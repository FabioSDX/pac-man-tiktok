// Mock script to trace the render loop execution order
const COLS = 15;
const TILE = 72;
const E = 0;
const AVATAR_BLOCK = 20;
const ROULETTE_BLOCK = 21;

const worldMap = {};
// Setup a simple world map where:
// Row 5 has the frog at column 2 (2x2)
// Row 6 has:
// column 2: bottom-left of frog
// column 3: bottom-right of frog
// column 4: diamond ore (7)
// column 5: diamond ore (7)
// column 6: diamond ore (7)

function genRow(r) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
        if (r === 5) {
            if (c === 2) {
                row[c] = { t: AVATAR_BLOCK, rowOffset: 0, colOffset: 0 };
            } else if (c === 3) {
                row[c] = { t: AVATAR_BLOCK, rowOffset: 0, colOffset: 1 };
            } else {
                row[c] = { t: 15 }; // Mossy / Gold / etc.
            }
        } else if (r === 6) {
            if (c === 2) {
                row[c] = { t: AVATAR_BLOCK, rowOffset: 1, colOffset: 0 };
            } else if (c === 3) {
                row[c] = { t: AVATAR_BLOCK, rowOffset: 1, colOffset: 1 };
            } else if (c === 4 || c === 5 || c === 6) {
                row[c] = { t: 7 }; // Diamond ore
            } else {
                row[c] = { t: 1 }; // Stone
            }
        } else {
            row[c] = { t: 1 };
        }
    }
    return row;
}

function getCell(r, c) {
    if (c < 0 || c >= COLS) return null;
    if (!worldMap[r]) worldMap[r] = genRow(r);
    return worldMap[r][c];
}

const drawCalls = [];
const ctx = {
    drawImage: (tex, x, y, w, h) => {
        drawCalls.push({ action: 'drawImage', tex, x, y, w, h });
    },
    save: () => { drawCalls.push({ action: 'save' }); },
    restore: () => { drawCalls.push({ action: 'restore' }); },
    translate: (x, y) => { drawCalls.push({ action: 'translate', x, y }); },
    transform: (a, b, c, d, e, f) => { drawCalls.push({ action: 'transform', a, b, c, d, e, f }); },
    fillRect: (x, y, w, h) => { drawCalls.push({ action: 'fillRect', x, y, w, h }); },
    fillStyle: (color) => {}
};

function draw2x2Block(bCell, bx, by) {
    const size = TILE * 2;
    const d = Math.floor(TILE * 0.3);
    
    // Front face
    ctx.drawImage('AVATAR_FRONT', bx, by, size, size);
    
    // Right face
    ctx.save();
    ctx.translate(bx, by - d);
    ctx.transform(d / size, -d / size, 0, 1, size, d);
    ctx.drawImage('AVATAR_RIGHT', 0, 0, size, size);
    ctx.restore();
    
    // Top face
    ctx.save();
    ctx.translate(bx, by - d);
    ctx.transform(1, 0, -d / size, d / size, d, 0);
    ctx.drawImage('AVATAR_TOP', 0, 0, size, size);
    ctx.restore();
}

// Simulating the main render loop of Pass 2
const rStart = 4;
const rEnd = 7;

for (let r = rEnd; r >= rStart; r--) {
    for (let c = 0; c < COLS; c++) {
        const cell = getCell(r, c);
        if (!cell || cell.t === E) continue;
        const x = c * TILE;
        const y = r * TILE;

        if (cell.t === AVATAR_BLOCK || cell.t === ROULETTE_BLOCK) {
            if (cell.rowOffset !== 0 || cell.colOffset !== 0) continue;
            
            draw2x2Block(cell, x, y);

            // Redraw loop
            const adjR = r + 1;
            for (let adjC = c + 2; adjC < COLS; adjC++) {
                const adjCell = getCell(adjR, adjC);
                if (adjCell && adjCell.t !== E) {
                    const adjX = adjC * TILE;
                    const adjY = adjR * TILE;
                    
                    if (adjCell.t === AVATAR_BLOCK || adjCell.t === ROULETTE_BLOCK) {
                        if (adjCell.rowOffset === 0 && adjCell.colOffset === 0) {
                            draw2x2Block(adjCell, adjX, adjY);
                        }
                        continue;
                    }

                    const depth1x1 = Math.floor(TILE * 0.3);
                    ctx.drawImage('TEX3D_' + adjCell.t, adjX, adjY - depth1x1, TILE + depth1x1, TILE + depth1x1);
                }
            }
            continue;
        }

        const depth = Math.floor(TILE * 0.3);
        ctx.drawImage('TEX3D_' + cell.t, x, y - depth, TILE + depth, TILE + depth);
    }
}

console.log(JSON.stringify(drawCalls, null, 2));
