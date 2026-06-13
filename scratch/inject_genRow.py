import os

app_js = r"c:\laragon8\www\fallingpickaxeticktockmoney\js\app.js"
with open(app_js, 'r', encoding='utf-8') as f:
    code = f.read()

# Modify genRow
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

if '// Propagate bottom halves' not in code:
    code = code.replace(genRow_old, genRow_new)

# Modify drawing in Pass 2
draw_old = """            // Pass 2: Front faces + shimmer + cracks
            for (var r = rEnd; r >= rStart; r--) {
                for (var c = 0; c < COLS; c++) {
                    var cell = getCell(r, c);
                    if (!cell || cell.t === E) continue;

                    var x = c * TILE;
                    var y = r * TILE;
                    var tex3d = B3D_TEX[cell.t];
                    var tex = BTEX[cell.t];"""

draw_new = """            // Pass 2: Front faces + shimmer + cracks
            for (var r = rEnd; r >= rStart; r--) {
                for (var c = 0; c < COLS; c++) {
                    var cell = getCell(r, c);
                    if (!cell || cell.t === E) continue;

                    var x = c * TILE;
                    var y = r * TILE;
                    
                    if (cell.t === AVATAR_BLOCK || cell.t === ROULETTE_BLOCK) {
                        if (cell.rowOffset !== 0 || cell.colOffset !== 0) continue;
                        var size = TILE * 2;
                        var d = Math.floor(size * 0.3);
                        var isRoul = (cell.t === ROULETTE_BLOCK);
                        var avatarImg = isRoul ? null : avatarCache[cell.avatarUrl];
                        
                        ctx.fillStyle = isRoul ? '#aa22aa' : '#442288';
                        ctx.fillRect(x, y, size, size);

                        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0 && !isRoul) {
                            // Draw avatar on front face
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

                        // Premium frame
                        ctx.save();
                        ctx.strokeStyle = isRoul ? '#00f2ea' : '#ffe066';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
                        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

                        // Glare
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
                    var tex = BTEX[cell.t];"""

if 'if (cell.t === AVATAR_BLOCK || cell.t === ROULETTE_BLOCK)' not in code:
    code = code.replace(draw_old, draw_new)

with open(app_js, 'w', encoding='utf-8') as f:
    f.write(code)
print("genRow and draw updated.")
