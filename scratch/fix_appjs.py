import os
import re

filepath = 'js/app.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace corrupted pickaxe
content = re.sub(r"var scoreStr = '.*? ' \+ displayScore;", "var scoreStr = '&#9935; ' + displayScore;", content)
content = re.sub(r"document\.getElementById\('scoreDisplay'\)\.textContent = '.*? ' \+ displayScore;", "document.getElementById('scoreDisplay').innerHTML = '&#9935; ' + displayScore;", content)
content = re.sub(r"scoreDisplay\.textContent = scoreStr;", "scoreDisplay.innerHTML = scoreStr;", content)

# Replace corrupted lightning in pending
content = re.sub(r"pendingEl\.textContent = '\+' \+ pending \+ '.*?';", "pendingEl.innerHTML = '+' + pending + '&#9889;';", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed app.js emojis")
