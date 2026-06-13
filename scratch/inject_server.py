import os

server_js = r"c:\laragon8\www\fallingpickaxeticktockmoney\server.js"
with open(server_js, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add static serving and endpoints
upscale_code = """// ── Serve avatares_hd ──────────────────────────────────────────────────────────
app.use('/avatares_hd', express.static(path.join(__dirname, 'avatares_hd')));
app.use('/avatares_video', express.static(path.join(__dirname, 'avatares_video')));

// ── Lista de avatares HD da pasta /avatares_hd ──────────────────────────────────
app.get('/avatar-list', function (_req, res) {
  var hdDir = path.join(__dirname, 'avatares_hd');
  try {
    if (!fs.existsSync(hdDir)) {
      return res.json({ files: [] });
    }
    var files = fs.readdirSync(hdDir);
    var imageExt = ['.png', '.jpg', '.jpeg', '.webp'];
    var avatarFiles = files.filter(function (f) {
      var ext = path.extname(f).toLowerCase();
      return imageExt.includes(ext);
    });
    avatarFiles = avatarFiles.map(function (f) { return 'avatares_hd/' + f; });
    res.json({ files: avatarFiles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

app.get('/api/upscale', async function (req, res) {
  let url = req.query.url || '';
  let id  = req.query.id  || '';

  if (!url || !id) {
    return res.json({ error: 'URL and ID are required' });
  }

  id = id.replace(/[^a-zA-Z0-9_]/g, '');

  console.log(`\\n--- [Upscale Started] ID: ${id} ---`);
  const urlHash = getAvatarUrlHash(url);

  const tempFile   = path.join(__dirname, 'temp_upscale', `${id}_${urlHash}.png`);
  const outputFile = path.join(__dirname, 'avatares_hd',  `${id}_${urlHash}.png`);
  const outputUrl  = `avatares_hd/${id}_${urlHash}.png`;

  if (fs.existsSync(outputFile)) {
    console.log(`[Upscale] Cached file found: ${outputFile}`);
    return res.json({ status: 'cached', url: outputUrl });
  }

  try {
    if (!fs.existsSync(path.join(__dirname, 'temp_upscale'))) {
      fs.mkdirSync(path.join(__dirname, 'temp_upscale'), { recursive: true });
    }
    if (!fs.existsSync(path.join(__dirname, 'avatares_hd'))) {
      fs.mkdirSync(path.join(__dirname, 'avatares_hd'), { recursive: true });
    }

    const downloadImage = (downloadUrl, targetPath) => {
      return new Promise((resolve, reject) => {
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
            return resolve(downloadImage(absoluteUrl, targetPath));
          }
          if (r.statusCode !== 200) return reject(new Error(`Original status code invalid: ${r.statusCode}`));
          const file = fs.createWriteStream(targetPath);
          r.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
          file.on('error', (err) => { try { fs.unlinkSync(targetPath); } catch (_) {} reject(err); });
        });
        req2.on('error', reject);
        req2.on('timeout', () => { req2.destroy(); reject(new Error('Download timeout')); });
      });
    };
    
    await downloadImage(url, tempFile);

    const upscalerExe = path.join(__dirname, 'upscaler', 'realesrgan-ncnn-vulkan.exe');
    if (!fs.existsSync(upscalerExe)) {
      console.error('[Upscale] Upscaler executable not found at:', upscalerExe);
      return res.json({ status: 'error', error: 'Upscaler not found' });
    }

    const args = ['-i', tempFile, '-o', outputFile, '-n', 'realesrgan-x4plus', '-s', '4'];
    execFile(upscalerExe, args, { timeout: 30000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      if (error) {
        console.error(`[Upscale] Upscaler failed:`, error);
        return res.json({ status: 'error', error: 'Upscaling process failed' });
      }
      console.log(`[Upscale] Success! Saved to: ${outputFile}`);
      res.json({ status: 'success', url: outputUrl });
    });

  } catch (error) {
    try { fs.unlinkSync(tempFile); } catch (e) {}
    console.error('[Upscale] Error:', error.message);
    res.json({ status: 'error', error: error.message });
  }
});
"""

if "app.get('/api/upscale'" not in code:
    code = code.replace(
        "app.get('/health', function (_req, res) { res.json({ status: 'ok', sessions: sessions.size, uptime: process.uptime() }); });",
        "app.get('/health', function (_req, res) { res.json({ status: 'ok', sessions: sessions.size, uptime: process.uptime() }); });\n\n" + upscale_code
    )

with open(server_js, 'w', encoding='utf-8') as f:
    f.write(code)
print("Server fixes applied.")
