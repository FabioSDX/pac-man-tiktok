const fs = require('fs');
const path = require('path');

const serverFile = path.join(process.cwd(), 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const upscalerBlock = `
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

  console.log(\`\\n--- [Upscale Requested] ID: \${id} ---\`);
  const urlHash = getAvatarUrlHash(url);

  const tempFile   = path.join(__dirname, 'temp_upscale', \`\${id}_\${urlHash}.png\`);
  const outputFile = path.join(__dirname, 'avatares_hd',  \`\${id}_\${urlHash}.png\`);
  const outputUrl  = \`avatares_hd/\${id}_\${urlHash}.png\`;

  if (fs.existsSync(outputFile)) {
    console.log(\`[Upscale Cache Hit] ID: \${id} (\${outputUrl})\`);
    return res.json({ status: 'cached', url: outputUrl });
  }

  const runUpscale = () => {
    return new Promise(async (resolve, reject) => {
      try {
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
              if (r.statusCode !== 200) return rejectDl(new Error(\`Original status code invalid: \${r.statusCode}\`));
              const file = fs.createWriteStream(targetPath);
              r.pipe(file);
              file.on('finish', () => { file.close(() => { resolveDl(); }); });
              file.on('error', (err) => { try { fs.unlinkSync(targetPath); } catch (_) {} rejectDl(err); });
            });
            req2.on('error', rejectDl);
            req2.on('timeout', () => { req2.destroy(); rejectDl(new Error('Download timeout')); });
          });
        };
        
        console.log(\`[Upscale Queue] Downloading image for ID: \${id}\`);
        await downloadImage(url, tempFile);

        const upscalerExe = path.join(__dirname, 'upscaler', 'realesrgan-ncnn-vulkan.exe');
        if (!fs.existsSync(upscalerExe)) {
          console.error('[Upscale] Upscaler executable not found at:', upscalerExe);
          try { fs.unlinkSync(tempFile); } catch (e) {}
          return reject(new Error('Upscaler executable not found'));
        }

        const args = ['-i', tempFile, '-o', outputFile, '-n', 'realesrgan-x4plus', '-s', '4'];
        console.log(\`[Upscale Queue] Executing Real-ESRGAN for ID: \${id}\`);
        execFile(upscalerExe, args, { timeout: 45000 }, (error, stdout, stderr) => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
          if (error) {
            console.error(\`[Upscale] Upscaler failed for ID \${id}:\`, error);
            return reject(new Error('Upscaling process failed'));
          }
          console.log(\`[Upscale] Success for ID: \${id}! Saved to: \${outputFile}\`);
          resolve({ status: 'success', url: outputUrl });
        });
      } catch (error) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        console.error(\`[Upscale Task Exception] ID: \${id} | Error:\`, error.message);
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

  console.log(\`[Upscale Queue] Queued ID: \${id}. Queue length: \${upscaleQueue.length}\`);
  processUpscaleQueue();
});
`;

// Insert it before // ── TikTok TTS Proxy ──
const insertIndex = code.indexOf('// ── TikTok TTS Proxy ───────────────────────────────────────────────────────────');
if (insertIndex !== -1) {
    code = code.substring(0, insertIndex) + upscalerBlock + '\n\n' + code.substring(insertIndex);
    fs.writeFileSync(serverFile, code);
    console.log('Upscaler endpoint restored successfully.');
} else {
    console.error('Marker for insertion not found!');
}
