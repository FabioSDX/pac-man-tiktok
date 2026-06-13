import re
import os

app_js_path = r'c:\laragon8\www\fallingpickaxeticktockmoney - Copia\js\app.js'

with open(app_js_path, 'r', encoding='latin1') as f:
    content = f.read()

# 1. Insert Top Volume Settings & Functions
top_pattern = r'var lastHeartDamage = \{\};\s*//\s*Tracker para cooldown de dano \(0\.5 hearts\)'
match_top = re.search(top_pattern, content)
if not match_top:
    print("ERROR: Could not find lastHeartDamage pattern")
    exit(1)

idx_top = match_top.end()

volume_globals_code = """

        // --- Volume Settings & Audio Registry ---
        var gameSoundsVolume = parseFloat(localStorage.getItem('pd_gamesounds_volume') || '0.5');
        var musicVolume = parseFloat(localStorage.getItem('pd_music_volume') || '0.5');
        var messagesVolume = parseFloat(localStorage.getItem('pd_messages_volume') || '0.5');
        var allSFXElements = [];
        var gameSoundsGainNode = null;
        var musicGainNode = null;
        var currentMessageAudio = null;

        function createSFX(src, baseVol) {
            var audio = new Audio(src);
            audio.baseVolume = baseVol !== undefined ? baseVol : 1.0;
            audio.volume = audio.baseVolume * gameSoundsVolume;
            allSFXElements.push(audio);
            return audio;
        }

        function createSFXArray(sources, baseVol) {
            return sources.map(function(src) {
                return createSFX(src, baseVol);
            });
        }

        function cloneSFX(audioElement) {
            var cloned = audioElement.cloneNode();
            cloned.baseVolume = audioElement.baseVolume !== undefined ? audioElement.baseVolume : 1.0;
            cloned.volume = cloned.baseVolume * gameSoundsVolume;
            return cloned;
        }

        function updateGameSoundsVolume(newVolume) {
            gameSoundsVolume = newVolume;
            localStorage.setItem('pd_gamesounds_volume', newVolume);
            allSFXElements.forEach(function(audio) {
                audio.volume = audio.baseVolume * gameSoundsVolume;
            });
            if (gameSoundsGainNode) {
                gameSoundsGainNode.gain.value = gameSoundsVolume;
            }
        }

        function updateMusicVolume(newVolume) {
            musicVolume = newVolume;
            localStorage.setItem('pd_music_volume', newVolume);
            if (musicGainNode) {
                musicGainNode.gain.value = musicVolume;
            }
        }

        function updateMessagesVolume(newVolume) {
            messagesVolume = newVolume;
            localStorage.setItem('pd_messages_volume', newVolume);
            if (currentMessageAudio) {
                currentMessageAudio.volume = messagesVolume;
            }
        }

        window.changeVolume = function(type, val) {
            var floatVal = parseFloat(val) / 100;
            if (type === 'game') {
                updateGameSoundsVolume(floatVal);
                var el = document.getElementById('gameVolumeVal');
                if (el) el.textContent = val + '%';
            } else if (type === 'music') {
                updateMusicVolume(floatVal);
                var el = document.getElementById('musicVolumeVal');
                if (el) el.textContent = val + '%';
            } else if (type === 'messages') {
                updateMessagesVolume(floatVal);
                var el = document.getElementById('messagesVolumeVal');
                if (el) el.textContent = val + '%';
            }
        };"""

content = content[:idx_top] + volume_globals_code + content[idx_top:]
print("Inserted volume globals at the top.")

# 2. Replace the core audio functions block
old_audio_block = """        var AC = null;
        function getAC() {
            if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
            if (AC.state === 'suspended') AC.resume();
            return AC;
        }

        var _reverbNode = null;
        function getReverbNode() {
            var ac = getAC();
            if (_reverbNode && _reverbNode.context === ac) return _reverbNode;
            var len = ac.sampleRate * 2.2;
            var buf = ac.createBuffer(2, len, ac.sampleRate);
            for (var ch = 0; ch < 2; ch++) {
                var d = buf.getChannelData(ch);
                for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
            }
            var conv = ac.createConvolver(); conv.buffer = buf;
            var wetG = ac.createGain(); wetG.gain.value = 0.38;
            conv.connect(wetG); wetG.connect(ac.destination);
            _reverbNode = conv; return conv;
        }

        function playNote(freq, type, vol, attack, decay, when) {
            var ac = getAC();
            var osc = ac.createOscillator();
            var gain = ac.createGain();
            var rev = getReverbNode();
            osc.connect(gain); gain.connect(ac.destination); gain.connect(rev);
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, when);
            gain.gain.setValueAtTime(0.0001, when);
            gain.gain.linearRampToValueAtTime(vol, when + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
            osc.start(when); osc.stop(when + attack + decay + 0.1);
        }"""

new_audio_block = """        // --- Audio Context & Registry ---
        var AC = null;
        function getAC() {
            if (!AC) {
                AC = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create game sounds gain node
                gameSoundsGainNode = AC.createGain();
                gameSoundsGainNode.gain.value = gameSoundsVolume;
                gameSoundsGainNode.connect(AC.destination);
                
                // Create music gain node
                musicGainNode = AC.createGain();
                musicGainNode.gain.value = musicVolume;
                musicGainNode.connect(AC.destination);
            }
            if (AC.state === 'suspended') AC.resume();
            return AC;
        }

        var _sfxReverbNode = null;
        function getSFXReverbNode() {
            var ac = getAC();
            if (_sfxReverbNode && _sfxReverbNode.context === ac) return _sfxReverbNode;
            var len = ac.sampleRate * 2.2;
            var buf = ac.createBuffer(2, len, ac.sampleRate);
            for (var ch = 0; ch < 2; ch++) {
                var d = buf.getChannelData(ch);
                for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
            }
            var conv = ac.createConvolver(); conv.buffer = buf;
            var wetG = ac.createGain(); wetG.gain.value = 0.38;
            conv.connect(wetG);
            if (gameSoundsGainNode) {
                wetG.connect(gameSoundsGainNode);
            } else {
                wetG.connect(ac.destination);
            }
            _sfxReverbNode = conv; return conv;
        }

        var _musicReverbNode = null;
        function getMusicReverbNode() {
            var ac = getAC();
            if (_musicReverbNode && _musicReverbNode.context === ac) return _musicReverbNode;
            var len = ac.sampleRate * 2.2;
            var buf = ac.createBuffer(2, len, ac.sampleRate);
            for (var ch = 0; ch < 2; ch++) {
                var d = buf.getChannelData(ch);
                for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
            }
            var conv = ac.createConvolver(); conv.buffer = buf;
            var wetG = ac.createGain(); wetG.gain.value = 0.38;
            conv.connect(wetG);
            if (musicGainNode) {
                wetG.connect(musicGainNode);
            } else {
                wetG.connect(ac.destination);
            }
            _musicReverbNode = conv; return conv;
        }

        function playNote(freq, type, vol, attack, decay, when, isMusic) {
            if (!_audioStarted) return;
            var ac = getAC();
            var osc = ac.createOscillator();
            var gain = ac.createGain();
            
            // Route to appropriate gain node
            var destinationNode = isMusic ? musicGainNode : gameSoundsGainNode;
            
            // Reverb routing
            var rev = isMusic ? getMusicReverbNode() : getSFXReverbNode();
            
            osc.connect(gain);
            if (destinationNode) {
                gain.connect(destinationNode);
            } else {
                gain.connect(ac.destination);
            }
            if (rev) {
                gain.connect(rev);
            }
            
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, when);
            gain.gain.setValueAtTime(0.0001, when);
            gain.gain.linearRampToValueAtTime(vol, when + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
            osc.start(when); osc.stop(when + attack + decay + 0.1);
        }"""

if old_audio_block in content:
    content = content.replace(old_audio_block, new_audio_block, 1)
    print("Replaced core audio functions successfully.")
else:
    print("ERROR: Could not find old_audio_block")
    exit(1)

# 3. Update sfxHit and sfxBreak to connect to gameSoundsGainNode and add _audioStarted check
old_sfx_hit = """        function sfxHit(blockType) {
            var ac = getAC(), t = ac.currentTime;
            var len = Math.ceil(ac.sampleRate * 0.045);
            var buf = ac.createBuffer(1, len, ac.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 400 + blockType * 60;
            var g = ac.createGain(); g.gain.setValueAtTime(0.09, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
            src.connect(filt); filt.connect(g); g.connect(ac.destination);
            src.start(t);
        }"""

new_sfx_hit = """        function sfxHit(blockType) {
            if (!_audioStarted) return;
            var ac = getAC(), t = ac.currentTime;
            var len = Math.ceil(ac.sampleRate * 0.045);
            var buf = ac.createBuffer(1, len, ac.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 400 + blockType * 60;
            var g = ac.createGain(); g.gain.setValueAtTime(0.09, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
            src.connect(filt); filt.connect(g); g.connect(gameSoundsGainNode);
            src.start(t);
        }"""

if old_sfx_hit in content:
    content = content.replace(old_sfx_hit, new_sfx_hit, 1)
    print("Updated sfxHit function.")
else:
    print("ERROR: Could not find old_sfx_hit")
    exit(1)

old_sfx_break = """        function sfxBreak(blockType) {
            var ac = getAC(), t = ac.currentTime;
            var osc = ac.createOscillator(), og = ac.createGain();
            var baseFreq = [55, 60, 58, 52, 48, 50, 44, 42, 40][Math.min(blockType, 8)];
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * 1.8, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.18);
            og.gain.setValueAtTime(0.45, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
            osc.connect(og); og.connect(ac.destination); osc.start(t); osc.stop(t + 0.35);
            var len = Math.ceil(ac.sampleRate * 0.22);
            var buf = ac.createBuffer(1, len, ac.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 300 + blockType * 40;
            var g = ac.createGain(); g.gain.setValueAtTime(0.35, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start(t);
        }"""

new_sfx_break = """        function sfxBreak(blockType) {
            if (!_audioStarted) return;
            var ac = getAC(), t = ac.currentTime;
            var osc = ac.createOscillator(), og = ac.createGain();
            var baseFreq = [55, 60, 58, 52, 48, 50, 44, 42, 40][Math.min(blockType, 8)];
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * 1.8, t);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.18);
            og.gain.setValueAtTime(0.45, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
            osc.connect(og); og.connect(gameSoundsGainNode); osc.start(t); osc.stop(t + 0.35);
            var len = Math.ceil(ac.sampleRate * 0.22);
            var buf = ac.createBuffer(1, len, ac.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter();
            filt.type = 'lowpass'; filt.frequency.value = 300 + blockType * 40;
            var g = ac.createGain(); g.gain.setValueAtTime(0.35, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            src.connect(filt); filt.connect(g); g.connect(gameSoundsGainNode); src.start(t);
        }"""

if old_sfx_break in content:
    content = content.replace(old_sfx_break, new_sfx_break, 1)
    print("Updated sfxBreak function.")
else:
    print("ERROR: Could not find old_sfx_break")
    exit(1)

# 4. Connect customBGMGain to musicGainNode in initCustomBGM
old_bgm_connect = "customBGMGain.connect(ac.destination);"
new_bgm_connect = """if (musicGainNode) {
                customBGMGain.connect(musicGainNode);
            } else {
                customBGMGain.connect(ac.destination);
            }"""

if old_bgm_connect in content:
    content = content.replace(old_bgm_connect, new_bgm_connect, 1)
    print("Updated customBGMGain connection.")
else:
    print("WARNING: Could not find customBGMGain.connect(ac.destination);")

# 5. Update playNote calls inside scheduleMusicBeat to pass true as isMusic
notes_to_replace = [
    ("playNote(bf, 'sine', bn.vol, 0.02, bn.dur * 0.8, t);", "playNote(bf, 'sine', bn.vol, 0.02, bn.dur * 0.8, t, true);"),
    ("playNote(bf * 0.5, 'sine', bn.vol * 0.4, 0.02, bn.dur * 0.8, t);", "playNote(bf * 0.5, 'sine', bn.vol * 0.4, 0.02, bn.dur * 0.8, t, true);"),
    ("playNote(mf, 'sine', mn.vol, 0.03, mn.dur, t);", "playNote(mf, 'sine', mn.vol, 0.03, mn.dur, t, true);"),
    ("playNote(mf * 1.005, 'triangle', mn.vol * 0.3, 0.03, mn.dur * 1.2, t);", "playNote(mf * 1.005, 'triangle', mn.vol * 0.3, 0.03, mn.dur * 1.2, t, true);"),
    ("playNote(pf, padType, musicMode === 'boss' ? 0.05 : 0.035, 0.1, beat * 3.5, t);", "playNote(pf, padType, musicMode === 'boss' ? 0.05 : 0.035, 0.1, beat * 3.5, t, true);"),
    ("playNote(gf, 'sine', 0.035, 0.01, 0.2, t + Math.random() * beat * 0.5);", "playNote(gf, 'sine', 0.035, 0.01, 0.2, t + Math.random() * beat * 0.5, true);"),
    ("playNote(hScaleFreq(cd, 2), 'triangle', 0.04, 0.05, beat * 2, t);", "playNote(hScaleFreq(cd, 2), 'triangle', 0.04, 0.05, beat * 2, t, true);"),
    ("playNote(curRoot * 0.5, 'triangle', 0.08, 0.05, beat * 1.5, t);", "playNote(curRoot * 0.5, 'triangle', 0.08, 0.05, beat * 1.5, t, true);"),
    ("playNote(hScaleFreq(3, 0), 'sawtooth', 0.03, 0.1, beat * 3, t);", "playNote(hScaleFreq(3, 0), 'sawtooth', 0.03, 0.1, beat * 3, t, true);")
]

for old_call, new_call in notes_to_replace:
    if old_call in content:
        content = content.replace(old_call, new_call, 1)
        print(f"Updated playNote call: {old_call[:25]}...")
    else:
        print(f"WARNING: Could not find playNote call: {old_call[:25]}...")

# 6. Update swordHitSound declaration
old_sword_hit_decl = "var swordHitSound = new Audio('sons/ataque de espada.ogg');"
new_sword_hit_decl = "var swordHitSound = createSFX('sons/ataque de espada.ogg', 0.5);"

if old_sword_hit_decl in content:
    content = content.replace(old_sword_hit_decl, new_sword_hit_decl, 1)
    print("Updated swordHitSound declaration.")
else:
    print("WARNING: Could not find old_sword_hit_decl.")

old_sfx_sword_hit = """        function sfxSwordHit() {
            if (!_audioStarted) return;
            try {
                var s = swordHitSound.cloneNode();
                s.volume = 0.5;
                s.play();
            } catch (e) { }
        }"""

new_sfx_sword_hit = """        function sfxSwordHit() {
            if (!_audioStarted) return;
            try {
                var s = cloneSFX(swordHitSound);
                s.play();
            } catch (e) { }
        }"""

if old_sfx_sword_hit in content:
    content = content.replace(old_sfx_sword_hit, new_sfx_sword_hit, 1)
    print("Updated sfxSwordHit function.")
else:
    print("WARNING: Could not find old_sfx_sword_hit.")

# 7. Update dragon sounds load and play
pattern_dragon_load = r"for\s*\(var\s*i\s*=\s*1;\s*i\s*<=\s*4;\s*i\+\+\)\s*dragonRoarSounds\.push\(new\s*Audio\('sons/dragon_idle'\s*\+\s*i\s*\+\s*'\.ogg'\)\);\s*for\s*\(var\s*i\s*=\s*1;\s*i\s*<=\s*6;\s*i\+\+\)\s*dragonFlapSounds\.push\(new\s*Audio\('sons/dragon_flap'\s*\+\s*i\s*\+\s*'\.ogg'\)\);"
match_drag_load = re.search(pattern_dragon_load, content)
if match_drag_load:
    new_dragon_load_code = """for (var i = 1; i <= 4; i++) dragonRoarSounds.push(createSFX('sons/dragon_idle' + i + '.ogg', 1.0));
              for (var i = 1; i <= 6; i++) dragonFlapSounds.push(createSFX('sons/dragon_flap' + i + '.ogg', 1.0));"""
    content = content[:match_drag_load.start()] + new_dragon_load_code + content[match_drag_load.end():]
    print("Updated dragon sounds load using regex.")
else:
    print("WARNING: Could not find dragon sounds load pattern.")

pattern_dragon_roar = r"if\s*\(_audioStarted\)\s*\{\s*var\s*roar\s*=\s*dragonRoarSounds\[Math\.floor\(Math\.random\(\)\s*\*\s*dragonRoarSounds\.length\)\];\s*roar\.volume\s*=\s*\(dragonPhase\s*===\s*'front'\s*\?\s*1\.0\s*:\s*0\.4\);\s*roar\.play\(\)\.catch\(function\s*\(e\)\s*\{\s*\}\);\s*\}"
match_drag_roar = re.search(pattern_dragon_roar, content)
if match_drag_roar:
    new_dragon_roar_code = """if (_audioStarted) {
                          var roar = cloneSFX(dragonRoarSounds[Math.floor(Math.random() * dragonRoarSounds.length)]);
                          roar.baseVolume = (dragonPhase === 'front' ? 1.0 : 0.4);
                          roar.volume = roar.baseVolume * gameSoundsVolume;
                          roar.play().catch(function (e) { });
                      }"""
    content = content[:match_drag_roar.start()] + new_dragon_roar_code + content[match_drag_roar.end():]
    print("Updated dragon roar play using regex.")
else:
    print("WARNING: Could not find dragon roar play pattern.")

pattern_dragon_flap = r"if\s*\(_audioStarted\)\s*\{\s*var\s*flap\s*=\s*dragonFlapSounds\[dragonFlapIdx\];\s*flap\.volume\s*=\s*\(dragonPhase\s*===\s*'front'\s*\?\s*0\.8\s*:\s*0\.3\);\s*flap\.play\(\)\.catch\(function\s*\(e\)\s*\{\s*\}\);\s*\}"
match_drag_flap = re.search(pattern_dragon_flap, content)
if match_drag_flap:
    new_dragon_flap_code = """if (_audioStarted) {
                          var flap = cloneSFX(dragonFlapSounds[dragonFlapIdx]);
                          flap.baseVolume = (dragonPhase === 'front' ? 0.8 : 0.3);
                          flap.volume = flap.baseVolume * gameSoundsVolume;
                          flap.play().catch(function (e) { });
                      }"""
    content = content[:match_drag_flap.start()] + new_dragon_flap_code + content[match_drag_flap.end():]
    print("Updated dragon flap play using regex.")
else:
    print("WARNING: Could not find dragon flap play pattern.")

# 8. Update Sheep and Pig Sounds Arrays & play triggers
old_sheep_pig_decl = """        var sheepSounds = [
            new Audio('sons/som ovelha um.ogg'),
            new Audio('sons/som ovelha dois.ogg'),
            new Audio('sons/som ovelha tres.ogg')
        ];"""

new_sheep_pig_decl = """        var sheepSounds = createSFXArray([
            'sons/som ovelha um.ogg',
            'sons/som ovelha dois.ogg',
            'sons/som ovelha tres.ogg'
        ], 0.4);"""

if old_sheep_pig_decl in content:
    content = content.replace(old_sheep_pig_decl, new_sheep_pig_decl, 1)
    print("Updated sheepSounds array declaration.")
else:
    print("WARNING: Could not find old_sheep_pig_decl.")

old_pig_decl = """        var pigSounds = [
            new Audio('sons/som pig um.ogg'),
            new Audio('sons/som pig dois.ogg'),
            new Audio('sons/som pig tres.ogg')
        ];"""

new_pig_decl = """        var pigSounds = createSFXArray([
            'sons/som pig um.ogg',
            'sons/som pig dois.ogg',
            'sons/som pig tres.ogg'
        ], 0.4);"""

if old_pig_decl in content:
    content = content.replace(old_pig_decl, new_pig_decl, 1)
    print("Updated pigSounds array declaration.")
else:
    print("WARNING: Could not find old_pig_decl.")

old_sfx_sheep_play = """            try {
                var s = sheepSounds[Math.floor(Math.random() * sheepSounds.length)].cloneNode();
                s.volume = 0.4;
                s.play();
                activeSheepSounds.push(s);
            } catch (e) { }"""

new_sfx_sheep_play = """            try {
                var s = cloneSFX(sheepSounds[Math.floor(Math.random() * sheepSounds.length)]);
                s.play();
                activeSheepSounds.push(s);
            } catch (e) { }"""

if old_sfx_sheep_play in content:
    content = content.replace(old_sfx_sheep_play, new_sfx_sheep_play, 1)
    print("Updated sfxSheep play block.")
else:
    print("WARNING: Could not find old_sfx_sheep_play.")

old_sfx_pig_play = """            try {
                var s = pigSounds[Math.floor(Math.random() * pigSounds.length)].cloneNode();
                s.volume = 0.4;
                s.play();
                activePigSounds.push(s);
            } catch (e) { }"""

new_sfx_pig_play = """            try {
                var s = cloneSFX(pigSounds[Math.floor(Math.random() * pigSounds.length)]);
                s.play();
                activePigSounds.push(s);
            } catch (e) { }"""

if old_sfx_pig_play in content:
    content = content.replace(old_sfx_pig_play, new_sfx_pig_play, 1)
    print("Updated sfxPig play block.")
else:
    print("WARNING: Could not find old_sfx_pig_play.")

# 9. Chicken & Homer sound triggers
old_chk_sPick = """                        sPick.isChicken = true;
                        if (_audioStarted) {
                            var snd = chickenSounds[Math.floor(Math.random() * chickenSounds.length)];
                            snd.volume = 0.6;
                            snd.play().catch(function (e) { });
                        }"""

new_chk_sPick = """                        sPick.isChicken = true;
                        if (_audioStarted) {
                            var snd = cloneSFX(chickenSounds[Math.floor(Math.random() * chickenSounds.length)]);
                            snd.baseVolume = 0.6;
                            snd.volume = snd.baseVolume * gameSoundsVolume;
                            snd.play().catch(function (e) { });
                        }"""

if old_chk_sPick in content:
    content = content.replace(old_chk_sPick, new_chk_sPick, 1)
    print("Updated sPick chicken trigger.")
else:
    print("WARNING: Could not find old_chk_sPick.")

old_chk_newP = """                            newP.isChicken = true;
                            if (_audioStarted) chickenSounds[0].play().catch(e => { });"""

new_chk_newP = """                            newP.isChicken = true;
                            if (_audioStarted) {
                                var s = cloneSFX(chickenSounds[0]);
                                s.play().catch(e => { });
                            }"""

if old_chk_newP in content:
    content = content.replace(old_chk_newP, new_chk_newP, 1)
    print("Updated newP chicken trigger.")
else:
    print("WARNING: Could not find old_chk_newP.")

old_chk_gift = """                        if (_audioStarted) {
                            var snd = chickenSounds[Math.floor(Math.random() * chickenSounds.length)];
                            snd.volume = 0.6;
                            snd.play().catch(function (e) { });
                        }"""

new_chk_gift = """                        if (_audioStarted) {
                            var snd = cloneSFX(chickenSounds[Math.floor(Math.random() * chickenSounds.length)]);
                            snd.baseVolume = 0.6;
                            snd.volume = snd.baseVolume * gameSoundsVolume;
                            snd.play().catch(function (e) { });
                        }"""

if old_chk_gift in content:
    content = content.replace(old_chk_gift, new_chk_gift)
    print("Updated all follow/gift chicken triggers.")
else:
    print("WARNING: Could not find old_chk_gift.")

old_homer_gift = """                            homerSound.volume = 0.6;
                            homerSound.play().catch(function (e) { });"""

new_homer_gift = """                            var s = cloneSFX(homerSound);
                            s.baseVolume = 0.6;
                            s.volume = s.baseVolume * gameSoundsVolume;
                            s.play().catch(function (e) { });"""

if old_homer_gift in content:
    content = content.replace(old_homer_gift, new_homer_gift, 1)
    print("Updated gift homer trigger.")
else:
    print("WARNING: Could not find old_homer_gift.")

# 10. Update TTS and mp3 announcements volume
old_tiktok_tts = "var audio = new Audio('/tts?text=' + encodeURIComponent(text) + '&voice=' + voice);"
new_tiktok_tts = """var audio = new Audio('/tts?text=' + encodeURIComponent(text) + '&voice=' + voice);
                audio.volume = messagesVolume;
                currentMessageAudio = audio;"""

old_tiktok_end = """                audio.onended = function () {
                    setTimeout(processTTSQueue, 300);
                };
                audio.onerror = function () {
                    console.error('TikTok TTS Error');
                    _isSpeaking = false;
                    processTTSQueue();
                };
                audio.play().catch(function (e) {
                    console.error('TTS Play Blocked/Error:', e);
                    _isSpeaking = false;
                    processTTSQueue();
                });"""

new_tiktok_end = """                audio.onended = function () {
                    if (currentMessageAudio === audio) currentMessageAudio = null;
                    setTimeout(processTTSQueue, 300);
                };
                audio.onerror = function () {
                    console.error('TikTok TTS Error');
                    _isSpeaking = false;
                    if (currentMessageAudio === audio) currentMessageAudio = null;
                    processTTSQueue();
                };
                audio.play().catch(function (e) {
                    console.error('TTS Play Blocked/Error:', e);
                    _isSpeaking = false;
                    if (currentMessageAudio === audio) currentMessageAudio = null;
                    processTTSQueue();
                });"""

if old_tiktok_tts in content:
    content = content.replace(old_tiktok_tts, new_tiktok_tts, 1)
    content = content.replace(old_tiktok_end, new_tiktok_end, 1)
    print("Updated TikTok TTS triggers & hooks.")
else:
    print("WARNING: Could not find old_tiktok_tts.")

old_browser_tts = "var utterance = new SpeechSynthesisUtterance(text);"
new_browser_tts = """var utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = messagesVolume;"""

if old_browser_tts in content:
    content = content.replace(old_browser_tts, new_browser_tts, 1)
    print("Updated Browser TTS triggers.")
else:
    print("WARNING: Could not find old_browser_tts.")

old_mp3_ann = """        function playMp3Announcement(url) {
            if (_isSpeaking) return;
            _isSpeaking = true;
            var audio = new Audio(url);
            audio.onended = function () { _isSpeaking = false; };
            audio.onerror = function () { _isSpeaking = false; };
            audio.play().catch(function (e) { console.error('MP3 Play error:', e); _isSpeaking = false; });
        }"""

new_mp3_ann = """        function playMp3Announcement(url) {
            if (_isSpeaking) return;
            _isSpeaking = true;
            var audio = new Audio(url);
            audio.volume = messagesVolume;
            currentMessageAudio = audio;
            audio.onended = function () {
                _isSpeaking = false;
                if (currentMessageAudio === audio) currentMessageAudio = null;
            };
            audio.onerror = function () {
                _isSpeaking = false;
                if (currentMessageAudio === audio) currentMessageAudio = null;
            };
            audio.play().catch(function (e) {
                console.error('MP3 Play error:', e);
                _isSpeaking = false;
                if (currentMessageAudio === audio) currentMessageAudio = null;
            });
        }"""

if old_mp3_ann in content:
    content = content.replace(old_mp3_ann, new_mp3_ann, 1)
    print("Updated playMp3Announcement function.")
else:
    print("WARNING: Could not find old_mp3_ann.")

# Save the updated content
with open(app_js_path, 'w', encoding='latin1') as f:
    f.write(content)

print("SUCCESS: Code updated successfully!")
