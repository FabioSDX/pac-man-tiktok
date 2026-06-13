import difflib

with open('js/app.js.recover_bak', 'r', encoding='latin1') as f:
    clean_lines = f.readlines()

with open('js/app.js.backup_pvp_restore', 'r', encoding='latin1') as f:
    backup_lines = f.readlines()

diff = difflib.unified_diff(
    clean_lines, backup_lines,
    fromfile='clean', tofile='backup',
    n=3
)

with open('scratch/volume_diff.txt', 'w', encoding='utf-8') as f:
    f.writelines(diff)

print("Diff generated in scratch/volume_diff.txt")
