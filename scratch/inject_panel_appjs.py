import os

app_js = r"c:\laragon8\www\fallingpickaxeticktockmoney\js\app.js"
with open(app_js, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add approved_animations loading logic
approved_logic = """
        var approved_animations = {};
        try {
            var stored = localStorage.getItem('approved_animations');
            if (stored) {
                approved_animations = JSON.parse(stored);
            }
        } catch(e){}

        function saveApprovedAnimations() {
            localStorage.setItem('approved_animations', JSON.stringify(approved_animations));
        }

        // We will call this once avatar list is loaded
        function preloadApprovedAnimations() {
            if (!availableAvatars) return;
            availableAvatars.forEach(function(url) {
                var parts = url.split('/');
                var fileName = parts[parts.length - 1];
                var userId = fileName.split('_')[0];
                if (userId && approved_animations[userId]) {
                    requestAvatarAnimation(url, userId);
                }
            });
        }
"""

if 'var approved_animations =' not in code:
    code = code.replace(
        "var avatarAnimCache = {};",
        approved_logic + "\n        var avatarAnimCache = {};",
        1
    )

# 2. Add preloadApprovedAnimations call after availableAvatars is fetched
if 'preloadApprovedAnimations();' not in code:
    code = code.replace(
        "availableAvatars = data.files;",
        "availableAvatars = data.files;\n                    preloadApprovedAnimations();",
        1
    )

# 3. Remove automatic requestAvatarAnimation from genRow
genRow_old = """
                    if (blockType === AVATAR_BLOCK && randomUrl) {
                        var parts = randomUrl.split('/');
                        var fileName = parts[parts.length - 1]; // e.g., "username_hash.png"
                        var userId = fileName.split('_')[0]; // "username"
                        if (userId && userId.length > 0) {
                            if (typeof requestAvatarAnimation === 'function') {
                                requestAvatarAnimation(randomUrl, userId);
                            }
                        }
                    }"""

genRow_new = """
                    // Automatic animation request removed. Will only animate if approved via Animation Control Panel.
                    if (blockType === AVATAR_BLOCK && randomUrl) {
                        var parts = randomUrl.split('/');
                        var fileName = parts[parts.length - 1]; // e.g., "username_hash.png"
                        var userId = fileName.split('_')[0]; // "username"
                    }"""

if 'requestAvatarAnimation(randomUrl, userId);' in code:
    code = code.replace(genRow_old, genRow_new, 1)

# 4. Add openAnimationPanel logic
panel_logic = """
        function openAnimationPanel() {
            var modal = document.getElementById('animationControlModal');
            if (!modal) return;
            modal.style.display = 'flex';
            renderAnimationPanel();
        }

        function closeAnimationPanel() {
            var modal = document.getElementById('animationControlModal');
            if (modal) modal.style.display = 'none';
        }

        function renderAnimationPanel() {
            var grid = document.getElementById('animGrid');
            if (!grid) return;
            grid.innerHTML = '';
            if (!availableAvatars || availableAvatars.length === 0) {
                grid.innerHTML = '<div style="color:#aaa; text-align:center; width:100%;">Nenhum avatar em HD ainda.</div>';
                return;
            }

            // Sort by most recent (assuming last in array is newest, though usually OS listing is alphabetical. We'll reverse array for newest first if pushed)
            var list = availableAvatars.slice().reverse();

            list.forEach(function(url) {
                var parts = url.split('/');
                var fileName = parts[parts.length - 1];
                var userId = fileName.split('_')[0];

                var card = document.createElement('div');
                card.className = 'anim-card';
                
                var mediaContainer = document.createElement('div');
                mediaContainer.className = 'anim-media';
                
                var animInfo = avatarAnimCache[url];
                if (animInfo && animInfo.status === 'done' && animInfo.videoEl) {
                    var v = animInfo.videoEl.cloneNode();
                    v.style.width = '100%';
                    v.style.height = '100%';
                    v.style.objectFit = 'cover';
                    v.muted = true;
                    v.loop = true;
                    v.autoplay = true;
                    v.play().catch(e=>{});
                    mediaContainer.appendChild(v);
                } else {
                    var img = document.createElement('img');
                    img.src = url;
                    mediaContainer.appendChild(img);
                }

                var title = document.createElement('div');
                title.className = 'anim-title';
                title.innerText = userId;

                var status = document.createElement('div');
                status.className = 'anim-status';

                var btn = document.createElement('button');
                btn.className = 'anim-btn';

                if (approved_animations[userId]) {
                    if (animInfo && animInfo.status === 'done') {
                        status.innerText = '✅ Animado';
                        status.style.color = '#00ff88';
                        btn.innerText = 'Remover';
                        btn.style.background = '#ff4444';
                        btn.onclick = function() {
                            delete approved_animations[userId];
                            saveApprovedAnimations();
                            renderAnimationPanel();
                        };
                    } else if (animInfo && animInfo.status === 'pending') {
                        status.innerText = '⏳ Processando...';
                        status.style.color = '#ffdd44';
                        btn.innerText = 'Gerando';
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                    } else if (animInfo && animInfo.status === 'error') {
                        status.innerText = '❌ Erro';
                        status.style.color = '#ff4444';
                        btn.innerText = 'Tentar Novamente';
                        btn.onclick = function() {
                            delete avatarAnimCache[url];
                            requestAvatarAnimation(url, userId);
                            renderAnimationPanel();
                        };
                    } else {
                        status.innerText = '⏳ Na Fila';
                        btn.innerText = 'Aguarde';
                        btn.disabled = true;
                    }
                } else {
                    status.innerText = '❌ Não Animado';
                    status.style.color = '#aaa';
                    btn.innerText = '✨ Animar';
                    btn.onclick = function() {
                        approved_animations[userId] = true;
                        saveApprovedAnimations();
                        requestAvatarAnimation(url, userId);
                        renderAnimationPanel();
                    };
                }

                card.appendChild(mediaContainer);
                card.appendChild(title);
                card.appendChild(status);
                card.appendChild(btn);

                grid.appendChild(card);
            });
        }
        
        // Auto-refresh the panel if it's open, to update status
        setInterval(function() {
            var modal = document.getElementById('animationControlModal');
            if (modal && modal.style.display !== 'none') {
                renderAnimationPanel();
            }
        }, 3000);
"""

if 'function openAnimationPanel()' not in code:
    code = code.replace(
        "function updateAvailableAvatars() {",
        panel_logic + "\n\n        function updateAvailableAvatars() {",
        1
    )

with open(app_js, 'w', encoding='utf-8') as f:
    f.write(code)
print("app.js logic applied.")
