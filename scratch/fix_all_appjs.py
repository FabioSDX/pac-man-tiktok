import os

app_js_bak = r"c:\laragon8\www\fallingpickaxeticktockmoney\js\app.js.recover_bak"
app_js = r"c:\laragon8\www\fallingpickaxeticktockmoney\js\app.js"
with open(app_js_bak, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add AVATAR_BLOCK and ROULETTE_BLOCK
if 'AVATAR_BLOCK = 20' not in code:
    code = code.replace(
        "OBSIDIAN = 18, BONUS_BOX = 19;",
        "OBSIDIAN = 18, BONUS_BOX = 19, AVATAR_BLOCK = 20, ROULETTE_BLOCK = 21;",
        1
    )

if '20: { color:' not in code:
    code = code.replace(
        "19: { color: '#ffdd44', glow: '#ffff88', hp: 4, pts: 5, name: 'Bonus Box', img: 'block/obsidian.png' }",
        "19: { color: '#ffdd44', glow: '#ffff88', hp: 4, pts: 5, name: 'Bonus Box', img: 'block/obsidian.png' },\n            20: { color: '#442288', glow: '#fff', hp: 4, pts: 50, name: 'Avatar HD', img: 'block/obsidian.png' },\n            21: { color: '#aa22aa', glow: '#00f2ea', hp: 4, pts: 10, name: 'Roulette', img: 'block/obsidian.png' }",
        1
    )

# 2. Add _rouletteActive
if '_rouletteActive = false' not in code:
    code = code.replace(
        "var _avatarLoading = {};",
        "var _avatarLoading = {};\n        var _rouletteActive = false;\n        var _lightningPass = [];",
        1
    )

# 3. Add spawnSpecialRoulette, etc.
func_code = """
        function triggerRouletteMassDestruction(sourcePick, targetBlockType, prizeColor) {
            var targets = [];
            for (var r in worldMap) {
                var row = worldMap[r];
                for (var c = 0; c < COLS; c++) {
                    if (row[c] && row[c].t === targetBlockType) {
                        targets.push({ r: parseInt(r), c: c });
                    }
                }
            }
            if (targets.length === 0) return;

            var sortedTargets = targets.sort(function(a,b) {
                if(a.r !== b.r) return b.r - a.r;
                return Math.abs(a.c - COLS/2) - Math.abs(b.c - COLS/2);
            });

            var idx = 0;
            function destroyNext() {
                if (idx >= sortedTargets.length) return;
                var batchSize = Math.min(3, sortedTargets.length - idx);
                for(var i=0; i<batchSize; i++) {
                    var tg = sortedTargets[idx++];
                    var cell = getCell(tg.r, tg.c);
                    if (cell && cell.t === targetBlockType) {
                        cell.t = E;
                        cell.hp = 0;
                        cell.cr = 0;
                        var tx = tg.c * TILE + TILE / 2;
                        var ty = tg.r * TILE + TILE / 2;
                        spawnParts(tx, ty, prizeColor, 5);
                        spawnDebris(tx, ty, targetBlockType, sourcePick);

                        var px = sourcePick ? sourcePick.x : tx;
                        var py = sourcePick ? sourcePick.y : (camY - 100);
                        _lightningPass.push({
                            x1: px, y1: py,
                            x2: tx, y2: ty,
                            color: prizeColor,
                            life: 15
                        });

                        sfxBreak(targetBlockType);
                        var pts = BDEF[targetBlockType].pts || 1;
                        if (sourcePick && sourcePick.active) score += pts;
                        spawnText(tx, ty, '+' + pts, prizeColor);
                        if (sourcePick && sourcePick.userName) {
                            var p = userPicks.find(function(u){return u.userName === sourcePick.userName;});
                            if (p) p.score = (p.score || 0) + pts;
                            if (persistentScores[sourcePick.userName]) persistentScores[sourcePick.userName].score += pts;
                            addCycleScore(sourcePick.userName, pts, 'block');
                        }
                        checkFallingBlocks(tg.c, tg.r + 1, sourcePick);
                    }
                }
                if (idx < sortedTargets.length) {
                    setTimeout(destroyNext, 80);
                }
            }
            destroyNext();
        }

        function spawnSpecialRoulette(sourcePick) {
            if (_rouletteActive) return;
            _rouletteActive = true;

            var container = document.getElementById('rouletteContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'rouletteContainer';
                container.style.cssText = 'position: absolute; top: 80px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 10000; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 100%;';
                (document.getElementById('gameWrapper') || document.body).appendChild(container);
            }

            var wheelDiv = document.createElement('div');
            wheelDiv.style.cssText = 'width: 143px; height: 143px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; background: rgba(0, 0, 0, 0.4); border-radius: 50%;';

            var wCanvas = document.createElement('canvas');
            wCanvas.width = 117;
            wCanvas.height = 117;
            wCanvas.style.background = 'transparent';
            wCanvas.style.borderRadius = '50%';
            wheelDiv.appendChild(wCanvas);

            var pointer = document.createElement('div');
            pointer.style.cssText = 'width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 12px solid #ffd700; position: absolute; top: 5px; left: 50%; transform: translateX(-50%); z-index: 10; filter: drop-shadow(0 0 5px #ffd700);';
            wheelDiv.appendChild(pointer);

            container.appendChild(wheelDiv);

            var wCtx = wCanvas.getContext('2d');
            var prizes = [
                { blockType: DIAMOND, color: 'rgba(0, 242, 234, 0.6)' },
                { blockType: GOLD,    color: 'rgba(255, 200, 0, 0.6)' },
                { blockType: EMERALD, color: 'rgba(50, 205, 50, 0.6)' },
                { blockType: COPPER,  color: 'rgba(200, 100, 40, 0.6)' },
                { blockType: LAPIS,   color: 'rgba(0, 102, 255, 0.6)' },
                { blockType: COAL,    color: 'rgba(80, 80, 80, 0.6)'  }
            ];

            var angle = 0;
            var speed = 0.2 + Math.random() * 0.2;
            var deceleration = 0.002;
            var spinning = true;

            function drawWheel() {
                wCtx.clearRect(0, 0, 117, 117);
                var arc = Math.PI * 2 / prizes.length;

                wCtx.save();
                wCtx.translate(58.5, 58.5);
                wCtx.rotate(angle);
                wCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                wCtx.lineWidth = 1;

                for (var i = 0; i < prizes.length; i++) {
                    wCtx.beginPath();
                    wCtx.fillStyle = prizes[i].color;
                    wCtx.moveTo(0, 0);
                    wCtx.arc(0, 0, 56, i * arc, (i + 1) * arc);
                    wCtx.fill();
                    wCtx.stroke();

                    wCtx.save();
                    wCtx.rotate(i * arc + arc / 2);
                    var itemImg = ITEX[prizes[i].blockType];
                    if (itemImg && itemImg.complete && itemImg.naturalWidth > 0) {
                        wCtx.drawImage(itemImg, 26, -13, 26, 26);
                    }
                    wCtx.restore();
                }
                wCtx.restore();

                wCtx.beginPath();
                wCtx.arc(58.5, 58.5, 56, 0, Math.PI * 2);
                wCtx.lineWidth = 2;
                wCtx.strokeStyle = '#fff';
                wCtx.stroke();

                wCtx.beginPath();
                wCtx.arc(58.5, 58.5, 21, 0, Math.PI * 2);
                wCtx.fillStyle = 'rgba(0,0,0,0.7)';
                wCtx.fill();
                wCtx.lineWidth = 2;
                wCtx.strokeStyle = '#ffd700';
                wCtx.stroke();

                wCtx.fillStyle = '#ffd700';
                wCtx.font = 'bold 18px Arial';
                wCtx.textAlign = 'center';
                wCtx.textBaseline = 'middle';
                wCtx.fillText('⚡', 58.5, 58.5);
            }

            var lastPrizeIndex = -1;

            function animate() {
                if (!spinning) return;
                angle += speed;
                speed -= deceleration;

                var normalizedAngle = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                var localAngle = (Math.PI * 1.5 - normalizedAngle);
                if (localAngle < 0) localAngle += Math.PI * 2;
                var arc = Math.PI * 2 / prizes.length;
                var prizeIndex = Math.floor(localAngle / arc);

                if (prizeIndex !== lastPrizeIndex) {
                    if (typeof sfxRouletteTick === 'function') sfxRouletteTick();
                    lastPrizeIndex = prizeIndex;
                }

                if (speed <= 0) {
                    spinning = false;
                    speed = 0;
                    var prize = prizes[prizeIndex];

                    setTimeout(function () {
                        triggerRouletteMassDestruction(sourcePick, prize.blockType, prize.color);
                        wheelDiv.style.borderColor = '#00ff00';
                        setTimeout(function () {
                            wheelDiv.remove();
                            if (container.children.length === 0) container.remove();
                            _rouletteActive = false;
                        }, 2000);
                    }, 500);
                }

                drawWheel();
                if (spinning) requestAnimationFrame(animate);
            }
            animate();
        }
"""
if 'function spawnSpecialRoulette' not in code:
    code = code.replace(
        "function getAC() {",
        func_code + "\n\n        function getAC() {",
        1
    )

# 4. hitBlock
hitBlock_inject = """if (cell.t === ROULETTE_BLOCK) {
                    var ar = row; var ac = col;
                    for (var dr = 0; dr <= 1; dr++) {
                        for (var dc = 0; dc <= 1; dc++) {
                            var neighbor = getCell(ar + dr, ac + dc);
                            if (neighbor && neighbor.t === ROULETTE_BLOCK) {
                                neighbor.t = E; neighbor.hp = 0; neighbor.cr = 0;
                                spawnParts((ac + dc) * TILE + TILE / 2, (ar + dr) * TILE + TILE / 2, '#00f2ea', 4);
                            }
                        }
                    }
                    sfxBreak(BONUS_BOX);
                    spawnSpecialRoulette(pick);
                    checkFallingBlocks(ac, ar + 2, source);
                    checkFallingBlocks(ac + 1, ar + 2, source);
                    return;
                }
                if (cell.t === AVATAR_BLOCK) {
                    var ar = row; var ac = col;
                    for (var dr = 0; dr <= 1; dr++) {
                        for (var dc = 0; dc <= 1; dc++) {
                            var neighbor = getCell(ar + dr, ac + dc);
                            if (neighbor && neighbor.t === AVATAR_BLOCK) {
                                neighbor.t = E; neighbor.hp = 0; neighbor.cr = 0;
                                spawnParts((ac + dc) * TILE + TILE / 2, (ar + dr) * TILE + TILE / 2, '#fff', 4);
                                spawnDebris((ac + dc) * TILE + TILE / 2, (ar + dr) * TILE + TILE / 2, AVATAR_BLOCK, source);
                            }
                        }
                    }
                    sfxBreak(AVATAR_BLOCK);
                    var pts = 50;
                    if (pick && pick.active) score += pts;
                    spawnText(ac * TILE + TILE, ar * TILE + TILE, '+' + pts, '#fff');
                    if (source && source.userName) {
                        var player = userPicks.find(function (u) { return u.userName === source.userName; });
                        if (player) player.score = (player.score || 0) + pts;
                        if (!persistentScores[source.userName]) persistentScores[source.userName] = { score: 0, avatar: source.userAvatarUrl || '' };
                        persistentScores[source.userName].score += pts;
                        addCycleScore(source.userName, pts, 'block');
                    }
                    checkFallingBlocks(ac, ar + 2, source);
                    checkFallingBlocks(ac + 1, ar + 2, source);
                    return;
                }
                if (cell.t === BONUS_BOX) {"""

code = code.replace(
    "if (cell.t === E || cell.t === BEDROCK) return;",
    "if (cell.t === E || cell.t === BEDROCK) return;\n                    if ((cell.t === AVATAR_BLOCK || cell.t === ROULETTE_BLOCK) && cell.anchor) {\n                        col = cell.anchor.c;\n                        row = cell.anchor.r;\n                        cell = getCell(row, col);\n                        if (!cell) return;\n                    }",
    1
)

idx = code.find("if (cell.t === BONUS_BOX) {")
if idx != -1:
    code = code[:idx] + hitBlock_inject + code[idx + len("if (cell.t === BONUS_BOX) {"):]


# 5. draw thor lightning
draw_thor = """
            // Thor Lightning Pass
            ctx.save();
            ctx.lineCap = 'round';
            for (var i = _lightningPass.length - 1; i >= 0; i--) {
                var l = _lightningPass[i];
                l.life--;
                if (l.life <= 0) {
                    _lightningPass.splice(i, 1);
                    continue;
                }
                var p = l.life / 15; // 1 to 0
                ctx.beginPath();
                ctx.moveTo(l.x1, l.y1 - camY);
                ctx.lineTo(l.x2, l.y2 - camY);
                ctx.strokeStyle = l.color;
                ctx.lineWidth = 6 * p;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(l.x1, l.y1 - camY);
                ctx.lineTo(l.x2, l.y2 - camY);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 * p;
                ctx.stroke();
            }
            ctx.restore();
"""
code = code.replace(
    "ctx.restore();\n        }\n\n        function spawnRoulette(userName) {",
    "ctx.restore();\n" + draw_thor + "\n        }\n\n        function spawnRoulette(userName) {",
    1
)


# 6. genRow with availableAvatars 
genRow_old = """        function genRow(r) {
            var row = [];
            var depth = r;
            var zone = Math.floor(r / CLEARING_INTERVAL);
            var zoneStart = zone * CLEARING_INTERVAL;
            var isNearClearing = (r >= zoneStart - 1 && r <= zoneStart + CLEARING_HEIGHT);

            for (var c = 0; c < COLS; c++) {
                var t;
                if (depth < 2) { t = E; }
                else if (isMegaClearingCell(r, c)) { t = E; }
                else if (isClearingCell(r, c)) { t = E; }
                else if (isMiniClearingCell(r, c)) { t = E; }
                else { t = pickBlock(depth); }
                row[c] = { t: t, hp: (t === E ? 0 : BDEF[t].hp), cr: 0 };
            }"""

genRow_new = """        var availableAvatars = [];
        async function updateAvailableAvatars() {
            try {
                var response = await fetch('/avatar-list');
                var data = await response.json();
                if (data && data.files) {
                    availableAvatars = data.files;
                    availableAvatars.forEach(function(url) {
                        if (!avatarCache[url] && !_avatarLoading[url]) {
                            var img = new Image();
                            _avatarLoading[url] = true;
                            img.onload = function() {
                                avatarCache[url] = img;
                                _avatarLoading[url] = false;
                            };
                            img.onerror = function() {
                                _avatarLoading[url] = false;
                            };
                            img.src = url;
                        }
                    });
                }
            } catch (e) {
                console.error('[Client] Error fetching avatar list:', e);
            }
        }
        updateAvailableAvatars();
        setInterval(updateAvailableAvatars, 15000);

        function genRow(r) {
            var row = [];
            var depth = r;
            var zone = Math.floor(r / CLEARING_INTERVAL);
            var zoneStart = zone * CLEARING_INTERVAL;
            var isNearClearing = (r >= zoneStart - 1 && r <= zoneStart + CLEARING_HEIGHT);

            // Propagate bottom halves of 2x2 blocks from the row above
            if (r > 0 && worldMap[r - 1]) {
                for (var c = 0; c < COLS; c++) {
                    var prevCell = worldMap[r - 1][c];
                    if (prevCell && (prevCell.t === AVATAR_BLOCK || prevCell.t === ROULETTE_BLOCK) && prevCell.rowOffset === 0) {
                        row[c] = {
                            t: prevCell.t,
                            hp: prevCell.hp,
                            cr: 0,
                            rowOffset: 1,
                            colOffset: prevCell.colOffset,
                            blockSize: 2,
                            avatarUrl: prevCell.avatarUrl,
                            anchor: { r: r - 1, c: prevCell.colOffset === 0 ? c : c - 1 }
                        };
                    }
                }
            }

            for (var c = 0; c < COLS; c++) {
                if (row[c] && (row[c].t === AVATAR_BLOCK || row[c].t === ROULETTE_BLOCK)) continue;
                var t;
                if (depth < 2) { t = E; }
                else if (isMegaClearingCell(r, c)) { t = E; }
                else if (isClearingCell(r, c)) { t = E; }
                else if (isMiniClearingCell(r, c)) { t = E; }
                else { t = pickBlock(depth); }
                row[c] = { t: t, hp: (t === E ? 0 : BDEF[t].hp), cr: 0 };
            }

            // Spawn new 2x2 blocks
            for (var c = 0; c < COLS - 1; c++) {
                var canSpawn2x2 = true;
                for (var dr = 0; dr < 2; dr++) {
                    for (var dc = 0; dc < 2; dc++) {
                        var nr = r + dr;
                        var nc = c + dc;
                        var isClearing = (nr < 2) || isMegaClearingCell(nr, nc) || isClearingCell(nr, nc) || isMiniClearingCell(nr, nc);
                        if (isClearing) { canSpawn2x2 = false; break; }
                        if (dr === 0) {
                            var cell = row[nc];
                            if (!cell || cell.t === E || cell.t === BEDROCK || cell.t === BONUS_BOX || cell.t === AVATAR_BLOCK || cell.t === ROULETTE_BLOCK) {
                                canSpawn2x2 = false; break;
                            }
                        }
                    }
                    if (!canSpawn2x2) break;
                }
                if (canSpawn2x2 && Math.random() < 0.05) { // 5% chance
                    var isRoulette = Math.random() < 0.3; // 30% chance of roulette vs avatar
                    var blockType = isRoulette ? ROULETTE_BLOCK : AVATAR_BLOCK;
                    var randomUrl = availableAvatars ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)] : '';
                    var anchorObj = { r: r, c: c };
                    
                    if (blockType === AVATAR_BLOCK && randomUrl) {
                        var parts = randomUrl.split('/');
                        var fileName = parts[parts.length - 1]; // e.g., "username_hash.png"
                        var userId = fileName.split('_')[0]; // "username"
                        if (userId && userId.length > 0) {
                            if (typeof requestAvatarAnimation === 'function') {
                                requestAvatarAnimation(randomUrl, userId);
                            }
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
                    }
                }
            }"""
code = code.replace(genRow_old, genRow_new, 1)


# 7. app.js animate logic and draw loop
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
code = code.replace(
    "var avatarCache = {};",
    "var avatarCache = {};\n" + anim_code,
    1
)

draw_old = """            // Pass 2: Front faces + shimmer + cracks (drawn ON TOP of 3D faces)
            for (var r = rEnd; r >= rStart; r--) {
                for (var c = 0; c < COLS; c++) {
                    var cell = getCell(r, c);
                    if (!cell || cell.t === E) continue;
                    var x = c * TILE;
                    var y = r * TILE;
                    var tex3d = B3D_TEX[cell.t];
                    var tex = BTEX[cell.t];

                    if (tex3d) {"""

draw_new = """            // Pass 2: Front faces + shimmer + cracks (drawn ON TOP of 3D faces)
            for (var r = rEnd; r >= rStart; r--) {
                for (var c = 0; c < COLS; c++) {
                    var cell = getCell(r, c);
                    if (!cell || cell.t === E) continue;
                    var x = c * TILE;
                    var y = r * TILE;

                    if (cell.t === AVATAR_BLOCK || cell.t === ROULETTE_BLOCK) {
                        if (cell.rowOffset !== 0 || cell.colOffset !== 0) continue;
                        var size = TILE * 2;
                        var isRoul = (cell.t === ROULETTE_BLOCK);
                        var avatarImg = isRoul ? null : avatarCache[cell.avatarUrl];
                        
                        ctx.fillStyle = isRoul ? '#aa22aa' : '#442288';
                        ctx.fillRect(x, y, size, size);

                        var animInfo = avatarAnimCache[cell.avatarUrl];
                        if (animInfo && animInfo.status === 'done' && animInfo.videoEl && animInfo.videoEl.readyState >= 2 && !isRoul) {
                            ctx.drawImage(animInfo.videoEl, x, y, size, size);
                        } else if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0 && !isRoul) {
                            ctx.drawImage(avatarImg, x, y, size, size);
                        } else if (isRoul) {
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '32px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('🎁', x + size / 2, y + size / 2);
                        } else {
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '24px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('HD', x + size / 2, y + size / 2);
                        }

                        ctx.save();
                        ctx.strokeStyle = isRoul ? '#00f2ea' : '#ffe066';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
                        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

                        var grad = ctx.createLinearGradient(x, y, x + size, y + size);
                        grad.addColorStop(0, 'rgba(255,255,255,0.15)');
                        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
                        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
                        ctx.fillStyle = grad;
                        ctx.fillRect(x, y, size, size);
                        ctx.restore();

                        if (cell.cr > 0.01) {
                            var stage = Math.min(9, Math.floor(cell.cr * 10));
                            var dtex = DESTROY_TEX[stage];
                            if (dtex && dtex.complete) ctx.drawImage(dtex, x, y, size, size);
                        }
                        continue;
                    }

                    var tex3d = B3D_TEX[cell.t];
                    var tex = BTEX[cell.t];

                    if (tex3d) {"""

code = code.replace(draw_old, draw_new, 1)


with open(app_js, 'w', encoding='utf-8') as f:
    f.write(code)
print("app.js completely restored and fixed.")
