/**
 * Face Animation Module (Simplified)
 * Converts static HD avatar images to animated videos using Replicate Live Portrait API.
 * Uses consistent MD5 hash for filenames (shared with upscale system).
 * Includes sequential queue + retry to respect Replicate rate limits.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Replicate SDK (optional dependency) ──────────────────────────────────────
let Replicate = null;
try {
  Replicate = require('replicate');
} catch (e) {
  console.warn('[Face Animation] Replicate module not installed. Face animation disabled.');
}

// Singleton Replicate client
let replicateClient = null;
function getReplicate() {
  if (!Replicate || !process.env.REPLICATE_API_TOKEN) return null;
  if (!replicateClient) {
    replicateClient = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  return replicateClient;
}

// Model configuration
const LIVE_PORTRAIT_MODEL = 'fofr/live-portrait:067dd98cc3e5cb396c4a9efb4bba3eec6c4a9d271211325c477518fc6485e146';
const DRIVING_VIDEO_URL = 'https://replicate.delivery/pbxt/LEQxLFMUNZMiKt5PWjyMJIbTdvKAb5j3f0spuiEwb9TEbo8B/d0.mp4';

// ── Sequential Queue (1 request at a time to respect rate limits) ─────────────
const animationQueue = [];     // Array of { resolve, reject, imageUrl, sanitizedId, urlHash }
let queueProcessing = false;
const MIN_INTERVAL_MS = 12000; // 12s between requests (safe for 6/min rate limit)
let lastRequestTime = 0;

// Map<cacheKey, Promise<string|null>> — deduplicates concurrent requests
const pendingAnimations = new Map();
// Set of failed cache keys (avoid retrying known failures that aren't rate limits)
const failedAnimations = new Set();

// ── Pending Animation Approval Registry ──────────────────────────────────────
const animationApprovalQueue = new Map(); // Map<cacheKey, { sanitizedId, urlHash, imageUrl, requestedAt }>

// ── Download helper (handles redirects) ──────────────────────────────────────
function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 60000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (!loc) return reject(new Error('Redirect without location'));
        const abs = loc.startsWith('http') ? loc : new URL(loc, url).href;
        return downloadFile(abs, targetPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(targetPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(targetPath); });
      file.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
    req.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Process queue one at a time ──────────────────────────────────────────────
async function processQueue() {
  if (queueProcessing || animationQueue.length === 0) return;
  queueProcessing = true;

  while (animationQueue.length > 0) {
    const job = animationQueue.shift();

    // Wait for rate limit interval
    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      const waitMs = MIN_INTERVAL_MS - elapsed;
      console.log(`[Face Animation] Rate limit: waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }

    try {
      const result = await executeAnimation(job.imageUrl, job.sanitizedId, job.urlHash);
      job.resolve(result);
    } catch (err) {
      // On 429, re-queue with longer delay
      if (err.message && err.message.includes('429')) {
        const retryMatch = err.message.match(/retry_after.*?(\d+)/);
        const retryAfter = retryMatch ? parseInt(retryMatch[1]) * 1000 + 2000 : 15000;
        console.log(`[Face Animation] 429 rate limit, retrying in ${Math.ceil(retryAfter / 1000)}s...`);
        lastRequestTime = Date.now() + retryAfter - MIN_INTERVAL_MS;
        animationQueue.unshift(job); // Put back at front
        await sleep(retryAfter);
      } else {
        job.resolve(null); // Non-retryable error
      }
    }
  }

  queueProcessing = false;
}

// ── Execute a single animation request ───────────────────────────────────────
async function executeAnimation(imageUrl, sanitizedId, urlHash) {
  const replicate = getReplicate();
  if (!replicate) return null;

  const videosDir = path.join(__dirname, 'avatares_video');
  const videoFile = path.join(videosDir, `${sanitizedId}_${urlHash}.mp4`);
  const videoUrl = `avatares_video/${sanitizedId}_${urlHash}.mp4`;

  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  // Build full URL for the image if it's a local path
  let faceImageUrl = imageUrl;
  if (!imageUrl.startsWith('http')) {
    const imgPath = path.join(__dirname, imageUrl);
    if (fs.existsSync(imgPath)) {
      const imgData = fs.readFileSync(imgPath);
      faceImageUrl = `data:image/png;base64,${imgData.toString('base64')}`;
    } else {
      console.error(`[Face Animation] Local image not found: ${imgPath}`);
      return null;
    }
  }

  console.log(`[Face Animation] Calling Replicate for ${sanitizedId} (hash: ${urlHash})...`);
  lastRequestTime = Date.now();

  const output = await replicate.run(LIVE_PORTRAIT_MODEL, {
    input: {
      face_image: faceImageUrl,
      driving_video: DRIVING_VIDEO_URL
    }
  });

  if (!output || output.length === 0) {
    throw new Error('No output from Replicate');
  }

  const outputUrl = typeof output === 'string' ? output : output[0];
  console.log(`[Face Animation] Replicate output: ${outputUrl}`);

  await downloadFile(outputUrl, videoFile);

  if (fs.existsSync(videoFile) && fs.statSync(videoFile).size > 1000) {
    console.log(`[Face Animation] ✅ Saved: ${videoUrl} (${Math.round(fs.statSync(videoFile).size / 1024)} KB)`);
    return videoUrl;
  }

  throw new Error('Video file invalid or empty');
}

/**
 * Animate a face image using Replicate Live Portrait API.
 * @param {string} imageUrl  - URL or local path to the HD image
 * @param {string} sanitizedId - Sanitized user ID (alphanumeric + underscore)
 * @param {string} urlHash   - MD5 hash of the original avatar URL (same as upscale system)
 * @returns {Promise<string|null>} Relative video URL or null
 */
async function animateFace(imageUrl, sanitizedId, urlHash) {
  if (!getReplicate()) return null;

  const cacheKey = `${sanitizedId}:${urlHash}`;

  // Check if previously failed with non-retryable error
  if (failedAnimations.has(cacheKey)) return null;

  // Check if video already exists on disk
  const videoFile = path.join(__dirname, 'avatares_video', `${sanitizedId}_${urlHash}.mp4`);
  const videoUrl = `avatares_video/${sanitizedId}_${urlHash}.mp4`;

  if (fs.existsSync(videoFile) && fs.statSync(videoFile).size > 1000) {
    console.log(`[Face Animation] Disk cache hit: ${videoUrl}`);
    return videoUrl;
  }

  // Deduplicate: if same request is already in-flight, await that promise
  if (pendingAnimations.has(cacheKey)) {
    console.log(`[Face Animation] Awaiting in-flight request for ${sanitizedId}`);
    return pendingAnimations.get(cacheKey);
  }

  // Enqueue the animation job
  const promise = new Promise((resolve, reject) => {
    animationQueue.push({ resolve, reject, imageUrl, sanitizedId, urlHash, queuedAt: Date.now() });
    console.log(`[Face Animation] Queued: ${sanitizedId}_${urlHash} (queue size: ${animationQueue.length})`);
  });

  pendingAnimations.set(cacheKey, promise);

  // Start processing (no-op if already running)
  processQueue();

  try {
    const result = await promise;
    if (!result) failedAnimations.add(cacheKey);
    return result;
  } finally {
    pendingAnimations.delete(cacheKey);
  }
}

/**
 * Express route handler for /api/animate-face
 */
function animateFaceRoute(req, res) {
  const imageUrl = req.query.url;
  const id = req.query.id;
  const urlHash = req.query.hash;

  if (!imageUrl || !id) {
    return res.json({ error: 'URL and ID are required' });
  }

  const crypto = require('crypto');
  const hash = urlHash || crypto.createHash('md5').update(imageUrl.split('?')[0]).digest('hex').substring(0, 8);
  const sanitizedId = id.replace(/[^a-zA-Z0-9_]/g, '');

  animateFace(imageUrl, sanitizedId, hash)
    .then(videoUrl => {
      if (videoUrl) {
        res.json({ status: 'success', videoUrl });
      } else {
        res.json({ status: 'skipped', message: 'Face animation not available' });
      }
    })
    .catch(error => {
      console.error('[Face Animation Route] Error:', error);
      res.json({ status: 'error', message: error.message });
    });
}

// ── Pending Animation Approval Registry ──────────────────────────────────────
function registerPendingAnimation(sanitizedId, urlHash, imageUrl) {
  const cacheKey = `${sanitizedId}:${urlHash}`;
  if (animationApprovalQueue.has(cacheKey)) return;
  animationApprovalQueue.set(cacheKey, {
    sanitizedId,
    urlHash,
    imageUrl,
    requestedAt: Date.now()
  });
}

function getPendingAnimationApproval(cacheKey) {
  return animationApprovalQueue.get(cacheKey) || null;
}

function removePendingAnimationApproval(cacheKey) {
  return animationApprovalQueue.delete(cacheKey);
}

function getAllPendingAnimationApprovals() {
  return Array.from(animationApprovalQueue.values());
}

// ── Queue State Helpers (exposed for API) ─────────────────────────────────────
function getQueueSnapshot() {
  const hdDir = path.join(__dirname, 'avatares_hd');
  const videoDir = path.join(__dirname, 'avatares_video');
  const items = [];

  for (const job of animationQueue) {
    const imgPath = path.join(hdDir, `${job.sanitizedId}_${job.urlHash}.png`);
    const videoPath = path.join(videoDir, `${job.sanitizedId}_${job.urlHash}.mp4`);
    items.push({
      sanitizedId: job.sanitizedId,
      urlHash: job.urlHash,
      imageUrl: job.imageUrl,
      status: 'pending',
      hasImage: fs.existsSync(imgPath),
      hasVideo: fs.existsSync(videoPath) && fs.statSync(videoPath).size > 1000,
      queuedAt: job.queuedAt || Date.now()
    });
  }

  for (const [key, promise] of pendingAnimations) {
    const parts = key.split(':');
    const sanitizedId = parts[0] || '';
    const urlHash = parts[1] || '';
    const imgPath = path.join(hdDir, `${sanitizedId}_${urlHash}.png`);
    const videoPath = path.join(videoDir, `${sanitizedId}_${urlHash}.mp4`);
    const existsInQueue = animationQueue.some(j => j.sanitizedId === sanitizedId && j.urlHash === urlHash);
    if (existsInQueue) continue;

    items.push({
      sanitizedId,
      urlHash,
      imageUrl: '',
      status: 'processing',
      hasImage: fs.existsSync(imgPath),
      hasVideo: fs.existsSync(videoPath) && fs.statSync(videoPath).size > 1000,
      queuedAt: Date.now() - 60000
    });
  }

  for (const key of failedAnimations) {
    const parts = key.split(':');
    const sanitizedId = parts[0] || '';
    const urlHash = parts[1] || '';
    const imgPath = path.join(hdDir, `${sanitizedId}_${urlHash}.png`);
    const videoPath = path.join(videoDir, `${sanitizedId}_${urlHash}.mp4`);
    const existsInQueue = animationQueue.some(j => j.sanitizedId === sanitizedId && j.urlHash === urlHash);
    const existsInPending = pendingAnimations.has(key);
    if (existsInQueue || existsInPending) continue;

    items.push({
      sanitizedId,
      urlHash,
      imageUrl: '',
      status: 'failed',
      hasImage: fs.existsSync(imgPath),
      hasVideo: fs.existsSync(videoPath) && fs.statSync(videoPath).size > 1000,
      queuedAt: Date.now() - 300000
    });
  }

  const approvals = getAllPendingAnimationApprovals().map(approval => {
    const imgPath = path.join(hdDir, `${approval.sanitizedId}_${approval.urlHash}.png`);
    const videoPath = path.join(videoDir, `${approval.sanitizedId}_${approval.urlHash}.mp4`);
    return {
      sanitizedId: approval.sanitizedId,
      urlHash: approval.urlHash,
      imageUrl: approval.imageUrl,
      status: 'awaiting_approval',
      hasImage: fs.existsSync(imgPath),
      hasVideo: fs.existsSync(videoPath) && fs.statSync(videoPath).size > 1000,
      queuedAt: approval.requestedAt
    };
  });

  return {
    queueLength: animationQueue.length,
    processing: queueProcessing,
    pendingApprovals: approvals.length,
    items: [...items, ...approvals]
  };
}

function approveAnimationJob(sanitizedId, urlHash) {
  const cacheKey = `${sanitizedId}:${urlHash}`;
  const approval = animationApprovalQueue.get(cacheKey);
  if (!approval) return false;

  removePendingAnimationApproval(cacheKey);

  const imageUrl = approval.imageUrl;
  const promise = new Promise((resolve, reject) => {
    animationQueue.push({
      resolve,
      reject,
      imageUrl,
      sanitizedId,
      urlHash,
      queuedAt: Date.now()
    });
  });
  pendingAnimations.set(cacheKey, promise);

  processQueue();
  return true;
}

function removeJobFromQueue(sanitizedId, urlHash) {
  const idx = animationQueue.findIndex(j => j.sanitizedId === sanitizedId && j.urlHash === urlHash);
  if (idx !== -1) {
    const job = animationQueue[idx];
    if (job.reject) {
      job.resolve(null);
      job.reject = null;
      job.resolve = null;
    }
    animationQueue.splice(idx, 1);
  }
  const cacheKey = `${sanitizedId}:${urlHash}`;
  removePendingAnimationApproval(cacheKey);
  pendingAnimations.delete(cacheKey);
  return true;
}

function rejectAnimationJob(sanitizedId, urlHash) {
  const cacheKey = `${sanitizedId}:${urlHash}`;
  removePendingAnimationApproval(cacheKey);
  pendingAnimations.delete(cacheKey);
  const idx = animationQueue.findIndex(j => j.sanitizedId === sanitizedId && j.urlHash === urlHash);
  if (idx !== -1) {
    const job = animationQueue[idx];
    if (job.reject) {
      job.resolve(null);
      job.reject = null;
      job.resolve = null;
    }
    animationQueue.splice(idx, 1);
  }
  processQueue();
  return true;
}

module.exports = {
  animateFace,
  animateFaceRoute,
  downloadFile,
  LIVE_PORTRAIT_MODEL,
  DRIVING_VIDEO_URL,
  getQueueSnapshot,
  registerPendingAnimation,
  getPendingAnimationApproval,
  getAllPendingAnimationApprovals,
  approveAnimationJob,
  rejectAnimationJob,
  removeJobFromQueue,
  processQueue
};
