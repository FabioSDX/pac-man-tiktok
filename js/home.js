document.addEventListener('DOMContentLoaded', () => {
    const btnOffline = document.getElementById('btnPlayOffline');
    const inputOffline = document.getElementById('offlineName');
    const btnOnline = document.getElementById('btnPlayOnline');

    // Navegação Offline
    btnOffline.addEventListener('click', () => {
        let name = inputOffline.value.trim();
        if (!name) name = 'Player' + Math.floor(Math.random() * 1000);
        window.location.href = `index.html?player=${encodeURIComponent(name)}`;
    });

    // Enter key no input
    inputOffline.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') btnOffline.click();
    });

    // Navegação Online
    btnOnline.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // --- Animação do Título com Física no Canvas ---
    const canvas = document.getElementById('titleCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const blockImg = new Image();
        blockImg.src = 'block/diamond_ore.png'; 
        
        const pickImg = new Image();
        pickImg.src = 'pickaxe/golden_pickaxe.png';

        const titleGrid = [
            "  PPP  III  CCC  K  K  AAA  X   X EEE  ",
            "  P  P  I  C     K K  A   A  X X  E    ",
            "  PPP   I  C     KK   AAAAA   X   EEE  ",
            "  P     I  C     K K  A   A  X X  E    ",
            "  P    III  CCC  K  K A   A X   X EEE  "
        ];
        
        const blockSize = 18;
        let blocks = [];
        let pickaxeObj = null;

        const startX = (canvas.width - (titleGrid[0].length * blockSize)) / 2;
        const startY = 120;

        function initBlocks() {
            blocks = [];
            for (let r = 0; r < titleGrid.length; r++) {
                for (let c = 0; c < titleGrid[r].length; c++) {
                    if (titleGrid[r][c] !== ' ') {
                        blocks.push({
                            targetX: startX + c * blockSize,
                            targetY: startY + r * blockSize,
                            x: startX + c * blockSize,
                            y: -Math.random() * 800 - 50, // Starts high up
                            vx: 0,
                            vy: Math.random() * 5 + 5, // Fall speed
                            isSettled: false,
                            rotation: 0,
                            vr: 0, 
                            isBroken: false
                        });
                    }
                }
            }
            pickaxeObj = null;
        }

        initBlocks();

        function dropPickaxe() {
            pickaxeObj = {
                x: canvas.width / 2,
                y: -100,
                vy: 20, // Falls fast
                rotation: 45, 
                state: 'falling'
            };
        }

        setInterval(() => {
            initBlocks();
            setTimeout(dropPickaxe, 3500); 
        }, 8000);

        setTimeout(dropPickaxe, 3500);

        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (let b of blocks) {
                if (!b.isBroken) {
                    if (!b.isSettled) {
                        b.y += b.vy;
                        if (b.y >= b.targetY) {
                            b.y = b.targetY;
                            b.isSettled = true;
                        }
                    }
                } else {
                    b.x += b.vx;
                    b.y += b.vy;
                    b.vy += 0.5; // gravity
                    b.rotation += b.vr;
                }
                
                ctx.save();
                ctx.translate(b.x + blockSize/2, b.y + blockSize/2);
                ctx.rotate(b.rotation * Math.PI / 180);
                if (blockImg.complete) {
                    ctx.drawImage(blockImg, -blockSize/2, -blockSize/2, blockSize, blockSize);
                } else {
                    ctx.fillStyle = '#0ff';
                    ctx.fillRect(-blockSize/2, -blockSize/2, blockSize, blockSize);
                }
                ctx.restore();
            }

            if (pickaxeObj) {
                if (pickaxeObj.state === 'falling') {
                    pickaxeObj.y += pickaxeObj.vy;
                    ctx.save();
                    ctx.translate(pickaxeObj.x, pickaxeObj.y);
                    ctx.rotate(pickaxeObj.rotation * Math.PI / 180);
                    if (pickImg.complete) {
                        ctx.drawImage(pickImg, -40, -40, 80, 80);
                    }
                    ctx.restore();

                    if (pickaxeObj.y >= startY + (titleGrid.length * blockSize) / 2) {
                        pickaxeObj.state = 'hit';
                        for (let b of blocks) {
                            let dx = b.x - pickaxeObj.x;
                            let dy = b.y - pickaxeObj.y;
                            let dist = Math.sqrt(dx*dx + dy*dy);
                            if (dist < 180) {
                                b.isBroken = true;
                                b.vx = (dx / dist) * (Math.random() * 15 + 5);
                                b.vy = (dy / dist) * (Math.random() * 10 + 5) - 15; 
                                b.vr = (Math.random() - 0.5) * 30;
                            }
                        }
                    }
                } else if (pickaxeObj.state === 'hit') {
                    pickaxeObj.y -= 3;
                    pickaxeObj.x += 4;
                    pickaxeObj.rotation += 10;
                    ctx.save();
                    ctx.translate(pickaxeObj.x, pickaxeObj.y);
                    ctx.rotate(pickaxeObj.rotation * Math.PI / 180);
                    if (pickImg.complete) {
                        ctx.drawImage(pickImg, -40, -40, 80, 80);
                    }
                    ctx.restore();
                }
            }

            requestAnimationFrame(update);
        }

        update();
    }


    // --- Animação de Inimigos e Itens no Fundo ---
    const enemiesContainer = document.getElementById('enemies-container');
    const assets = [
        'slime/Slime.png', 
        'spider/Spider.png', 
        'pickaxe/diamond_pickaxe.png', 
        'sword/Diamond_Sword.png', 
        'block/tnt.png'
    ];

    function spawnFloatingAsset() {
        const asset = document.createElement('img');
        asset.src = assets[Math.floor(Math.random() * assets.length)];
        asset.className = 'floating-enemy';
        
        // Tamanho aleatório (perspectiva de fundo/frente)
        const size = 40 + Math.random() * 60;
        asset.style.width = size + 'px';
        
        // Posição inicial (em cima da tela)
        const startX = Math.random() * window.innerWidth;
        const startY = -150 - Math.random() * 200;
        
        asset.style.left = startX + 'px';
        asset.style.top = startY + 'px';
        
        // Variáveis de animação
        const speedY = 0.5 + Math.random() * 1.5; // Cai devagar
        const swaySpeed = 0.01 + Math.random() * 0.02;
        const swayAmount = 30 + Math.random() * 70;
        const rotateSpeed = (Math.random() - 0.5) * 2;
        
        let angle = Math.random() * Math.PI * 2;
        let currentY = startY;
        let currentX = startX;
        let currentRotation = Math.random() * 360;

        // Se for um inimigo (slime/spider), não rotaciona como doido, apenas oscila
        const isEnemy = asset.src.includes('Slime') || asset.src.includes('Spider');

        enemiesContainer.appendChild(asset);

        function animate() {
            currentY += speedY; // Adiciona para cair
            angle += swaySpeed;
            
            const x = currentX + Math.sin(angle) * swayAmount;
            
            if (isEnemy) {
                // Inimigos balançam um pouco
                currentRotation = Math.sin(angle) * 15;
            } else {
                // Itens giram continuamente
                currentRotation += rotateSpeed;
            }
            
            asset.style.transform = `translate(${x - startX}px, ${currentY - startY}px) rotate(${currentRotation}deg)`;

            // Remove quando sair por baixo
            if (currentY > window.innerHeight + 150) {
                asset.remove();
            } else {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Spawn de asset a cada X segundos
    setInterval(spawnFloatingAsset, 1500);
    
    // Spawn inicial de alguns itens já espalhados pela tela
    for(let i=0; i<8; i++) {
        setTimeout(spawnFloatingAsset, Math.random() * 3000);
    }
});
