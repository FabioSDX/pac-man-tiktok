require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const { LiveChat } = require('youtube-chat');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Global Metrics Tracking
let eventsCounter = 0;
let eventsHistory = new Array(60).fill(0);
setInterval(() => {
  eventsHistory.shift();
  eventsHistory.push(eventsCounter);
  eventsCounter = 0;
}, 1000);


// Silenciar console.log para mensagens repetitivas
const originalLog = console.log;
console.log = function (...args) {
  const msg = args.join(' ');
  if (msg.includes('JOINED') || msg.includes('connected') || msg.includes('viewerCount')) return;
  originalLog.apply(console, args);
};

// ── CORS headers ─────────────────────────────────────────────────────────────────
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Favicon handler - serve inline SVG emoji
app.get('/favicon.ico', function (req, res) {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⛏</text></svg>');
});

app.use(express.static('.'));

// ── Per-client sessions ──────────────────────────────────────────────────────
// Each client can have ONLY tiktok connected
// Map<ws, { tiktok: {conn, username, connected}, lastTTConnect }>
const sessions = new Map();

function getSession(ws) {
  if (!sessions.has(ws)) sessions.set(ws, { tiktok: null, youtube: null, lastTTConnect: 0, lastYTConnect: 0 });
  return sessions.get(ws);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getAvatar(user, data) {
  return (user && user.profilePictureUrl) || (data && data.profilePictureUrl) || '';
}
function getUser(user, data, fallback) {
  var u = user || {};
  return (u.uniqueId || (data && data.uniqueId) || u.nickname || (data && data.nickname) || fallback || '').toLowerCase();
}
function getNick(user, data, fallback) {
  return (user && user.nickname) || (data && data.nickname) || fallback || '';
}

function send(ws, obj) {
  try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch (e) { }
}

function initBatching(session, ws) {
  if (!session.eventQueue) session.eventQueue = [];
  if (!session.likeBuffer) session.likeBuffer = {};
  if (!session.batchInterval) {
    session.batchInterval = setInterval(function () {
      if (session.likeBuffer) {
        for (var user in session.likeBuffer) {
          session.eventQueue.push(session.likeBuffer[user]);
        }
        session.likeBuffer = {};
      }
      if (session.eventQueue.length > 0) {
        send(ws, { type: 'event_batch', events: session.eventQueue });
        session.eventQueue = [];
      }
    }, 100);
  }
}

function cleanupSession(ws) {
  var s = sessions.get(ws);
  if (!s) return;
  if (s.tiktok && s.tiktok.conn) { try { s.tiktok.conn.disconnect(); } catch (e) { } }
  if (s.youtube && s.youtube.conn) { try { s.youtube.conn.stop(); } catch (e) { } }
  if (s.batchInterval) {
    try { clearInterval(s.batchInterval); } catch (e) { }
  }
  sessions.delete(ws);
}

// ── TikTok Connection ────────────────────────────────────────────────────────
function connectTikTok(ws, username, sessionId) {
  var session = getSession(ws);
  // Disconnect previous TikTok only
  if (session.tiktok && session.tiktok.conn) {
    try { session.tiktok.conn.disconnect(); } catch (e) { }
  }

  var opts = {
    processInitialData: true, enableExtendedGiftInfo: true, enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000, requestOptions: { timeout: 15000 }, websocketOptions: { timeout: 15000 }
  };
  if (sessionId) opts.sessionId = sessionId;
  else if (process.env.TIKTOK_SESSION_ID) opts.sessionId = process.env.TIKTOK_SESSION_ID;

  var tiktok = new WebcastPushConnection(username, opts);
  session.tiktok = { conn: tiktok, username: username, connected: false };
  session.lastTTConnect = Date.now();

  console.log('[TikTok] Connecting to @' + username + '...');

  tiktok.connect().then(function (state) {
    console.log('[TikTok] Connected to @' + username + ' | roomId:', state.roomId);
    if (session.tiktok) session.tiktok.connected = true;
    var gifts = [];
    if (state.availableGifts) {
      gifts = state.availableGifts.map(function (g) {
        return { name: g.name ? g.name.toLowerCase() : '', url: (g.image && g.image.url_list) ? g.image.url_list[0] : '' };
      });
      console.log('[TikTok] Presentes disponíveis:', gifts.map(function(g){ return g.name; }).join(', '));
    }
    var hostAvatar = '';
    try { hostAvatar = state.roomInfo.owner.avatar_thumb.url_list[0]; } catch (e) { }
    send(ws, { type: 'connected', platform: 'tiktok', username: username, roomId: state.roomId, availableGifts: gifts, ownerAvatar: hostAvatar });
  }).catch(function (err) {
    console.error('[TikTok] Failed:', err.message);
    // Retry without websocket upgrade if that was the issue
    if (err.message && err.message.includes('websocket upgrade')) {
      console.log('[TikTok] Retrying with polling only...');
      opts.enableWebsocketUpgrade = false;
      var tiktok2 = new WebcastPushConnection(username, opts);
      session.tiktok = { conn: tiktok2, username: username, connected: false };
      // Re-attach all events
      attachTikTokEvents(ws, tiktok2, username, session);
      tiktok2.connect().then(function (state) {
        console.log('[TikTok] Connected (polling) to @' + username + ' | roomId:', state.roomId);
        if (session.tiktok) session.tiktok.connected = true;
        var gifts = [];
        if (state.availableGifts) {
          gifts = state.availableGifts.map(function (g) {
            return { name: g.name ? g.name.toLowerCase() : '', url: (g.image && g.image.url_list) ? g.image.url_list[0] : '' };
          });
          console.log('[TikTok] Presentes disponíveis (polling):', gifts.map(function(g){ return g.name; }).join(', '));
        }
        var hostAvatar = '';
        try { hostAvatar = state.roomInfo.owner.avatar_thumb.url_list[0]; } catch (e) { }
        send(ws, { type: 'connected', platform: 'tiktok', username: username, roomId: state.roomId, availableGifts: gifts, ownerAvatar: hostAvatar });
      }).catch(function (err2) {
        console.error('[TikTok] Polling also failed:', err2.message);
        send(ws, { type: 'error', platform: 'tiktok', message: 'TikTok: ' + err2.message });
      });
      return;
    }
    send(ws, { type: 'error', platform: 'tiktok', message: 'TikTok: ' + err.message });
  });

  attachTikTokEvents(ws, tiktok, username, session);
}

function attachTikTokEvents(ws, tiktok, username, session) {

  tiktok.on('chat', function (data) {
    eventsCounter++;
    var u = data.user || {}, uid = getUser(u, data, username), nick = getNick(u, data, uid), av = getAvatar(u, data);
    var chatEv = { type: 'chat', platform: 'tiktok', user: uid, nickname: nick, avatar: av, comment: data.comment || '', msgId: data.msgId };
    if (session.eventQueue) session.eventQueue.push(chatEv);
  });
  tiktok.on('member', function (data) {
    eventsCounter++;
    var u = data.user || {}, uid = getUser(u, data, ''), nick = getNick(u, data, uid), av = getAvatar(u, data);
    if (uid && session.eventQueue) {
      session.eventQueue.push({ type: 'member', platform: 'tiktok', user: uid, nickname: nick, avatar: av, msgId: data.msgId });
    }
  });
  tiktok.on('subscribe', function (data) {
    eventsCounter++;
    var u = data.user || {}, uid = getUser(u, data, ''), nick = getNick(u, data, uid), av = getAvatar(u, data);
    if (uid && session.eventQueue) {
      session.eventQueue.push({ type: 'subscribe', platform: 'tiktok', user: uid, nickname: nick, avatar: av, msgId: data.msgId });
    }
  });
  tiktok.on('gift', function (data) {
    if (data.repeatEnd === false) return;
    eventsCounter++;
    var u = data.user || {}, uid = getUser(u, data, 'unknown'), nick = getNick(u, data, uid), av = getAvatar(u, data);
    if (session.eventQueue) {
      session.eventQueue.push({
        type: 'gift', platform: 'tiktok', user: uid, nickname: nick, avatar: av,
        giftName: (data.giftName || data.describe || '').toLowerCase(), diamondCount: data.diamondCount || 1,
        repeatCount: data.repeatCount || 1, giftId: data.giftId || 0, msgId: data.msgId,
        giftPictureUrl: data.giftPictureUrl || (data.extendedGiftInfo && data.extendedGiftInfo.icon && data.extendedGiftInfo.icon.url_list ? data.extendedGiftInfo.icon.url_list[0] : ''),
        giftAnimationUrl: data.extendedGiftInfo && data.extendedGiftInfo.image && data.extendedGiftInfo.image.url_list ? data.extendedGiftInfo.image.url_list[0] : '',
        giftType: data.giftType || 0
      });
    }
  });
  tiktok.on('like', function (data) {
    eventsCounter++;
    var u = data.user || {}, uid = getUser(u, data, ''), nick = getNick(u, data, uid), av = getAvatar(u, data);
    if (!uid) return;

    if (!session.likeBuffer) session.likeBuffer = {};
    if (!session.likeBuffer[uid]) {
      session.likeBuffer[uid] = { type: 'like', platform: 'tiktok', user: uid, nickname: nick, avatar: av, likeCount: 0, msgId: data.msgId };
    }
    session.likeBuffer[uid].likeCount += (data.likeCount || 1);
  });
  tiktok.on('follow', function (data) {
    eventsCounter++;
    console.log('[TikTok] Follow event detected:', data.uniqueId || (data.user && data.user.uniqueId));
    var u = data.user || {}, uid = getUser(u, data, 'unknown'), nick = getNick(u, data, uid), av = getAvatar(u, data);
    if (session.eventQueue) {
      session.eventQueue.push({ type: 'follow', platform: 'tiktok', user: uid, nickname: nick, avatar: av, msgId: data.msgId });
    }
  });
  tiktok.on('share', function (data) {
    eventsCounter++;
    var u = data.user || {}, uid = getUser(u, data, 'unknown'), nick = getNick(u, data, uid), av = getAvatar(u, data);
    if (session.eventQueue) {
      session.eventQueue.push({ type: 'share', platform: 'tiktok', user: uid, nickname: nick, avatar: av, msgId: data.msgId });
    }
  });
  tiktok.on('social', function (data) {
    console.log('[TikTok] Social event:', data.displayType, 'from', data.uniqueId || (data.user && data.user.uniqueId));
    var u = data.user || {}, uid = getUser(u, data, ''), nick = getNick(u, data, uid), av = getAvatar(u, data);
    if (uid && session.eventQueue) {
      var isFollow = data.displayType && (data.displayType.includes('follow') || data.displayType.includes('seguidor'));
      var type = isFollow ? 'follow' : 'social';
      session.eventQueue.push({ type: type, platform: 'tiktok', user: uid, nickname: nick, avatar: av, label: data.displayType || 'social', msgId: data.msgId });
    }
  });
  tiktok.on('roomUser', function (data) { send(ws, { type: 'roomUser', platform: 'tiktok', viewerCount: data.viewerCount || 0 }); });
  tiktok.on('streamEnd', function () {
    console.log('[TikTok] Stream ended @' + username);
    if (session.tiktok) session.tiktok.connected = false;
    send(ws, { type: 'streamEnd', platform: 'tiktok' });
  });
  tiktok.on('disconnected', function () {
    if (session.tiktok) session.tiktok.connected = false;
    send(ws, { type: 'disconnected', platform: 'tiktok' });
  });
  tiktok.on('error', function (err) {
    send(ws, { type: 'error', platform: 'tiktok', message: err.message });
  });
}

function formatYouTubeAvatar(thumbnail) {
  if (!thumbnail || !thumbnail.url) return '';
  let url = thumbnail.url;
  if (url.startsWith('//')) url = 'https:' + url;
  else if (url.startsWith('http://')) url = url.replace('http://', 'https://');
  return url;
}

// ── YouTube Connection ───────────────────────────────────────────────────────
function connectYouTube(ws, youtubeId) {
  var session = getSession(ws);
  if (session.youtube && session.youtube.conn) {
    try { session.youtube.conn.stop(); } catch (e) { }
  }

  let parsedId = youtubeId;
  if (youtubeId.includes('v=')) {
      parsedId = youtubeId.split('v=')[1].split('&')[0];
  } else if (youtubeId.includes('youtu.be/')) {
      parsedId = youtubeId.split('youtu.be/')[1].split('?')[0];
  } else if (youtubeId.includes('/live/')) {
      parsedId = youtubeId.split('/live/')[1].split('?')[0];
  }

  var opts = {};
  if (parsedId.startsWith('UC') && parsedId.length >= 24) {
      opts.channelId = parsedId;
  } else {
      opts.liveId = parsedId;
  }

  var liveChat = new LiveChat(opts);
  session.youtube = { conn: liveChat, channelId: parsedId, connected: false };
  session.lastYTConnect = Date.now();

  console.log('[YouTube] Connecting to ' + parsedId + '...');

  liveChat.on('start', (liveId) => {
    console.log('[YouTube] Connected to LiveId:', liveId);
    if (session.youtube) session.youtube.connected = true;
    send(ws, { type: 'connected', platform: 'youtube', username: parsedId, roomId: liveId, availableGifts: [] });
  });

  liveChat.on('chat', (chatItem) => {
    var nick = chatItem.author.name || '';
    var uid = nick.startsWith('@') ? nick : '@' + nick;
    var av = formatYouTubeAvatar(chatItem.author.thumbnail);
    var comment = '';
    chatItem.message.forEach(item => {
        if (item.text) comment += item.text;
        else if (item.emojiText) comment += item.emojiText;
    });

    var isBroadcaster = false;
    if (chatItem.author.badge) {
        chatItem.author.badge.forEach(b => {
            if (b.type === 'owner' || b.type === 'broadcaster' || (b.label && b.label.toLowerCase().includes('owner'))) {
                isBroadcaster = true;
            }
        });
    }

    var chatEv = { type: 'chat', platform: 'youtube', user: uid, nickname: nick, avatar: av, comment: comment, msgId: chatItem.id, isBroadcaster: isBroadcaster };
    if (session.eventQueue) session.eventQueue.push(chatEv);
  });

  liveChat.on('superChat', (item) => {
    var nick = item.author.name || 'unknown';
    var uid = '@' + nick;
    var av = formatYouTubeAvatar(item.author.thumbnail);
    if (session.eventQueue) {
      session.eventQueue.push({
        type: 'gift', platform: 'youtube', user: uid, nickname: nick, avatar: av,
        giftName: 'SuperChat ' + item.amount, diamondCount: 10,
        repeatCount: 1, giftId: item.id, msgId: item.id,
        giftPictureUrl: ''
      });
    }
  });

  liveChat.on('superSticker', (item) => {
    var nick = item.author.name || 'unknown';
    var uid = '@' + nick;
    var av = formatYouTubeAvatar(item.author.thumbnail);
    if (session.eventQueue) {
      session.eventQueue.push({
        type: 'gift', platform: 'youtube', user: uid, nickname: nick, avatar: av,
        giftName: item.stickerName || 'SuperSticker', diamondCount: 10,
        repeatCount: 1, giftId: item.id, msgId: item.id,
        giftPictureUrl: ''
      });
    }
  });

  liveChat.on('member', (item) => {
     var nick = item.author.name || 'unknown';
     var uid = '@' + nick;
     var av = formatYouTubeAvatar(item.author.thumbnail);
     if (session.eventQueue) {
       session.eventQueue.push({ type: 'member', platform: 'youtube', user: uid, nickname: nick, avatar: av, msgId: item.id });
     }
  });

  liveChat.on('error', (err) => {
    console.error('[YouTube] Error:', err.message);
    send(ws, { type: 'error', platform: 'youtube', message: 'YouTube: ' + err.message });
  });
  
  liveChat.on('end', () => {
    console.log('[YouTube] Stream ended / disconnected.');
    if (session.youtube) session.youtube.connected = false;
    send(ws, { type: 'disconnected', platform: 'youtube' });
  });

  liveChat.start().catch((err) => {
      console.error('[YouTube] Start failed:', err.message);
      send(ws, { type: 'error', platform: 'youtube', message: 'YouTube: ' + err.message });
  });
}


// ── WebSocket handler ────────────────────────────────────────────────────────
wss.on('connection', function (ws) {
  console.log('[WS] Client connected. Total:', wss.clients.size);
  var session = getSession(ws);
  initBatching(session, ws);

  ws.on('message', function (raw) {
    try {
      var msg = JSON.parse(raw);

      // Rate-limit per platform
      if (msg.action === 'connect' && session.lastTTConnect && (Date.now() - session.lastTTConnect < 10000)) {
        var wait = Math.ceil((10000 - (Date.now() - session.lastTTConnect)) / 1000);
        send(ws, { type: 'error', platform: 'tiktok', message: 'Wait ' + wait + 's before reconnecting.' });
        return;
      }

      if (msg.action === 'connect' && msg.username) {
        var uname = msg.username.replace(/^@/, '').trim();
        if (!uname) { send(ws, { type: 'error', platform: 'tiktok', message: 'Username required.' }); return; }
        
        var fs = require('fs');
        var path = require('path');
        var authFile = path.join(__dirname, 'authorized_users.json');
        var isAuthorized = false;
        
        try {
          if (fs.existsSync(authFile)) {
            var authData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
            if (authData && authData.users && Array.isArray(authData.users)) {
              var authorizedUsers = authData.users.map(u => u.toLowerCase());
              if (authorizedUsers.includes(uname.toLowerCase())) {
                isAuthorized = true;
              }
            }
          }
        } catch (e) {
          console.error('[Auth] Error reading authorized_users.json:', e);
        }
        
        if (!isAuthorized) {
          send(ws, { 
            type: 'error', 
            platform: 'tiktok', 
            message: 'Acesso Negado! Solicite acesso enviando uma mensagem no direct do canal do TikTok.' 
          });
          return;
        }

        connectTikTok(ws, uname, msg.sessionId);
      }
      else if (msg.action === 'connect_youtube' && msg.youtubeId) {
        var yId = msg.youtubeId.trim();
        if (!yId) { send(ws, { type: 'error', platform: 'youtube', message: 'Channel/Video ID required.' }); return; }
        connectYouTube(ws, yId);
      }
      else if (msg.action === 'disconnect') {
        var plat = msg.platform || 'all';
        if ((plat === 'all' || plat === 'tiktok') && session.tiktok && session.tiktok.conn) {
          try { session.tiktok.conn.disconnect(); } catch (e) { } session.tiktok = null;
        }
        if ((plat === 'all' || plat === 'youtube') && session.youtube && session.youtube.conn) {
          try { session.youtube.conn.stop(); } catch (e) { } session.youtube = null;
        }
        send(ws, { type: 'disconnected', platform: plat });
      }
      else if (msg.action === 'status') {
        send(ws, {
          type: 'status',
          tiktok: !!(session.tiktok && session.tiktok.connected),
          tiktokUser: session.tiktok ? session.tiktok.username : null,
          youtube: !!(session.youtube && session.youtube.connected),
          youtubeId: session.youtube ? session.youtube.channelId : null
        });
      }
    } catch (e) { console.error('[WS] Bad message:', e.message); }
  });

  ws.on('close', function () {
    var s = sessions.get(ws);
    if (s) console.log('[WS] Client left. TT:', s.tiktok ? s.tiktok.username : '-');
    cleanupSession(ws);
    console.log('[WS] Remaining:', wss.clients.size);
  });
  ws.on('error', function (err) { console.error('[WS] Error:', err.message); });
});

// ── Health + Start ───────────────────────────────────────────────────────────
app.get('/health', function (_req, res) { res.json({ status: 'ok', sessions: sessions.size, uptime: process.uptime() }); });

// ── Admin Streamers API ──────────────────────────────────────────────────────
app.get('/api/streamers', function (req, res) {
  if (req.query.password !== '97690784n@') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const activeStreamers = [];
  for (const session of sessions.values()) {
    if (session.tiktok && session.tiktok.connected && session.tiktok.username) {
      activeStreamers.push({
        platform: 'tiktok',
        username: session.tiktok.username,
        link: 'https://www.tiktok.com/@' + session.tiktok.username + '/live'
      });
    }
    if (session.youtube && session.youtube.connected && session.youtube.channelId) {
      let link = '';
      if (session.youtube.channelId.startsWith('UC') && session.youtube.channelId.length >= 24) {
        link = 'https://www.youtube.com/channel/' + session.youtube.channelId + '/live';
      } else {
        link = 'https://www.youtube.com/watch?v=' + session.youtube.channelId;
      }
      activeStreamers.push({
        platform: 'youtube',
        username: session.youtube.channelId,
        link: link
      });
    }
  }

  // Remover duplicatas baseadas no username+platform
  const uniqueStreamers = [];
  const seen = new Set();
  for (const s of activeStreamers) {
      const key = s.platform + ':' + s.username;
      if (!seen.has(key)) {
          seen.add(key);
          uniqueStreamers.push(s);
      }
  }

  res.json({ status: 'ok', count: uniqueStreamers.length, streamers: uniqueStreamers, metrics: eventsHistory });
});


// ── Serve avatares_hd ──────────────────────────────────────────────────────────
app.use('/avatares_hd', express.static(path.join(__dirname, 'avatares_hd')));

// ── Upscale Endpoint & Helper ──────────────────────────────────────────────────
function getAvatarUrlHash(url) {
  if (!url) return '';
  if (url.includes('avatares_hd/') && url.endsWith('.png')) {
    const baseName = path.basename(url, '.png');
    const parts = baseName.split('_');
    return parts[parts.length - 1];
  }
  let targetUrl = url;
  if (url.includes('/proxy-image') && url.includes('url=')) {
    try {
      const match = url.match(/[?&]url=([^&]+)/);
      if (match) {
        targetUrl = decodeURIComponent(match[1]);
      }
    } catch (e) {
      console.error('[Hash Extraction Error]', e);
    }
  }
  const cleanUrl = targetUrl.split('?')[0];
  return require('crypto').createHash('md5').update(cleanUrl).digest('hex').substring(0, 8);
}

const { execFile } = require('child_process');

const upscaleQueue = [];
let upscaleActiveCount = 0;
const MAX_CONCURRENT_UPSCALE = 1;

async function processUpscaleQueue() {
  if (upscaleQueue.length === 0 || upscaleActiveCount >= MAX_CONCURRENT_UPSCALE) {
    return;
  }
  const task = upscaleQueue.shift();
  upscaleActiveCount++;
  try {
    await task.run();
  } catch (e) {
    console.error('[Upscale Queue Task Error]', e);
  } finally {
    upscaleActiveCount--;
    setImmediate(processUpscaleQueue);
  }
}

app.get('/api/upscale', async function (req, res) {
  let url = req.query.url || '';
  let id  = req.query.id  || '';

  if (!url || !id) {
    return res.json({ error: 'URL and ID are required' });
  }

  id = id.replace(/[^a-zA-Z0-9_]/g, '');

  console.log(`\n--- [Upscale Requested] ID: ${id} ---`);
  const urlHash = getAvatarUrlHash(url);

  const tempFile   = path.join(__dirname, 'temp_upscale', `${id}_${urlHash}.png`);
  const outputFile = path.join(__dirname, 'avatares_hd',  `${urlHash}.png`);
  const outputUrl  = `avatares_hd/${urlHash}.png`;

  if (fs.existsSync(outputFile)) {
    console.log(`[Upscale Cache Hit] Hash: ${urlHash} (${outputUrl})`);
    return res.json({ status: 'cached', url: outputUrl });
  }

  const runUpscale = () => {
    return new Promise(async (resolve, reject) => {
      try {
        if (fs.existsSync(outputFile)) {
          console.log(`[Upscale Queue Cache Hit] Hash: ${urlHash} (${outputUrl})`);
          return resolve({ status: 'cached', url: outputUrl });
        }
        if (!fs.existsSync(path.join(__dirname, 'temp_upscale'))) {
          fs.mkdirSync(path.join(__dirname, 'temp_upscale'), { recursive: true });
        }
        if (!fs.existsSync(path.join(__dirname, 'avatares_hd'))) {
          fs.mkdirSync(path.join(__dirname, 'avatares_hd'), { recursive: true });
        }

        const downloadImage = (downloadUrl, targetPath) => {
          return new Promise((resolveDl, rejectDl) => {
            const proto = downloadUrl.startsWith('https') ? require('https') : require('http');
            const options = {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              timeout: 15000
            };
            const req2 = proto.get(downloadUrl, options, (r) => {
              if (r.statusCode === 301 || r.statusCode === 302) {
                const redirectUrl = r.headers.location;
                const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, downloadUrl).href;
                return resolveDl(downloadImage(absoluteUrl, targetPath));
              }
              if (r.statusCode !== 200) return rejectDl(new Error(`Original status code invalid: ${r.statusCode}`));
              const file = fs.createWriteStream(targetPath);
              r.pipe(file);
              file.on('finish', () => { file.close(() => { resolveDl(); }); });
              file.on('error', (err) => { try { fs.unlinkSync(targetPath); } catch (_) {} rejectDl(err); });
            });
            req2.on('error', rejectDl);
            req2.on('timeout', () => { req2.destroy(); rejectDl(new Error('Download timeout')); });
          });
        };
        
        console.log(`[Upscale Queue] Downloading image for ID: ${id}`);
        await downloadImage(url, tempFile);

        const upscalerExe = path.join(__dirname, 'upscaler', 'realesrgan-ncnn-vulkan.exe');
        if (!fs.existsSync(upscalerExe)) {
          console.error('[Upscale] Upscaler executable not found at:', upscalerExe);
          try { fs.unlinkSync(tempFile); } catch (e) {}
          return reject(new Error('Upscaler executable not found'));
        }

        const args = ['-i', tempFile, '-o', outputFile, '-n', 'realesrgan-x4plus', '-s', '4'];
        console.log(`[Upscale Queue] Executing Real-ESRGAN for ID: ${id}`);
        execFile(upscalerExe, args, { timeout: 45000 }, (error, stdout, stderr) => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          if (error) {
            console.error(`[Upscale] Upscaler failed for ID ${id}:`, error);
            return reject(new Error('Upscaling process failed'));
          }
          console.log(`[Upscale] Success for ID: ${id}! Saved to: ${outputFile}`);
          resolve({ status: 'success', url: outputUrl });
        });
      } catch (error) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        console.error(`[Upscale Task Exception] ID: ${id} | Error:`, error.message);
        reject(error);
      }
    });
  };

  upscaleQueue.push({
    id: id,
    run: async () => {
      try {
        const result = await runUpscale();
        res.json(result);
      } catch (err) {
        res.json({ status: 'error', error: err.message });
      }
    }
  });

  console.log(`[Upscale Queue] Queued ID: ${id}. Queue length: ${upscaleQueue.length}`);
  processUpscaleQueue();
});


// ── Premium Upscale (Replicate) ──────────────────────────────────────────────
function registerReplicateCost(cost) {
  const costFile = path.join(__dirname, 'replicate_costs.json');
  let data = { total_cost: 0, runs: 0 };
  if (fs.existsSync(costFile)) {
    try { data = JSON.parse(fs.readFileSync(costFile)); } catch(e){}
  }
  data.total_cost += cost;
  data.runs += 1;
  fs.writeFileSync(costFile, JSON.stringify(data));
}

app.get('/api/cost-report', (req, res) => {
  const costFile = path.join(__dirname, 'replicate_costs.json');
  if (fs.existsSync(costFile)) {
    return res.sendFile(costFile);
  }
  return res.json({ total_cost: 0, runs: 0 });
});

app.get('/api/upscale-premium', async function (req, res) {
  let url = req.query.url || '';
  let id  = req.query.id  || '';

  if (!url || !id) {
    return res.json({ error: 'URL and ID are required' });
  }

  id = id.replace(/[^a-zA-Z0-9_]/g, '');
  const urlHash = getAvatarUrlHash(url);
  const internalHdFile = path.join(__dirname, 'avatares_hd', `${urlHash}.png`);

  const outputHash = urlHash + "_premium";
  const outputFile = path.join(__dirname, 'avatares_premium', `${outputHash}.png`);
  const outputUrl  = `avatares_premium/${outputHash}.png`;

  if (fs.existsSync(outputFile)) {
    return res.json({ status: 'cached', url: outputUrl });
  }

  if (!fs.existsSync(path.join(__dirname, 'avatares_premium'))) {
    fs.mkdirSync(path.join(__dirname, 'avatares_premium'), { recursive: true });
  }

  const Replicate = require('replicate');
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    let imageUri;
    if (fs.existsSync(internalHdFile)) {
      const fsPromises = require('fs/promises');
      const data = (await fsPromises.readFile(internalHdFile)).toString("base64");
      imageUri = `data:image/png;base64,${data}`;
    } else {
      console.log(`[Upscale Premium] Internal HD missing, falling back to original URL: ${url}`);
      imageUri = url;
    }

    const input = {
      image: imageUri,
      codeformer_fidelity: 0.02,
      background_enhance: false,
      face_upsample: true,
      upscale: 2
    };

    console.log(`[Upscale Premium] Enviando para Replicate... ID: ${id}`);
    
    let prediction = await replicate.predictions.create({
      version: "cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2",
      input: input
    });
    
    while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
      await new Promise(r => setTimeout(r, 1000));
      prediction = await replicate.predictions.get(prediction.id);
    }

    if (prediction.status !== "succeeded") {
       throw new Error("Prediction falhou: " + prediction.status);
    }
    
    const outputImgUrl = prediction.output; 
    
    const predictTime = prediction.metrics ? prediction.metrics.predict_time : 0;
    const cost = predictTime * 0.000725;
    console.log(`[Upscale Premium] Finalizado. Tempo: ${predictTime}s, Custo: US$ ${cost.toFixed(4)}`);
    registerReplicateCost(cost);

    const downloadImage = (downloadUrl, targetPath) => {
        return new Promise((resolveDl, rejectDl) => {
            const proto = downloadUrl.startsWith('https') ? require('https') : require('http');
            const req2 = proto.get(downloadUrl, (r) => {
                if (r.statusCode !== 200) return rejectDl(new Error(`Status ${r.statusCode}`));
                const file = fs.createWriteStream(targetPath);
                r.pipe(file);
                file.on('finish', () => file.close(resolveDl));
                file.on('error', rejectDl);
            });
            req2.on('error', rejectDl);
        });
    };
    
    await downloadImage(outputImgUrl, outputFile);
    
    return res.json({ status: 'success', url: outputUrl });
  } catch (err) {
    console.error('[Upscale Premium Error]', err);
    return res.json({ error: err.message });
  }
});

// ── TikTok TTS Proxy ───────────────────────────────────────────────────────────
// ── Microsoft Edge TTS Proxy (Vozes Naturais) ──────────────────────────────────
async function getEdgeTTS(text, voice) {
  const WebSocket = require('ws');
  const { v4: uuidv4 } = require('crypto');

  return new Promise((resolve, reject) => {
    const requestId = require('crypto').randomBytes(16).toString('hex');
    const endpoint = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=' + requestId;

    const ws = new WebSocket(endpoint, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      }
    });

    let audioData = Buffer.alloc(0);
    let timeout = setTimeout(() => { ws.close(); reject(new Error('TTS Timeout')); }, 10000);

    ws.on('open', () => {
      const config = 'Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';
      let lang = voice.startsWith('pt-BR') ? 'pt-BR' : 'en-US';
      const ssml = 'X-RequestId:' + requestId + '\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version=\'1.0\' xmlns=\'http://www.w3.org/2001/10/synthesis\' xml:lang=\'' + lang + '\'><voice name=\'' + voice + '\'><prosody pitch=\'+0Hz\' rate=\'+10%\' volume=\'+0%\'>' + text + '</prosody></voice></speak>';
      ws.send(config);
      ws.send(ssml);
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const index = data.indexOf(Buffer.from('Path:audio\r\n'));
        if (index !== -1) {
          audioData = Buffer.concat([audioData, data.slice(index + 12)]);
        }
      } else {
        const msg = data.toString();
        if (msg.includes('Path:turn.end')) {
          clearTimeout(timeout);
          ws.close();
          resolve(audioData);
        }
      }
    });

    ws.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

const imageCache = new Map();
const CACHE_MAX_ITEMS = 500;

// ── Image Proxy (to allow drawing external avatars on canvas) ──
app.get('/proxy-image', function (req, res) {
  var url = req.query.url;
  if (!url) return res.status(400).send('URL is required');

  if (imageCache.has(url)) {
    const cached = imageCache.get(url);
    res.set('Content-Type', cached.contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(cached.data);
  }

  const https = require('https');
  const http = require('http');
  const agent = url.startsWith('https') ? https : http;

  agent.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, (pRes) => {
    if (pRes.statusCode !== 200) {
      return res.status(pRes.statusCode).send('Proxy Error');
    }

    let chunks = [];
    pRes.on('data', chunk => chunks.push(chunk));
    pRes.on('end', () => {
      let buffer = Buffer.concat(chunks);
      let cType = pRes.headers['content-type'];

      if (imageCache.size > CACHE_MAX_ITEMS) {
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
      }
      imageCache.set(url, { data: buffer, contentType: cType });

      res.set('Content-Type', cType);
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    });
  }).on('error', (err) => {
    res.status(500).send('Proxy Error: ' + err.message);
  });
});

let edgeTTSDisabled = false;

app.get('/tts', async function (req, res) {
  var text = req.query.text;
  var voice = req.query.voice || 'en-US-GuyNeural';
  if (!text) return res.status(400).send('Text is required');

  text = text.substring(0, 500);

  try {
    if (edgeTTSDisabled) throw new Error('Microsoft TTS desabilitado por falhas (403)');
    console.log('[TTS] Microsoft Natural:', voice, '| Texto:', text.substring(0, 30) + '...');
    const audioBuffer = await getEdgeTTS(text, voice);

    if (audioBuffer && audioBuffer.length > 0) {
      res.set('Content-Type', 'audio/mpeg');
      return res.send(audioBuffer);
    }
    throw new Error('Buffer de áudio vazio');

  } catch (e) {
    if (e.message && e.message.includes('403')) {
      if (!edgeTTSDisabled) {
        console.error('[TTS] Erro 403 detectado. Desabilitando Microsoft TTS por 5 minutos para evitar engasgos.');
        edgeTTSDisabled = true;
        setTimeout(() => { edgeTTSDisabled = false; }, 5 * 60 * 1000);
      }
    } else {
      console.error('[TTS] Erro Microsoft TTS:', e.message);
    }
    // Fallback final Google Translate (Proxy to avoid CORS/Referer issues)
    let tl = voice.startsWith('pt-BR') ? 'pt-br' : 'en';
    var googleUrl = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=' + tl + '&client=tw-ob';

    const https = require('https');
    https.get(googleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (gRes) => {
      if (gRes.statusCode !== 200) {
        return res.status(gRes.statusCode).send('Google TTS Error');
      }
      res.set('Content-Type', 'audio/mpeg');
      gRes.pipe(res);
    }).on('error', (err) => {
      res.status(500).send('TTS Fallback Error: ' + err.message);
    });
  }
});

// ── Save Ranking Image Endpoint ────────────────────────────────────────────────
app.post('/save-ranking', function (req, res) {
  const { image, filename } = req.body;
  if (!image) return res.status(400).send('Image data is required');

  // Salvar na Área de Trabalho do Windows
  const desktopDir = path.join(process.env.USERPROFILE, 'Desktop');
  if (!fs.existsSync(desktopDir)) {
    return res.status(500).send('Desktop directory not found');
  }

  const base64Data = image.replace(/^data:image\/png;base64,/, "");
  const savePath = path.join(desktopDir, filename || `ranking_${Date.now()}.png`);

  fs.writeFile(savePath, base64Data, 'base64', function (err) {
    if (err) {
      console.error('[Server] Error saving ranking image:', err);
      return res.status(500).send('Error saving image');
    }
    console.log('[Server] Ranking image saved to Desktop:', savePath);
    res.send({ status: 'ok', path: savePath });
  });
});

server.listen(PORT, function () {
  console.log('=== Pickaxe Drop Server ===');
  console.log('Game:      http://localhost:' + PORT);
  console.log('Platforms: TikTok Live');
  console.log('===========================');
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(function () {
      require('http').get((process.env.RENDER_EXTERNAL_URL + '/health').replace('https:', 'http:'), function () { }).on('error', function () { });
    }, 14 * 60 * 1000);
  }
});
