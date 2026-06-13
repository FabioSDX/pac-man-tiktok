import sys

sys.stdout.reconfigure(encoding='utf-8')

def find_function_block(content, func_signature):
    idx = content.find(func_signature)
    if idx == -1:
        return -1, -1
        
    brace_start = content.find('{', idx)
    if brace_start == -1:
        return -1, -1
        
    brace_count = 1
    cursor = brace_start + 1
    while brace_count > 0 and cursor < len(content):
        char = content[cursor]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
        cursor += 1
        
    return idx, cursor

def apply_adjustments():
    filepath = 'js/app.js'
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # 1. Update isSwordState using brace tracking
    func_sig_issword = "function isSwordState(p)"
    start_idx, end_idx = find_function_block(content, func_sig_issword)
    
    if start_idx != -1 and end_idx != -1:
        repl_issword = """        function isSwordState(p) {
            if (!p) return false;
            if (p.isWitherSkeleton) return true;
            if (p.isExtraSword || p.isGoldSword || p.isDiamondSword) return true;
            if (p.swordTimer > 0 || p.goldSwordsTimer > 0 || p.diamondSwordsTimer > 0) return true;
            if (p.activeSwords && p.activeSwords.length > 0) return true;
            if (p.owner && isSwordState(p.owner)) return true;
            if (p.cloneOwner) {
                var ownerPick = (ownerName && p.cloneOwner === ownerName) ? pick : userPicks.find(function (u) { return u.userName === p.cloneOwner; });
                if (ownerPick && isSwordState(ownerPick)) return true;
            }
            return false;
        }"""
        content = content[:start_idx] + repl_issword + content[end_idx:]
        print("1. Successfully updated isSwordState to check activeSwords.")
    else:
        print("Error: isSwordState function signature not found or brace mismatch.")
        return

    # 2. Update registerKill using brace tracking
    func_sig_regkill = "function registerKill(p, victim)"
    start_idx, end_idx = find_function_block(content, func_sig_regkill)
    
    if start_idx != -1 and end_idx != -1:
        repl_register_kill = """        function registerKill(p, victim) {
            if (!p) return;
            var playerObj = p;
            if (p.owner) playerObj = p.owner;
            else if (p.cloneOwner) {
                var ownerPick = (ownerName && p.cloneOwner === ownerName) ? pick : userPicks.find(function (up) { return up.userName === p.cloneOwner; });
                if (ownerPick) playerObj = ownerPick;
            }
            var userName = playerObj.userName || (playerObj === pick ? (ownerName || '@owner') : '');
            if (!userName) return;

            // COMBOS DE MORTE APENAS PARA ESQUELETONS E OUTROS JOGADORES (PVP)
            var isComboTarget = (victim === 'skeleton' || victim === 'wither_skeleton' || victim.startsWith('@'));
            
            if (isComboTarget) {
                playerObj.killCombo = (playerObj.killCombo || 0) + 1;
                playerObj.killComboTimer = 300; // 5 seconds
                
                var kc = playerObj.killCombo;
                var killBonus = 0;
                var label = '';
                var color = '#ffffff';
                
                if (kc === 2) {
                    label = '⚔️ DOUBLE KILL!';
                    color = '#44ddff';
                    killBonus = 200;
                    playKillSound('double');
                } else if (kc === 3) {
                    label = '⚔️ TRIPLE KILL!';
                    color = '#ffaa00';
                    killBonus = 500;
                    playKillSound('triple');
                } else if (kc === 4) {
                    label = '⚔️ MEGA KILL!';
                    color = '#ff44ff';
                    killBonus = 1000;
                    playKillSound('mega');
                } else if (kc === 5) {
                    label = '⚔️ ULTRA KILL!';
                    color = '#ff0055';
                    killBonus = 2000;
                    playKillSound('ultra');
                } else if (kc >= 6) {
                    label = '⚔️ MONSTER KILL!';
                    color = '#00ffcc';
                    killBonus = 3000 + (kc - 6) * 500;
                    playKillSound('monster');
                }

                if (killBonus > 0) {
                    if (playerObj === pick) {
                        if (pick.active) score += killBonus;
                    } else {
                        score += killBonus;
                    }
                    if (persistentScores[userName]) {
                        persistentScores[userName].score += killBonus;
                    }
                    
                    spawnText(playerObj.x, playerObj.y - 80, label + ' (+' + killBonus + ')', color);
                    
                    if (kc >= 3) {
                        showComboPopup(label, color, userName, playerObj.userAvatarUrl || '');
                    }
                }
            }

            var enemyText = '';
            if (victim === 'zombie') enemyText = '💀 ZOMBIE KILLED!';
            else if (victim === 'spider') enemyText = '💀 SPIDER KILLED!';
            else if (victim === 'skeleton' || victim === 'wither_skeleton') enemyText = '💀 SKELETON KILLED!';
            else if (victim === 'bat') enemyText = '💀 BAT KILLED!';
            else if (victim.startsWith('@')) enemyText = '⚔️ PVP K.O.!';

            if (enemyText) {
                spawnText(playerObj.x, playerObj.y - 60, enemyText, isComboTarget ? color : '#aaaaaa');
            }
        }"""
        content = content[:start_idx] + repl_register_kill + content[end_idx:]
        print("2. Successfully updated registerKill function to filter for combo targets.")
    else:
        print("Error: registerKill function signature not found or brace mismatch.")
        return

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Done making adjustments.")

if __name__ == '__main__':
    apply_adjustments()
