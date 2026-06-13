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

    // --- Animação do Título com a Picareta ---
    const spans = document.querySelectorAll('.block-text span');
    
    function strikeTitle() {
        if(spans.length === 0) return;
        
        // Remove letras quebradas (invisíveis) para não focar nelas
        const activeSpans = Array.from(spans).filter(s => !s.classList.contains('broken'));
        if(activeSpans.length === 0) {
            // Se todas quebraram, reseta tudo!
            spans.forEach(s => {
                s.classList.remove('damaged', 'broken');
            });
            return;
        }

        // Escolhe uma letra aleatória
        const targetSpan = activeSpans[Math.floor(Math.random() * activeSpans.length)];
        const rect = targetSpan.getBoundingClientRect();
        
        // Cria a picareta caindo
        const pick = document.createElement('div');
        pick.className = 'falling-pickaxe';
        pick.style.left = (rect.left + rect.width / 2 - 35) + 'px';
        pick.style.top = (rect.top - 60) + 'px'; // Começa o impacto um pouco acima
        
        document.getElementById('pickaxe-falling-container').appendChild(pick);
        
        // Quando a picareta bater (0.8s da animação - bate aos ~80%)
        setTimeout(() => {
            // Aplica dano ou quebra
            if (!targetSpan.classList.contains('damaged')) {
                targetSpan.classList.add('damaged');
            } else {
                targetSpan.classList.remove('damaged');
                targetSpan.classList.add('broken');
            }
        }, 640); // 80% de 800ms
        
        // Remove a picareta depois de cair
        setTimeout(() => {
            pick.remove();
        }, 850);
    }

    // Picareta cai no título aleatoriamente a cada 2 a 5 segundos
    setInterval(() => {
        strikeTitle();
    }, 2000 + Math.random() * 3000);


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
        
        // Posição inicial (embaixo da tela)
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight + 150;
        
        asset.style.left = startX + 'px';
        asset.style.top = startY + 'px';
        
        // Variáveis de animação
        const speedY = 0.5 + Math.random() * 1.5; // Sobe devagar
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
            currentY -= speedY;
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

            // Remove quando sair por cima
            if (currentY < -150) {
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
