import os

app_js = r"c:\laragon8\www\fallingpickaxeticktockmoney\js\app.js"
with open(app_js, 'r', encoding='utf-8') as f:
    code = f.read()

anim_code = """
        var avatarAnimCache = {}; // { [avatarUrl]: { status:'pending'|'done'|'error', videoEl } }
        function requestAvatarAnimation(url, userId) {
            if (!url || !userId) return;
            if (avatarAnimCache[url]) return; // Already requested or done

            avatarAnimCache[url] = { status: 'pending', videoEl: null };
            console.log(`[Animate] Requesting animation for ${userId}`);

            fetch(`/api/animate-face?url=${encodeURIComponent(url)}&id=${encodeURIComponent(userId)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && (data.status === 'success' || data.status === 'cached') && data.url) {
                        var v = document.createElement('video');
                        v.muted = true;
                        v.loop = true;
                        v.autoplay = true;
                        v.playsInline = true;
                        v.crossOrigin = 'anonymous';
                        v.oncanplay = function() {
                            v.play().catch(e => console.warn('[Video] Play error:', e));
                            avatarAnimCache[url].status = 'done';
                            avatarAnimCache[url].videoEl = v;
                            console.log(`[Animate] Video ready for ${userId}`);
                        };
                        v.onerror = function() {
                            avatarAnimCache[url].status = 'error';
                            console.error(`[Animate] Video load error for ${userId}`);
                        };
                        v.src = data.url;
                    } else {
                        avatarAnimCache[url].status = 'error';
                        console.error(`[Animate] API error for ${userId}:`, data.error);
                    }
                })
                .catch(err => {
                    avatarAnimCache[url].status = 'error';
                    console.error(`[Animate] Fetch error for ${userId}:`, err);
                });
        }
"""

if 'var avatarAnimCache = {};' not in code:
    code = code.replace(
        "var avatarCache = {};",
        "var avatarCache = {};\n" + anim_code
    )

draw_old = "if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0 && !isRoul) {"
draw_new = """
                        var animInfo = avatarAnimCache[cell.avatarUrl];
                        if (animInfo && animInfo.status === 'done' && animInfo.videoEl && animInfo.videoEl.readyState >= 2 && !isRoul) {
                            ctx.drawImage(animInfo.videoEl, x, y, size, size);
                        } else if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0 && !isRoul) {"""

if 'avatarAnimCache[cell.avatarUrl]' not in code:
    code = code.replace(draw_old, draw_new)

genRow_old = """
                    for (var dc = 0; dc < 2; dc++) {
                        row[c + dc] = {
                            t: blockType,
                            hp: BDEF[AVATAR_BLOCK].hp,
                            cr: 0,
                            rowOffset: 0,
                            colOffset: dc,
                            blockSize: 2,
                            avatarUrl: randomUrl,
                            anchor: anchorObj
                        };
                    }"""

genRow_new = """
                    // Extract ID and request animation if it's an avatar
                    if (blockType === AVATAR_BLOCK && randomUrl) {
                        var parts = randomUrl.split('/');
                        var fileName = parts[parts.length - 1]; // e.g., "username_hash.png"
                        var userId = fileName.split('_')[0]; // "username"
                        if (userId && userId.length > 0) {
                            requestAvatarAnimation(randomUrl, userId);
                        }
                    }

                    for (var dc = 0; dc < 2; dc++) {
                        row[c + dc] = {
                            t: blockType,
                            hp: BDEF[AVATAR_BLOCK].hp,
                            cr: 0,
                            rowOffset: 0,
                            colOffset: dc,
                            blockSize: 2,
                            avatarUrl: randomUrl,
                            anchor: anchorObj
                        };
                    }"""
if 'requestAvatarAnimation(randomUrl, userId);' not in code:
    code = code.replace(genRow_old, genRow_new)

with open(app_js, 'w', encoding='utf-8') as f:
    f.write(code)
print("app.js animate logic injected.")
