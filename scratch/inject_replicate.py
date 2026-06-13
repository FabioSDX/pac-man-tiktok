import os
import re

server_js = r"c:\laragon8\www\fallingpickaxeticktockmoney\server.js"
with open(server_js, 'r', encoding='utf-8') as f:
    code = f.read()

animate_code = """
// ── Replicate Live Portrait Endpoint ──────────────────────────────────────────
const https = require('https');

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || '';

app.get('/api/animate-face', async function (req, res) {
  let url = req.query.url || '';
  let id  = req.query.id  || '';

  if (!url || !id) {
    return res.json({ error: 'URL and ID are required' });
  }

  id = id.replace(/[^a-zA-Z0-9_]/g, '');
  const urlHash = getAvatarUrlHash(url);
  const videoFileName = `${id}_${urlHash}.mp4`;
  const outputFile = path.join(__dirname, 'avatares_video', videoFileName);
  const outputUrl = `avatares_video/${videoFileName}`;

  if (fs.existsSync(outputFile)) {
    console.log(`[Animate] Cached video found: ${outputFile}`);
    return res.json({ status: 'cached', url: outputUrl });
  }

  try {
    if (!fs.existsSync(path.join(__dirname, 'avatares_video'))) {
      fs.mkdirSync(path.join(__dirname, 'avatares_video'), { recursive: true });
    }

    // Must provide an absolute URL for Replicate
    // If the URL is relative like "avatares_hd/...", we need to form a full URL.
    // However, Laragon local URLs (localhost) cannot be reached by Replicate.
    // The user's image must be publicly accessible. 
    // BUT the 'url' param might already be the TikTok userAvatarUrl!
    // Wait, the client passes 'url' which is availableAvatars[] (a local path) or the TikTok URL?
    // In our implementation, availableAvatars gives "avatares_hd/xxx.png". Replicate can't download from localhost.
    // So we CANNOT pass localhost URL to Replicate.
    // Wait! Replicate also accepts base64 data URIs!
    // Let's read the local HD image and convert it to base64.
    
    let localImagePath = '';
    if (url.startsWith('avatares_hd/')) {
        localImagePath = path.join(__dirname, url);
    } else {
        // Fallback: assume it's already an absolute URL (unlikely to be HD though)
        // But if it's the TikTok URL, it is public.
    }

    let inputImageStr = url;
    if (localImagePath && fs.existsSync(localImagePath)) {
        const imgBuffer = fs.readFileSync(localImagePath);
        const ext = path.extname(localImagePath).toLowerCase().substring(1) || 'png';
        const mime = ext === 'jpg' ? 'jpeg' : ext;
        inputImageStr = `data:image/${mime};base64,${imgBuffer.toString('base64')}`;
    }

    const payload = JSON.stringify({
      version: "8310ba07dc2184cfd26dfd3131bf4eab6d2a45a198d022b7dc0da35fcf10287b",
      input: {
        image: inputImageStr,
        driving_video: "https://replicate.delivery/pbxt/LEQxLFMUNZMiKt5PWjyMJIbTdvKAb5j3f0spuiEwt9TEbo8B/d0.mp4"
      }
    });

    const createOptions = {
      hostname: 'api.replicate.com',
      path: '/v1/predictions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log(`[Animate] Starting Replicate API for ID: ${id}`);

    const reqReplicate = https.request(createOptions, (resRep) => {
      let data = '';
      resRep.on('data', chunk => { data += chunk; });
      resRep.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (resRep.statusCode !== 201) {
             console.error('[Animate] Replicate Create Error:', json);
             return res.json({ status: 'error', error: json.detail || 'Failed to create prediction' });
          }

          const getUrl = json.urls.get;
          
          // Polling function
          const poll = () => {
             const pollReq = https.request(getUrl, {
                 headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
             }, (pollRes) => {
                 let pData = '';
                 pollRes.on('data', chunk => { pData += chunk; });
                 pollRes.on('end', () => {
                    const pJson = JSON.parse(pData);
                    if (pJson.status === 'succeeded') {
                        // Download the MP4
                        const outputMp4 = pJson.output;
                        console.log(`[Animate] Replicate success! Downloading video from ${outputMp4}`);
                        const file = fs.createWriteStream(outputFile);
                        https.get(outputMp4, (dlRes) => {
                            dlRes.pipe(file);
                            file.on('finish', () => {
                                file.close();
                                console.log(`[Animate] Saved video to ${outputFile}`);
                                res.json({ status: 'success', url: outputUrl });
                            });
                        }).on('error', (err) => {
                            fs.unlink(outputFile, ()=>{});
                            res.json({ status: 'error', error: 'Failed to download video' });
                        });
                    } else if (pJson.status === 'failed' || pJson.status === 'canceled') {
                        console.error('[Animate] Prediction failed:', pJson.error);
                        res.json({ status: 'error', error: pJson.error || 'Prediction failed' });
                    } else {
                        // Still processing/starting
                        setTimeout(poll, 2000);
                    }
                 });
             });
             pollReq.on('error', (e) => res.json({ status: 'error', error: e.message }));
             pollReq.end();
          };
          
          // Start polling
          setTimeout(poll, 3000);

        } catch (e) {
          console.error('[Animate] Parse error:', e);
          res.json({ status: 'error', error: 'Invalid response from Replicate' });
        }
      });
    });

    reqReplicate.on('error', (e) => {
      console.error('[Animate] Request error:', e);
      res.json({ status: 'error', error: e.message });
    });

    reqReplicate.write(payload);
    reqReplicate.end();

  } catch (error) {
    console.error('[Animate] Exception:', error.message);
    res.json({ status: 'error', error: error.message });
  }
});
"""

if "app.get('/api/animate-face'" not in code:
    code = code.replace(
        "app.get('/api/upscale', async function (req, res) {",
        animate_code + "\n\napp.get('/api/upscale', async function (req, res) {"
    )
    with open(server_js, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replicate endpoints injected.")
else:
    print("Already injected.")
