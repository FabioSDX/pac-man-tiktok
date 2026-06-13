import os

css_path = r"c:\laragon8\www\fallingpickaxeticktockmoney\css\style.css"
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

anim_css = """
/* Animation Control Panel Cards */
.anim-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: transform 0.2s;
}
.anim-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.08);
}
.anim-media {
    width: 100px;
    height: 100px;
    background: #000;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    border: 2px solid #222;
}
.anim-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.anim-title {
    color: #fff;
    font-size: 13px;
    font-weight: bold;
    width: 100%;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.anim-status {
    font-size: 11px;
    text-align: center;
    font-weight: bold;
}
.anim-btn {
    width: 100%;
    padding: 8px;
    border: none;
    border-radius: 6px;
    background: #aa22aa;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    transition: filter 0.2s;
}
.anim-btn:hover:not(:disabled) {
    filter: brightness(1.2);
}
.anim-btn:disabled {
    cursor: not-allowed;
}
"""

if '.anim-card {' not in css:
    css += '\n' + anim_css
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css)
    print("style.css updated.")
else:
    print("Already there.")
