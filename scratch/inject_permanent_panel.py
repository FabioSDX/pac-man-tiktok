import os

index_html = r"c:\laragon8\www\fallingpickaxeticktockmoney\index.html"
with open(index_html, 'r', encoding='utf-8') as f:
    code = f.read()

import re

# 1. Remove the toggle button
code = re.sub(r'<button class="ui-action-btn ui-btn-anim"[^>]+>.*?🎭 Animações \(HD\).*?</button>\s*', '', code)

# 2. Extract and remove the old animation modal
modal_regex = r'<!-- Animation Control Panel \(Fixed Bottom Tray\) -->.*?<div id="animationControlModal".*?</div>\s*</div>\s*</div>'
match = re.search(modal_regex, code, re.DOTALL)
if match:
    code = code.replace(match.group(0), '')
else:
    # try old modal format
    modal_regex2 = r'<!-- Animation Control Modal -->.*?<div id="animationControlModal".*?</div>\s*</div>\s*</div>'
    match2 = re.search(modal_regex2, code, re.DOTALL)
    if match2:
        code = code.replace(match2.group(0), '')

# 3. Insert the new permanent panel after gameControlsPanel
new_panel = """
    <!-- Animation Control Panel -->
    <div id="animationControlModal" style="background: rgba(20, 20, 30, 0.85); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 15px; margin-left: 10px; display: flex; flex-direction: column; gap: 10px; color: #fff; font-family: 'Inter', sans-serif; width: 250px; height: fit-content; max-height: calc(100vh - 40px); align-self: flex-start; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
        <h3 style="margin-top: 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; color: #aa22aa; font-size: 14px; text-align: center;">🎭 ANIMAÇÕES HD</h3>
        
        <div id="animGrid" style="flex:1; overflow-y:auto; overflow-x:hidden; display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; align-content:start; padding-right: 5px;">
            <!-- Cards renderizados via app.js -->
        </div>
    </div>
"""

# Find end of gameControlsPanel
controls_end = r'</button>\s*</div>\s*</div>\s*</div>\s*<!-- Player Management Panel -->'
if re.search(controls_end, code):
    code = re.sub(
        r'(</button>\s*</div>\s*</div>\s*</div>)(\s*<!-- Player Management Panel -->)',
        r'\1\n' + new_panel + r'\2',
        code
    )

with open(index_html, 'w', encoding='utf-8') as f:
    f.write(code)

# 4. Fix CSS for the grid layout
css_path = r"c:\laragon8\www\fallingpickaxeticktockmoney\css\style.css"
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace css properties for anim-card and anim-media
css = re.sub(r'\.anim-card \{([^}]+)\}', r'.anim-card {\1}', css)

css = css.replace("width: 140px;", "width: 100%; box-sizing: border-box;")
css = css.replace("padding: 10px;", "padding: 6px;")
css = css.replace("gap: 8px;", "gap: 4px;")

css = css.replace("width: 100px;", "width: 80px;")
css = css.replace("height: 100px;", "height: 80px;")

css = css.replace("padding: 8px;", "padding: 4px;") # buttons padding
css = css.replace("font-size: 13px;", "font-size: 10px;") # title font size

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

# 5. Fix app.js: we no longer need display='flex' when opening panel because it's permanent
app_js = r"c:\laragon8\www\fallingpickaxeticktockmoney\js\app.js"
with open(app_js, 'r', encoding='utf-8') as f:
    app_code = f.read()

app_code = app_code.replace("modal.style.display = 'flex';", "/* no display toggle needed */")
app_code = app_code.replace("if (modal) modal.style.display = 'none';", "")

# and since it's permanent, renderAnimationPanel needs to be called on load!
# Let's add it to the init/setup phase. updateAvailableAvatars already calls preloadApprovedAnimations.
# Let's just make it render.
if "renderAnimationPanel();" not in app_code.split("preloadApprovedAnimations();")[1][:50]:
    app_code = app_code.replace("preloadApprovedAnimations();", "preloadApprovedAnimations(); renderAnimationPanel();")

with open(app_js, 'w', encoding='utf-8') as f:
    f.write(app_code)

print("done")
