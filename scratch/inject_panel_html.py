import os

index_html = r"c:\laragon8\www\fallingpickaxeticktockmoney\index.html"
with open(index_html, 'r', encoding='utf-8') as f:
    code = f.read()

# Add button to adminPanel
btn_html = """        <button class="ui-action-btn ui-btn-anim" onclick="openAnimationPanel()" style="background: #aa22aa; color: #fff; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s; margin-top: 5px;">🎭 Animações (HD)</button>"""
if 'onclick="openAnimationPanel()"' not in code:
    code = code.replace(
        '<button class="ui-action-btn ui-btn-video" onclick="cycleBgVideo()"',
        btn_html + '\n        <button class="ui-action-btn ui-btn-video" onclick="cycleBgVideo()"'
    )

# Add Modal
modal_html = """
    <!-- Animation Control Modal -->
    <div id="animationControlModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:99999; justify-content:center; align-items:center; flex-direction:column; font-family:'Inter', sans-serif;">
        <div style="background:#1a1a24; border:1px solid #333; border-radius:12px; width:80%; max-width:900px; height:80%; max-height:700px; display:flex; flex-direction:column; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <div style="padding:20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; color:#aa22aa; font-size:24px;">🎭 Controle de Animações HD</h2>
                <button onclick="closeAnimationPanel()" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            <div id="animGrid" style="padding:20px; flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:20px; align-content:start;">
                <!-- Cards renderizados via app.js -->
            </div>
        </div>
    </div>
"""
if 'id="animationControlModal"' not in code:
    code = code.replace(
        '</body>',
        modal_html + '\n</body>'
    )

with open(index_html, 'w', encoding='utf-8') as f:
    f.write(code)
print("index.html updated.")
