// ==========================================
// Pac-Man Chat Battle - Optimized Game Engine
// ==========================================

var pacmanGameState = 'waiting'; // waiting, playing, gameover
var pacmanPlayers = {}; // userName -> player state
var pacmanClones = []; // Array of { owner: 'userName', x, y, targetX, targetY, progress, dir, timer, ... }
var pacmanPheromones = {}; // "x,y" -> timestamp of last visit by any player/clone
var pacmanDots = []; // list of active dots
var pacmanFruits = []; // list of active fruits on the board
var pacmanGiftDrops = []; // list of active gift drops on the board
var pacmanGhosts = []; // list of ghosts
var pacmanMaze = []; // 2D grid of walls
 var MAZE_LAYOUT = []; // Reference to maze used by movement code
 var pacmanScore = 0;
 var pacmanThemeBgColor = '#050510';
 var pacmanThemeDotColor = '#ffaa00';
 var pacmanThemeWallColor = '#00aaff';
 var pacmanTileSize = 40;
var pacmanPowerMode = false;
var pacmanGiantMode = false;
var pacmanPowerTimer = 0;
var pacmanCtx = null;
var mazeCanvas = null;
var mazeCtx = null;
var mazeCanvasFrightened1 = null;
var mazeCtxFrightened1 = null;
var mazeCanvasFrightened2 = null;
var mazeCtxFrightened2 = null;

const GENERIC_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiMxYTFhMmUiLz48cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6IiBmaWxsPSIjMDBmZmZmIi8+PC9zdmc+";
var pacmanComboPopup = null; // { user, avatar, color, combo, points, timer }
var pacmanLevel = 1;
var pacmanRoundEndMode = 'match'; // 'match' or 'overall'
var pacmanGlobalLeaderboard = [];
try {
    var storedLeaderboard = localStorage.getItem('pacmanGlobalLeaderboard');
    if (storedLeaderboard) {
        pacmanGlobalLeaderboard = JSON.parse(storedLeaderboard);
    }
} catch(e) {}
var pacmanCelebrationQueue = [];
var pacmanActiveCelebration = null;
var pacmanCelebrationConfetti = [];
var pacmanCelebrationFireworkSparks = [];
var pacmanSirenTimer = 0;
var pacmanFruitTimer = 900; // spawn first fruit after 15 seconds (900 frames)

// Camera Zoom Effect
var pacmanZoomTarget = null;
var pacmanZoomCooldown = 0;
var pacmanLastLeaderboard = [];
var pacmanInitialLeaderSet = false;

// Particles and VFX
var pacmanParticles = [];
var pacmanTextParticles = [];

// ==========================================
// Daily Revenue & Quotes Logic
// ==========================================
var pacmanDailyRevenueDiamonds = 0;
var pacmanUsdQuote = 5.0; // Fallback

function initDailyRevenue() {
    var today = new Date().toISOString().slice(0, 10);
    var storedDate = localStorage.getItem('pacmanRevenueDate');
    
    if (storedDate !== today) {
        localStorage.setItem('pacmanRevenueDate', today);
        localStorage.setItem('pacmanDailyRevenueDiamonds', '0');
        pacmanDailyRevenueDiamonds = 0;
        fetchDailyQuote();
    } else {
        pacmanDailyRevenueDiamonds = parseInt(localStorage.getItem('pacmanDailyRevenueDiamonds') || '0', 10);
        pacmanUsdQuote = parseFloat(localStorage.getItem('pacmanUsdQuote') || '5.0');
        renderFinancePanel();
        
        var lastQuoteDate = localStorage.getItem('pacmanUsdQuoteDate');
        if (lastQuoteDate !== today) {
            fetchDailyQuote();
        }
    }
}

function fetchDailyQuote() {
    var today = new Date().toISOString().slice(0, 10);
    var lblQuote = document.getElementById('usdQuote');
    if (lblQuote) lblQuote.textContent = 'Buscando API...';
    
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data && data.USDBRL && data.USDBRL.bid) {
                pacmanUsdQuote = parseFloat(data.USDBRL.bid);
                localStorage.setItem('pacmanUsdQuote', pacmanUsdQuote);
                localStorage.setItem('pacmanUsdQuoteDate', today);
                renderFinancePanel();
            }
        })
        .catch(function(err) {
            console.error('Erro ao buscar cotação USD-BRL:', err);
            if (lblQuote) lblQuote.textContent = 'R$ ' + pacmanUsdQuote.toFixed(2) + ' (Cache)';
        });
}

function updateDailyRevenue(diamonds) {
    if (!diamonds || diamonds <= 0) return;
    pacmanDailyRevenueDiamonds += diamonds;
    localStorage.setItem('pacmanDailyRevenueDiamonds', pacmanDailyRevenueDiamonds);
    renderFinancePanel();
}

function resetDailyRevenue() {
    pacmanDailyRevenueDiamonds = 0;
    localStorage.setItem('pacmanDailyRevenueDiamonds', '0');
    renderFinancePanel();
}

function renderFinancePanel() {
    var lblUsd = document.getElementById('revenueUsd');
    var lblBrl = document.getElementById('revenueBrl');
    var lblQuote = document.getElementById('usdQuote');
    var lblDiam = document.getElementById('revenueDiamonds');
    
    if (!lblUsd || !lblBrl) return;
    
    // 1 Diamond = US$ 0.005 approx
    var revenueUsd = pacmanDailyRevenueDiamonds * 0.005;
    var revenueBrl = revenueUsd * pacmanUsdQuote;
    
    if (lblDiam) {
        lblDiam.textContent = '💎 ' + pacmanDailyRevenueDiamonds + (pacmanDailyRevenueDiamonds === 1 ? ' Diamante' : ' Diamantes');
    }
    lblUsd.textContent = 'US$ ' + revenueUsd.toFixed(2);
    lblBrl.textContent = 'R$ ' + revenueBrl.toFixed(2);
    
    if (lblQuote) {
        lblQuote.textContent = 'R$ ' + pacmanUsdQuote.toFixed(2);
    }
}
// Initialize on load
setTimeout(initDailyRevenue, 1500);

// Pre-render heart emoji to an offscreen canvas to massively improve performance
var cachedHeartCanvas = document.createElement('canvas');
cachedHeartCanvas.width = 32;
cachedHeartCanvas.height = 32;
var hCtx = cachedHeartCanvas.getContext('2d');
hCtx.font = "26px Arial";
hCtx.textAlign = 'center';
hCtx.textBaseline = 'middle';
hCtx.fillText('❤️', 16, 18);


// Constants
const MAX_ACTIVE_PLAYERS = 35; // Maximum players on board at once to avoid lag/clutter
const PLAYER_INACTIVITY_TIMEOUT = 120000; // 2 minutes in ms
const PLAYER_DEATH_TIMEOUT = 30000; // 30 seconds in ms
var cleanupCheckFrameCounter = 0;

const PACMAN_COLORS = ['#FFFF00', '#FF0000', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#8A2BE2', '#0000FF', '#FF1493', '#00FA9A', '#FF4500', '#1E90FF'];
const PACMAN_GHOST_COLORS = ['#FF0000', '#FFB6C1', '#00FFFF', '#FFA500', '#00FF00'];

var pacmanMaze = []; // 2D grid of walls


// ==========================================
// Web Audio API Synthesizer
// ==========================================
const AudioSynth = {
    ctx: null,
    muted: false,
    wakaState: 0,
    lastWakaTime: 0,
    sirenOsc: null,
    sirenLfo: null,
    sirenLfoGain: null,
    sirenGain: null,
    bgmNextNoteTime: 0,
    bgmStep: 0,
    bgmChordIndex: 0,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.gameGain = this.ctx.createGain();
            this.musicGain = this.ctx.createGain();
            this.speechGain = this.ctx.createGain();
            this.gameGain.connect(this.ctx.destination);
            this.musicGain.connect(this.ctx.destination);
            this.speechGain.connect(this.ctx.destination);
            this.updateVolumes();
        }
    },
    updateVolumes() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.warn("AudioContext resume failed:", e));
        }
        if (this.gameGain) {
            this.gameGain.gain.setTargetAtTime( (window.pacmanGameVolume !== undefined ? window.pacmanGameVolume * 2 : 1), this.ctx.currentTime, 0.1);
        }
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime( (window.pacmanMusicVolume !== undefined ? window.pacmanMusicVolume * 2 : 1), this.ctx.currentTime, 0.1);
        }
        if (this.speechGain) {
            this.speechGain.gain.setTargetAtTime( (window.pacmanSpeechVolume !== undefined ? window.pacmanSpeechVolume * 2 : 1), this.ctx.currentTime, 0.1);
        }
    },
    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopSiren();
        }
        return this.muted;
    },
    playTone(freq, type, duration, volume = 0.1, delay = 0, isMusic = false) {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);
        
        osc.connect(gain);
        gain.connect(isMusic ? this.musicGain : this.gameGain);
        
        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + duration);
    },
    playBreakWall() {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        if (this.lastBreakTime && now - this.lastBreakTime < 0.1) return;
        this.lastBreakTime = now;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.gameGain);
        osc.start(now);
        osc.stop(now + 0.15);
    },
    playWaka() {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const now = this.ctx.currentTime;
        // Low cooldown allows quick rapid waka sound when eating dots in sequence
        if (this.lastWakaTime && now - this.lastWakaTime < 0.08) {
            return;
        }
        this.lastWakaTime = now;
        
        const t = this.ctx.currentTime;
        const duration = 0.13; // 130ms tone
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        // Classic arcade waka pitch curve:
        // Alternates between a high "wa" sweep (starts high, sweeps down)
        // and a lower "ka" sweep (starts lower, sweeps down)
        const isWa = (this.wakaState === 0);
        this.wakaState = (this.wakaState + 1) % 2;
        
        // Sawtooth wave filtered gives the characteristic squelchy analog synth voice of the Namco sound chip
        osc.type = 'sawtooth';
        
        const startFreq = isWa ? 650 : 450;
        const endFreq = isWa ? 300 : 200;
        
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
        
        // Lowpass Filter sweeps downwards quickly to give the "wah" filter sweep feel
        filter.type = 'lowpass';
        filter.Q.value = 8; // High resonance for that juicy "buzzy/squelchy" arcade sound
        filter.frequency.setValueAtTime(startFreq * 1.5, t);
        filter.frequency.exponentialRampToValueAtTime(endFreq * 0.8, t + duration);
        
        gainNode.gain.setValueAtTime(0.001, t);
        gainNode.gain.linearRampToValueAtTime(0.035, t + 0.02); // quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration); // smooth decay
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.gameGain);
        
        osc.start(t);
        osc.stop(t + duration);
    },
    updateSiren(active, powerMode, eatenRatio) {
        if (this.muted || !active) {
            this.stopSiren();
            return;
        }
        
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const style = window.pacmanMusicStyle || 'techno';
        const now = this.ctx.currentTime;
        
        if (style === 'arcade') {
            this.updateSirenArcade(now, powerMode, eatenRatio);
        } else if (style === 'bossa') {
            this.updateSirenBossa(now, powerMode, eatenRatio);
        } else {
            this.updateSirenTechno(now, powerMode, eatenRatio);
        }
    },
    updateSirenArcade(now, powerMode, eatenRatio) {
        if (!this.arcadeSirenOsc) {
            this.arcadeSirenOsc = this.ctx.createOscillator();
            this.arcadeSirenGain = this.ctx.createGain();
            this.arcadeSirenOsc.type = 'triangle';
            this.arcadeSirenGain.gain.value = 0.05;
            this.arcadeSirenOsc.connect(this.arcadeSirenGain);
            this.arcadeSirenGain.connect(this.musicGain);
            this.arcadeSirenOsc.start(now);
            
            // LFO to sweep pitch
            this.arcadeLfo = this.ctx.createOscillator();
            this.arcadeLfoGain = this.ctx.createGain();
            this.arcadeLfo.type = 'sawtooth';
            this.arcadeLfo.frequency.value = 4; // 4 Hz sweep
            this.arcadeLfoGain.gain.value = 80; // +/- 80 Hz
            this.arcadeLfo.connect(this.arcadeLfoGain);
            this.arcadeLfoGain.connect(this.arcadeSirenOsc.frequency);
            this.arcadeLfo.start(now);
        }
        
        // Base frequency speeds up and pitches up as level completes
        const baseFreq = powerMode ? 600 : 350 + (eatenRatio * 150);
        this.arcadeSirenOsc.frequency.setTargetAtTime(baseFreq, now, 0.1);
        this.arcadeLfo.frequency.setTargetAtTime(powerMode ? 8 : 4 + (eatenRatio * 3), now, 0.1);
    },
    updateSirenBossa(now, powerMode, eatenRatio) {
        if (this.arcadeSirenOsc) this.stopSiren(); // Limpar sons contínuos se trocou rápido

        if (this.bgmNextNoteTime === 0) {
            this.bgmNextNoteTime = now + 0.1;
            this.bgmStep = 0;
        }
        
        if (now > this.bgmNextNoteTime - 0.1) {
            const t = this.bgmNextNoteTime;
            const tempo = powerMode ? 160 : 120 + (eatenRatio * 20); // bpm
            const stepDuration = (60 / tempo) / 4; // 16th note
            
            // Bossa Chords (Jazz flavor)
            const chords = [
                [293.66, 369.99, 440.00, 554.37], // Dmaj9
                [329.63, 392.00, 493.88, 587.33], // Em7
                [277.18, 329.63, 415.30, 493.88], // C#m7
                [369.99, 466.16, 554.37, 659.25]  // F#7
            ];
            
            if (this.bgmStep % 32 === 0) {
                this.bgmChordIndex = (this.bgmChordIndex + 1) % chords.length;
            }
            
            const chord = chords[this.bgmChordIndex];
            
            // Bossa clave rhythm (simplified)
            // Plays chords on steps: 2, 5, 8, 11, 14
            const playChord = [2, 5, 8, 11, 14].includes(this.bgmStep % 16);
            
            if (playChord) {
                for (let freq of chord) {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine'; // Soft electric piano / guitar vibe
                    osc.frequency.value = freq;
                    
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.015, t + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                    
                    osc.connect(gain);
                    gain.connect(this.musicGain);
                    osc.start(t);
                    osc.stop(t + 0.6);
                }
            }
            
            // Upright Bass
            // Plays on 0 and 8 (1 and 3 of the bar) with syncopation on 6 and 14
            const playBass = [0, 6, 8, 14].includes(this.bgmStep % 16);
            if (playBass) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bassOsc.type = 'triangle';
                
                // Root note (index 0) down an octave, or 5th (index 2) down an octave
                const isRoot = (this.bgmStep % 16 < 8);
                const bassFreq = (isRoot ? chord[0] : chord[2]) / 2;
                
                bassOsc.frequency.value = bassFreq;
                
                bassGain.gain.setValueAtTime(0, t);
                bassGain.gain.linearRampToValueAtTime(powerMode ? 0.12 : 0.08, t + 0.02);
                bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
                
                bassOsc.connect(bassGain);
                bassGain.connect(this.musicGain);
                bassOsc.start(t);
                bassOsc.stop(t + 1.0);
            }
            
            // Soft Shaker (Noise)
            if (this.bgmStep % 2 === 0) {
                const shaker = this.ctx.createOscillator();
                const shakerGain = this.ctx.createGain();
                shaker.type = 'square';
                shaker.frequency.value = 6000 + (Math.random() * 2000); // noisy
                
                shakerGain.gain.setValueAtTime(0.002, t);
                shakerGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
                
                shaker.connect(shakerGain);
                shakerGain.connect(this.musicGain);
                shaker.start(t);
                shaker.stop(t + 0.1);
            }
            
            this.bgmStep++;
            this.bgmNextNoteTime = t + stepDuration;
        }
    },
    updateSirenTechno(now, powerMode, eatenRatio) {
        if (this.arcadeSirenOsc) this.stopSiren(); // Limpar sons contínuos se trocou rápido

        if (this.bgmNextNoteTime === 0) {
            this.bgmNextNoteTime = now + 0.1;
        }
        
        if (now > this.bgmNextNoteTime - 0.1) {
            const t = this.bgmNextNoteTime;
            
            // Soft harmony chords based on start melody (B major, C major, D major, G major)
            const chords = [
                [246.94, 311.13, 369.99], // B major
                [261.63, 329.63, 392.00], // C major
                [293.66, 369.99, 440.00], // D major
                [196.00, 246.94, 293.66]  // G major
            ];
            
            if (this.bgmStep % 8 === 0) {
                // Change chord somewhat randomly for non-repetitive harmony
                if (Math.random() > 0.3) {
                    this.bgmChordIndex = (this.bgmChordIndex + 1) % chords.length;
                } else {
                    this.bgmChordIndex = Math.floor(Math.random() * chords.length);
                }
            }
            
            const currentChord = chords[this.bgmChordIndex];
            let noteFreq = 0;
            
            if (powerMode) {
                // Power mode: intense and faster!
                noteFreq = currentChord[Math.floor(Math.random() * currentChord.length)] * 2;
                this.bgmNextNoteTime = t + 0.11;
            } else {
                // Soft arpeggio
                const noteIdx = [0, 1, 2, 1, 0, 2, 1, 2][this.bgmStep % 8];
                noteFreq = currentChord[noteIdx];
                if (Math.random() < 0.15) noteFreq *= 2;
                // Speed gets slightly faster as the level gets empty (Mais rápido para ser vibrante)
                const speed = 0.18 - (eatenRatio * 0.08); 
                this.bgmNextNoteTime = t + speed;
            }
            
            // --- KICK DRUM (Batida Pulsante) ---
            if ((powerMode && this.bgmStep % 2 === 0) || (!powerMode && this.bgmStep % 4 === 0)) {
                const kickOsc = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kickOsc.type = 'sine';
                
                // Frequência despenca rápido gerando um soco grave (Punchy Kick)
                kickOsc.frequency.setValueAtTime(150, t);
                kickOsc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
                
                kickGain.gain.setValueAtTime(0.8, t);
                kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
                
                kickOsc.connect(kickGain);
                kickGain.connect(this.musicGain);
                kickOsc.start(t);
                kickOsc.stop(t + 0.5);
            }
            
            this.bgmStep++;
            
            // --- SYNTH (Sintetizador Estalado estilo Techno/Synthwave) ---
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            osc.type = powerMode ? 'square' : 'sawtooth';
            osc.frequency.setValueAtTime(noteFreq, t);
            
            // Filtro Lowpass rápido para dar um estalo "plucky" 
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(powerMode ? 4000 : 1500, t);
            filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(powerMode ? 0.08 : 0.05, t + 0.02); // Ataque rápido
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3); // Decay rápido
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start(t);
            osc.stop(t + 0.4);
        }
    },
    startSirenNode() {
        // Obsolete, replaced by arpeggiator/lfo
    },
    stopSiren() {
        this.bgmNextNoteTime = 0; // Reset bgm timer so it doesn't queue lots of notes when unpaused
        
        if (this.arcadeSirenOsc) {
            try {
                this.arcadeSirenOsc.stop();
                this.arcadeLfo.stop();
            } catch(e) {}
            this.arcadeSirenOsc.disconnect();
            this.arcadeLfo.disconnect();
            this.arcadeSirenOsc = null;
            this.arcadeLfo = null;
        }
    },
    playDeath() {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        
        // 5 cascading stepped sweeps down
        for (let i = 0; i < 5; i++) {
            const delay = i * 0.11;
            const startFreq = 800 - (i * 120);
            const endFreq = startFreq - 150;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(startFreq, t + delay);
            osc.frequency.linearRampToValueAtTime(endFreq, t + delay + 0.09);
            
            gain.gain.setValueAtTime(0.07, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.09);
            
            osc.connect(gain);
            gain.connect(this.gameGain);
            osc.start(t + delay);
            osc.stop(t + delay + 0.09);
        }
    },
    playGhostEat(comboIndex) {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        
        // Garante que o combo seja no mínimo 1 e define um limite (ex: 8) para não estourar
        const combo = Math.min(comboIndex || 1, 8);
        
        // Progressão baseada no combo: som mais longo, alto e intenso
        const baseFreq = 800 + (combo * 150); 
        const baseGain = 0.1 + (combo * 0.025); 
        
        // Toca "pams" repetidos dependendo do número do combo (1 = pam, 2 = pam-pam, etc.)
        for (let i = 0; i < combo; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            // Mistura ondas para gerar um som polifônico e rico
            osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
            
            // Cada "pam" toca em sequência, com 0.12s de diferença
            const delay = i * 0.12;
            
            // O tom sobe ligeiramente a cada pulso da sequência do combo atual
            const startFreq = baseFreq + (i * 100);
            
            osc.frequency.setValueAtTime(startFreq, t + delay);
            // Queda intensa de pitch simulando o som de engolir do clássico
            osc.frequency.exponentialRampToValueAtTime(100, t + delay + 0.18);
            
            gain.gain.setValueAtTime(baseGain, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.18);
            
            osc.connect(gain);
            gain.connect(this.gameGain);
            
            osc.start(t + delay);
            osc.stop(t + delay + 0.2);
        }
        
        // Adiciona um baixo sub-frequência (polifonia) que preenche todo o efeito no fundo
        if (combo > 1) {
            const oscSub = this.ctx.createOscillator();
            const gainSub = this.ctx.createGain();
            oscSub.type = 'triangle';
            oscSub.frequency.setValueAtTime(400 + combo * 50, t);
            oscSub.frequency.linearRampToValueAtTime(50, t + (combo * 0.12) + 0.1);
            
            // Volume suave para o sub-grave
            gainSub.gain.setValueAtTime(baseGain * 0.7, t);
            gainSub.gain.linearRampToValueAtTime(0.0001, t + (combo * 0.12) + 0.1);
            
            oscSub.connect(gainSub);
            gainSub.connect(this.gameGain);
            
            oscSub.start(t);
            oscSub.stop(t + (combo * 0.12) + 0.15);
        }
    },
    playRespawn() {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        
        // Rising arpeggio chord (C4, E4, G4, C5)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            const delay = idx * 0.07;
            this.playTone(freq, 'sine', 0.12, 0.05, delay);
        });
    },
    playLevelUp() {
        this.init();
        const t = this.ctx.currentTime;
        this.playTone(523.25, 'sine', 0.1, 0.08, 0); // C5
        this.playTone(659.25, 'sine', 0.1, 0.08, 0.1); // E5
        this.playTone(783.99, 'sine', 0.1, 0.08, 0.2); // G5
        this.playTone(1046.50, 'sine', 0.25, 0.08, 0.3); // C6
    },
    playStartMelody() {
        this.init();
        if (this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const tempo = 125;
        const q = 60 / tempo; // quarter note duration
        const e = q / 2;     // eighth note duration
        const s = e / 2;     // sixteenth note duration
        
        const notes = [
            { f: 987.77, d: e },  // B5
            { f: 1975.53, d: e }, // B6
            { f: 1479.98, d: e }, // F#6
            { f: 1244.51, d: e }, // D#6
            { f: 1975.53, d: s }, // B6
            { f: 1479.98, d: s }, // F#6
            { f: 1244.51, d: e + s }, // D#6
            { f: 0, d: s },
            
            { f: 1046.50, d: e },  // C6
            { f: 2093.00, d: e },  // C7
            { f: 1567.98, d: e },  // G6
            { f: 1318.51, d: e },  // E6
            { f: 2093.00, d: s },  // C7
            { f: 1567.98, d: s },  // G6
            { f: 1318.51, d: e + s }, // E6
            { f: 0, d: s },
            
            { f: 987.77, d: e },  // B5
            { f: 1975.53, d: e }, // B6
            { f: 1479.98, d: e }, // F#6
            { f: 1244.51, d: e }, // D#6
            { f: 1975.53, d: s }, // B6
            { f: 1479.98, d: s }, // F#6
            { f: 1244.51, d: e + s }, // D#6
            { f: 0, d: s },
            
            { f: 1244.51, d: s }, // D#6
            { f: 1318.51, d: s }, // E6
            { f: 1396.91, d: s }, // F6
            { f: 1396.91, d: s }, // F6
            { f: 1479.98, d: s }, // F#6
            { f: 1567.98, d: s }, // G6
            { f: 1661.22, d: s }, // G#6
            { f: 1661.22, d: s }, // G#6
            { f: 1760.00, d: s }, // A6
            { f: 1760.00, d: s }, // A6
            { f: 1975.53, d: e }  // B6
        ];
        
        let tOffset = 0;
        notes.forEach(note => {
            if (note.f > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note.f, this.ctx.currentTime + tOffset);
                gain.gain.setValueAtTime(0.04, this.ctx.currentTime + tOffset);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + tOffset + note.d);
                osc.connect(gain);
                gain.connect(this.gameGain);
                osc.start(this.ctx.currentTime + tOffset);
                osc.stop(this.ctx.currentTime + tOffset + note.d);
            }
            tOffset += note.d;
        });
    },
    playVictoryFanfare() {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        // Fast, triumphant, uplifting arpeggio
        const s = 0.12; // 120ms per step
        const notes = [
            { f: 523.25, d: s }, // C5
            { f: 659.25, d: s }, // E5
            { f: 783.99, d: s }, // G5
            { f: 1046.50, d: s },// C6
            { f: 783.99, d: s }, // G5
            { f: 1046.50, d: s * 3 } // C6 (held)
        ];
        
        let tOffset = 0;
        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.f, this.ctx.currentTime + tOffset);
            
            gain.gain.setValueAtTime(0.0, this.ctx.currentTime + tOffset);
            gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + tOffset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + tOffset + note.d);
            
            osc.connect(gain);
            gain.connect(this.gameGain);
            
            osc.start(this.ctx.currentTime + tOffset);
            osc.stop(this.ctx.currentTime + tOffset + note.d);
            tOffset += note.d;
        });
    },
    playIntermissionMusic() {
        if (this.muted) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Classic Pac-Man Intermission-like tune
        const s = 0.15; 
        const notes = [
            { f: 349.23, d: s }, // F4
            { f: 440.00, d: s }, // A4
            { f: 523.25, d: s }, // C5
            { f: 698.46, d: s }, // F5
            { f: 523.25, d: s }, // C5
            { f: 698.46, d: s }, // F5
            
            { f: 329.63, d: s }, // E4
            { f: 415.30, d: s }, // G#4
            { f: 493.88, d: s }, // B4
            { f: 659.25, d: s }, // E5
            { f: 493.88, d: s }, // B4
            { f: 659.25, d: s }, // E5
            
            { f: 349.23, d: s }, // F4
            { f: 440.00, d: s }, // A4
            { f: 523.25, d: s }, // C5
            { f: 698.46, d: s }, // F5
            { f: 523.25, d: s }, // C5
            { f: 698.46, d: s }, // F5
            
            { f: 392.00, d: s }, // G4
            { f: 493.88, d: s }, // B4
            { f: 587.33, d: s }, // D5
            { f: 783.99, d: s * 3 } // G5 (held)
        ];
        
        let tOffset = 0;
        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, this.ctx.currentTime + tOffset);
            
            gain.gain.setValueAtTime(0.0, this.ctx.currentTime + tOffset);
            gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + tOffset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + tOffset + note.d);
            
            osc.connect(gain);
            gain.connect(this.gameGain);
            
            osc.start(this.ctx.currentTime + tOffset);
            osc.stop(this.ctx.currentTime + tOffset + note.d);
            tOffset += note.d;
        });
    }
};
window.AudioSynth = AudioSynth;

// ==========================================
// Avatar Caching
// ==========================================
const avatarCache = {};
var cachedGenericImage = null;
function getGenericAvatarImage() {
    if (!cachedGenericImage) {
        cachedGenericImage = new Image();
        cachedGenericImage.src = GENERIC_AVATAR;
    }
    return cachedGenericImage;
}

function resolveAvatarUrl(userName, url) {
    if (!url || url === '') return GENERIC_AVATAR;
    if (avatarCache[userName] === 'failed') return GENERIC_AVATAR;
    return url;
}

function getAvatarImage(userName, url) {
    if (!url || url === '') return getGenericAvatarImage();
    if (avatarCache[userName] === 'failed') return getGenericAvatarImage();
    if (avatarCache[userName]) return avatarCache[userName];
    
    var img = new Image();
    // Removed crossOrigin = "anonymous" and proxy to ensure it loads without CORS blocks
    img.onerror = function() {
        avatarCache[userName] = 'failed';
    };
    img.src = resolveAvatarUrl(userName, url);
    avatarCache[userName] = img;
    return img;
}

// ==========================================
// Procedural Maze Generator
// ==========================================
function generateProceduralMaze() {
    var bgHue = Math.floor(Math.random() * 360);
    var bgSat = Math.floor(Math.random() * 40) + 50; // 50% to 90% (Vivid)
    var bgLight = Math.floor(Math.random() * 30) + 60; // 60% to 90% (Claras/Light colors)
    pacmanThemeBgColor = 'hsl(' + bgHue + ', ' + bgSat + '%, ' + bgLight + '%)';
    
    var dotHue = (bgHue + 120 + Math.floor(Math.random() * 120)) % 360;
    pacmanThemeDotColor = 'hsl(' + dotHue + ', 100%, 30%)'; // Darker for contrast
    
    var wallHue = (bgHue + 180 + Math.floor(Math.random() * 90)) % 360;
    pacmanThemeWallColor = 'hsl(' + wallHue + ', 100%, 35%)'; // Darker for contrast

    var cols = 27;
    var rows = 48; // Updated to 48 for 1080x1920 mobile aspect ratio
    
    // 1. Initialize grid to all walls (1)
    var grid = [];
    for (var r = 0; r < rows; r++) {
        grid[r] = [];
        for (var c = 0; c < cols; c++) {
            grid[r][c] = 1;
        }
    }
    
    // Helper to identify if a coordinate is within active left-half grid boundaries
    function inBounds(c, r) {
        return r > 0 && r < rows - 1 && c > 0 && c <= 13;
    }
    
    // Helper to check if a cell is part of the Ghost House walls (which must remain solid 1s)
    function isGhostHouseWall(c, r) {
        // Ghost house is cols 11-13 (mirrored 11-15), rows 18-20
        if (r >= 18 && r <= 20 && c >= 11 && c <= 13) {
            if (r === 18 && c === 13) return false; // Door (path)
            if (r === 19 && c === 12) return false; // Interior (path)
            if (r === 19 && c === 13) return false; // Interior (path)
            return true;
        }
        return false;
    }
    
    // Pre-carve warp tunnel, ghost house, and connection paths
    // Warp tunnel (row 24)
    for (var c = 0; c <= 13; c++) {
        grid[24][c] = 0;
    }
    // Ghost house interior
    grid[19][12] = 0;
    grid[19][13] = 0;
    // Ghost house door
    grid[18][13] = 0;
    // Entrance backbone path connection
    grid[17][13] = 0;
    grid[16][13] = 0;
    grid[15][13] = 0;
    grid[14][13] = 0;
    
    // Let's connect the warp tunnel row 24 to the grid paths
    // And ensure the top half connects to the bottom half via the central axis!
    grid[20][13] = 0;
    grid[21][13] = 0;
    grid[22][13] = 0;
    grid[23][13] = 0;
    grid[25][13] = 0;
    
    // Prim's algorithm structures
    var pathCells = [];
    var inMaze = {};
    var frontier = [];
    var inFrontier = {};
    
    // Define path cells (odd-odd coordinates on the left half)
    for (var r = 1; r < rows - 1; r += 2) {
        for (var c = 1; c <= 13; c += 2) {
            if (isGhostHouseWall(c, r)) continue;
            pathCells.push({ x: c, y: r });
        }
    }
    
    // Mark pre-carved path cells as already in maze
    pathCells.forEach(function(cell) {
        if (grid[cell.y][cell.x] === 0) {
            inMaze[cell.x + ',' + cell.y] = true;
        }
    });
    
    // Helper to add neighboring path cells to the frontier
    function addToFrontier(c, r) {
        if (!inBounds(c, r)) return;
        if (isGhostHouseWall(c, r)) return;
        if (inMaze[c + ',' + r]) return;
        
        var key = c + ',' + r;
        if (!inFrontier[key]) {
            inFrontier[key] = true;
            frontier.push({ x: c, y: r });
        }
    }
    
    // Initialize frontier from all cells currently in the maze
    pathCells.forEach(function(cell) {
        if (inMaze[cell.x + ',' + cell.y]) {
            addToFrontier(cell.x - 2, cell.y);
            addToFrontier(cell.x + 2, cell.y);
            addToFrontier(cell.x, cell.y - 2);
            addToFrontier(cell.x, cell.y + 2);
        }
    });
    
    // Grow maze using Prim's algorithm on path cells
    while (frontier.length > 0) {
        var idx = Math.floor(Math.random() * frontier.length);
        var cell = frontier[idx];
        frontier.splice(idx, 1);
        delete inFrontier[cell.x + ',' + cell.y];
        
        // Find neighbors already in the maze
        var mazeNeighbors = [];
        var dirs = [
            { x: -2, y: 0 }, { x: 2, y: 0 },
            { x: 0, y: -2 }, { x: 0, y: 2 }
        ];
        
        dirs.forEach(function(d) {
            var nc = cell.x + d.x;
            var nr = cell.y + d.y;
            if (inBounds(nc, nr) && inMaze[nc + ',' + nr]) {
                mazeNeighbors.push({ x: nc, y: nr });
            }
        });
        
        if (mazeNeighbors.length > 0) {
            // Choose a random neighbor in the maze and carve the wall between them
            var neighbor = mazeNeighbors[Math.floor(Math.random() * mazeNeighbors.length)];
            grid[cell.y][cell.x] = 0;
            grid[(cell.y + neighbor.y) / 2][(cell.x + neighbor.x) / 2] = 0;
            inMaze[cell.x + ',' + cell.y] = true;
            
            // Add new frontier cells
            dirs.forEach(function(d) {
                addToFrontier(cell.x + d.x, cell.y + d.y);
            });
        }
    }
    
    // Aproveitar a "faixa morta" na base do labirinto (linha 46)
    // O algoritmo de Prim para na linha 45, deixando 46 e 47 como paredes.
    for (var c = 1; c <= 13; c++) {
        grid[46][c] = 0; // Cria um longo corredor horizontal na base
    }
    // Conecta o corredor inferior ao resto do labirinto nas pontas e no centro
    grid[45][1] = 0;
    grid[45][13] = 0;
    grid[45][7] = 0; // Mais uma conexão no meio para fluxo

    // Remove dead ends to create loops (Pac-Man mazes need loops)
    var deadEndPasses = 5; // Agresivelly remove dead ends
    for (var pass = 0; pass < deadEndPasses; pass++) {
        var deadEnds = [];
        for (var r = 1; r < rows - 1; r++) {
            for (var c = 1; c <= 13; c++) {
                if (grid[r][c] === 0 && !isGhostHouseWall(c, r)) {
                    var walls = 0;
                    if (grid[r-1][c] === 1) walls++;
                    if (grid[r+1][c] === 1) walls++;
                    if (grid[r][c-1] === 1) walls++;
                    if (grid[r][c+1] === 1) walls++;
                    
                    if (walls >= 3) {
                        deadEnds.push({r: r, c: c});
                    }
                }
            }
        }
        
        deadEnds.forEach(function(de) {
            var candidates = [];
            var dirs = [
                {r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}
            ];
            dirs.forEach(function(d) {
                var nr = de.r + d.r;
                var nc = de.c + d.c;
                if (nr > 1 && nr < rows - 2 && nc > 1 && nc < 13) {
                    if (grid[nr][nc] === 1 && !isGhostHouseWall(nc, nr)) {
                        var nnr = nr + d.r;
                        var nnc = nc + d.c;
                        if (nnr > 0 && nnr < rows - 1 && nnc > 0 && nnc <= 13) {
                            if (grid[nnr][nnc] === 0) {
                                candidates.push({r: nr, c: nc});
                            }
                        }
                    }
                }
            });
            if (candidates.length > 0) {
                // Pick a random candidate and break the wall
                var breakWall = candidates[Math.floor(Math.random() * candidates.length)];
                grid[breakWall.r][breakWall.c] = 0;
            }
        });
    }
    
    // Mirror function to update the right side
     function mirrorGrid() {
         for (var r = 0; r < rows; r++) {
             for (var c = 0; c < 14; c++) {
                 grid[r][26 - c] = grid[r][c];
             }
         }
     }
     
     // Mirror the maze to create symmetrical right side
     mirrorGrid();
     
     pacmanMaze = grid;
     MAZE_LAYOUT = grid; // Sync to MAZE_LAYOUT used by movement code
 }

// ==========================================
// Maze Initialization & Rendering
// ==========================================// --- Graphics Caching ---
var pacmanSpriteCache = {
    bodies: {},
    pacman: {}
};

function getGhostBodySprite(color) {
    if (pacmanSpriteCache.bodies[color]) return pacmanSpriteCache.bodies[color];
    var size = 64;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    var radius = size * 0.42;
    ctx.translate(size/2, size/2);
    // ctx.shadowBlur = 12; // Efeito removido a pedido
    // ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -5, radius, Math.PI, 0, false);
    ctx.lineTo(radius, radius + 5);
    ctx.lineTo(radius * 0.4, radius - 2);
    ctx.lineTo(0, radius + 5);
    ctx.lineTo(-radius * 0.4, radius - 2);
    ctx.lineTo(-radius, radius + 5);
    ctx.closePath();
    ctx.fill();
    pacmanSpriteCache.bodies[color] = c;
    return c;
}

function getPacmanSprite(color, frameIndex) {
    var key = color + "_" + frameIndex;
    if (pacmanSpriteCache.pacman[key]) return pacmanSpriteCache.pacman[key];
    var size = 64;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    var radius = size * 0.48;
    var mouthAngles = [Math.PI / 4.5, Math.PI / 8, 0.05];
    var mouthOpen = mouthAngles[frameIndex % 3];
    ctx.translate(size/2, size/2);
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, mouthOpen, Math.PI * 2 - mouthOpen);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    pacmanSpriteCache.pacman[key] = c;
    return c;
}

// Maze Initialization & Rendering
var dotFlowField = [];
var cloneFlowField = [];

function updateCloneFlowField() {
    var rows = pacmanMaze.length;
    var cols = pacmanMaze[0].length;
    
    cloneFlowField = new Array(rows);
    for (var r = 0; r < rows; r++) {
        cloneFlowField[r] = new Array(cols).fill(999999999);
    }
    
    var dotGrid = new Array(rows);
    for (var r = 0; r < rows; r++) {
        dotGrid[r] = new Array(cols).fill(false);
    }
    
    var queue = [];
    
    for (var i = 0; i < pacmanDots.length; i++) {
        var dot = pacmanDots[i];
        if (dot.active) {
            dotGrid[dot.y][dot.x] = true;
            cloneFlowField[dot.y][dot.x] = 0;
            queue.push({x: dot.x, y: dot.y, dist: 0});
        }
    }
    
    var head = 0;
    while(head < queue.length) {
        var curr = queue[head++];
        
        if (curr.dist > cloneFlowField[curr.y][curr.x]) continue;
        
        var dirs = [[0,-1], [0,1], [-1,0], [1,0]];
        for (var d = 0; d < 4; d++) {
            var nx = curr.x + dirs[d][0];
            var ny = curr.y + dirs[d][1];
            
            if (nx < 0) nx = cols - 1;
            else if (nx >= cols) nx = 0;
            
            if (ny >= 0 && ny < rows && pacmanMaze[ny] && pacmanMaze[ny][nx] !== 1) {
                var stepCost = dotGrid[ny][nx] ? 1 : 1000;
                var ndist = curr.dist + stepCost;
                
                if (ndist < cloneFlowField[ny][nx]) {
                    cloneFlowField[ny][nx] = ndist;
                    queue.push({x: nx, y: ny, dist: ndist});
                }
            }
        }
    }
}

function updateDotFlowField() {
    updateCloneFlowField();
    var rows = pacmanMaze.length;
    var cols = pacmanMaze[0].length;
    
    dotFlowField = new Array(rows);
    for (var r = 0; r < rows; r++) {
        dotFlowField[r] = new Array(cols).fill(999999999);
    }
    
    // Create a fast lookup grid for dots to optimize the loop
    var dotGrid = new Array(rows);
    for (var r = 0; r < rows; r++) {
        dotGrid[r] = new Array(cols).fill(false);
    }
    
    var queue = [];
    
    for (var i = 0; i < pacmanDots.length; i++) {
        var dot = pacmanDots[i];
        if (dot.active) {
            dotGrid[dot.y][dot.x] = true;
            dotFlowField[dot.y][dot.x] = 0;
            queue.push({x: dot.x, y: dot.y, dist: 0});
        }
    }
    
    // Add fruits to the queue with a massive negative distance to strongly attract Pac-Mans
    for (var i = 0; i < pacmanFruits.length; i++) {
        var f = pacmanFruits[i];
        if (f.active) {
            dotGrid[f.y][f.x] = true;
            if (dotFlowField[f.y][f.x] > -5000) {
                dotFlowField[f.y][f.x] = -5000;
                queue.push({x: f.x, y: f.y, dist: -5000});
            }
        }
    }
    
    // Add Gift Drops to the queue with an even more massive negative distance!
    if (typeof pacmanGiftDrops !== 'undefined') {
        for (var i = 0; i < pacmanGiftDrops.length; i++) {
            var g = pacmanGiftDrops[i];
            if (g.active) {
                // Se já estivermos no modo caça, ignoramos presentes do tipo Rosa para a IA não acumular sozinha.
                if (pacmanPowerMode && (g.gift === 'rose' || g.gift === 'rosa' || g.gift === 'love')) {
                    continue; 
                }
                
                dotGrid[g.y][g.x] = true;
                if (dotFlowField[g.y][g.x] > -8000) {
                    dotFlowField[g.y][g.x] = -8000;
                    queue.push({x: g.x, y: g.y, dist: -8000});
                }
            }
        }
    }
    
    // (Fantasmas vulneráveis removidos do BFS global para não atrair todos os jogadores ao mesmo tempo)
    
    var head = 0;
    while(head < queue.length) {
        var curr = queue[head++];
        
        // SPFA Optimization: If we already found a shorter path before processing this node, skip it
        if (curr.dist > dotFlowField[curr.y][curr.x]) continue;
        
        var dirs = [[0,-1], [0,1], [-1,0], [1,0]];
        for (var d = 0; d < 4; d++) {
            var nx = curr.x + dirs[d][0];
            var ny = curr.y + dirs[d][1];
            
            if (nx < 0) nx = cols - 1;
            else if (nx >= cols) nx = 0;
            
            if (ny >= 0 && ny < rows && pacmanMaze[ny] && pacmanMaze[ny][nx] !== 1) {
                // Inteligência Artificial: Caminhar por um espaço VAZIO custa MUITO mais do que por um PONTO.
                // O custo 1000 faz com que o Pac-Man literalmente nunca ande no vazio se houver opção de ponto.
                var stepCost = dotGrid[ny][nx] ? 1 : 1000;
                var ndist = curr.dist + stepCost;
                
                if (ndist < dotFlowField[ny][nx]) {
                    dotFlowField[ny][nx] = ndist;
                    queue.push({x: nx, y: ny, dist: ndist});
                }
            }
        }
    }
}

// Auto Like Bot Logic
var pacmanAutoLikeBotInterval = null;
function toggleAutoLikeBot() {
    var btn = document.getElementById('btnAutoLikeBot');
    if (pacmanAutoLikeBotInterval) {
        clearInterval(pacmanAutoLikeBotInterval);
        pacmanAutoLikeBotInterval = null;
        if (btn) {
            btn.innerHTML = 'Bot Like (OFF)';
            btn.style.background = 'rgba(255,105,180,0.2)';
            btn.style.color = '#ff69b4';
        }
    } else {
        var hostInput = document.getElementById('tiktokUsernameInput');
        var hostName = hostInput ? hostInput.value.trim() : '';
        if (!hostName) hostName = 'Dono_da_Live';
        if (hostName.startsWith('@')) hostName = hostName.substring(1);
        hostName = hostName.toLowerCase();
        
        pacmanAutoLikeBotInterval = setInterval(function() {
            var hostAvatar = (pacmanPlayers[hostName] && pacmanPlayers[hostName].avatar) ? pacmanPlayers[hostName].avatar : '';
            if (typeof processLiveEvent === 'function') {
                processLiveEvent({ type: 'like', user: hostName, avatar: hostAvatar, likeCount: 3, msgId: 'autolike_'+Date.now() });
            }
        }, 800);
        
        if (btn) {
            btn.innerHTML = 'Bot Like (ON)';
            btn.style.background = 'rgba(255,105,180,0.6)';
            btn.style.color = '#fff';
        }
    }
}

function initPacmanMaze() {
     // Initialize Audio Engine immediately
    AudioSynth.init();
     
     // Initialize dots array
     pacmanDots = [];
     for (var r = 0; r < pacmanMaze.length; r++) {
         for (var c = 0; c < pacmanMaze[0].length; c++) {
             if (pacmanMaze[r][c] === 0) {
                 pacmanDots.push({
                     x: c,
                     y: r,
                     active: true,
                     power: false // Default to false
                 });
             }
         }
     }
     
     pacmanGiftDrops = []; // Reset gift drops
     
     var initialGifts = [
         { gift: 'rose', url: 'images tiktok/Rose.png' },
         { gift: 'gg', url: 'images tiktok/GG.png' },
         { gift: 'amo voce', url: 'images tiktok/Hand_Hearts.png' },
         { gift: 'rosquinha', url: 'images tiktok/Doughnut.png' }
     ];
     // Distribuir 4 presentes iniciais aleatórios no labirinto
     for (var i = 0; i < 4; i++) {
         var pos = getAvailableGiftSpawnPosition();
         var pick = initialGifts[Math.floor(Math.random() * initialGifts.length)];
         pacmanGiftDrops.push({
             x: pos.x,
             y: pos.y,
             active: true,
             gift: pick.gift,
             giftPictureUrl: pick.url,
             sender: 'Sistema',
             diamondCount: 1,
             repeatCount: 1
         });
     }
     
     updateDotFlowField();
 }

function renderMazeStatic() {
     if (!mazeCtx) return;
     
     // CLEAR as transparent instead of filling with black
     mazeCtx.clearRect(0, 0, 1080, 1920);
     
     function drawNeonMaze(ctx, color) {
         ctx.shadowBlur = 15;
         ctx.shadowColor = color;
         ctx.strokeStyle = color;
         ctx.lineWidth = 14;
         ctx.lineJoin = 'round';
         ctx.lineCap = 'round';
         
         ctx.beginPath();
         for (var r = 0; r < pacmanMaze.length; r++) {
             for (var c = 0; c < pacmanMaze[0].length; c++) {
                 if (pacmanMaze[r][c] === 1) {
                     var cx = c * pacmanTileSize + pacmanTileSize / 2;
                     var cy = r * pacmanTileSize + pacmanTileSize / 2;
                     
                     var hasRight = (c + 1 < pacmanMaze[0].length && pacmanMaze[r][c+1] === 1);
                     var hasDown = (r + 1 < pacmanMaze.length && pacmanMaze[r+1][c] === 1);
                     var hasLeft = (c - 1 >= 0 && pacmanMaze[r][c-1] === 1);
                     var hasUp = (r - 1 >= 0 && pacmanMaze[r-1][c] === 1);
                     
                     if (hasRight) {
                         ctx.moveTo(cx, cy);
                         ctx.lineTo(cx + pacmanTileSize, cy);
                     }
                     if (hasDown) {
                         ctx.moveTo(cx, cy);
                         ctx.lineTo(cx, cy + pacmanTileSize);
                     }
                     
                     if (!hasRight && !hasDown && !hasLeft && !hasUp) {
                         ctx.moveTo(cx, cy);
                         ctx.lineTo(cx + 0.1, cy);
                     }
                 }
             }
         }
         ctx.stroke();
         ctx.shadowBlur = 0;
     }
     
     // Draw walls with neon glow on transparent background
     drawNeonMaze(mazeCtx, pacmanThemeWallColor);
 }
 
 function destroyMazeWall(c, r) {
     if (r <= 0 || r >= pacmanMaze.length - 1 || c <= 0 || c >= pacmanMaze[0].length - 1) return; // Protect outer bounds
     if (pacmanMaze[r][c] === 1) {
         pacmanMaze[r][c] = 0; // Convert to path
         var px = c * pacmanTileSize;
         var py = r * pacmanTileSize;
         // Erase wall visually (make it transparent so wave effect doesn't hit it)
         if (mazeCtx) {
             mazeCtx.clearRect(px, py, pacmanTileSize, pacmanTileSize);
         }
         // Frightened canvases were removed, so no need to clear them
         AudioSynth.playBreakWall();
         spawnTextParticle(c, r, 'POW!', pacmanThemeDotColor);
     }
 }

var ghostDialogues = {
    0: { // Red (Blinky) - English
        angry: ["I got you!", "Come back here!", "No escape!", "Gotcha!", "Hahaha!", "Muahaha!", "You can't hide!", "I smell fear!", "Turn around!", "Your time is up!", "Don't run!", "I'm right behind you!", "Say your prayers!", "Fresh meat!", "You are mine!", "Peek-a-boo!"],
        scared: ["Help me!", "Oh no!", "Run away!", "Mercy!", "Aaaahhh!", "Eeeeeek!", "Don't hurt me!", "I'm too young to die!", "Leave me alone!", "Mummy!", "I surrender!", "Not in the face!", "I was just kidding!", "I'm friendly!", "Spare me!", "Time to fly!"],
        kill: ["Six seven!", "Emotional damage!", "Wasted!", "Get rekt!", "You died!", "GG bro!"],
        respawn: ["I'm back!", "You will pay!", "Revenge is sweet!", "Round two!", "Miss me?", "I have returned!", "Now it's personal!", "You're going down!", "Vengeance is mine!", "Try that again!"]
    },
    1: { // Pink (Pinky) - Spanish
        angry: ["¡Te pillé!", "¡Vuelve aquí!", "¡No escaparás!", "¡Cuidado!", "¡Jajaja!", "¡Jejeje!", "¡Corre corre!", "¡Te voy a atrapar!", "¡No te escondas!", "¡Es tu fin!", "¡Ven con mami!", "¡Huele a miedo!", "¡Ya eres mío!", "¡Prepárate!", "¡No puedes huir!", "¡Sorpresa!"],
        scared: ["¡Ayúdame!", "¡Socorro!", "¡Déjame!", "¡Piedad!", "¡Aaaaah!", "¡Ay ay ay!", "¡No me hagas daño!", "¡Soy muy joven!", "¡Mamá!", "¡Me rindo!", "¡No en la cara!", "¡Era una broma!", "¡Soy bueno!", "¡Perdóname!", "¡A volar!", "¡Paz hermano!"],
        kill: ["¡Ay caramba!", "¡F en el chat!", "¡Adiós, mi amigo!", "¡Se fue al cielo!", "¡Qué lástima!", "¡Hasta la vista!"],
        respawn: ["¡He vuelto!", "¡Me las pagarás!", "¡La venganza es mía!", "¡Segundo asalto!", "¡Ya estoy aquí!", "¡Ahora es personal!", "¡Prepárate a sufrir!", "¡Vas a caer!", "¡Inténtalo de nuevo!", "¡Regresé más fuerte!"]
    },
    2: { // Cyan (Inky) - Portuguese
        angry: ["Te peguei!", "Volte aqui!", "Agora não escapa!", "Achou que ia fugir?", "Hahaha!", "Muhaha!", "Corre negada!", "Vem pro pai!", "Não tem pra onde correr!", "Eu sinto o cheiro do medo!", "Onde você vai?!", "Vai de base!", "Aqui tem coragem!", "Se correr o bicho pega!", "Game over pra você!", "Olha pra trás!"],
        scared: ["Socorro!", "Deu ruim!", "Ferrou!", "Deixa disso!", "Aaaahhh!", "Eitaaa!", "Não me machuca!", "Sou muito novo pra morrer!", "Chama a polícia!", "Tô brincando!", "Paz e amor!", "Misericórdia!", "Fui!", "Me deixa em paz!", "Salvem-se quem puder!", "Ferrou de vez!"],
        kill: ["Receba!", "Foi de arrasta pra cima!", "Fez o L!", "Foi de berço!", "Toma na jabiraca!", "Foi de base!"],
        respawn: ["Voltei!", "A vingança nunca é plena!", "Agora é pessoal!", "Round dois!", "Achou que eu tinha morrido?", "Sinta a minha fúria!", "Você vai me pagar!", "Tô de volta pro jogo!", "Agora você chora!", "Eu sou imortal!"]
    },
    3: { // Orange (Clyde) - Asian Mix
        angry: ["待て!", "抓住你了!", "बच नहीं सकते!", "フフフ!", "哈哈哈!", "हाहाहा!", "逃がさないぞ!", "覚悟しろ!", "死ね!", "别跑!", "你跑不掉的!", "受死吧!", "रुक जाओ!", "तुम्हारा खेल खत्म!", "डर लग रहा है?", "見つけたぞ!"],
        scared: ["助けて!", "救命!", "बचाओ!", "キャー!", "啊啊啊!", "ओह नहीं!", "やめて!", "許して!", "逃げろ!", "不要伤害我!", "我投降!", "放过我吧!", "मुझे छोड़ दो!", "कृपा करो!", "क्षमा करें!", "ごめんなさい!"],
        kill: ["お前はもう死んでいる!", "六七!", "खत्म!", "やった!", "再见!", "अलविदा!"],
        respawn: ["ただいま!", "復讐してやる!", "覚悟はいいか!", "我回来了!", "复仇时刻!", "你完蛋了!", "मैं वापस आ गया!", "बदला लूंगा!", "अब तुम्हारी खैर नहीं!", "復活!"]
    },
    4: { // Michael Jackson Special Ghost
        spawn: ["Hee hee! Let's dance!", "Shamone!", "This is it!"],
        angry: ["Beat it!", "Don't stop 'til you get enough!", "Annie, are you ok?"],
        scared: ["Thriller night!", "Billie Jean is not my lover!", "Auuu!"],
        kill: ["Smooth criminal!", "You've been struck by...", "Bad! I'm bad!"],
        respawn: ["Keep the faith...", "Nooo! Hee hee...", "Gone too soon..."]
    },
    5: { // Mario Special Ghost
        spawn: ["It's a-me, Mario!", "Let's a-go!", "Mamma mia!"],
        angry: ["Here we go!", "Oki doki!", "Wahoo!"],
        scared: ["Oh no! Mamma mia!", "Mama, help-a me!", "Wahhhhh!"],
        kill: ["So long-a Bowser!", "Oh yeah, Mario time!", "You-a finished!"],
        respawn: ["Arrivederci!", "I'm-a tired...", "Game over!"]
    }
};

var ghostAudioCache = {};

var activeGhostVoices = [];

function stopAllGhostVoices() {
    activeGhostVoices.forEach(function(src) {
        try { src.stop(); } catch(e) {}
    });
    activeGhostVoices = [];
}

function speakGhostDialogue(ghostId, state, index) {
    if (pacmanGameState !== 'playing') return;
    if (typeof AudioSynth === 'undefined' || !AudioSynth.ctx) return;
    
    var url = 'audio/voices/ghost_' + ghostId + '_' + state + '_' + index + '.mp3';
    var ctx = AudioSynth.ctx;
    
    function playBuffer(buffer) {
        if (pacmanGameState !== 'playing') return; // Double check just in case
        
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        // O SEGREDO: playbackRate altera a velocidade E O TOM simultaneamente.
        // 1.8x = Muito mais rápido e quase o dobro da afinação (efeito Tico e Teco perfeito!)
        source.playbackRate.value = 1.8;
        
        var gainNode = ctx.createGain();
        gainNode.gain.value = 1.0; // Volume
        
        source.connect(gainNode);
        if (AudioSynth.speechGain) {
            gainNode.connect(AudioSynth.speechGain);
        } else {
            gainNode.connect(ctx.destination);
        }
        
        activeGhostVoices.push(source);
        source.onended = function() {
            var idx = activeGhostVoices.indexOf(source);
            if (idx > -1) activeGhostVoices.splice(idx, 1);
        };
        
        source.start(0);
    }
    
    if (ghostAudioCache[url]) {
        playBuffer(ghostAudioCache[url]);
    } else {
        fetch(url)
            .then(function(res) { return res.arrayBuffer(); })
            .then(function(buf) { return ctx.decodeAudioData(buf); })
            .then(function(decoded) {
                ghostAudioCache[url] = decoded;
                playBuffer(decoded);
            })
            .catch(function(e) { console.error("Erro ao carregar MP3 da voz do fantasma", e); });
    }
}

function initGhosts() {
     pacmanGhosts = [];
     var ghostColors = ['#ff0000', '#ffb6c1', '#00ffff', '#ffa500'];
     var ghostCorners = [
         {x: 1, y: 1},      // Top-Left
         {x: 25, y: 1},     // Top-Right
         {x: 1, y: 46},     // Bottom-Left
         {x: 25, y: 46}     // Bottom-Right
     ];
     
     var specialType = null;
     var specialGhostIndex = -1;
     if (Math.random() < 0.3) { // 30% chance of a special ghost
         specialGhostIndex = Math.floor(Math.random() * 4);
         specialType = Math.random() < 0.5 ? 'michael' : 'mario';
     }
     
     for (var i = 0; i < 4; i++) {
         var isMJ = (i === specialGhostIndex && specialType === 'michael');
         var isMario = (i === specialGhostIndex && specialType === 'mario');
         
         var gId = isMJ ? 4 : isMario ? 5 : i;
         var gColor = isMJ ? '#ffffff' : isMario ? '#ff0000' : ghostColors[i];
         
         pacmanGhosts.push({
             id: gId,
             special: isMJ ? 'michael' : isMario ? 'mario' : null,
             x: ghostCorners[i].x,
             y: ghostCorners[i].y,
             targetX: ghostCorners[i].x,
             targetY: ghostCorners[i].y,
             spawnX: ghostCorners[i].x,
             spawnY: ghostCorners[i].y,
             progress: 0,
             dir: 'up',
             color: gColor,
             speed: 0.006,
             homeTime: 0,
             isDead: false,
             speechText: "",
             speechTimer: 0,
             speechCooldown: 0
         });
     }
     initGhostReturnFields(ghostCorners);
     if (specialGhostIndex !== -1) {
         ghostReturnFields[specialType === 'michael' ? 4 : 5] = ghostReturnFields[specialGhostIndex];
     }
     
     if (specialGhostIndex !== -1) {
         setTimeout(function() {
             if (pacmanGameState !== 'playing') return;
             var specialId = specialType === 'michael' ? 4 : 5;
             var rIndex = Math.floor(Math.random() * ghostDialogues[specialId]['spawn'].length);
             var gh = pacmanGhosts[specialGhostIndex];
             if (gh && !gh.isDead) {
                 gh.speechText = ghostDialogues[specialId]['spawn'][rIndex];
                 if (gh.speechText.text) gh.speechText = gh.speechText.text; // Handle objects
                 gh.speechTimer = 150;
                 speakGhostDialogue(specialId, 'spawn', rIndex);
             }
         }, 2500);
     }
 }

var ghostReturnFields = [];
function initGhostReturnFields(corners) {
    var rows = pacmanMaze.length;
    var cols = pacmanMaze[0].length;
    ghostReturnFields = [];
    
    for (var i = 0; i < corners.length; i++) {
        var field = new Array(rows);
        for (var r = 0; r < rows; r++) {
            field[r] = new Array(cols).fill(999999999);
        }
        var queue = [];
        var spawnX = corners[i].x;
        var spawnY = corners[i].y;
        
        field[spawnY][spawnX] = 0;
        queue.push({x: spawnX, y: spawnY, dist: 0});
        
        var head = 0;
        while(head < queue.length) {
            var curr = queue[head++];
            if (curr.dist > field[curr.y][curr.x]) continue;
            
            var dirs = [[0,-1], [0,1], [-1,0], [1,0]];
            for (var d = 0; d < 4; d++) {
                var nx = curr.x + dirs[d][0];
                var ny = curr.y + dirs[d][1];
                if (nx < 0) nx = cols - 1;
                else if (nx >= cols) nx = 0;
                
                if (ny >= 0 && ny < rows && pacmanMaze[ny] && pacmanMaze[ny][nx] !== 1) {
                    var ndist = curr.dist + 1;
                    if (ndist < field[ny][nx]) {
                        field[ny][nx] = ndist;
                        queue.push({x: nx, y: ny, dist: ndist});
                    }
                }
            }
        }
        ghostReturnFields.push(field);
    }
}

function checkDotCollision(pl, userName) {
     // Check Gift Drops First (only for main players)
     if (pl.lives !== undefined && typeof pacmanGiftDrops !== 'undefined') {
         var giftIndex = pacmanGiftDrops.findIndex(function(g) {
             return g.active && g.x === pl.targetX && g.y === pl.targetY;
         });
         
         if (giftIndex !== -1) {
             var g = pacmanGiftDrops[giftIndex];
             g.active = false;
             if (typeof activateGiftPower === 'function') {
                 activateGiftPower(pl, userName, g);
             }
             if (pacmanPlayers[userName]) {
                 pacmanPlayers[userName].roundScore = (pacmanPlayers[userName].roundScore || 0) + 500;
             }
             pacmanScore += 500;
             updateDotFlowField(); // Atualizar rotas para evitar que fiquem presos no local do presente vazio
         }
     }

     var dotIndex = pacmanDots.findIndex(function(dot) {
         return dot.active && dot.x === pl.targetX && dot.y === pl.targetY;
     });
     
     if (dotIndex !== -1) {
         var dot = pacmanDots[dotIndex];
         
         // Clones cannot consume power pills, so they just pass over them
         if (dot.power && pl.lives === undefined) {
             // Clone passes over the power pill without doing anything
         } else {
             dot.active = false;
             if (!dot.power) {
                 AudioSynth.playWaka();
             }
             var pts = dot.power ? 50 : 10;
             if (pacmanPlayers[userName]) {
                 pacmanPlayers[userName].roundScore = (pacmanPlayers[userName].roundScore || 0) + pts;
             }
             pacmanScore += pts;
             
             // Trigger zoom and individual power mode on power pill consumption
             if (dot.power) {
                 var isAlreadyPowerMap = pl.powerEndTime && pl.powerEndTime > Date.now();
                 pl.powerEndTime = (isAlreadyPowerMap ? pl.powerEndTime : Date.now()) + 30000;
                 pl.powerTimer = 1; // Used as boolean flag for active power
                 pl.ghostComboCount = 0;
                 AudioSynth.playTone(880, 'sine', 0.4, 0.1);
                 
                 pacmanZoomTarget = {
                     user: userName,
                     x: pl.x + 0.5,
                     y: pl.y + 0.5,
                     color: pl.color,
                     avatar: pl.avatar,
                     timer: 360
                 };
                 pacmanZoomCooldown = 600;
                 pushAlertEvent(`💪 @${userName} comeu uma Pílula de Poder! Apenas ele pode comer fantasmas!`);
             }
             
             spawnDotParticles(pl.targetX, pl.targetY, dot.power ? '#00ffcc' : pacmanThemeDotColor, dot.power ? 20 : 5);
             updatePacmanLeaderboard();
             
             // Check if all dots collected
             if (pacmanDots.every(function(d) { return !d.active; })) {
                 triggerRoundEnd();
             } else {
                 // Update AI flow field so players route to remaining dots
                 updateDotFlowField();
             }
         }
     }
    
    // Check Fruit collision
    var fruitIndex = pacmanFruits.findIndex(function(fr) {
        return fr.active && fr.x === pl.targetX && fr.y === pl.targetY;
    });
    
    if (fruitIndex !== -1) {
        var fr = pacmanFruits[fruitIndex];
        fr.active = false;
        
        var pts = fr.value || 500;
        if (pacmanPlayers[userName]) {
            pacmanPlayers[userName].roundScore = (pacmanPlayers[userName].roundScore || 0) + pts;
        }
        pacmanScore += pts;
        
        spawnTextParticle(pl.targetX, pl.targetY, "+" + pts, pacmanThemeDotColor);
        pushAlertEvent(`${fr.type} @${userName} devorou a fruta bônus de ${pts} pontos!`);
        AudioSynth.playTone(770, 'square', 0.3, 0.1);
        AudioSynth.playTone(880, 'square', 0.3, 0.15); // Little happy tune
        updateDotFlowField();
    }
}

function spawnPacmanPlayer(userName, avatar) {
     if (pacmanPlayers[userName]) {
         if (pacmanPlayers[userName].lives <= 0) {
             pacmanPlayers[userName].lives = 3;
         }
         return;
     }
     
     var existingGlobal = Array.isArray(pacmanGlobalLeaderboard) ? pacmanGlobalLeaderboard.find(function(g) { return g.user.toLowerCase() === userName.toLowerCase(); }) : null;
     var startScore = (existingGlobal && !isNaN(existingGlobal.score)) ? Number(existingGlobal.score) : 0;
     
     var pos = getAvailableSpawnPosition();
     var colorIdx = Object.keys(pacmanPlayers).length % PACMAN_COLORS.length;
     pacmanPlayers[userName] = {
         x: pos.x,
         y: pos.y,
         targetX: pos.x,
         targetY: pos.y,
         progress: 0,
         dir: 'right',
         score: startScore,
         roundScore: 0,
         lives: 3,
         fuel: 0,
         avatar: avatar,
         color: PACMAN_COLORS[colorIdx],
         lastActivityTime: Date.now(),
         spawnProtection: 0,
         speedBoostTimer: 0,
         giftSpeedTimer: 0,
         giftSpeedMultiplier: 1.0,
         ghostComboCount: 0,
         tapTimestamps: [],
         likesBuffer: 0
     };
 }

function findNextMoveAI(pl, isClone) {
     var bestDir = pl.dir || 'right';
     var bestScore = 999999999; // Aumentado para suportar labirintos vazios gigantes
     
     var oppositeDir = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' }[pl.dir];
     
     // Verifica distância inicial dos fantasmas para ajustar comportamento de fuga
     var nearestGhostDist = 999;
     for (var j = 0; j < pacmanGhosts.length; j++) {
         var gh = pacmanGhosts[j];
         if (gh.homeTime > 0) continue;
         var distToGhost = Math.abs(pl.x - gh.x) + Math.abs(pl.y - gh.y);
         if (distToGhost < nearestGhostDist) nearestGhostDist = distToGhost;
     }
     
     var hasPower = pl.powerTimer > 0 || pl.giantTimer > 0;
     var isFleeing = !hasPower && nearestGhostDist < 4;
     
     var dirs = ['right', 'down', 'left', 'up'];
     for (var i = 0; i < dirs.length; i++) {
         var d = dirs[i];
         var dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
         var dy = d === 'up' ? -1 : d === 'down' ? 1 : 0;
         var tx = pl.x + dx;
         var ty = pl.y + dy;
         
         if (tx < 0) tx = pacmanMaze[0].length - 1;
         if (tx >= pacmanMaze[0].length) tx = 0;
         
         if (pacmanMaze[ty] && pacmanMaze[ty][tx] !== 1) {
             // FALLBACK CORRIGIDO PARA 999999. Antes era 9999, o que fazia ele preferir 
             // o vazio do que um ponto que estivesse a 10.000 de custo de distância!
             var targetField = isClone ? cloneFlowField : dotFlowField;
             var score = (targetField[ty] && targetField[ty][tx] !== undefined) ? targetField[ty][tx] : 999999999;
             
             // Penalidade de meia-volta dinâmica!
             var revPenalty = 1000;
             
             if (hasPower) {
                 revPenalty = 3500; // Impede jittering ao caçar fantasmas
             }
             
             // Evitar jittering extremo quando estiver muito rápido (GG)
             if (pl.speedBoostTimer > 0) {
                 revPenalty = 8000;
             }
             
             // Se um fantasma estiver por perto (raio de 6), usamos repulsão forte para evitar o 
             // "jittering" (ir e voltar) na borda do raio de medo (4).
             if (!hasPower && nearestGhostDist < 6) {
                 revPenalty = 4000;
             }
             
             // Se um fantasma estiver MUITO perto (emergência), permitimos a meia-volta instantânea
             if (isFleeing && nearestGhostDist < 3) revPenalty = 10;
             
             if (d !== pl.dir) score += 0.1;
             if (d === oppositeDir) score += revPenalty;
             
             // Pheromone repulsion (max 250)
             var pheroData = pacmanPheromones[tx + ',' + ty];
             var pheroTime = pheroData ? (pheroData.time || pheroData) : 0;
             var pheroAge = Date.now() - pheroTime;
             if (pheroAge < 5000) { 
                 score += (5000 - pheroAge) * 0.05; 
             }
             
             // Lógica Dinâmica de Fantasmas
             var gDist = 99999;
             for (var j = 0; j < pacmanGhosts.length; j++) {
                 if (pacmanGhosts[j].homeTime > 0 || pacmanGhosts[j].isDead) continue;
                 var dG = Math.abs(tx - pacmanGhosts[j].x) + Math.abs(ty - pacmanGhosts[j].y);
                 if (dG < gDist) gDist = dG;
             }
             
             if (hasPower) {
                 if (gDist !== 99999) {
                     // CAÇAR FANTASMAS! Sempre focar no fantasma vivo mais próximo, sem limite de distância.
                     score -= (1000 - gDist) * 2000;
                 }
             } else {
                 if (gDist < 4) {
                     // Forte repulsão. O peso 5000 esmaga qualquer custo de espaço vazio (1000)
                     score += (4 - gDist) * 5000; 
                 }
             }
             
             if (score < bestScore) {
                 bestScore = score;
                 bestDir = d;
             }
         }
     }
     return bestDir;
 }

function getClosestPlayer(ghX, ghY) {
     var closest = null;
     var minDist = 9999;
     
     for (var p in pacmanPlayers) {
         var pl = pacmanPlayers[p];
         if (pl.lives <= 0) continue;
         var dist = Math.hypot(pl.x - ghX, pl.y - ghY);
         if (dist < minDist && pl.spawnProtection <= 0) {
             minDist = dist;
             closest = pl;
         }
     }
     return closest;
 }

function getAvailableSpawnPosition() {
     // Find a safe position in the ghost house area
     var candidates = [];
     for (var c = 10; c <= 14; c++) {
         for (var r = 17; r <= 21; r++) {
             if (pacmanMaze[r] && pacmanMaze[r][c] === 0) {
                 candidates.push({ x: c, y: r });
             }
         }
     }
     return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : { x: 13, y: 19 };
 }

function getAvailableGiftSpawnPosition() {
    var validSpots = [];
    for (var r = 1; r < pacmanMaze.length - 1; r++) {
        for (var c = 1; c < pacmanMaze[0].length - 1; c++) {
            if (pacmanMaze[r][c] === 0) {
                // Don't spawn inside ghost house
                if (r >= 15 && r <= 23 && c >= 8 && c <= 16) continue;
                validSpots.push({ x: c, y: r });
            }
        }
    }
    
    // Shuffle valid spots
    for (var i = validSpots.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = validSpots[i];
        validSpots[i] = validSpots[j];
        validSpots[j] = temp;
    }
    
    // Find a spot that is far from existing drops
    for (var i = 0; i < validSpots.length; i++) {
        var spot = validSpots[i];
        var isFar = true;
        if (typeof pacmanGiftDrops !== 'undefined') {
            for (var j = 0; j < pacmanGiftDrops.length; j++) {
                var g = pacmanGiftDrops[j];
                if (g.active) {
                    var dist = Math.abs(g.x - spot.x) + Math.abs(g.y - spot.y);
                    if (dist < 10) { // Minimum Manhattan distance between gifts
                        isFar = false;
                        break;
                    }
                }
            }
        }
        if (isFar) return spot;
    }
    
    // Fallback if map is too crowded
    return validSpots[0] || { x: 1, y: 1 };
}

function resetGhostCombos() {
     for (var i = 0; i < pacmanGhosts.length; i++) {
         // APENAS remove o estado 'comido' caso estejam fugindo, 
         // mas NÃO reseta a posição deles! Eles mantém a posição atual.
         // Se eles estavam mortos (homeTime > 0), eles continuam mortos até o tempo acabar.
     }
     for (var p in pacmanPlayers) {
         pacmanPlayers[p].ghostComboCount = 0;
     }
 }

function triggerRoundEnd() {
    pacmanGameState = 'round_end';
    pacmanRoundEndMode = 'match';
    window.pacmanRoundEndStart = Date.now(); // Marca o início para animação de count-up
    AudioSynth.playVictoryFanfare();
    setTimeout(function() {
        AudioSynth.playIntermissionMusic();
    }, 1000);
    AudioSynth.stopSiren(); // Stop the ambient siren during the transition
    stopAllGhostVoices(); // Interrompe qualquer fala de fantasma que esteja tocando

    
    pushAlertEvent(`🎉 FASE COMPLETADA! Exibindo classificação da rodada...`);
    
    // Send scores to the server to persist
    if (ws && ws.readyState === 1) {
        var scoreData = Object.keys(pacmanPlayers).map(function(p) {
            return {
                user: p,
                nickname: p,
                avatar: pacmanPlayers[p].avatar || '',
                score: pacmanPlayers[p].score
            };
        });
        ws.send(JSON.stringify({ action: 'save_scores', scores: scoreData }));
    }
    
    // Atualiza o Placar Geral localmente (High Scores de todos os tempos)
    var playerList = Object.keys(pacmanPlayers).map(function(p) {
        // Consolidate the round score into the global score NOW, at the end of the round.
        pacmanPlayers[p].score += (pacmanPlayers[p].roundScore || 0);
        return {
            user: p,
            score: pacmanPlayers[p].score,
            avatar: pacmanPlayers[p].avatar || ''
        };
    });
    
    playerList.forEach(function(pl) {
        var existing = pacmanGlobalLeaderboard.find(function(g) { return g.user === pl.user; });
        if (existing) {
            existing.score = Math.max(existing.score, pl.score);
            if (pl.avatar) existing.avatar = pl.avatar;
        } else {
            pacmanGlobalLeaderboard.push(pl);
        }
    });
    
    pacmanGlobalLeaderboard.sort(function(a, b) { return b.score - a.score; });
    try {
        localStorage.setItem('pacmanGlobalLeaderboard', JSON.stringify(pacmanGlobalLeaderboard));
    } catch(e) {}
    
    // Atualiza a UI do placar geral apenas no final da partida (para evitar stuttering)
    commitLeaderboardUpdate();
    
    // After 10 seconds, switch to overall leaderboard (allowing almost 2 full animation cycles)
    setTimeout(function() {
        pacmanRoundEndMode = 'overall';
        window.pacmanRoundEndStart = Date.now(); // Reinicia a animação!
        window.pacmanCachedDisplayPlayers = null; // Invalida o cache
        pushAlertEvent(`🏆 Exibindo o Placar Geral histórico...`);
    }, 10000);
    
    // After 20 seconds total, transition to next level
    setTimeout(function() {
        triggerLevelUp();
    }, 20000);
}

function triggerLevelUp() {
    try {
        pacmanLevel++;
        spawnTextParticle(13, 24, `FASE ${pacmanLevel}!`, '#00ffff');
        pushAlertEvent(`🎉 Avançando para o Nível ${pacmanLevel}!`);
        
        // Screen Flash VFX
        var canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.boxShadow = '0 0 35px #00ffff';
            setTimeout(function() {
                if (canvas) canvas.style.boxShadow = '0 0 15px #0055ff';
            }, 1000);
        }
        
        // Reset Board with increased difficulty (ghost speed increments) and new procedural map
        generateProceduralMaze();
        initPacmanMaze();
        renderMazeStatic();
        initGhosts(); // Ghosts always reset to base speed - no escalation
        
        // Give all living players extra points and reset their positions to safety
        for (var p in pacmanPlayers) {
            var pl = pacmanPlayers[p];
            pl.roundScore = 0; // Reset score of the round
            pl.powerTimer = 0; // Zerar skills da rodada anterior
            pl.giantTimer = 0;
            pl.giftSpeedTimer = 0;
            pl.giftSpeedMultiplier = 1;
            pl.ghostComboCount = 0;
            if (pl.lives > 0) {
                pl.score += 500;
                pl.roundScore += 500;
                var pos = getAvailableSpawnPosition();
                pl.x = pos.x;
                pl.y = pos.y;
                pl.targetX = pos.x;
                pl.targetY = pos.y;
                pl.progress = 0;
                pl.spawnProtection = 240;
            }
        }
        updatePacmanLeaderboard();
        
        // Set game state back to playing
        pacmanGameState = 'playing';
        
        // Play start of match/new level melody
        try {
            AudioSynth.playStartMelody();
        } catch (e) {
            console.warn('Could not play start melody:', e);
        }
    } catch (err) {
        console.error('[LevelUp] Error advancing level:', err);
        // Force recovery so game is never stuck
        pacmanGameState = 'playing';
    }
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Lista de Jogadores Ignorados no Placar
// Adicione aqui qualquer nome falso/conta de teste gerado para testes (sem o '@', apenas minúsculas).
var IGNORED_PLAYERS_LIST = [
    'speedy58',
    'speed29',
    'player',
    'teste',
    'testplayer'
];

function isPlayerBanned(username) {
    if (!username) return true;
    var u = String(username).toLowerCase().trim().replace(/^@/, ''); // Remove o @ para a checagem
    
    // Bloqueia bots gerados pelo atalho S
    if (u.startsWith('bot_')) return true;
    
    // Bloqueia jogadores na lista de ignorados
    if (IGNORED_PLAYERS_LIST.includes(u)) return true;
    
    return false;
}

function drawRoundEndOverlay() {
    if (!pacmanCtx) return;
    
    var w = 1080;
    var h = 1920;
    
    // 1. Semi-transparent black backdrop
    pacmanCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    pacmanCtx.fillRect(0, 0, w, h);
    
    // 2. Setup Title, Subtitle, Footer and data source depending on mode
    var titleText = '';
    var subtitleText = '';
    var footerText = '';
    var displayPlayers = [];
    
    // Configura textos
    if (pacmanRoundEndMode === 'match') {
        titleText = '🏆 FASE COMPLETADA 🏆';
        subtitleText = `Classificação da Rodada (Fase ${pacmanLevel})`;
        footerText = 'Exibindo placar geral em breve...';
    } else {
        titleText = '🏆 PLACAR GERAL 🏆';
        subtitleText = 'Melhores Pontuações de Sempre (Top 20)';
        footerText = 'Preparando o próximo labirinto...';
    }
    
    // CACHE de Jogadores para não fazer Sort a 60 frames por segundo (mata a performance)
    if (!window.pacmanCachedDisplayPlayers || window.pacmanCachedRoundEndMode !== pacmanRoundEndMode) {
        window.pacmanCachedRoundEndMode = pacmanRoundEndMode;
        
        if (pacmanRoundEndMode === 'match') {
            window.pacmanCachedDisplayPlayers = Object.keys(pacmanPlayers)
            .filter(function(p) { return !isPlayerBanned(p); })
            .map(function(p) {
                return {
                    name: p,
                    score: pacmanPlayers[p].roundScore || 0,
                    color: pacmanPlayers[p].color,
                    avatar: pacmanPlayers[p].avatar
                };
            }).sort(function(a, b) {
                return b.score - a.score;
            });
        } else {
            var rawLeaderboard = Array.isArray(pacmanGlobalLeaderboard) ? pacmanGlobalLeaderboard : [];
            window.pacmanCachedDisplayPlayers = rawLeaderboard.filter(function(p) {
                return !isPlayerBanned(p.user);
            }).map(function(p, index) {
                var username = String(p.user).toLowerCase();
                return {
                    name: String(p.user),
                    score: Number(p.score) || 0,
                    color: pacmanPlayers[username] ? pacmanPlayers[username].color : PACMAN_COLORS[index % PACMAN_COLORS.length],
                    avatar: p.avatar || ''
                };
            }).sort(function(a, b) {
                return b.score - a.score;
            });
        }
    }
    
    displayPlayers = window.pacmanCachedDisplayPlayers;
    
    // Animation Progress (0.0 to 1.0)
    // Starts exactly at 0 and takes 3.5 seconds to reach 1.0
    var elapsed = Date.now() - (window.pacmanRoundEndStart || Date.now());
    var animProgress = Math.min(1.0, elapsed / 3500); 
    // Smooth ease out for score scaling
    var easeOut = 1 - Math.pow(1 - animProgress, 4);

    if (pacmanRoundEndMode === 'match') {
        // --- DRAW MATCH PODIUM CARD ---
        var cardW = 800;
        var cardH = 1100;
        var cardX = (w - cardW) / 2;
        var cardY = (h - cardH) / 2;
        
        // --- DRAW FUN ANIMATION ---
        drawRankingFunAnimation(displayPlayers, elapsed, w, h, cardY, cardY + cardH);

        // Glow effect
        pacmanCtx.save();
        pacmanCtx.shadowBlur = 30;
        pacmanCtx.shadowColor = '#00ffff';
        pacmanCtx.fillStyle = 'rgba(11, 11, 30, 0.95)';
        pacmanCtx.strokeStyle = '#00ffff';
        pacmanCtx.lineWidth = 6;
        
        roundRect(pacmanCtx, cardX, cardY, cardW, cardH, 20);
        pacmanCtx.fill();
        pacmanCtx.stroke();
        pacmanCtx.restore();
        
        // Draw Title
        pacmanCtx.textAlign = 'center';
        pacmanCtx.textBaseline = 'middle';
        
        pacmanCtx.save();
        pacmanCtx.shadowBlur = 15;
        pacmanCtx.shadowColor = '#ffff00';
        pacmanCtx.fillStyle = '#ffff00';
        pacmanCtx.font = 'bold 50px Outfit, Inter, sans-serif';
        pacmanCtx.fillText(titleText, w / 2, cardY + 100);
        pacmanCtx.restore();
        
        pacmanCtx.fillStyle = '#ffffff';
        pacmanCtx.font = '28px Inter, sans-serif';
        pacmanCtx.fillText(subtitleText, w / 2, cardY + 170);
        
        // Separator line
        pacmanCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        pacmanCtx.lineWidth = 2;
        pacmanCtx.beginPath();
        pacmanCtx.moveTo(cardX + 80, cardY + 220);
        pacmanCtx.lineTo(cardX + cardW - 80, cardY + 220);
        pacmanCtx.stroke();
        
        // Podium Layout for Top 3
        var podiumCenterY = cardY + 450;
        var podiumCenterX = w / 2;
        
        var pPositions = [
            { x: podiumCenterX, y: podiumCenterY - 60, scale: 1.4, medal: '🥇', color: '#FFD700', boxH: 180 }, // 1st
            { x: podiumCenterX - 230, y: podiumCenterY + 10, scale: 1.1, medal: '🥈', color: '#C0C0C0', boxH: 110 }, // 2nd
            { x: podiumCenterX + 230, y: podiumCenterY + 40, scale: 0.95, medal: '🥉', color: '#CD7F32', boxH: 80 }  // 3rd
        ];
        
        // Draw Podium Pillars First (background)
        for (var i = 0; i < Math.min(displayPlayers.length, 3); i++) {
            var pos = pPositions[i];
            var pillarW = 200 * pos.scale;
            
            pacmanCtx.fillStyle = `rgba(30, 30, 50, 0.8)`;
            pacmanCtx.strokeStyle = pos.color;
            pacmanCtx.lineWidth = 3;
            
            var pillarX = pos.x - pillarW/2;
            var pillarY = pos.y + 110 * pos.scale;
            
            pacmanCtx.beginPath();
            pacmanCtx.roundRect(pillarX, pillarY, pillarW, pos.boxH, [10, 10, 0, 0]);
            pacmanCtx.fill();
            pacmanCtx.stroke();
            
            pacmanCtx.fillStyle = pos.color;
            pacmanCtx.textAlign = 'center';
            pacmanCtx.font = 'bold ' + (50 * pos.scale) + 'px Outfit, sans-serif';
            pacmanCtx.fillText(i + 1, pos.x, pillarY + pos.boxH/2 + 15 * pos.scale);
        }
        
        // Draw Top 3 Players on Podium
        for (var i = 0; i < Math.min(displayPlayers.length, 3); i++) {
            var pl = displayPlayers[i];
            var pos = pPositions[i];
            
            var avatarSize = 100 * pos.scale;
            var img = getAvatarImage(pl.name, pl.avatar);
            
            pacmanCtx.save();
            
            pacmanCtx.beginPath();
            pacmanCtx.arc(pos.x, pos.y, avatarSize / 2, 0, Math.PI * 2);
            pacmanCtx.clip();
            
            if (img && img.complete) {
                pacmanCtx.drawImage(img, pos.x - avatarSize / 2, pos.y - avatarSize / 2, avatarSize, avatarSize);
            } else {
                pacmanCtx.fillStyle = pl.color;
                pacmanCtx.fillRect(pos.x - avatarSize / 2, pos.y - avatarSize / 2, avatarSize, avatarSize);
            }
            pacmanCtx.restore();
            
            pacmanCtx.strokeStyle = pos.color;
            pacmanCtx.lineWidth = 5 * pos.scale;
            pacmanCtx.beginPath();
            pacmanCtx.arc(pos.x, pos.y, avatarSize / 2, 0, Math.PI * 2);
            pacmanCtx.stroke();
            
            pacmanCtx.textAlign = 'center';
            pacmanCtx.font = (40 * pos.scale) + 'px Arial';
            pacmanCtx.fillText(pos.medal, pos.x, pos.y - avatarSize/2 - 10);
            
            pacmanCtx.fillStyle = '#ffffff';
            pacmanCtx.font = 'bold ' + (22 * pos.scale) + 'px Inter, sans-serif';
            pacmanCtx.fillText('@' + pl.name.substring(0, 10), pos.x, pos.y + avatarSize/2 + 30 * pos.scale);
            
            var displayScore = Math.floor((Number(pl.score) || 0) * easeOut);
            pacmanCtx.fillStyle = pl.color;
            pacmanCtx.font = 'bold ' + (28 * pos.scale) + 'px "Press Start 2P", monospace';
            pacmanCtx.fillText(displayScore.toLocaleString(), pos.x, pos.y + avatarSize/2 + 70 * pos.scale);
        }
        
        // Draw Remaining Players (4th to 6th) in a compact list below the podium
        var listStartY = podiumCenterY + 280;
        var rowHeight = 70;
        
        for (var i = 3; i < Math.min(displayPlayers.length, 6); i++) {
            var pl = displayPlayers[i];
            var py = listStartY + (i - 3) * rowHeight;
            
            pacmanCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            roundRect(pacmanCtx, cardX + 100, py - 30, cardW - 200, 60, 10);
            pacmanCtx.fill();
            
            pacmanCtx.textAlign = 'left';
            pacmanCtx.fillStyle = '#aaaaaa';
            pacmanCtx.font = 'bold 24px Inter, sans-serif';
            pacmanCtx.fillText(`#${i + 1}  @${pl.name}`, cardX + 130, py + 8);
            
            var displayScore = Math.floor((Number(pl.score) || 0) * easeOut);
            pacmanCtx.textAlign = 'right';
            pacmanCtx.fillStyle = pl.color;
            pacmanCtx.font = 'bold 24px "Press Start 2P", monospace';
            pacmanCtx.fillText(displayScore.toLocaleString() + ' pts', cardX + cardW - 130, py + 8);
        }
        
        // Draw Footer (Next stage timer)
        pacmanCtx.textAlign = 'center';
        pacmanCtx.fillStyle = '#8888ff';
        pacmanCtx.font = 'italic 24px Inter, sans-serif';
        pacmanCtx.fillText(footerText, w / 2, cardY + cardH - 60);

    } else {
        // --- DRAW OVERALL RANKING FULL SCREEN ---
        pacmanCtx.textAlign = 'center';
        pacmanCtx.textBaseline = 'middle';
        
        // Glow for Title
        pacmanCtx.save();
        pacmanCtx.shadowBlur = 25;
        pacmanCtx.shadowColor = '#00ffff';
        pacmanCtx.fillStyle = '#00ffff';
        pacmanCtx.font = 'bold 60px Outfit, Inter, sans-serif';
        pacmanCtx.fillText(titleText, w / 2, 130);
        pacmanCtx.restore();
        
        pacmanCtx.fillStyle = '#ffffff';
        pacmanCtx.font = '32px Inter, sans-serif';
        pacmanCtx.fillText(subtitleText, w / 2, 210);
        
        // Separator
        pacmanCtx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        pacmanCtx.lineWidth = 3;
        pacmanCtx.beginPath();
        pacmanCtx.moveTo(w/2 - 300, 260);
        pacmanCtx.lineTo(w/2 + 300, 260);
        pacmanCtx.stroke();
        
        // Top 20 List
        var maxPlayers = Math.min(displayPlayers.length, 20);
        var listStartY = 310;
        var rowHeight = 75; // Fits up to 20 easily
        
        for (var i = 0; i < maxPlayers; i++) {
            var pl = displayPlayers[i];
            var py = listStartY + i * rowHeight;
            
            // Highlight background for top 3
            if (i === 0) pacmanCtx.fillStyle = 'rgba(255, 215, 0, 0.15)';
            else if (i === 1) pacmanCtx.fillStyle = 'rgba(192, 192, 192, 0.12)';
            else if (i === 2) pacmanCtx.fillStyle = 'rgba(205, 127, 50, 0.1)';
            else pacmanCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            
            roundRect(pacmanCtx, 80, py, w - 160, 65, 12);
            pacmanCtx.fill();
            
            // Rank medal or number
            pacmanCtx.textAlign = 'left';
            pacmanCtx.fillStyle = pl.color || '#ffffff';
            pacmanCtx.font = 'bold 28px Inter, sans-serif';
            var rankLabel = `#${i + 1}`;
            if (i === 0) rankLabel = '🥇 1';
            else if (i === 1) rankLabel = '🥈 2';
            else if (i === 2) rankLabel = '🥉 3';
            
            pacmanCtx.fillText(rankLabel, 110, py + 33);
            
            // Avatar
            var avatarSize = 46;
            var img = getAvatarImage(pl.name, pl.avatar);
            pacmanCtx.save();
            pacmanCtx.beginPath();
            pacmanCtx.arc(230, py + 32, avatarSize / 2, 0, Math.PI * 2);
            pacmanCtx.clip();
            if (img && img.complete) {
                pacmanCtx.drawImage(img, 230 - avatarSize/2, py + 32 - avatarSize/2, avatarSize, avatarSize);
            } else {
                pacmanCtx.fillStyle = pl.color || '#00ffcc';
                pacmanCtx.fillRect(230 - avatarSize/2, py + 32 - avatarSize/2, avatarSize, avatarSize);
            }
            pacmanCtx.restore();
            
            // Name
            pacmanCtx.fillStyle = '#ffffff';
            pacmanCtx.font = 'bold 26px Inter, sans-serif';
            pacmanCtx.fillText(`@${pl.name.substring(0, 16)}`, 270, py + 34);
            
            // Score (Sem animação no placar geral)
            var displayScore = Number(pl.score) || 0;
            pacmanCtx.textAlign = 'right';
            pacmanCtx.fillStyle = pl.color || '#00ffcc';
            pacmanCtx.font = 'bold 26px "Press Start 2P", monospace';
            pacmanCtx.fillText(displayScore.toLocaleString() + ' PTS', w - 110, py + 34);
        }
        
        // Footer
        pacmanCtx.textAlign = 'center';
        pacmanCtx.fillStyle = '#8888ff';
        pacmanCtx.font = 'italic 26px Inter, sans-serif';
        pacmanCtx.fillText(footerText, w / 2, h - 40);
    }
}

function spawnFruit() {
    var pos = getAvailableSpawnPosition();
    var fruitTypes = ['🍒', '🍓', '🍑', '🍎', '🍇'];
    var type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    var val = (fruitTypes.indexOf(type) + 1) * 300;
    
    // Kept dot active so fruits stay in front of the dots (no temporary deactivation)
    pacmanFruits.push({ x: pos.x, y: pos.y, active: true, value: val, type: type, restoredDot: false });
    spawnTextParticle(pos.x, pos.y, `${type} FRUTA!`, '#ff5500');
    pushAlertEvent(`🍒 Uma Fruta Bônus surgiu no labirinto!`); // Call it manually or let the animation frame handle it
}

function drawRankingFunAnimation(players, elapsed, w, h, cardY, cardBottomY) {
    // Top space center
    var topSpaceY = cardY / 2;
    // Bottom space center
    var bottomSpaceY = cardBottomY + (h - cardBottomY) / 2;
    
    // Cycle every 6000ms. We add 1200ms offset so the characters are already entering the screen
    // when the ranking appears, removing the empty "delay" feeling.
    var cycle = (elapsed + 1200) % 6000;
    
    var ghostColors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
    
    // Scale slightly larger than game: game is usually 30-40 tile size, let's use radius 45
    var scale = 45;
    
    // Top Animation: Left to Right
    var topX = -300 + (cycle / 6000) * (w + 1000);
    // Draw top 3 players running away from ghosts
    var topPlayers = players.slice(0, 3);
    
    pacmanCtx.save();
    // Ghosts chasing (Right, left of players)
    for (let i = 0; i < 4; i++) {
        let gx = topX - 140 - i * 90;
        if (gx > -100 && gx < w + 100) {
            drawSimpleGhost(gx, topSpaceY, scale, 'right', ghostColors[i], elapsed, 'angry');
        }
    }
    
    // Players running ahead (Right, right of ghosts)
    for (let i = 0; i < topPlayers.length; i++) {
        let px = topX + (topPlayers.length - 1 - i) * 100;
        if (px > -100 && px < w + 100) {
            drawSimplePacman(px, topSpaceY, scale, 'right', topPlayers[i], elapsed);
            // Draw name above
            pacmanCtx.font = "bold 18px Inter";
            pacmanCtx.fillStyle = topPlayers[i].color || '#fff';
            pacmanCtx.textAlign = 'center';
            pacmanCtx.lineWidth = 3;
            pacmanCtx.strokeStyle = '#000';
            pacmanCtx.strokeText(topPlayers[i].name, px, topSpaceY - scale - 15);
            pacmanCtx.fillText(topPlayers[i].name, px, topSpaceY - scale - 15);
        }
    }
    pacmanCtx.restore();
    
    // Bottom Animation: Right to Left
    var bottomX = w + 300 - (cycle / 6000) * (w + 1000);
    
    pacmanCtx.save();
    // Ghosts chasing (Left, right of players)
    for (let i = 0; i < 4; i++) {
        let gx = bottomX + 140 + i * 90;
        if (gx > -100 && gx < w + 100) {
            drawSimpleGhost(gx, bottomSpaceY, scale, 'left', ghostColors[i], elapsed, 'angry');
        }
    }
    
    // Players running ahead (Left, left of ghosts)
    for (let i = 0; i < topPlayers.length; i++) {
        let px = bottomX - (topPlayers.length - 1 - i) * 100;
        if (px > -100 && px < w + 100) {
            drawSimplePacman(px, bottomSpaceY, scale, 'left', topPlayers[i], elapsed);
            // Draw name above
            pacmanCtx.font = "bold 18px Inter";
            pacmanCtx.fillStyle = topPlayers[i].color || '#fff';
            pacmanCtx.textAlign = 'center';
            pacmanCtx.lineWidth = 3;
            pacmanCtx.strokeStyle = '#000';
            pacmanCtx.strokeText(topPlayers[i].name, px, bottomSpaceY - scale - 15);
            pacmanCtx.fillText(topPlayers[i].name, px, bottomSpaceY - scale - 15);
        }
    }
    pacmanCtx.restore();
}

function drawSpeechBubble(ctx, px, py, text) {
    ctx.save();
    ctx.font = "bold 20px Inter"; // Increased by ~30%
    var textWidth = ctx.measureText(text).width;
    var bubbleW = textWidth + 26;
    var bubbleH = 34;
    var bubbleX = px - bubbleW / 2;
    var bubbleY = py - 55; // Above ghost
    
    // Canvas bounds check
    if (bubbleX < 5) bubbleX = 5;
    if (bubbleX + bubbleW > 1075) bubbleX = 1075 - bubbleW;
    
    // Draw bubble and tail
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    var r = 8; // border radius
    ctx.moveTo(bubbleX + r, bubbleY);
    ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH);
    
    // The tail on the bottom edge pointing to ghost
    var tailBaseX = px;
    if (tailBaseX < bubbleX + 15) tailBaseX = bubbleX + 15;
    if (tailBaseX > bubbleX + bubbleW - 15) tailBaseX = bubbleX + bubbleW - 15;
    
    ctx.lineTo(tailBaseX + 8, bubbleY + bubbleH);
    ctx.lineTo(px, py - 18); // Point down exactly to ghost head
    ctx.lineTo(tailBaseX - 8, bubbleY + bubbleH);
    
    ctx.lineTo(bubbleX + r, bubbleY + bubbleH);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r);
    ctx.lineTo(bubbleX, bubbleY + r);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2 + 1);
    ctx.restore();
}

function drawGhostFace(gx, gy, dir, scale, state, isSpecial) {
    pacmanCtx.save();
    pacmanCtx.translate(gx, gy);
    if (isSpecial) {
        pacmanCtx.scale(0.75, 0.75);
        pacmanCtx.translate(0, 4 * scale);
    }
    var lGx = 0, lGy = 0;
    
    var eyeOffsetX = 0, eyeOffsetY = 0;
    if (dir === 'left') eyeOffsetX = -2 * scale;
    else if (dir === 'right') eyeOffsetX = 2 * scale;
    else if (dir === 'up') eyeOffsetY = -2 * scale;
    else if (dir === 'down') eyeOffsetY = 2 * scale;
    
    // Eyes Background
    pacmanCtx.fillStyle = '#ffffff';
    pacmanCtx.strokeStyle = '#000000';
    pacmanCtx.lineWidth = 1;
    pacmanCtx.beginPath(); pacmanCtx.arc(lGx - 5 * scale + eyeOffsetX, lGy - 6 * scale + eyeOffsetY, 4 * scale, 0, Math.PI*2); pacmanCtx.fill();
    if (isSpecial) pacmanCtx.stroke();
    pacmanCtx.beginPath(); pacmanCtx.arc(lGx + 5 * scale + eyeOffsetX, lGy - 6 * scale + eyeOffsetY, 4 * scale, 0, Math.PI*2); pacmanCtx.fill();
    if (isSpecial) pacmanCtx.stroke();
    
    // Pupils
    var pupilOffsetX = (dir === 'left') ? -0.5 * scale : (dir === 'right') ? 0.5 * scale : 0;
    var pupilOffsetY = (dir === 'up') ? -0.5 * scale : (dir === 'down') ? 0.5 * scale : 0;
    
    if (state === 'scared') {
        pacmanCtx.fillStyle = '#ff0000';
        pacmanCtx.beginPath(); pacmanCtx.arc(lGx - 5 * scale + eyeOffsetX + pupilOffsetX, lGy - 6 * scale + eyeOffsetY + pupilOffsetY, 2 * scale, 0, Math.PI*2); pacmanCtx.fill();
        pacmanCtx.beginPath(); pacmanCtx.arc(lGx + 5 * scale + eyeOffsetX + pupilOffsetX, lGy - 6 * scale + eyeOffsetY + pupilOffsetY, 2 * scale, 0, Math.PI*2); pacmanCtx.fill();
    } else {
        pacmanCtx.fillStyle = isSpecial ? '#000000' : '#0000dd';
        pacmanCtx.beginPath(); pacmanCtx.arc(lGx - 5 * scale + eyeOffsetX + pupilOffsetX, lGy - 6 * scale + eyeOffsetY + pupilOffsetY, 2 * scale, 0, Math.PI*2); pacmanCtx.fill();
        pacmanCtx.beginPath(); pacmanCtx.arc(lGx + 5 * scale + eyeOffsetX + pupilOffsetX, lGy - 6 * scale + eyeOffsetY + pupilOffsetY, 2 * scale, 0, Math.PI*2); pacmanCtx.fill();
    }
    
    if (state === 'dead') {
        pacmanCtx.restore();
        return; // Dead ghosts are just eyes
    }
    
    // Expressions
    pacmanCtx.lineWidth = 1.5 * scale;
    pacmanCtx.lineCap = 'round';
    pacmanCtx.lineJoin = 'round';
    
    if (state === 'angry') {
        pacmanCtx.strokeStyle = '#000000';
        // Angry Eyebrows \ /
        pacmanCtx.beginPath(); pacmanCtx.moveTo(lGx - 8 * scale + eyeOffsetX, lGy - 11 * scale + eyeOffsetY); pacmanCtx.lineTo(lGx - 3 * scale + eyeOffsetX, lGy - 9 * scale + eyeOffsetY); pacmanCtx.stroke();
        pacmanCtx.beginPath(); pacmanCtx.moveTo(lGx + 8 * scale + eyeOffsetX, lGy - 11 * scale + eyeOffsetY); pacmanCtx.lineTo(lGx + 3 * scale + eyeOffsetX, lGy - 9 * scale + eyeOffsetY); pacmanCtx.stroke();
        
        // Angry Mouth (sharp zigzag)
        pacmanCtx.beginPath();
        var my = lGy + 3 * scale;
        pacmanCtx.moveTo(lGx - 5 * scale, my);
        pacmanCtx.lineTo(lGx - 2.5 * scale, my - 2 * scale);
        pacmanCtx.lineTo(lGx, my);
        pacmanCtx.lineTo(lGx + 2.5 * scale, my - 2 * scale);
        pacmanCtx.lineTo(lGx + 5 * scale, my);
        pacmanCtx.stroke();
    } else if (state === 'scared') {
        pacmanCtx.strokeStyle = '#222';
        // Scared Eyebrows / \
        pacmanCtx.beginPath(); pacmanCtx.moveTo(lGx - 7 * scale + eyeOffsetX, lGy - 9 * scale + eyeOffsetY); pacmanCtx.lineTo(lGx - 3 * scale + eyeOffsetX, lGy - 11 * scale + eyeOffsetY); pacmanCtx.stroke();
        pacmanCtx.beginPath(); pacmanCtx.moveTo(lGx + 7 * scale + eyeOffsetX, lGy - 9 * scale + eyeOffsetY); pacmanCtx.lineTo(lGx + 3 * scale + eyeOffsetX, lGy - 11 * scale + eyeOffsetY); pacmanCtx.stroke();
        
        // Wavy/Zigzag Mouth (longer)
        pacmanCtx.beginPath();
        var my = lGy + 5 * scale;
        pacmanCtx.moveTo(lGx - 6 * scale, my);
        pacmanCtx.lineTo(lGx - 4 * scale, my - 1.5 * scale);
        pacmanCtx.lineTo(lGx - 2 * scale, my + 1.5 * scale);
        pacmanCtx.lineTo(lGx, my - 1.5 * scale);
        pacmanCtx.lineTo(lGx + 2 * scale, my + 1.5 * scale);
        pacmanCtx.lineTo(lGx + 4 * scale, my - 1.5 * scale);
        pacmanCtx.lineTo(lGx + 6 * scale, my);
        pacmanCtx.stroke();
    } else {
        // Normal Mouth (straight small line)
        pacmanCtx.strokeStyle = '#111111';
        pacmanCtx.beginPath();
        pacmanCtx.moveTo(lGx - 3 * scale, lGy + 4 * scale);
        pacmanCtx.lineTo(lGx + 3 * scale, lGy + 4 * scale);
        pacmanCtx.stroke();
    }
    
    pacmanCtx.restore();
}

function drawMichaelJacksonAccessories(gx, gy, dir, scale, state) {
    if (state === 'dead') return;
    
    // Fedora Hat
    pacmanCtx.save();
    pacmanCtx.translate(gx, gy - 12 * scale); // Lower the hat back down since the face is lower now
    
    // Slight tilt depending on direction
    if (dir === 'left') pacmanCtx.rotate(-0.1);
    else if (dir === 'right') pacmanCtx.rotate(0.1);
    else if (dir === 'down') pacmanCtx.translate(0, 2 * scale); // Hat covers less when moving down
    
    // Brim
    pacmanCtx.fillStyle = '#111111';
    pacmanCtx.beginPath();
    pacmanCtx.ellipse(0, 0, 12 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
    pacmanCtx.fill();
    
    // Crown
    pacmanCtx.beginPath();
    pacmanCtx.rect(-7 * scale, -8 * scale, 14 * scale, 8 * scale);
    pacmanCtx.fill();
    
    // White Ribbon
    pacmanCtx.fillStyle = '#ffffff';
    pacmanCtx.fillRect(-7 * scale, -3 * scale, 14 * scale, 2 * scale);
    
    pacmanCtx.restore();
    
    // Sparkly Glove (Left hand, meaning right side of screen)
    var time = Date.now();
    var bobbing = Math.sin(time / 100) * 3 * scale;
    var gloveX = gx + 12 * scale;
    var gloveY = gy + bobbing;
    
    if (dir === 'left') {
        gloveX = gx - 12 * scale; // Switch side if moving left
    }
    
    pacmanCtx.save();
    pacmanCtx.translate(gloveX, gloveY);
    
    // Glove base
    pacmanCtx.fillStyle = '#e0e0e0';
    pacmanCtx.beginPath();
    pacmanCtx.arc(0, 0, 4 * scale, 0, Math.PI * 2);
    pacmanCtx.fill();
    
    // Sparkles
    pacmanCtx.fillStyle = '#ffffff';
    if (Math.floor(time / 50) % 2 === 0) pacmanCtx.fillRect(-2 * scale, -2 * scale, 1 * scale, 1 * scale);
    if (Math.floor(time / 70) % 2 === 0) pacmanCtx.fillRect(1 * scale, 1 * scale, 1 * scale, 1 * scale);
    if (Math.floor(time / 90) % 2 === 0) pacmanCtx.fillRect(2 * scale, -1 * scale, 1 * scale, 1 * scale);
    
    pacmanCtx.restore();
}

function drawMarioAccessories(gx, gy, dir, scale, state) {
    if (state === 'dead') return;
    
    // 1. Bigode (mustache)
    pacmanCtx.save();
    pacmanCtx.translate(gx, gy);
    pacmanCtx.scale(0.75, 0.75);
    pacmanCtx.translate(0, 4 * scale); // acompanha o deslocamento do rosto
    
    var eyeOffsetX = 0, eyeOffsetY = 0;
    if (dir === 'left') eyeOffsetX = -2 * scale;
    else if (dir === 'right') eyeOffsetX = 2 * scale;
    else if (dir === 'up') eyeOffsetY = -2 * scale;
    else if (dir === 'down') eyeOffsetY = 2 * scale;
    
    pacmanCtx.fillStyle = '#000000';
    pacmanCtx.beginPath();
    pacmanCtx.ellipse(-2.5 * scale + eyeOffsetX, 2.5 * scale + eyeOffsetY, 4 * scale, 2 * scale, -0.2, 0, Math.PI*2);
    pacmanCtx.fill();
    pacmanCtx.beginPath();
    pacmanCtx.ellipse(2.5 * scale + eyeOffsetX, 2.5 * scale + eyeOffsetY, 4 * scale, 2 * scale, 0.2, 0, Math.PI*2);
    pacmanCtx.fill();
    pacmanCtx.restore();
    
    // 2. Quepe (Hat)
    pacmanCtx.save();
    pacmanCtx.translate(gx, gy - 11 * scale); // Topo da cabeça
    
    if (dir === 'left') pacmanCtx.rotate(-0.1);
    else if (dir === 'right') pacmanCtx.rotate(0.1);
    else if (dir === 'down') pacmanCtx.translate(0, 1 * scale);
    
    // Aba do boné
    pacmanCtx.fillStyle = '#aa0000'; // Um tom um pouco mais escuro que o corpo pra destacar
    var brimOffset = (dir === 'left') ? -3 * scale : (dir === 'right') ? 3 * scale : 0;
    pacmanCtx.beginPath();
    var brimY = (dir === 'up') ? 1 * scale : 2 * scale;
    pacmanCtx.ellipse(brimOffset, brimY, 12 * scale, 3 * scale, 0, 0, Math.PI*2);
    pacmanCtx.fill();
    
    // Domo do boné
    pacmanCtx.fillStyle = '#dd0000'; // Vermelho mario (diferente de ff0000 do corpo pra dar relevo)
    pacmanCtx.beginPath();
    pacmanCtx.arc(0, 1 * scale, 11 * scale, Math.PI, 0);
    pacmanCtx.fill();
    
    // Contorno pro chapéu destacar no corpo
    pacmanCtx.strokeStyle = '#550000';
    pacmanCtx.lineWidth = 1 * scale;
    pacmanCtx.beginPath();
    pacmanCtx.arc(0, 1 * scale, 11 * scale, Math.PI, 0);
    pacmanCtx.stroke();
    
    // Círculo branco com M
    pacmanCtx.fillStyle = '#ffffff';
    var logoX = (dir === 'left') ? -4 * scale : (dir === 'right') ? 4 * scale : 0;
    var logoY = (dir === 'up') ? -5 * scale : -4 * scale;
    pacmanCtx.beginPath();
    pacmanCtx.arc(logoX, logoY, 3.5 * scale, 0, Math.PI * 2);
    pacmanCtx.fill();
    
    pacmanCtx.fillStyle = '#dd0000';
    pacmanCtx.font = 'bold ' + (5.5 * scale) + 'px sans-serif';
    pacmanCtx.textAlign = 'center';
    pacmanCtx.textBaseline = 'middle';
    pacmanCtx.fillText('M', logoX, logoY + 0.5 * scale);
    pacmanCtx.restore();
}


function drawSimpleGhost(gx, gy, scale, dir, color, elapsed, state) {
    var bodySprite = getGhostBodySprite(color);
    if (!bodySprite) return;
    
    var drawW = scale * 2.2;
    var drawH = scale * 2.2;
    
    pacmanCtx.drawImage(bodySprite, gx - drawW/2, gy - drawH/2, drawW, drawH);
    
    var eyeScale = scale / 15;
    drawGhostFace(gx, gy, dir, eyeScale, state || 'angry');
}

function drawSimplePacman(px, py, scale, dir, player, elapsed) {
    var frameIndex = Math.floor(elapsed / 80) % 3;
    var mOpen = [Math.PI / 4.5, Math.PI / 8, 0.05][frameIndex];
    
    var rotAngle = dir === 'right' ? 0 : Math.PI;
    
    // Removed bobbing effect
    // py += Math.sin(elapsed / 100 + px) * 8;
    
    var avatarImg = getAvatarImage(player.name, player.avatar);
    
    pacmanCtx.save();
    pacmanCtx.translate(px, py);
    pacmanCtx.rotate(rotAngle);
    
    if (avatarImg && avatarImg.complete && avatarImg.naturalWidth !== 0) {
        pacmanCtx.beginPath();
        pacmanCtx.arc(0, 0, scale, mOpen, Math.PI * 2 - mOpen);
        pacmanCtx.lineTo(0, 0);
        pacmanCtx.closePath();
        pacmanCtx.save();
        pacmanCtx.clip();
        
        // Draw avatar upright
        pacmanCtx.rotate(-rotAngle);
        pacmanCtx.drawImage(avatarImg, -scale, -scale, scale * 2, scale * 2);
        
        pacmanCtx.restore(); // remove clip
        
        // Draw glowing outline (optimized: no shadowBlur)
        pacmanCtx.strokeStyle = player.color || '#ffff00';
        pacmanCtx.lineWidth = 3;
        pacmanCtx.stroke();
    } else {
        pacmanCtx.fillStyle = player.color || '#ffff00';
        pacmanCtx.beginPath();
        pacmanCtx.arc(0, 0, scale, mOpen, Math.PI * 2 - mOpen);
        pacmanCtx.lineTo(0, 0);
        pacmanCtx.closePath();
        pacmanCtx.fill();
    }
    
    pacmanCtx.restore();
}

function checkGhostCollisions() {
    for (var p in pacmanPlayers) {
        var pl = pacmanPlayers[p];
        if (pl.lives <= 0 || pl.spawnProtection > 0) continue;
        
        // Calculate smooth interpolated coordinates on screen
        var plDrawX = pl.x + (pl.targetX - pl.x) * pl.progress;
        var plDrawY = pl.y + (pl.targetY - pl.y) * pl.progress;
        
        pacmanGhosts.forEach(function(gh) {
            if (gh.homeTime > 0 || gh.isDead) return;
            
            var ghDrawX = gh.x + (gh.targetX - gh.x) * gh.progress;
            var ghDrawY = gh.y + (gh.targetY - gh.y) * gh.progress;
            
            var threshold = 0.68;
            if (pl.giantTimer > 0) {
                var stacks = pl.giantStacks || 1;
                var dynamicScale = Math.min(2.5 * (1 + (stacks - 1) * 0.2), 4.5);
                threshold = dynamicScale * 0.75;
            }
            var dist = Math.hypot(plDrawX - ghDrawX, plDrawY - ghDrawY);
            if (dist < threshold) {
                if (pl.powerTimer > 0 || pl.giantTimer > 0) {
                    // Eat Ghost with Combo logic
                    pl.ghostComboCount = (pl.ghostComboCount || 0) + 1;
                    var comboIndex = pl.ghostComboCount;
                    // Exponential score: 200, 400, 800, 1600. Cap combo at x4
                    var pointsAwarded = 100 * Math.pow(2, comboIndex);
                    
                    pl.roundScore = (pl.roundScore || 0) + pointsAwarded;
                    pl.score = (pl.score || 0) + pointsAwarded;
                    pacmanScore += pointsAwarded;
                    gh.isDead = true;
                    gh.x = Math.round(gh.x + (gh.targetX - gh.x) * gh.progress);
                    gh.y = Math.round(gh.y + (gh.targetY - gh.y) * gh.progress);
                    gh.targetX = gh.x;
                    gh.targetY = gh.y;
                    gh.progress = 0;
                    gh.homeTime = 0;
                    
                    // Trigger camera zoom on ghost combo
                    pacmanZoomTarget = {
                        user: p,
                        x: pl.x + 0.5,
                        y: pl.y + 0.5,
                        color: pl.color,
                        avatar: pl.avatar,
                        timer: 360
                    };
                    pacmanZoomCooldown = 600;
                    
                    AudioSynth.playGhostEat(comboIndex);
                    window.pacmanHitStopTimer = 8 + (comboIndex * 2); // Congelamento progressivo!
                    spawnTextParticle(pl.x, pl.y, `+${pointsAwarded}`, pl.color);
                    // spawnScoreText(pl.x, pl.y, `COMBO x${comboIndex}! +${pointsAwarded}`, pl.color);
                    spawnDotParticles(pl.x, pl.y, '#ffffff', 12);
                    pushAlertEvent(`👻 @${p} COMEU o fantasma! Combo x${comboIndex} (+${pointsAwarded} pts)`);
                    
                    // Activate Combo Popup - Accumulate if active
                    if (pacmanComboPopup && pacmanComboPopup.user === p && pacmanComboPopup.timer > 0) {
                        pacmanComboPopup.combo = comboIndex;
                        pacmanComboPopup.points += pointsAwarded;
                        pacmanComboPopup.ghostColor = gh.color;
                        pacmanComboPopup.timer = 160; // Mantém ativo sem reativar a animação de pop-in inicial
                    } else {
                        pacmanComboPopup = {
                            user: p,
                            avatar: pl.avatar || '',
                            color: pl.color,
                            combo: comboIndex,
                            points: pointsAwarded,
                            ghostColor: gh.color,
                            timer: 180 // 3 seconds
                        };
                    }
                    
                    updatePacmanLeaderboard();
                    updateDotFlowField(); // Atualiza a IA para não perseguirem o fantasma "morto"
                } else {
                    // Player Dies
                    pl.lives--;
                    AudioSynth.playDeath();
                    spawnDeathParticles(pl.x, pl.y, pl.color);
                    
                    // --- Ghost Meme Voice ---
                    var rIndex = Math.floor(Math.random() * 6);
                    speakGhostDialogue(gh.id, 'kill', rIndex);
                    if (ghostDialogues[gh.id] && ghostDialogues[gh.id]['kill']) {
                        gh.speechText = ghostDialogues[gh.id]['kill'][rIndex];
                        gh.speechTimer = 240; // 4 seconds
                    }
                    // ------------------------
                    
                    // Destroy all clones owned by this player instantly
                    for (var i = pacmanClones.length - 1; i >= 0; i--) {
                        if (pacmanClones[i].owner === p) {
                            spawnDeathParticles(pacmanClones[i].x, pacmanClones[i].y, '#ff66ff');
                            pacmanClones.splice(i, 1);
                        }
                    }
                    
                    if (pl.lives <= 0) {
                        spawnTextParticle(pl.x, pl.y, 'GAME OVER', '#ff0000');
                        pushAlertEvent(`💀 @${p} foi eliminado!`);
                        // Keep player in memory with 0 lives, can join/spawn again
                    } else {
                        spawnTextParticle(pl.x, pl.y, `PERDEU VIDA (${pl.lives})`, '#ff3300');
                        // Respawn safely
                        var pos = getAvailableSpawnPosition();
                        pl.x = pos.x;
                        pl.y = pos.y;
                        pl.targetX = pos.x;
                        pl.targetY = pos.y;
                        pl.progress = 0;
                        pl.spawnProtection = 180;
                        
                        setTimeout(function() {
                            AudioSynth.playRespawn();
                        }, 800);
                    }
                    updatePacmanLeaderboard();
                }
            }
        });
    }
    
    // Check Clones vs Ghosts
    for (var i = pacmanClones.length - 1; i >= 0; i--) {
        var cl = pacmanClones[i];
        
        var clDrawX = cl.x + (cl.targetX - cl.x) * cl.progress;
        var clDrawY = cl.y + (cl.targetY - cl.y) * cl.progress;
        
        pacmanGhosts.forEach(function(gh) {
            if (gh.homeTime > 0 || cl.timer <= 0) return;
            
            var ghDrawX = gh.x + (gh.targetX - gh.x) * gh.progress;
            var ghDrawY = gh.y + (gh.targetY - gh.y) * gh.progress;
            
            var dist = Math.hypot(clDrawX - ghDrawX, clDrawY - ghDrawY);
            if (dist < 0.68) {
                // Clones always die to ghosts now
                cl.timer = 0;
                spawnDeathParticles(cl.x, cl.y, cl.color);
                spawnTextParticle(cl.x, cl.y, 'CLONE DESTRUÍDO', '#ff3300');
            }
        });
    }
}

// ==========================================
// Movement Update Loops
// ==========================================
function updateEntities() {
    if (pacmanGameState !== 'playing' && pacmanGameState !== 'round_end') return;
    var isSlowMo = (pacmanGameState === 'round_end');
    
    // 1. Update Player Positions
    for (var p in pacmanPlayers) {
        var pl = pacmanPlayers[p];
        if (pl.lives <= 0) continue;
        
        if (pl.spawnProtection > 0) pl.spawnProtection--;
        if (pl.speedBoostTimer > 0) pl.speedBoostTimer--;
        
        if (pl.giftSpeedEndTime) {
            if (Date.now() < pl.giftSpeedEndTime) pl.giftSpeedTimer = 1;
            else { pl.giftSpeedTimer = 0; pl.giftSpeedMultiplier = 1.0; }
        } else if (pl.giftSpeedTimer > 0) {
            pl.giftSpeedTimer--;
            if (pl.giftSpeedTimer <= 0) {
                pl.giftSpeedMultiplier = 1.0;
            }
        }
        
        // Update autoEnergyTimer based on endTime
        if (pl.autoEnergyEndTime) {
            if (Date.now() < pl.autoEnergyEndTime) pl.autoEnergyTimer = 1;
            else pl.autoEnergyTimer = 0;
        } else if (pl.autoEnergyTimer && pl.autoEnergyTimer > 0) {
            pl.autoEnergyTimer--;
        }

        // --- Continuous Energy Tank Tracking (Likes) ---
        if (pl.giantTimer > 0) {
            // Se for gigante, a aceleração fica cravada no MÁXIMO e a energia não cai.
            pl.likeEnergy = 100;
            pl.tapSpeedMultiplier = 2.0;
        } else if ((pl.autoEnergyTimer && pl.autoEnergyTimer > 0) || pl.giftSpeedTimer > 0) {
            pl.likeEnergy = 100;
            pl.tapSpeedMultiplier = 2.0; // max multiplier at 100 energy
        } else if (pl.likeEnergy > 0) {
            pl.likeEnergy -= 0.083; // Base drain rate (~5 energy per second at 60fps)
            if (pl.likeEnergy < 0) pl.likeEnergy = 0;
            
            // Calculate multiplier directly from energy (max 2.0x speed at 100 energy)
            pl.tapSpeedMultiplier = 1.0 + (pl.likeEnergy / 100) * 1.0;
        } else {
            pl.tapSpeedMultiplier = 1.0;
        }
        
        if (pl.progress === 0) {
            // Calculate next smart direction automatically!
            var aiDir = findNextMoveAI(pl, false);
            pl.dir = aiDir;
            
            var dx = pl.dir === 'left' ? -1 : pl.dir === 'right' ? 1 : 0;
            var dy = pl.dir === 'up' ? -1 : pl.dir === 'down' ? 1 : 0;
            var tx = pl.x + dx;
            var ty = pl.y + dy;
            
            if (tx < 0) tx = MAZE_LAYOUT[0].length - 1;
            else if (tx >= MAZE_LAYOUT[0].length) tx = 0;
            
            var isWrap = Math.abs(tx - pl.x) > 1;
            if (isWrap) {
                pl.x = tx;
                pl.targetX = tx;
                pl.y = ty;
                pl.targetY = ty;
                pl.progress = 0.0;
                checkDotCollision(pl, p);
            } else if (MAZE_LAYOUT[ty] && MAZE_LAYOUT[ty][tx] !== 1) {
                pl.targetX = tx;
                pl.targetY = ty;
                pl.progress = 0.0; // Reset progress to 0.0, we will increment it below
                // If they have tap speed boost active (likes frequency >= 2/sec), they move fast automatically!
                if (pl.tapSpeedMultiplier && pl.tapSpeedMultiplier > 1.0) {
                    pl.isFast = true;
                } else if (pl.fuel > 0) {
                    if (!(pl.giantTimer > 0)) pl.fuel--; // consume 1 movement fuel step!
                    pl.isFast = true;
                } else {
                    pl.isFast = false;
                }
            } else {
                // Blocked fallback
                pl.progress = 0;
            }
        }
        
        // Progress movement linearly
        if (pl.progress > 0 || (pl.progress === 0 && (pl.x !== pl.targetX || pl.y !== pl.targetY))) {
            // tap-tap active: use fast speed directly as base, without fuel overhead
            var tapActive = pl.tapSpeedMultiplier && pl.tapSpeedMultiplier > 1.0;
            var currentSpeed;
            var hasPower = pl.powerTimer > 0 || pl.giantTimer > 0;
            if (pl.speedBoostTimer > 0) {
                currentSpeed = 0.08; // Super turbo! (was 0.0325)
            } else if (tapActive) {
                currentSpeed = 0.01625 * pl.tapSpeedMultiplier; // halved from 0.0325
                if (hasPower) currentSpeed *= 1.3;
            } else if (hasPower) {
                currentSpeed = pl.isFast ? 0.0225 : 0.006; // halved from 0.045 / 0.012
            } else {
                currentSpeed = pl.isFast ? 0.01625 : 0.004; // halved from 0.0325 / 0.008
            }
            
            // Gift speed multiplier stacks on top
            if (pl.giftSpeedTimer > 0) {
                currentSpeed *= pl.giftSpeedMultiplier;
            }
            
            if (isSlowMo) currentSpeed *= 0.15;
            
            // Reduzir a velocidade máxima do gigante pela metade conforme solicitado
            if (pl.giantTimer > 0) {
                currentSpeed *= 0.5;
            }
            
            pl.progress += currentSpeed;
            
            // Add a vibrant visual trail effect (spark particles) as players move - reduced for performance
            if (tapActive && Math.random() < 0.15) {
                var drawPx = (pl.x + (pl.targetX - pl.x) * pl.progress);
                var drawPy = (pl.y + (pl.targetY - pl.y) * pl.progress);
                
                pacmanParticles.push({
                    x: (drawPx + 0.5) * pacmanTileSize,
                    y: (drawPy + 0.5) * pacmanTileSize - 10,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -0.5 - Math.random() * 1.0, // Float up
                    color: '#ff2255',
                    shape: 'heart',
                    size: 4 + Math.random() * 4,
                    life: 20 + Math.floor(Math.random() * 10),
                    maxLife: 30
                });
            } else if (Math.random() < 0.08) {
                var drawPx = (pl.x + (pl.targetX - pl.x) * pl.progress);
                var drawPy = (pl.y + (pl.targetY - pl.y) * pl.progress);
                
                pacmanParticles.push({
                    x: (drawPx + 0.5) * pacmanTileSize,
                    y: (drawPy + 0.5) * pacmanTileSize,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    color: pl.color,
                    size: 1 + Math.random() * 2,
                    life: 15 + Math.floor(Math.random() * 8),
                    maxLife: 23
                });
            }
            
            if (pl.giantEndTime) {
                if (Date.now() < pl.giantEndTime) pl.giantTimer = 1;
                else pl.giantTimer = 0;
            } else if (pl.giantTimer > 0) {
                pl.giantTimer--;
            }
            
            if (pl.progress >= 1.0) {
                pl.x = pl.targetX;
                pl.y = pl.targetY;
                pl.progress = 0.0;
                pacmanPheromones[pl.x + ',' + pl.y] = { time: Date.now(), color: pl.color, turbo: pl.speedBoostTimer > 0 };
                
                if (pl.giantTimer > 0) {
                    var r = 1 + Math.floor((pl.giantStacks || 1) - 1);
                    r = Math.min(3, r); // limite para não quebrar o mapa inteiro de uma vez
                    for (var dx = -r; dx <= r; dx++) {
                        for (var dy = -r; dy <= r; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            if (typeof destroyMazeWall === 'function') destroyMazeWall(pl.x + dx, pl.y + dy);
                        }
                    }
                }
                
                AudioSynth.playWaka(); // Som waka-waka ao andar/comer
                checkDotCollision(pl, p);
            }
        }
    }
    
    // 1.5 Update Clones
    for (var i = pacmanClones.length - 1; i >= 0; i--) {
        var cl = pacmanClones[i];
        
        if (cl.spawnDelay > 0) {
            cl.spawnDelay--;
            var pl = pacmanPlayers[cl.owner];
            if (pl) {
                cl.x = pl.x; cl.y = pl.y; cl.targetX = pl.targetX; cl.targetY = pl.targetY;
            }
            continue;
        }
        
        if (cl.endTime) {
            if (Date.now() > cl.endTime) cl.timer = 0;
        } else {
            cl.timer--;
        }
        if (cl.timer <= 0) {
            pacmanClones.splice(i, 1);
            continue;
        }
        
        if (cl.progress === 0) {
            var aiDir = findNextMoveAI(cl, true);
            cl.dir = aiDir;
            
            var dx = cl.dir === 'left' ? -1 : cl.dir === 'right' ? 1 : 0;
            var dy = cl.dir === 'up' ? -1 : cl.dir === 'down' ? 1 : 0;
            var tx = cl.x + dx;
            var ty = cl.y + dy;
            
            if (tx < 0) tx = MAZE_LAYOUT[0].length - 1;
            else if (tx >= MAZE_LAYOUT[0].length) tx = 0;
            
            var isWrap = Math.abs(tx - cl.x) > 1;
            if (isWrap) {
                cl.x = tx;
                cl.targetX = tx;
                cl.y = ty;
                cl.targetY = ty;
                cl.progress = 0.0;
                checkDotCollision(cl, cl.owner); // P is the owner!
            } else if (MAZE_LAYOUT[ty] && MAZE_LAYOUT[ty][tx] !== 1) {
                cl.targetX = tx;
                cl.targetY = ty;
                cl.progress = 0.0;
            } else {
                cl.progress = 0;
            }
        }
        
        if (cl.progress > 0 || (cl.progress === 0 && (cl.x !== cl.targetX || cl.y !== cl.targetY))) {
            var currentSpeed = 0.01625 * 0.75; // Clones speed reduced by half (fixed and independent of parent)
            if (isSlowMo) currentSpeed *= 0.15;
            // Clones do not get power pill speed boost as they cannot eat ghosts
            cl.progress += currentSpeed;
            
            if (Math.random() < 0.05) {
                var drawPx = (cl.x + (cl.targetX - cl.x) * cl.progress);
                var drawPy = (cl.y + (cl.targetY - cl.y) * cl.progress);
                pacmanParticles.push({
                    x: (drawPx + 0.5) * pacmanTileSize,
                    y: (drawPy + 0.5) * pacmanTileSize,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    color: '#ff66ff',
                    size: 1 + Math.random(),
                    life: 10,
                    maxLife: 15
                });
            }
            
            if (cl.progress >= 1.0) {
                cl.x = cl.targetX;
                cl.y = cl.targetY;
                cl.progress = 0.0;
                pacmanPheromones[cl.x + ',' + cl.y] = { time: Date.now(), color: cl.color, turbo: false };
                AudioSynth.playWaka(); // Som waka-waka ao andar/comer
                checkDotCollision(cl, cl.owner);
            }
        }
    }
    
    // 2. Update Ghost Positions
    // 2. Update Ghost Positions
    pacmanGhosts.forEach(function(gh) {
        if (gh.homeTime > 0) {
            gh.homeTime--;
            return;
        }
        
        if (gh.progress === 0) {
            // Decide direction
            var possibleDirs = ['left', 'right', 'up', 'down'];
            var opposite = { 'left': 'right', 'right': 'left', 'up': 'down', 'down': 'up' };
            
            var validDirs = possibleDirs.filter(function(d) {
                var dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
                var dy = d === 'up' ? -1 : d === 'down' ? 1 : 0;
                var nx = gh.x + dx;
                var ny = gh.y + dy;
                if (nx < 0) nx = MAZE_LAYOUT[0].length - 1;
                else if (nx >= MAZE_LAYOUT[0].length) nx = 0;
                
                return ny >= 0 && ny < MAZE_LAYOUT.length && MAZE_LAYOUT[ny][nx] !== 1;
            });
            
            // Try not to immediately backtrack unless there are no other paths
            // If the ghost is dead, it is allowed to immediately U-turn to follow the shortest return path!
            if (validDirs.length > 1 && gh.dir && !gh.isDead) {
                var opp = opposite[gh.dir];
                validDirs = validDirs.filter(function(d) { return d !== opp; });
            }
            
            var targetDir = null;
            if (validDirs.length > 0) {
                if (gh.isDead) {
                    // Use perfect BFS gradient to return home
                    validDirs.sort(function(a, b) {
                        var ax = gh.x + (a === 'left' ? -1 : a === 'right' ? 1 : 0);
                        var ay = gh.y + (a === 'up' ? -1 : a === 'down' ? 1 : 0);
                        var bx = gh.x + (b === 'left' ? -1 : b === 'right' ? 1 : 0);
                        var by = gh.y + (b === 'up' ? -1 : b === 'down' ? 1 : 0);
                        
                        var _mazeW = MAZE_LAYOUT[0].length;
                        if (ax < 0) ax = _mazeW - 1; else if (ax >= _mazeW) ax = 0;
                        if (bx < 0) bx = _mazeW - 1; else if (bx >= _mazeW) bx = 0;
                        
                        var scoreA = ghostReturnFields[gh.id][ay][ax];
                        var scoreB = ghostReturnFields[gh.id][by][bx];
                        return scoreA - scoreB;
                    });
                    targetDir = validDirs[0];
                } else {
                    var tx, ty, useTarget = false, reverse = false;
                    var targetPlayer = getClosestPlayer(gh.x, gh.y);
                    if (targetPlayer && Math.random() < 0.8) { // 80% smart tracking
                        tx = targetPlayer.x;
                        ty = targetPlayer.y;
                        useTarget = true;
                        reverse = pacmanPowerMode || pacmanGiantMode;
                    }
                    
                    if (useTarget) {
                        var _mazeW = MAZE_LAYOUT[0].length;
                        var _mazeH = MAZE_LAYOUT.length;
                        validDirs.sort(function(a, b) {
                            var ax = gh.x + (a === 'left' ? -1 : a === 'right' ? 1 : 0);
                            var ay = gh.y + (a === 'up' ? -1 : a === 'down' ? 1 : 0);
                            var bx = gh.x + (b === 'left' ? -1 : b === 'right' ? 1 : 0);
                            var by = gh.y + (b === 'up' ? -1 : b === 'down' ? 1 : 0);
                            
                            var daxr = Math.abs(ax - tx); if (daxr > _mazeW / 2) daxr = _mazeW - daxr;
                            var dayr = Math.abs(ay - ty); if (dayr > _mazeH / 2) dayr = _mazeH - dayr;
                            var dbxr = Math.abs(bx - tx); if (dbxr > _mazeW / 2) dbxr = _mazeW - dbxr;
                            var dbyr = Math.abs(by - ty); if (dbyr > _mazeH / 2) dbyr = _mazeH - dbyr;
                            var distA = daxr + dayr;
                            var distB = dbxr + dbyr;
                            return reverse ? (distB - distA) : (distA - distB);
                        });
                        targetDir = validDirs[0];
                    } else {
                        targetDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                    }
                }
            }

            
            if (targetDir) {
                gh.dir = targetDir;
                var dx = gh.dir === 'left' ? -1 : gh.dir === 'right' ? 1 : 0;
                var dy = gh.dir === 'up' ? -1 : gh.dir === 'down' ? 1 : 0;
                var gtx = gh.x + dx;
                var gty = gh.y + dy;
                
                if (gtx < 0) gtx = MAZE_LAYOUT[0].length - 1;
                else if (gtx >= MAZE_LAYOUT[0].length) gtx = 0;
                
                var isGhWrap = Math.abs(gtx - gh.x) > 1;
                if (isGhWrap) {
                    gh.x = gtx;
                    gh.targetX = gtx;
                    gh.y = gty;
                    gh.targetY = gty;
                    gh.progress = 0.0;
                } else {
                    gh.targetX = gtx;
                    gh.targetY = gty;
                    gh.progress = 0.0; // Reset progress to 0.0, we will increment it below
                }
            } else {
                gh.progress = 0;
            }
        }
        
        // Progress movement linearly
        if (gh.progress > 0 || (gh.progress === 0 && (gh.x !== gh.targetX || gh.y !== gh.targetY))) {
            var activeSpeed = gh.speed;
            if (gh.isDead) {
                activeSpeed = gh.speed * 4.0; // Very fast when returning
            } else if (pacmanPowerMode || pacmanGiantMode) {
                activeSpeed = 0.00625; // slow down in frightened mode (halved)
            }
            
            if (isSlowMo) activeSpeed *= 0.15;
            
            gh.progress += activeSpeed;
            if (gh.progress >= 1.0) {
                gh.x = gh.targetX;
                gh.y = gh.targetY;
                gh.progress = 0.0;
                
                // Resurrect if reached home
                if (gh.isDead && gh.x === gh.spawnX && gh.y === gh.spawnY) {
                    gh.isDead = false;
                    gh.homeTime = 300; // 5 segundos de invulnerabilidade/espera na base
                    
                    // --- Respawn Speech ---
                    var rIndex = Math.floor(Math.random() * 10);
                    speakGhostDialogue(gh.id, 'respawn', rIndex);
                    if (ghostDialogues[gh.id] && ghostDialogues[gh.id]['respawn']) {
                        gh.speechText = ghostDialogues[gh.id]['respawn'][rIndex];
                        gh.speechTimer = 240;
                    }
                    // ----------------------
                }
            }
        } else if (gh.isDead && gh.x === gh.spawnX && gh.y === gh.spawnY) {
            // Já está na base e não vai se mover, ressuscita imediatamente
            gh.isDead = false;
            gh.homeTime = 300; // Evita loop infinito de combos (spawn kill)
            
            // --- Respawn Speech ---
            var rIndex = Math.floor(Math.random() * 10);
            speakGhostDialogue(gh.id, 'respawn', rIndex);
            if (ghostDialogues[gh.id] && ghostDialogues[gh.id]['respawn']) {
                gh.speechText = ghostDialogues[gh.id]['respawn'][rIndex];
                gh.speechTimer = 240;
            }
            // ----------------------
        }
        
        // --- Speech Logic ---
        if (!gh.isDead && gh.homeTime <= 0) {
            if (gh.speechCooldown > 0) gh.speechCooldown--;
            if (gh.speechTimer > 0) gh.speechTimer--;
            else gh.speechText = "";
            
            if (gh.speechCooldown <= 0 && Math.random() < 0.015) { // 1.5% chance per frame when off cooldown
                var state = 'normal';
                if (pacmanPowerMode || pacmanGiantMode) {
                    state = 'scared';
                } else {
                    var targetPlayer = getClosestPlayer(gh.x, gh.y);
                    if (targetPlayer) {
                        var dx = targetPlayer.x - gh.x;
                        var dy = targetPlayer.y - gh.y;
                        var dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < 4.5) state = 'angry';
                    }
                }
                
                if (state === 'angry' || state === 'scared') {
                    var phrases = ghostDialogues[gh.id][state];
                    if (phrases) {
                        var phraseIndex = Math.floor(Math.random() * phrases.length);
                        gh.speechText = phrases[phraseIndex];
                        speakGhostDialogue(gh.id, state, phraseIndex); // Toca o MP3 acelerado!
                        gh.speechTimer = 240; // 4 seconds
                        gh.speechCooldown = 300 + Math.random() * 300; // 5-10 seconds
                    }
                }
            }
        }
    });
    
    // 3. Process Collisions
    if (!isSlowMo) {
        checkGhostCollisions();
    }
}

// ==========================================
// VFX Particles Systems
// ==========================================
function spawnDotParticles(x, y, color, count) {
    if (pacmanParticles.length >= 150) return; // Reduced limit for performance
    var actualCount = Math.min(Math.floor(count / 2), 150 - pacmanParticles.length);
    for (var i = 0; i < actualCount; i++) {
        var angle = Math.random() * Math.PI * 2;
        pacmanParticles.push({
            x: (x + 0.5) * pacmanTileSize,
            y: (y + 0.5) * pacmanTileSize,
            vx: Math.cos(angle) * 0.8,
            vy: Math.sin(angle) * 0.8,
            color: color,
            size: 1 + Math.random() * 2,
            life: 15 + Math.floor(Math.random() * 8),
            maxLife: 23
        });
    }
}

function spawnHeartParticles(x, y, count) {
    if (pacmanParticles.length >= 150) return;
    var actualCount = Math.min(Math.floor(count / 3), 150 - pacmanParticles.length);
    for (var i = 0; i < actualCount; i++) {
        var angle = -Math.PI / 2;
        pacmanParticles.push({
            x: (x + 0.5) * pacmanTileSize,
            y: (y + 0.5) * pacmanTileSize,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5, // float upward
            color: '#ff3366',
            size: 1 + Math.random() * 2,
            life: 20 + Math.floor(Math.random() * 10),
            maxLife: 30,
            type: 'heart'
        });
    }
}

function spawnDeathParticles(x, y, color) {
    if (pacmanParticles.length >= 100) return;
    var count = Math.min(12, 100 - pacmanParticles.length);
    for (var i = 0; i < count; i++) {
        var angle = (i / 12) * Math.PI * 2;
        pacmanParticles.push({
            x: (x + 0.5) * pacmanTileSize,
            y: (y + 0.5) * pacmanTileSize,
            vx: Math.cos(angle) * 1.5,
            vy: Math.sin(angle) * 1.5,
            color: color,
            size: 2 + Math.random() * 2,
            life: 20 + Math.floor(Math.random() * 10),
            maxLife: 30
        });
    }
}

function spawnTextParticle(x, y, text, color) {
    if (pacmanTextParticles.length >= 30) return; // Hard limit to prevent lag
    pacmanTextParticles.push({
        x: (x + 0.5) * pacmanTileSize,
        y: y * pacmanTileSize - 10,
        text: text,
        color: color,
        life: 60,
        vy: -0.6
    });
}

// Floating score numbers
function spawnScoreText(x, y, text, color) {
    if (pacmanTextParticles.length >= 15) return;
    pacmanTextParticles.push({
        x: (x + 0.5) * pacmanTileSize,
        y: (y + 0.5) * pacmanTileSize,
        text: text,
        color: color,
        life: 30,
        vy: -0.3
    });
}

function updateParticles() {
    var isSlowMo = (pacmanGameState === 'round_end');
    var timeFactor = isSlowMo ? 0.15 : 1.0;
    
    // Optimized particle update - only update visible particles
    var len = pacmanParticles.length;
    for (var i = len - 1; i >= 0; i--) {
        var p = pacmanParticles[i];
        p.x += p.vx * timeFactor;
        p.y += p.vy * timeFactor;
        p.life -= timeFactor;
        if (p.life <= 0) pacmanParticles.splice(i, 1);
    }
    
    for (var i = pacmanTextParticles.length - 1; i >= 0; i--) {
        var pt = pacmanTextParticles[i];
        pt.y += pt.vy * timeFactor;
        pt.life -= timeFactor;
        if (pt.life <= 0) pacmanTextParticles.splice(i, 1);
    }
}

// ==========================================
// Drawing / Rendering Engine
// ==========================================
function checkCameraZoomTrigger() {
    if (pacmanZoomCooldown > 0) {
        pacmanZoomCooldown--;
    }
    
    if (pacmanGameState !== 'playing') return;
    
    var sortedPlayers = Object.keys(pacmanPlayers)
    .filter(function(p) { return !isPlayerBanned(p); })
    .map(function(p) {
        return {
            name: p,
            score: pacmanPlayers[p].roundScore || 0,
            x: pacmanPlayers[p].x,
            y: pacmanPlayers[p].y,
            color: pacmanPlayers[p].color,
            avatar: pacmanPlayers[p].avatar,
            lives: pacmanPlayers[p].lives
        };
    }).sort(function(a, b) { return b.score - a.score; });
    
    if (sortedPlayers.length > 0 && !pacmanZoomTarget) {
        var currentLeader = sortedPlayers[0];
        var previousLeader = pacmanLastLeaderboard.length > 0 ? pacmanLastLeaderboard[0] : null;
        
        // Only trigger zoom if we already had a previous leader (not the first frame)
        if (pacmanInitialLeaderSet && previousLeader && previousLeader.name !== currentLeader.name) {
            pacmanZoomTarget = {
                user: currentLeader.name,
                x: currentLeader.x + 0.5,
                y: currentLeader.y + 0.5,
                color: currentLeader.color,
                avatar: currentLeader.avatar,
                timer: 360
            };
            pacmanZoomCooldown = 600;
        }
        pacmanInitialLeaderSet = true;
    }
    
    pacmanLastLeaderboard = sortedPlayers;
    
    if (pacmanZoomTarget) {
        pacmanZoomTarget.timer--;
        if (pacmanZoomTarget.timer <= 0) {
            pacmanZoomTarget = null;
            for (var p in pacmanPlayers) {
                if (pacmanPlayers[p].powerTimer <= 0 && pacmanPlayers[p].giantTimer <= 0) {
                    pacmanPlayers[p].ghostComboCount = 0;
                }
            }
        } else if (pacmanPlayers[pacmanZoomTarget.user]) {
            var pl = pacmanPlayers[pacmanZoomTarget.user];
            pacmanZoomTarget.x = pl.x + (pl.targetX - pl.x) * pl.progress + 0.5;
            pacmanZoomTarget.y = pl.y + (pl.targetY - pl.y) * pl.progress + 0.5;
        }
    }
}

function drawPacman() {
    if (!pacmanCtx) return;
    var canvas = document.getElementById('gameCanvas');
    
    // Check for zoom triggers
    checkCameraZoomTrigger();
    
    // Clear Board TRANSPARENTLY first
    pacmanCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context for zoom transformations
    pacmanCtx.save();
    
    // Apply zoom if active (applies to everything: maze, dots, players, ghosts)
    if (pacmanZoomTarget) {
        if (!pacmanZoomTarget.maxTimer) pacmanZoomTarget.maxTimer = pacmanZoomTarget.timer;
        var maxTimer = pacmanZoomTarget.maxTimer;
        
        var zoomIntensity;
        var remaining = pacmanZoomTarget.timer;
        if (remaining > maxTimer - 20) {
            zoomIntensity = (maxTimer - remaining) / 20;
        } else if (remaining < 20) {
            zoomIntensity = remaining / 20;
        } else {
            zoomIntensity = 1;
        }
        
        // Garante que a intensidade nunca seja negativa, o que causava a tela de ponta cabeça
        zoomIntensity = Math.max(0, Math.min(1, zoomIntensity));
        var zoomFactor = 1 + zoomIntensity * 3;
        
        // centerX e centerY já vêm com +0.5 do checkCameraZoomTrigger
        var centerX = pacmanZoomTarget.x * pacmanTileSize;
        var centerY = pacmanZoomTarget.y * pacmanTileSize;
        
        pacmanCtx.translate(centerX, centerY);
        pacmanCtx.scale(zoomFactor, zoomFactor);
        pacmanCtx.translate(-centerX, -centerY);
    }
    
    // Draw background (Copa Mode or Static Neon)
    if (window.isCopaMode) {
        var time = Date.now();
        var cw = canvas.width;
        var ch = canvas.height;
        
        // 1. Desenha Fundo do Campo
        window.drawSoccerField(pacmanCtx, cw, ch, time);
        
        // 2. Paredes Originais (Máxima Eficiência)
        if (mazeCanvas) {
            pacmanCtx.globalAlpha = 1.0;
            pacmanCtx.drawImage(mazeCanvas, 0, 0);
        }
        
    } else if (mazeCanvas) {
        pacmanCtx.globalAlpha = 1.0; 
        pacmanCtx.drawImage(mazeCanvas, 0, 0);
        
        // EFEITO DE ONDA (Wave Effect) NAS PAREDES!
        pacmanCtx.globalCompositeOperation = 'source-in';
        
        var waveDuration = 6000; // Onda mais lenta (6 segundos)
        var nowTime = Date.now();
        var cycleIndex = Math.floor(nowTime / waveDuration) % 8;
        var waveOffset = (nowTime % waveDuration) / waveDuration;
        
        var w = 1080;
        var h = 1920;
        
        // Posição inicial (sx, sy) e final (ex, ey) da onda dependendo da direção
        var sx = 0, sy = 0, ex = 0, ey = h; 
        if (cycleIndex === 0) { sx = 0; sy = 0; ex = 0; ey = h; } // Cima pra Baixo
        else if (cycleIndex === 1) { sx = w; sy = 0; ex = 0; ey = 0; } // Direita pra Esquerda
        else if (cycleIndex === 2) { sx = 0; sy = h; ex = 0; ey = 0; } // Baixo pra Cima
        else if (cycleIndex === 3) { sx = 0; sy = 0; ex = w; ey = 0; } // Esquerda pra Direita
        else if (cycleIndex === 4) { sx = 0; sy = 0; ex = w; ey = h; } // Diagonal SE -> ID
        else if (cycleIndex === 5) { sx = w; sy = h; ex = 0; ey = 0; } // Diagonal ID -> SE
        else if (cycleIndex === 6) { sx = w; sy = 0; ex = 0; ey = h; } // Diagonal SD -> IE
        else if (cycleIndex === 7) { sx = 0; sy = h; ex = w; ey = 0; } // Diagonal IE -> SD
        
        var cx = sx + (ex - sx) * waveOffset;
        var cy = sy + (ey - sy) * waveOffset;
        
        var dx = ex - sx;
        var dy = ey - sy;
        var length = Math.sqrt(dx*dx + dy*dy) || 1;
        dx /= length;
        dy /= length;
        
        var span = 2000;
        var gStartX = cx - dx * span;
        var gStartY = cy - dy * span;
        var gEndX = cx + dx * span;
        var gEndY = cy + dy * span;
        
        var gradient = pacmanCtx.createLinearGradient(gStartX, gStartY, gEndX, gEndY);
        
        var baseColor = pacmanThemeWallColor; // Ciano
        var waveColor = '#ff00ff'; // Onda Magenta
        if (pacmanPowerMode) {
            baseColor = '#ff0055'; // Vermelho no modo power
            waveColor = '#ffff00'; // Onda Amarela no modo power
        }
        
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.47, baseColor); 
        gradient.addColorStop(0.5, waveColor); // O centro da onda (mais fina e focada)
        gradient.addColorStop(0.53, baseColor);
        gradient.addColorStop(1, baseColor);
        
        pacmanCtx.fillStyle = gradient;
        pacmanCtx.fillRect(0, 0, 1080, 1920);
        
        // Pinta o fundo real por trás de tudo
        pacmanCtx.globalCompositeOperation = 'destination-over';
        pacmanCtx.fillStyle = pacmanThemeBgColor;
        pacmanCtx.fillRect(0, 0, 1080, 1920);
        
        // Restaura modo normal de blend
        pacmanCtx.globalCompositeOperation = 'source-over';
    }
    
    // Draw Pheromone Trails (Glowing paths)
    var now = Date.now();
    for (var key in pacmanPheromones) {
        var phero = pacmanPheromones[key];
        var time = phero.time || phero;
        var age = now - time;
        if (age < 3000) { // Fades out over 3 seconds
            var parts = key.split(',');
            var px = parseInt(parts[0]);
            var py = parseInt(parts[1]);
            
            var alpha = 1.0 - (age / 3000);
            var isTurbo = phero.turbo || false;
            var color = phero.color || '#ffffff';
            
            pacmanCtx.globalAlpha = isTurbo ? alpha * 0.7 : alpha * 0.2;
            pacmanCtx.fillStyle = color;
            
            // Draw slightly rounded rectangle or just plain rect for trail
            var pad = isTurbo ? 0 : 2; // thicker trail when turbo
            pacmanCtx.fillRect(px * pacmanTileSize + pad, py * pacmanTileSize + pad, pacmanTileSize - pad * 2, pacmanTileSize - pad * 2);
        }
    }
    pacmanCtx.globalAlpha = 1.0;
    pacmanCtx.shadowBlur = 0;
    
    // Draw Dots (Standard dots batched into a single path for high canvas performance)
    pacmanCtx.fillStyle = pacmanThemeDotColor;
    pacmanCtx.beginPath();
    var dotRadius = pacmanTileSize * 0.15;
    for (var i = 0; i < pacmanDots.length; i++) {
        var dot = pacmanDots[i];
        if (dot.active && !dot.power) {
            var cx = (dot.x + 0.5) * pacmanTileSize;
            var cy = (dot.y + 0.5) * pacmanTileSize;
            pacmanCtx.moveTo(cx + dotRadius, cy);
            pacmanCtx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        }
    }
    pacmanCtx.fill();
    
    // Draw Power Pellets (Individually, as they are very few and blink dynamically)
    for (var i = 0; i < pacmanDots.length; i++) {
        var dot = pacmanDots[i];
        if (dot.active && dot.power) {
            var alpha = 0.5 + Math.abs(Math.sin(Date.now() / 150)) * 0.5;
            pacmanCtx.fillStyle = `rgba(0, 255, 204, ${alpha})`;
            var r = pacmanTileSize * 0.38;
            pacmanCtx.beginPath();
            pacmanCtx.arc((dot.x + 0.5) * pacmanTileSize, (dot.y + 0.5) * pacmanTileSize, r, 0, Math.PI * 2);
            pacmanCtx.fill();
        }
    }
    
    // Draw Fruits (Simplified for performance)
    pacmanFruits.forEach(function(fr) {
        if (fr.active) {
            pacmanCtx.save();
            
            var fx = (fr.x + 0.5) * pacmanTileSize;
            var fy = (fr.y + 0.5) * pacmanTileSize;
            
            var fruitColor = '#ff3344'; // default cherry red
            if (fr.type === '🍑') fruitColor = '#ffaa44';
            else if (fr.type === '🍇') fruitColor = '#cc44ff';
            else if (fr.type === '🍎') fruitColor = '#ff2222';
            
            pacmanCtx.translate(fx, fy);
            
            // Draw the actual Emoji LARGE and without background circle
            pacmanCtx.font = "36px 'Segoe UI Emoji', Arial, sans-serif";
            pacmanCtx.textAlign = "center";
            pacmanCtx.textBaseline = "middle";
            pacmanCtx.fillText(fr.type, 0, 0);
            
            pacmanCtx.restore();
        }
    });
    
    // Draw Ghosts (Optimized with cached glow bodies)
    pacmanGhosts.forEach(function(gh) {
        if (gh.homeTime > 0) return;
        
        var gx = (gh.x + (gh.targetX - gh.x) * gh.progress) * pacmanTileSize + pacmanTileSize / 2;
        var gy = (gh.y + (gh.targetY - gh.y) * gh.progress) * pacmanTileSize + pacmanTileSize / 2;
        
        if (!gh.isDead) {
            var colorToUse = pacmanPowerMode ? (Math.floor(Date.now() / 200) % 2 === 0 ? '#0000ff' : '#ffffff') : gh.color;
            var bodySprite = getGhostBodySprite(colorToUse);
            
            // Draw cached glowing body
            pacmanCtx.drawImage(bodySprite, gx - bodySprite.width/2, gy - bodySprite.height/2);
        }
        
        // Determine Ghost State
        var state = 'normal';
        if (gh.isDead) {
            state = 'dead';
        } else if (pacmanPowerMode) {
            state = 'scared';
        } else {
            var closestDist = Infinity;
            for (var p in pacmanPlayers) {
                var pl = pacmanPlayers[p];
                if (pl.lives > 0 && pl.spawnProtection <= 0) {
                    var dx = pl.x - gh.x;
                    var dy = pl.y - gh.y;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < closestDist) closestDist = dist;
                }
            }
            if (closestDist < 4.5) { // within 4.5 tiles
                state = 'angry';
            }
        }
        
        var isSpecial = (gh.special === 'michael' || gh.special === 'mario');
        drawGhostFace(gx, gy, gh.dir, 1.5, state, isSpecial);
        if (gh.special === 'michael') {
            drawMichaelJacksonAccessories(gx, gy, gh.dir, 1.5, state);
        } else if (gh.special === 'mario') {
            drawMarioAccessories(gx, gy, gh.dir, 1.5, state);
        }
    });
    
    // Draw Ghost Speech Bubbles (after all ghosts to ensure they are on top)
    pacmanGhosts.forEach(function(gh) {
        if (!gh.isDead && gh.homeTime <= 0 && gh.speechText && gh.speechTimer > 0) {
            var gx = (gh.x + (gh.targetX - gh.x) * gh.progress) * pacmanTileSize + pacmanTileSize / 2;
            var gy = (gh.y + (gh.targetY - gh.y) * gh.progress) * pacmanTileSize + pacmanTileSize / 2;
            drawSpeechBubble(pacmanCtx, gx, gy, gh.speechText);
        }
    });
    
    // Render Gift Drops
    if (typeof pacmanGiftDrops !== 'undefined') {
        pacmanGiftDrops.forEach(function(g) {
            if (g.active) {
                var px = g.x * pacmanTileSize + pacmanTileSize / 2;
                var py = g.y * pacmanTileSize + pacmanTileSize / 2;
                
                // Pulse animation
                var pulse = 1.0 + Math.sin(Date.now() / 150) * 0.15;
                var baseSize = pacmanTileSize * 1.5;
                var size = baseSize * pulse;
                
                var useImg = window.pacmanUseGiftImages !== false; // If not explicitly false, assume true or check.
                if (useImg) {
                    var img = getGiftImage(g.giftPictureUrl);
                    if (img && img.complete && img.naturalWidth !== 0) {
                        pacmanCtx.save();
                        // Simplified drawing without shadowBlur
                        try {
                            pacmanCtx.drawImage(img, px - size / 2, py - size / 2, size, size);
                        } catch(e) {}
                        pacmanCtx.restore();
                    } else {
                        // Fallback square
                        pacmanCtx.fillStyle = '#ff00ff';
                        pacmanCtx.fillRect(px - size/2, py - size/2, size, size);
                    }
                } else {
                    // Draw ultra-lightweight geometric shapes instead of heavy text/emojis
                    pacmanCtx.save();
                    pacmanCtx.translate(px, py);
                    pacmanCtx.scale(pulse, pulse); // Hardware accelerated scaling
                    
                    var gName = (g.gift || '').toLowerCase();
                    var radius = baseSize * 0.4;
                    
                    if (gName.includes('rose') || gName.includes('rosa') || gName.includes('love')) {
                        // Pink Circle
                        pacmanCtx.fillStyle = '#e91e63';
                        pacmanCtx.beginPath();
                        pacmanCtx.arc(0, 0, radius, 0, 2*Math.PI);
                        pacmanCtx.fill();
                    }
                    else if (gName.includes('gg')) {
                        // Purple Square
                        pacmanCtx.fillStyle = '#9c27b0';
                        pacmanCtx.fillRect(-radius, -radius, radius*2, radius*2);
                    }
                    else if (gName.includes('donut') || gName.includes('rosquinha')) {
                        // Orange Donut (Circle with a hole)
                        pacmanCtx.fillStyle = '#ff9800';
                        pacmanCtx.beginPath();
                        pacmanCtx.arc(0, 0, radius, 0, 2*Math.PI);
                        pacmanCtx.arc(0, 0, radius*0.4, 0, 2*Math.PI, true);
                        pacmanCtx.fill();
                    }
                    else if (gName.includes('tiktok') || gName.includes('coração') || gName.includes('heart')) {
                        // Red Circle
                        pacmanCtx.fillStyle = '#f44336';
                        pacmanCtx.beginPath();
                        pacmanCtx.arc(0, 0, radius, 0, 2*Math.PI);
                        pacmanCtx.fill();
                    }
                    else if (gName.includes('amo') || gName.includes('finger')) {
                        // Orange-Red Rectangle
                        pacmanCtx.fillStyle = '#ff5722';
                        pacmanCtx.fillRect(-radius, -radius*0.8, radius*2, radius*1.6);
                    }
                    else {
                        // Cyan Diamond
                        pacmanCtx.fillStyle = '#00f2fe';
                        pacmanCtx.beginPath();
                        pacmanCtx.moveTo(0, -radius);
                        pacmanCtx.lineTo(radius, 0);
                        pacmanCtx.lineTo(0, radius);
                        pacmanCtx.lineTo(-radius, 0);
                        pacmanCtx.fill();
                    }
                    
                    // Add a tiny white center dot for detail on all shapes
                    pacmanCtx.fillStyle = '#fff';
                    pacmanCtx.globalAlpha = 0.6;
                    pacmanCtx.beginPath();
                    pacmanCtx.arc(0, 0, radius * 0.2, 0, 2*Math.PI);
                    pacmanCtx.fill();
                    
                    pacmanCtx.restore();
                }
            }
        });
    }

    // Draw Players
    for (var p in pacmanPlayers) {
        var pl = pacmanPlayers[p];
        if (pl.lives <= 0) continue;
        
        // Blinking logic for spawn protection
        if (pl.spawnProtection > 0 && Math.floor(pl.spawnProtection / 10) % 2 === 0) {
            continue;
        }
        
        var px = (pl.x + (pl.targetX - pl.x) * pl.progress) * pacmanTileSize + pacmanTileSize / 2;
        var py = (pl.y + (pl.targetY - pl.y) * pl.progress) * pacmanTileSize + pacmanTileSize / 2;
        var radius = pacmanTileSize * 0.75;
        var giantScale = 1.0;
        if (pl.giantTimer > 0) {
            var stacks = pl.giantStacks || 1;
            giantScale = Math.min(2.5 * (1 + (stacks - 1) * 0.2), 4.5); // Capped at 4.5x
        }
        radius *= giantScale;
        
        // Expose username text centered above
        pacmanCtx.font = "bold 18px 'Inter', sans-serif";
        pacmanCtx.fillStyle = '#ffffff';
        pacmanCtx.strokeStyle = '#000000';
        pacmanCtx.lineWidth = 4;
        pacmanCtx.textAlign = 'center';
        
        var displayNick = p;
        if (displayNick.length > 8) displayNick = displayNick.substr(0, 7) + '..';
        var textToShow = displayNick;
        
        pacmanCtx.strokeText(textToShow, px, py - radius - 8);
        pacmanCtx.fillText(textToShow, px, py - radius - 8);
        
        // Check cached avatar image
        var avatarImg = getAvatarImage(p, pl.avatar);
        
        // Save state to draw player body/avatar
        pacmanCtx.save();
        
        // Blink effect if player is powered
        if (pl.powerTimer > 0) {
            pacmanCtx.globalAlpha = Math.floor(Date.now() / 150) % 2 === 0 ? 0.3 : 1.0;
        }
        
        var frameIndex = Math.floor(Date.now() / 100) % 3;
        var rotAngle = 0;
        if (pl.dir === 'right') rotAngle = 0;
        else if (pl.dir === 'down') rotAngle = Math.PI / 2;
        else if (pl.dir === 'left') rotAngle = Math.PI;
        else if (pl.dir === 'up') rotAngle = -Math.PI / 2;

        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth !== 0) {
            // Render circular avatar with animated mouth cut out
            var mOpen = [Math.PI / 4.5, Math.PI / 8, 0.05][frameIndex];
            pacmanCtx.save();
            pacmanCtx.translate(px, py);
            pacmanCtx.rotate(rotAngle);
            
            pacmanCtx.beginPath();
            pacmanCtx.arc(0, 0, radius, mOpen, Math.PI * 2 - mOpen);
            pacmanCtx.lineTo(0, 0);
            pacmanCtx.closePath();
            pacmanCtx.save();
            pacmanCtx.clip();
            
            // Draw avatar un-rotated so the picture stays upright
            pacmanCtx.rotate(-rotAngle);
            pacmanCtx.drawImage(avatarImg, -radius, -radius, radius * 2, radius * 2);
            
            pacmanCtx.restore(); // remove clip
            
            // Draw glowing outline of Pac-Man shape over avatar
            pacmanCtx.rotate(rotAngle); // rotate back for the stroke
            pacmanCtx.strokeStyle = pl.color;
            pacmanCtx.lineWidth = 4 * giantScale;
            pacmanCtx.stroke();
            pacmanCtx.restore();
        } else {
            // Draw cached retro glowing Pacman
            var pacSprite = getPacmanSprite(pl.color, frameIndex);
            pacmanCtx.translate(px, py);
            pacmanCtx.rotate(rotAngle);
            if (giantScale > 1) pacmanCtx.scale(giantScale, giantScale);
            pacmanCtx.drawImage(pacSprite, -pacSprite.width/2, -pacSprite.height/2);
        }
        pacmanCtx.restore();
        
        // Draw remaining lives as tiny dots inside character or above
        var livesIndicatorY = py + radius + 7;
        for (var l = 0; l < pl.lives; l++) {
            pacmanCtx.fillStyle = '#ff3300';
            pacmanCtx.beginPath();
            pacmanCtx.arc(px - (pl.lives - 1) * 3 + (l * 6), livesIndicatorY, 2, 0, Math.PI * 2);
            pacmanCtx.fill();
        }
        
        // Draw Energy Tank Bar
        if (pl.likeEnergy && pl.likeEnergy > 0) {
            var barW = 30 * giantScale;
            var barH = 4 * giantScale;
            var barY = livesIndicatorY + 6;
            
            // Background
            pacmanCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            pacmanCtx.fillRect(px - barW / 2, barY, barW, barH);
            
            // Foreground Fill
            var fillPct = Math.min(1.0, pl.likeEnergy / 100);
            pacmanCtx.fillStyle = '#00ffcc'; // neon cyan
            pacmanCtx.fillRect(px - barW / 2, barY, barW * fillPct, barH);
            
            // Draw border
            pacmanCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            pacmanCtx.lineWidth = 1;
            pacmanCtx.strokeRect(px - barW / 2, barY, barW, barH);
        }
    }
    
    // Draw Clones
    pacmanClones.forEach(function(cl) {
        if (cl.spawnDelay > 0) return;
        
        var px = (cl.x + (cl.targetX - cl.x) * cl.progress + 0.5) * pacmanTileSize;
        var py = (cl.y + (cl.targetY - cl.y) * cl.progress + 0.5) * pacmanTileSize;
        
        pacmanCtx.save();
        pacmanCtx.globalAlpha = 0.6; // Semi-transparent
        
        var rotAngle = 0;
        if (cl.dir === 'right') rotAngle = 0;
        else if (cl.dir === 'down') rotAngle = Math.PI / 2;
        else if (cl.dir === 'left') rotAngle = Math.PI;
        else if (cl.dir === 'up') rotAngle = -Math.PI / 2;
        
        var avatarImg = getAvatarImage(cl.owner, cl.avatar);
        var radius = pacmanTileSize * 0.65;
        
        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth !== 0) {
            var mOpen = [Math.PI / 4.5, Math.PI / 8, 0.05][frameIndex];
            pacmanCtx.save();
            pacmanCtx.translate(px, py);
            pacmanCtx.scale(0.8, 0.8);
            pacmanCtx.rotate(rotAngle);
            
            pacmanCtx.beginPath();
            pacmanCtx.arc(0, 0, radius, mOpen, Math.PI * 2 - mOpen);
            pacmanCtx.lineTo(0, 0);
            pacmanCtx.closePath();
            pacmanCtx.save();
            pacmanCtx.clip();
            
            pacmanCtx.rotate(-rotAngle);
            pacmanCtx.globalAlpha = 0.6; // Clones are transparent
            pacmanCtx.drawImage(avatarImg, -radius, -radius, radius * 2, radius * 2);
            pacmanCtx.fillStyle = cl.color;
            pacmanCtx.globalAlpha = 0.3; // Tint
            pacmanCtx.fillRect(-radius, -radius, radius * 2, radius * 2);
            pacmanCtx.restore();
            
            pacmanCtx.globalAlpha = 0.6;
            pacmanCtx.strokeStyle = cl.color;
            pacmanCtx.lineWidth = 3.5;
            pacmanCtx.stroke();
            pacmanCtx.restore();
        } else {
            var pacSprite = getPacmanSprite(cl.color, frameIndex);
            pacmanCtx.save();
            pacmanCtx.translate(px, py);
            pacmanCtx.scale(0.8, 0.8); // Clones are slightly smaller
            pacmanCtx.rotate(rotAngle);
            pacmanCtx.globalAlpha = 0.6;
            pacmanCtx.drawImage(pacSprite, -pacSprite.width/2, -pacSprite.height/2);
            pacmanCtx.restore();
        }
        
        pacmanCtx.restore(); // Restore the outer save for globalAlpha
    });
    
    // Draw VFX particles (optimized)
    pacmanParticles.forEach(function(p) {
        pacmanCtx.fillStyle = p.color;
        var alpha = p.life / p.maxLife;
        pacmanCtx.globalAlpha = alpha;
        var size = p.size;
        
        if (p.shape === 'heart') {
            // Usa a versão em cache para não sobrecarregar a CPU renderizando texto a cada frame
            var s = size * 2;
            pacmanCtx.drawImage(cachedHeartCanvas, p.x - s, p.y - s, s * 2, s * 2);
        } else {
            // Simple square for all particles - fastest rendering
            pacmanCtx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
        }
    });
    pacmanCtx.globalAlpha = 1.0; // reset
    
    // Draw Score texts floating
    pacmanTextParticles.forEach(function(pt) {
        pacmanCtx.font = "bold 10px monospace";
        pacmanCtx.fillStyle = pt.color;
        pacmanCtx.textAlign = 'center';
        
        var alpha = pt.life / 30;
        pacmanCtx.globalAlpha = alpha;
        pacmanCtx.fillText(pt.text, pt.x, pt.y);
    });
    pacmanCtx.globalAlpha = 1.0; // reset
    
    // Overlay DOM sync removido a pedido do usuário (animação agora é fixa no centro)
    
    // Restore translation context
    pacmanCtx.restore();
    
    // Overlay "PAUSED / WAITING" if needed
    if (pacmanGameState === 'waiting') {
        pacmanCtx.fillStyle = 'rgba(0,0,0,0.6)';
        pacmanCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        pacmanCtx.font = "20px monospace";
        pacmanCtx.fillStyle = '#ffff00';
        pacmanCtx.textAlign = 'center';
        pacmanCtx.fillText('PAC-MAN BATTLE', canvas.width / 2, canvas.height / 2 - 20);
        
        pacmanCtx.font = "11px monospace";
        pacmanCtx.fillStyle = '#ffffff';
        pacmanCtx.fillText('AGUARDANDO CONEXAO DA LIVE...', canvas.width / 2, canvas.height / 2 + 15);
    }
}

// ==========================================
// Exposed API (Called from websocket and UI)
// ==========================================
// Leaderboard & Stream Ticker Log
// ==========================================
var _leaderboardDirty = false;
var leaderboardUpdateCounter = 0; // For throttling within game loop

function updatePacmanLeaderboard(force) {
    _leaderboardDirty = true;
    if (force) {
        commitLeaderboardUpdate();
    }
}

function commitLeaderboardUpdate() {
    if (!_leaderboardDirty) return;
    _leaderboardDirty = false;
    
    var lb = document.getElementById('pacmanLeaderboard');
    if (!lb) return;
    
    // Create a dictionary of all players to display (combining active players and global leaderboard)
    var combinedPlayers = {};
    
    // Add all historical global players first
    if (Array.isArray(pacmanGlobalLeaderboard)) {
        pacmanGlobalLeaderboard.forEach(function(item) {
            if (!item.user) return;
            var username = item.user.toLowerCase();
            combinedPlayers[username] = {
                name: item.user,
                score: item.score,
                avatar: item.avatar || '',
                lives: 0, // Mark as inactive/offline
                fuel: 0,
                color: '#aaaaaa' // default gray for offline
            };
        });
    }
    
    // Add or override with active players (with their actual color, current score, lives, fuel, etc.)
    Object.keys(pacmanPlayers).forEach(function(name) {
        var p = pacmanPlayers[name];
        var username = name.toLowerCase();
        combinedPlayers[username] = {
            name: name,
            score: p.score,
            avatar: p.avatar || '',
            lives: p.lives,
            fuel: p.fuel,
            color: p.color
        };
    });
    
    // Convert to array and sort descending by score
    var sortedList = Object.keys(combinedPlayers)
    .filter(function(key) { return !isPlayerBanned(key); })
    .map(function(key) {
        return combinedPlayers[key];
    }).sort(function(a, b) {
        return b.score - a.score;
    });
    
    lb.innerHTML = '';
    
    if (sortedList.length === 0) {
        lb.innerHTML = '<div style="color:#666; font-size:11px; padding:10px; text-align:center;">Nenhum jogador ativo</div>';
        return;
    }
    
    var fragment = document.createDocumentFragment();
    
    // LIMIT to Top 100 to prevent browser freezing (DOM bloat) on tab switch
    sortedList.slice(0, 100).forEach(function(p, idx) {
        var entry = document.createElement('div');
        entry.className = 'player-entry';
        // Add style for styling inactive versus active players slightly differently if desired
        if (p.lives <= 0) {
            entry.style.opacity = '0.6';
        }
        
        // Pódio icons (Crowns)
        var crown = '';
        if (idx === 0) crown = '👑 ';
        else if (idx === 1) crown = '🥈 ';
        else if (idx === 2) crown = '🥉 ';
        else crown = (idx + 1) + '. '; // Mostrar posição para os demais
        
        var avatarUrl = resolveAvatarUrl(p.name, p.avatar);
        var avatarHtml = `<img src="${avatarUrl}" onerror="if(this.src!=='${GENERIC_AVATAR}'){this.src='${GENERIC_AVATAR}';}" style="width:20px; height:20px; border-radius:50%; border:1px solid ${p.color}; flex-shrink:0;">`;
        
        // Lives hearts indicator or offline status
        var hearts = '';
        if (p.lives <= 0) {
            // Check if player is actually in-memory but has 0 lives vs was just loaded from overall leaderboard
            if (pacmanPlayers[p.name.toLowerCase()]) {
                hearts = '💀 ELIMINADO';
            } else {
                hearts = '💤 OFFLINE';
            }
        } else {
            hearts = '❤️'.repeat(Math.max(0, p.lives)) + ` | ⚡ ${p.fuel}`;
        }
        
        entry.innerHTML = `
            ${avatarHtml}
            <div style="display:flex; flex-direction:column; gap:2px; overflow:hidden;">
                <span style="font-weight:bold; font-size:12px; color:#fff; display:flex; align-items:center;">
                    ${crown}${p.name}
                </span>
                <span style="font-size:9px; color:#999;">${hearts}</span>
            </div>
            <span class="player-score" style="color:${p.color};">${p.score}</span>
        `;
        fragment.appendChild(entry);
    });
    
    lb.appendChild(fragment);
}
const recentAlerts = [];
function pushAlertEvent(text) {
    const list = document.getElementById('tickerContainer');
    if (!list) return;
    
    recentAlerts.unshift(text);
    if (recentAlerts.length > 5) recentAlerts.pop();
    
    list.innerHTML = '';
    recentAlerts.forEach(alertText => {
        const div = document.createElement('div');
        div.className = 'ticker-item';
        div.style.padding = '5px 8px';
        div.style.borderBottom = '1px solid #1a1a2e';
        div.style.fontSize = '11px';
        div.style.color = '#00ffff';
        div.style.fontFamily = "'Press Start 2P', monospace";
        div.style.lineHeight = '1.4';
        div.textContent = alertText;
        list.appendChild(div);
    });
}

// ==========================================
// TikTok Gift Event Triggers
// ==========================================
var pacmanGiftImageCache = {};
function getGiftImage(url) {
    if (!url) return null;
    if (pacmanGiftImageCache[url]) return pacmanGiftImageCache[url];
    var img = new Image();
    img.src = url;
    pacmanGiftImageCache[url] = img;
    return img;
}

function triggerGiftAnimationOverlay(url, senderName, giftName) {
    if (!url) return;
    
    // Criar overlay
    var overlay = document.getElementById('giftAnimationOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'giftAnimationOverlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.opacity = '1';
        overlay.style.zIndex = '20000'; // Above everything
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        
        var img = document.createElement('img');
        img.id = 'giftAnimationImg';
        img.style.maxWidth = '450px';
        img.style.maxHeight = '450px';
        
        overlay.appendChild(img);
        
        var wrapper = document.getElementById('gameWrapper') || document.body;
        wrapper.appendChild(overlay);
    }
    
    var imgEl = document.getElementById('giftAnimationImg');
    if (window.pacmanUseGiftImages === false) {
        imgEl.style.display = 'none';
        imgEl.src = '';
    } else {
        imgEl.style.display = 'block';
        imgEl.src = url;
    }
    
    // Configura metadados para o loop do drawPacman amarrar na posição
    overlay.style.display = 'flex';
    overlay.dataset.active = 'true';
    overlay.dataset.targetUser = senderName.toLowerCase();
    overlay.dataset.startTime = Date.now();
    overlay.dataset.baseScale = '1';
    
    // Force reflow
    void overlay.offsetWidth;
    
    // Clear previous timeout if exists
    if (window.giftAnimationTimeout) clearTimeout(window.giftAnimationTimeout);
    
    window.giftAnimationTimeout = setTimeout(function() {
        if (overlay) {
            overlay.style.display = 'none';
            overlay.dataset.active = 'false';
        }
    }, 4500); // Fica 4.5 segundos na tela
}

function processTikTokGift(data) {
    if (!data || !data.user) return;
    var user = data.user.replace(/^@/, '').toLowerCase();
    var gift = (data.giftName || '').toLowerCase().trim();
    var diamondCount = data.diamondCount || 1;
    var repeatCount = data.repeatCount || 1;
    
    // Trigger animation in DOM se for presente caro ou animado
    var totalValue = diamondCount * repeatCount;
    var animUrl = data.giftAnimationUrl || data.giftPictureUrl;
    if (animUrl && (data.giftType > 1 || totalValue >= 30 || data.giftAnimationUrl)) {
        triggerGiftAnimationOverlay(animUrl, user, gift || 'Presente Especial');
    }
    
    // Atualiza o painel financeiro (Contabilidade de faturamento)
    updateDailyRevenue(diamondCount * repeatCount);
    
    // Spawn sender if not spawned so they get credit for playing
    spawnPacmanPlayer(user, data.avatar || '');
    
    // Aplica o presente diretamente ao dono (quem enviou na live)
    var pl = pacmanPlayers[user];
    if (pl) {
        var dummyDrop = {
            gift: gift,
            sender: user,
            diamondCount: diamondCount,
            repeatCount: repeatCount
        };
        activateGiftPower(pl, user, dummyDrop);
    }
}

function activateGiftPower(pl, userName, giftDrop) {
    var gift = String(giftDrop.gift || '').toLowerCase();
    var user = giftDrop.sender;
    var diamondCount = giftDrop.diamondCount || 1;
    var repeatCount = giftDrop.repeatCount || 1;
    var consumerName = userName || pl.owner || 'Fantasma/Clone';
    
    var totalValue = diamondCount * repeatCount;
    var msgParts = [];
    
    // Nomes clássicos para o modo Híbrido
    var isGG = gift.includes('gg');
    var isRosa = gift.includes('rosa') || gift.includes('rose') || gift.includes('love');
    var isTikTok = gift.includes('tiktok') || ((gift.includes('coração') || gift.includes('coracao') || gift.includes('heart')) && !gift.includes('finger'));
    var isFingerHeart = gift.includes('finger') || gift.includes('amo');
    var isDonut = gift.includes('rosquinha') || gift.includes('donut');
    
    // 1. SISTEMA CLÁSSICO (Por Nome)
    var handledClassic = false;
    
    if (isDonut) {
        // GIGANTE (10s por unidade)
        var addedMs = 10000 * repeatCount;
        var isAlreadyGiant = pl.giantEndTime && pl.giantEndTime > Date.now();
        pl.giantEndTime = (isAlreadyGiant ? pl.giantEndTime : Date.now()) + addedMs;
        pl.giantStacks = isAlreadyGiant ? (pl.giantStacks || 1) + repeatCount : repeatCount;
        pl.giantTimer = 1;
        AudioSynth.playTone(400, 'sine', 0.5, 0.2);
        msgParts.push(`${repeatCount}x GIGANTE`);
        handledClassic = true;
    } else if (isFingerHeart) {
        // CLONES (60s por unidade)
        var existingClones = pacmanClones.filter(function(c) { return c.owner === consumerName; });
        if (existingClones.length > 0) {
            existingClones.forEach(function(c) { 
                var isAlreadyClone = c.endTime && c.endTime > Date.now();
                c.endTime = (isAlreadyClone ? c.endTime : Date.now()) + (60000 * repeatCount);
                c.timer = 1;
            });
        } else {
            var cloneDirs = ['up', 'down', 'left', 'right', 'up'];
            for (var i = 0; i < 5; i++) {
                pacmanClones.push({
                    owner: consumerName, x: pl.x, y: pl.y, targetX: pl.x, targetY: pl.y, progress: 0,
                    dir: cloneDirs[i], timer: 1, endTime: Date.now() + (60000 * repeatCount), color: pl.color || '#ff00ff', avatar: pl.avatar, huntTimer: 0, fleeTimer: 0,
                    spawnDelay: i * 90
                });
            }
        }
        msgParts.push(`${repeatCount}x CLONES`);
        handledClassic = true;
    } else if (isTikTok) {
        // VIDA EXTRA (+1 Life por unidade)
        var addedLives = 0;
        for (var l = 0; l < repeatCount; l++) {
            if (pl.lives < 5) { pl.lives++; addedLives++; }
        }
        if (addedLives > 0) {
            msgParts.push(`+${addedLives} VIDA`);
            AudioSynth.playTone(1000, 'square', 0.1, 0.2);
            updatePacmanLeaderboard(true);
        } else {
            msgParts.push(`VIDA MÁXIMA`);
        }
        handledClassic = true;
    } else if (isRosa) {
        // PÍLULA DE PODER (15s por unidade)
        var isAlreadyPower = pl.powerEndTime && pl.powerEndTime > Date.now();
        pl.powerEndTime = (isAlreadyPower ? pl.powerEndTime : Date.now()) + (15000 * repeatCount);
        pl.powerTimer = 1;
        var isAlreadyAuto = pl.autoEnergyEndTime && pl.autoEnergyEndTime > Date.now();
        pl.autoEnergyEndTime = (isAlreadyAuto ? pl.autoEnergyEndTime : Date.now()) + (15000 * repeatCount);
        pl.autoEnergyTimer = 1;
        pl.ghostComboCount = 0;
        AudioSynth.playTone(880, 'sine', 0.4, 0.1);
        msgParts.push(`+PÍLULA DE PODER`);
        handledClassic = true;
    } else if (isGG) {
        // APENAS TURBO (20s por unidade)
        var boostMultiplier = 1.5 + (0.1 * repeatCount);
        if (boostMultiplier > 2.5) boostMultiplier = 2.5;
        pl.giftSpeedMultiplier = boostMultiplier;
        var isAlreadySpeed = pl.giftSpeedEndTime && pl.giftSpeedEndTime > Date.now();
        pl.giftSpeedEndTime = (isAlreadySpeed ? pl.giftSpeedEndTime : Date.now()) + (20000 * repeatCount);
        pl.giftSpeedTimer = 1;
        msgParts.push(`SUPER TURBO`);
        handledClassic = true;
    }
    
    // 2. SISTEMA MATEMÁTICO DE DIAMANTES (Somente se não foi presente clássico)
    if (!handledClassic) {
        // Bônus Universal de Velocidade
        var speedBonusPercent = 0.05 * totalValue;
        var multiplier = 1.0 + speedBonusPercent;
        if (multiplier > 2.5) multiplier = 2.5;
        var durationMs = 5000 + (totalValue * 1000);
        if (durationMs > 30000) durationMs = 30000; // Cap at 30 seconds
        
        pl.giftSpeedMultiplier = multiplier;
        var isAlreadySpeedMath = pl.giftSpeedEndTime && pl.giftSpeedEndTime > Date.now();
        pl.giftSpeedEndTime = (isAlreadySpeedMath ? pl.giftSpeedEndTime : Date.now()) + durationMs;
        pl.giftSpeedTimer = 1;
        if (multiplier > 1.0) msgParts.push(`TURBO +${Math.round((multiplier - 1.0)*100)}%`);
        
        if (totalValue >= 30) {
            // TIER 3: GIGANTE
            var numGiants = Math.floor(totalValue / 30);
            var remainder = totalValue % 30;
            var addedMs = 10000 * numGiants;
            var isAlreadyGiant = pl.giantEndTime && pl.giantEndTime > Date.now();
            pl.giantEndTime = (isAlreadyGiant ? pl.giantEndTime : Date.now()) + addedMs;
            pl.giantStacks = isAlreadyGiant ? (pl.giantStacks || 1) + numGiants : numGiants;
            pl.giantTimer = 1;
            AudioSynth.playTone(400, 'sine', 0.5, 0.2);
            msgParts.push(`${numGiants}x GIGANTE`);
            totalValue = remainder;
        }
        
        if (totalValue >= 5) {
            // TIER 2: CLONES
            var numCloneGroups = Math.floor(totalValue / 5);
            var existingClones = pacmanClones.filter(function(c) { return c.owner === consumerName; });
            if (existingClones.length > 0) {
                existingClones.forEach(function(c) { 
                    var isAlreadyClone = c.endTime && c.endTime > Date.now();
                    c.endTime = (isAlreadyClone ? c.endTime : Date.now()) + (60000 * numCloneGroups);
                    c.timer = 1;
                });
            } else {
                var cloneDirs = ['up', 'down', 'left', 'right', 'up'];
                for (var i = 0; i < 5; i++) {
                    pacmanClones.push({
                        owner: consumerName, x: pl.x, y: pl.y, targetX: pl.x, targetY: pl.y, progress: 0,
                        dir: cloneDirs[i], timer: 1, endTime: Date.now() + (60000 * numCloneGroups), color: pl.color || '#ff00ff', avatar: pl.avatar, huntTimer: 0, fleeTimer: 0,
                        spawnDelay: i * 90
                    });
                }
            }
            msgParts.push(`${numCloneGroups}x CLONES`);
            
            // Tier 2 também dá Pílula de Poder
            var rosePower = numCloneGroups * 2; 
            var isAlreadyPower2 = pl.powerEndTime && pl.powerEndTime > Date.now();
            pl.powerEndTime = (isAlreadyPower2 ? pl.powerEndTime : Date.now()) + (15000 * rosePower);
            pl.powerTimer = 1;
            var isAlreadyAuto2 = pl.autoEnergyEndTime && pl.autoEnergyEndTime > Date.now();
            pl.autoEnergyEndTime = (isAlreadyAuto2 ? pl.autoEnergyEndTime : Date.now()) + (15000 * rosePower);
            pl.autoEnergyTimer = 1;
            pl.ghostComboCount = 0;
            msgParts.push(`+PÍLULA DE PODER`);
            AudioSynth.playTone(880, 'sine', 0.4, 0.1);
            
        } else if (totalValue >= 1) {
            // TIER 1: PÍLULA DE PODER
            var isAlreadyPower1 = pl.powerEndTime && pl.powerEndTime > Date.now();
            pl.powerEndTime = (isAlreadyPower1 ? pl.powerEndTime : Date.now()) + (15000 * totalValue);
            pl.powerTimer = 1;
            var isAlreadyAuto1 = pl.autoEnergyEndTime && pl.autoEnergyEndTime > Date.now();
            pl.autoEnergyEndTime = (isAlreadyAuto1 ? pl.autoEnergyEndTime : Date.now()) + (15000 * totalValue);
            pl.autoEnergyTimer = 1;
            pl.ghostComboCount = 0;
            AudioSynth.playTone(880, 'sine', 0.4, 0.1);
            msgParts.push(`+PÍLULA DE PODER`);
            
        } else if (giftDrop.diamondCount === 0 || !totalValue) {
            spawnFruit();
            msgParts.push(`Fruta Bônus`);
        }
    }
    
    var summary = msgParts.join(', ');
    spawnTextParticle(pl.x, pl.y, summary, '#ffaa00');
    pushAlertEvent(`🎁 @${consumerName} ativou '${giftDrop.gift}' (${diamondCount*repeatCount}💎): ${summary}!`);
}

function processTikTokLike(data) {
    if (!data || !data.user) return;
    var user = data.user.replace(/^@/, '').toLowerCase();
    var likes = data.likeCount || 1;
    
    // Spawn player if they don't exist yet OR if they are out of lives
    if (!pacmanPlayers[user] || pacmanPlayers[user].lives <= 0) {
        spawnPacmanPlayer(user, data.avatar || '');
    }
    var pl = pacmanPlayers[user];
    if (!pl || pl.lives <= 0) return;
    
    pl.lastActivityTime = Date.now();
    
    // Record likes/taps timestamps
    pl.likeEnergy = (pl.likeEnergy || 0) + (likes * 10);
    if (pl.likeEnergy > 100) pl.likeEnergy = 100; // Cap max energy at 100
    
    pl.likesBuffer += likes;
    var fuelToAdd = Math.floor(pl.likesBuffer / 5);
    if (fuelToAdd > 0) {
        pl.fuel += fuelToAdd;
        pl.likesBuffer %= 5;
        spawnHeartParticles(pl.x, pl.y, fuelToAdd * 4); // Spawn small hearts floating up!
        updatePacmanLeaderboard();
    }
}

function processTikTokSocial(data) {
    if (!data || !data.user) return;
    var user = data.user.replace(/^@/, '').toLowerCase();
    
    // Spawn player if they don't exist yet OR if they are out of lives
    if (!pacmanPlayers[user] || pacmanPlayers[user].lives <= 0) {
        spawnPacmanPlayer(user, data.avatar || '');
    }
    
    if (pacmanPlayers[user]) {
        pacmanPlayers[user].lastActivityTime = Date.now();
    }
    
    var actionName = 'interagiu';
    if (data.action === 'follow') {
        actionName = 'Seguiu';
        queueSubscriberCelebration(user, data.avatar || '', 'NOVO SEGUIDOR!');
    }
    else if (data.action === 'share') {
        actionName = 'Compartilhou';
        queueSubscriberCelebration(user, data.avatar || '', 'COMPARTILHOU!');
    }
    else if (data.action === 'member') actionName = 'Membro Entrou';
    else if (data.action === 'subscribe') {
        actionName = 'Se inscreveu';
        queueSubscriberCelebration(user, data.avatar || '', 'NOVO INSCRITO!');
    }
    
    pushAlertEvent(`👤 @${user} ${actionName} a live! Entrou no jogo!`);
}

function spawnConfetti(count, initial) {
    for (var i = 0; i < count; i++) {
        pacmanCelebrationConfetti.push({
            x: Math.random() * 1080,
            y: initial ? Math.random() * 1920 : -20 - Math.random() * 100,
            vx: (Math.random() - 0.5) * 4,
            vy: 3 + Math.random() * 5,
            size: 8 + Math.random() * 12,
            aspectRatio: 0.4 + Math.random() * 0.6,
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            color: 'hsl(' + Math.floor(Math.random() * 360) + ', 100%, 60%)'
        });
    }
}

function spawnFirework(x, y) {
    var sparkCount = 12 + Math.floor(Math.random() * 8); // Reduced from 40-60 to 12-20
    var baseHue = Math.floor(Math.random() * 360);
    for (var i = 0; i < sparkCount; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 3 + Math.random() * 8;
        pacmanCelebrationFireworkSparks.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.15,
            drag: 0.96,
            size: 3 + Math.random() * 4,
            alpha: 1.0,
            decay: 0.01 + Math.random() * 0.015,
            color: 'hsl(' + (baseHue + Math.floor(Math.random() * 40) - 20) + ', 100%, 65%)'
        });
    }
}

function updateCelebrationParticles() {
    // Update confetti
    for (var i = pacmanCelebrationConfetti.length - 1; i >= 0; i--) {
        var c = pacmanCelebrationConfetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.angle += c.rotationSpeed;
        if (c.y > 1920) {
            pacmanCelebrationConfetti.splice(i, 1);
        }
    }
    
    // Update firework sparks
    for (var i = pacmanCelebrationFireworkSparks.length - 1; i >= 0; i--) {
        var s = pacmanCelebrationFireworkSparks[i];
        s.vx *= s.drag;
        s.vy *= s.drag;
        s.vy += s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;
        if (s.alpha <= 0) {
            pacmanCelebrationFireworkSparks.splice(i, 1);
        }
    }
}

function drawCelebrationParticles() {
    if (!pacmanCtx) return;
    
    // Draw confetti (simplified - no rotation)
    for (var i = 0; i < pacmanCelebrationConfetti.length; i++) {
        var c = pacmanCelebrationConfetti[i];
        pacmanCtx.fillStyle = c.color;
        pacmanCtx.fillRect(c.x - 3, c.y - 3, 6, 6);
    }
    
    // Draw firework sparks (simplified)
    for (var i = 0; i < pacmanCelebrationFireworkSparks.length; i++) {
        var s = pacmanCelebrationFireworkSparks[i];
        pacmanCtx.globalAlpha = Math.max(0, s.alpha);
        pacmanCtx.fillStyle = s.color;
        pacmanCtx.fillRect(s.x - 2, s.y - 2, 4, 4);
    }
    pacmanCtx.globalAlpha = 1.0;
}

function queueSubscriberCelebration(userName, avatarUrl, titleText) {
    pacmanCelebrationQueue.push({
        user: userName,
        avatar: avatarUrl || '',
        title: titleText || 'NOVO INSCRITO!',
        timer: 120 // 2 seconds (mais rápido)
    });
    
    if (avatarUrl) {
        getAvatarImage(userName, avatarUrl);
    }
}

function updateActiveCelebration() {
    if (!pacmanActiveCelebration) {
        if (pacmanCelebrationQueue.length > 0) {
            pacmanActiveCelebration = pacmanCelebrationQueue.shift();
            spawnConfetti(20, true); // Reduced from 100 to 20
            spawnFirework(200 + Math.random() * 680, 400 + Math.random() * 400);
            AudioSynth.playTone(600, 'sine', 0.3, 0.1);
            setTimeout(function() { AudioSynth.playTone(800, 'sine', 0.3, 0.1); }, 150);
        }
    }
    
    if (pacmanActiveCelebration) {
        pacmanActiveCelebration.timer--;
        
        if (Math.random() < 0.1) { // Reduced chance from 35% to 10%
            spawnConfetti(1, false); // Reduced from 3 to 1
        }
        
        if (pacmanActiveCelebration.timer === 60) { // Only spawn 1 extra firework exactly in the middle of the timer
            spawnFirework(200 + Math.random() * 680, 300 + Math.random() * 600);
            AudioSynth.playTone(150 + Math.random() * 200, 'sine', 0.1, 0.05);
        }
        
        if (pacmanActiveCelebration.timer <= 0) {
            pacmanActiveCelebration = null;
        }
    }
    
    updateCelebrationParticles();
}

function drawSubscriberCelebrationBanner() {
    if (!pacmanActiveCelebration || !pacmanCtx) return;
    
    var w = 1080;
    var h = 1920;
    
    var cardW = 800;
    var cardH = 260;
    var cardX = (w - cardW) / 2;
    var cardY = 320;
    
    pacmanCtx.save();
    
    // Efeito Pulsante
    var pulse = 1.0 + Math.sin(Date.now() / 80) * 0.08;
    pacmanCtx.translate(cardX + cardW/2, cardY + cardH/2);
    pacmanCtx.scale(pulse, pulse);
    pacmanCtx.translate(-(cardX + cardW/2), -(cardY + cardH/2));
    
    // 2. Avatar
    var avatarX = cardX + 150;
    var avatarY = cardY + cardH / 2;
    var avatarRadius = 85;
    
    var userName = pacmanActiveCelebration.user;
    var avatarImg = avatarCache[userName];
    
    if (avatarImg && avatarImg.complete && avatarImg.naturalWidth !== 0) {
        pacmanCtx.save();
        pacmanCtx.beginPath();
        pacmanCtx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
        pacmanCtx.closePath();
        pacmanCtx.clip();
        pacmanCtx.drawImage(avatarImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        pacmanCtx.restore();
    } else {
        pacmanCtx.fillStyle = pacmanThemeDotColor;
        pacmanCtx.beginPath();
        pacmanCtx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
        pacmanCtx.fill();
    }
    
    // Avatar Border
    pacmanCtx.beginPath();
    pacmanCtx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    pacmanCtx.strokeStyle = '#ffff00';
    pacmanCtx.lineWidth = 6;
    pacmanCtx.stroke();
    
    // 3. Text
    pacmanCtx.fillStyle = '#00ffff';
    pacmanCtx.font = 'bold 45px "Outfit", Inter, sans-serif';
    pacmanCtx.textAlign = 'left';
    var bannerTitle = pacmanActiveCelebration.title || 'NOVO INSCRITO!';
    pacmanCtx.fillText(bannerTitle, cardX + 280, cardY + 110);
    
    pacmanCtx.fillStyle = '#ffffff';
    pacmanCtx.font = 'bold 65px "Inter", sans-serif';
    pacmanCtx.fillText('@' + userName, cardX + 280, cardY + 185);
    
    // 4. Draw a pacman sprite on the right
    var pacSprite = getPacmanSprite('#ffff00', Math.floor(Date.now() / 150) % 3);
    if (pacSprite) {
        pacmanCtx.drawImage(pacSprite, cardX + cardW - 140, cardY + 80, pacSprite.width * 2.5, pacSprite.height * 2.5);
    }
    
    pacmanCtx.restore();
}

// ==========================================
// WebSocket Chat Listener — aggressive reconnect, never gives up
// ==========================================
var ws = null;
var _wsReconnectTimer = null;
var _wsLastCredentials = null; // { type: 'tiktok'|'youtube', value: string, sessionId?: string }
var _wsConnecting = false;
var _wsFailedAttempts = 0;

var _currentConnectionState = {
    platform: null, // 'tiktok', 'youtube', or null
    status: 'disconnected', // 'disconnected', 'connecting', 'connected'
    username: ''
};

function updateConnectionUI(status, platform, username) {
    _currentConnectionState.status = status;
    _currentConnectionState.platform = platform;
    _currentConnectionState.username = username || '';

    var tiktokInput = document.getElementById('pacmanTiktokInput');
    var tiktokSessionInput = document.getElementById('pacmanTiktokSessionInput');
    var tiktokBtn = document.querySelector('.tiktok-border button');
    var youtubeInput = document.getElementById('pacmanYoutubeInput');
    var youtubeBtn = document.querySelector('.youtube-border button');
    
    var dot = document.getElementById('statusDot');
    var text = document.getElementById('statusText');

    // Reset both inputs and buttons to default
    if (tiktokInput && tiktokBtn) {
        tiktokInput.disabled = false;
        if (tiktokSessionInput) tiktokSessionInput.disabled = false;
        tiktokBtn.disabled = false;
        tiktokBtn.textContent = 'CONECTAR';
        tiktokBtn.style.background = '';
    }
    if (youtubeInput && youtubeBtn) {
        youtubeInput.disabled = false;
        youtubeBtn.disabled = false;
        youtubeBtn.textContent = 'CONECTAR';
        youtubeBtn.style.background = '';
    }

    if (status === 'connecting') {
        if (dot) dot.style.background = '#ffcc00'; // yellow
        if (platform === 'tiktok') {
            if (text) text.textContent = 'Conectando ao TikTok: @' + username + '...';
            if (tiktokInput && tiktokBtn) {
                tiktokInput.disabled = true;
                if (tiktokSessionInput) tiktokSessionInput.disabled = true;
                tiktokBtn.disabled = true;
                tiktokBtn.textContent = 'CONECTANDO...';
            }
            if (youtubeInput && youtubeBtn) {
                youtubeInput.disabled = true;
                youtubeBtn.disabled = true;
            }
        } else if (platform === 'youtube') {
            if (text) text.textContent = 'Conectando ao YouTube: ' + username + '...';
            if (youtubeInput && youtubeBtn) {
                youtubeInput.disabled = true;
                youtubeBtn.disabled = true;
                youtubeBtn.textContent = 'CONECTANDO...';
            }
            if (tiktokInput && tiktokBtn) {
                tiktokInput.disabled = true;
                tiktokBtn.disabled = true;
            }
        }
    } else if (status === 'connected') {
        if (dot) dot.style.background = '#00ffcc'; // green/cyan
        if (platform === 'tiktok') {
            if (text) text.textContent = 'Conectado: TikTok (@' + username + ')';
            if (tiktokInput && tiktokBtn) {
                tiktokInput.disabled = true;
                if (tiktokSessionInput) tiktokSessionInput.disabled = true;
                tiktokBtn.textContent = 'DESCONECTAR';
                tiktokBtn.style.background = '#ff0055';
            }
            if (youtubeInput && youtubeBtn) {
                youtubeInput.disabled = true;
                youtubeBtn.disabled = true;
            }
        } else if (platform === 'youtube') {
            if (text) text.textContent = 'Conectado: YouTube (' + username + ')';
            if (youtubeInput && youtubeBtn) {
                youtubeInput.disabled = true;
                youtubeBtn.textContent = 'DESCONECTAR';
                youtubeBtn.style.background = '#ff0055';
            }
            if (tiktokInput && tiktokBtn) {
                tiktokInput.disabled = true;
                tiktokBtn.disabled = true;
            }
        }
    } else { // disconnected
        if (dot) dot.style.background = '#ff0055'; // red
        if (text) text.textContent = 'Status: Desconectado';
    }
}

function _wsScheduleReconnect(delayMs) {
    if (_wsReconnectTimer) return; // already scheduled
    var delay = delayMs || 200;
    _wsReconnectTimer = setTimeout(function () {
        _wsReconnectTimer = null;
        initWebSocket();
    }, delay);
}

function initWebSocket() {
    if (_wsConnecting) return;
    _wsConnecting = true;

    // Close stale socket cleanly
    if (ws) {
        try { ws.onclose = null; ws.onerror = null; ws.close(); } catch (e) { }
        ws = null;
    }

    var wsProto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    var wsHost = window.location.hostname;
    var wsPort = window.location.port;
    var isLocal = (wsHost === 'localhost' || wsHost === '127.0.0.1' || wsHost.endsWith('.test') || wsHost.endsWith('.local') || wsHost.startsWith('192.168.') || wsHost.startsWith('10.'));

    if (isLocal) {
        if (!wsPort || wsPort === '80' || wsPort === '443' || wsPort === '8000' || wsPort === '8080') {
            wsPort = '3000'; // Fallback to Node.js port if running via Apache/Nginx virtual host or custom dev ports
        }
    }

    var wsUrl = wsProto + wsHost + (wsPort ? ':' + wsPort : '');
    console.log('[WS] Attempting connection to:', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = function () {
        _wsConnecting = false;
        _wsFailedAttempts = 0; // reset on success
        // Fetch leaderboard
        try { ws.send(JSON.stringify({ action: 'get_leaderboard' })); } catch (e) { }
        // Auto re-authenticate if we had a previous connection
        if (_wsLastCredentials) {
            try {
                if (_wsLastCredentials.type === 'tiktok') {
                    updateConnectionUI('connecting', 'tiktok', _wsLastCredentials.value);
                    ws.send(JSON.stringify({ action: 'connect', username: _wsLastCredentials.value }));
                    pushAlertEvent('🔄 Reconectando ao TikTok automaticamente...');
                } else if (_wsLastCredentials.type === 'youtube') {
                    updateConnectionUI('connecting', 'youtube', _wsLastCredentials.value);
                    ws.send(JSON.stringify({ action: 'connect_youtube', youtubeId: _wsLastCredentials.value }));
                    pushAlertEvent('🔄 Reconectando ao YouTube automaticamente...');
                }
            } catch (e) { }
        }
    };

    ws.onmessage = function (e) {
        try {
            var data = JSON.parse(e.data);
            if (data.type === 'chat') {
                window.processPacmanComment(data);
            } else if (data.type === 'gift') {
                processTikTokGift(data);
            } else if (data.type === 'like') {
                processTikTokLike(data);
            } else if (data.type === 'social' || data.type === 'follow' || data.type === 'share' || data.type === 'subscribe' || data.type === 'member') {
                if (!data.action) data.action = data.type; // Map type to action for processTikTokSocial
                processTikTokSocial(data);
            } else if (data.type === 'leaderboard') {
                pacmanGlobalLeaderboard = data.data || [];
                _leaderboardDirty = true;
                commitLeaderboardUpdate();
            } else if (data.type === 'connected') {
                updateConnectionUI('connected', data.platform, data.username);
                pushAlertEvent(`🟢 Conexão estabelecida com ${data.platform.toUpperCase()}`);
                if (pacmanGameState === 'waiting') {
                    pacmanGameState = 'playing';
                    AudioSynth.playStartMelody();
                    gameLoop();
                }
            } else if (data.type === 'disconnected') {
                updateConnectionUI('disconnected');
                if (data.platform !== 'all') {
                    pushAlertEvent(`🟠 Chat ${data.platform} caiu — reconectando automaticamente...`);
                }
            } else if (data.type === 'error') {
                updateConnectionUI('disconnected');
                pushAlertEvent(`⚠️ Erro: ${data.message}`);
                if (data.message.includes('Acesso Negado')) {
                    alert(data.message);
                }
            }
        } catch (err) {
            console.error('[WS] Error processing msg:', err);
        }
    };

    ws.onerror = function (err) {
        console.warn('[WS] Error:', err);
        _wsConnecting = false;
        _wsFailedAttempts++;
        updateConnectionUI('disconnected');
    };

    ws.onclose = function () {
        _wsConnecting = false;
        updateConnectionUI('disconnected');
        var text = document.getElementById('statusText');
        if (text) {
            if (_wsFailedAttempts >= 2) {
                text.textContent = 'Servidor local offline — execute "npm run start"';
            } else {
                text.textContent = 'WebSocket perdido — reconectando...';
            }
        }
        pushAlertEvent(`🔴 WebSocket offline — reconectando em instantes...`);
        _wsScheduleReconnect(1000); // 1s reconnect interval instead of 200ms
    };
}


function connectPacmanTiktok() {
    var tiktokBtn = document.querySelector('.tiktok-border button');
    if (tiktokBtn && tiktokBtn.textContent === 'DESCONECTAR') {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ action: 'disconnect' }));
        }
        return;
    }

    var u = document.getElementById('pacmanTiktokInput').value.trim();
    if (!u) {
        alert('Por favor, insira o nome de usuário do TikTok.');
        return;
    }

    if (ws && ws.readyState === 1) {
        _wsLastCredentials = { type: 'tiktok', value: u }; // save for auto-reconnect
        updateConnectionUI('connecting', 'tiktok', u);
        ws.send(JSON.stringify({ action: 'connect', username: u }));
    } else {
        alert('O jogo não está conectado ao servidor do chat (WebSocket). Certifique-se de que o servidor Node está rodando no terminal com o comando "npm run start" ou "node server.js".\n\nTentando reconectar agora...');
        initWebSocket();
    }
}

function connectPacmanYoutube() {
    var youtubeBtn = document.querySelector('.youtube-border button');
    if (youtubeBtn && youtubeBtn.textContent === 'DESCONECTAR') {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ action: 'disconnect' }));
        }
        return;
    }

    var id = document.getElementById('pacmanYoutubeInput').value.trim();
    if (!id) {
        alert('Por favor, insira o ID do canal ou vídeo do YouTube.');
        return;
    }

    if (ws && ws.readyState === 1) {
        _wsLastCredentials = { type: 'youtube', value: id }; // save for auto-reconnect
        updateConnectionUI('connecting', 'youtube', id);
        ws.send(JSON.stringify({ action: 'connect_youtube', youtubeId: id }));
    } else {
        alert('O jogo não está conectado ao servidor do chat (WebSocket). Certifique-se de que o servidor Node está rodando no terminal com o comando "npm run start" ou "node server.js".\n\nTentando reconectar agora...');
        initWebSocket();
    }
}

function spawnTestPlayer() {
    var randomNames = ['Ninja', 'ArcadeKing', 'WakaFan', 'GhostBuster', 'Speedy', 'RetroGamer', 'TikTokHero'];
    var name = 'bot_' + randomNames[Math.floor(Math.random() * randomNames.length)] + Math.floor(Math.random() * 100);
    spawnPacmanPlayer(name.toLowerCase(), 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60');
    
    // If game state is waiting and websocket not connected (local play), force start game loop
    if (pacmanGameState === 'waiting') {
        pacmanGameState = 'playing';
        AudioSynth.playStartMelody();
        gameLoop();
    }
}

// Keyboard arrow controls for local offline testing
document.addEventListener('keydown', function(e) {
    var offlineName = new URLSearchParams(window.location.search).get('player') || 'testplayer';
    offlineName = offlineName.toLowerCase();
    
    if (pacmanPlayers[offlineName]) {
        var key = e.key;
        if (key === 'ArrowLeft' || key === 'a' || key === 'A') movePacmanPlayer(offlineName, 'left');
        else if (key === 'ArrowRight' || key === 'd' || key === 'D') movePacmanPlayer(offlineName, 'right');
        else if (key === 'ArrowUp' || key === 'w' || key === 'W') movePacmanPlayer(offlineName, 'up');
        else if (key === 'ArrowDown' || key === 's' || key === 'S') movePacmanPlayer(offlineName, 'down');
    }
    
    // HUD show/hide hotkey
    if (e.key && typeof e.key === 'string') {
        if (e.key.toLowerCase() === 'h') {
            document.body.classList.toggle('hud-hidden');
        }
        
        // Debug: Simular presente premium animado
        if (e.key.toLowerCase() === 'g') {
            processTikTokGift({
                user: offlineName,
                giftName: 'Leão Teste',
                diamondCount: 29999,
                repeatCount: 1,
                giftPictureUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/1283c70685933d0bd3c02eb25e6e3ce5~tplv-obj.png', // Leão fallback
                giftAnimationUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/1283c70685933d0bd3c02eb25e6e3ce5~tplv-obj.png', 
                giftType: 2
            });
        }
    }
});

// ==========================================
// Main Gameloop
// ==========================================
function gameLoop() {
    // Never stop requestAnimationFrame, even in waiting state (so screen renders the waiting graphics)
    
    try {
        if (pacmanGameState === 'playing') {
            // Recalculate pacmanPowerMode and pacmanGiantMode based on active players
            var anyPowered = false;
            var anyGiant = false;
            for (var p in pacmanPlayers) {
                var pl = pacmanPlayers[p];
                if (pl.powerEndTime) {
                    if (Date.now() < pl.powerEndTime) pl.powerTimer = 1;
                    else pl.powerTimer = 0;
                } else if (pl.powerTimer > 0) {
                    pl.powerTimer--;
                }
                
                if (pl.powerTimer > 0) {
                    anyPowered = true;
                }
                if (pacmanPlayers[p].giantTimer > 0) {
                    anyGiant = true;
                }
            }
            pacmanGiantMode = anyGiant;
            
            if (pacmanPowerMode && !anyPowered) {
                pacmanPowerMode = false;
                pushAlertEvent(`⚠️ Pílula de Poder expirou! Fantasmas agressivos!`);
                updateDotFlowField(); // Limpa a atração residual dos fantasmas do flow field
            } else if (!pacmanPowerMode && anyPowered) {
                pacmanPowerMode = true;
                updateDotFlowField();
            }
            
            // Update ambient siren sound
            var activePlayers = Object.keys(pacmanPlayers).filter(function(p) {
                return pacmanPlayers[p].lives > 0;
            });
            if (activePlayers.length > 0) {
                var totalDots = pacmanDots.length;
                var activeDots = pacmanDots.filter(function(d) { return d.active; }).length;
                var eatenRatio = (totalDots - activeDots) / (totalDots || 1);
                // Sirene ambiente (sem barulho alto/alarme para powerMode para ficar sutil)
                AudioSynth.updateSiren(true, false, eatenRatio);
            } else {
                AudioSynth.updateSiren(false);
            }
            
// Clean up inactive players every 60 frames (~1 second) to maintain high performance and free up slots
            cleanupCheckFrameCounter++;
            if (cleanupCheckFrameCounter >= 120) {
                cleanupCheckFrameCounter = 0;
                cleanupInactivePlayers();
            }
 
            // Throttle leaderboard DOM updates (at most once every 60 frames / 1 second)
            // leaderboardUpdateCounter++;
            // if (leaderboardUpdateCounter >= 60) {
            //     leaderboardUpdateCounter = 0;
            //     commitLeaderboardUpdate(); // Atualizacao continua removida para evitar travamento
            // Atualizacao continua removida para evitar travamento
            // }
            
            // --- Dynamic Fruit Spawning & Despawning ---
            // Decrement timer
            if (pacmanFruitTimer > 0) {
                pacmanFruitTimer--;
            } else {
                // Check if there's any active fruit on the board
                var activeFruits = pacmanFruits.filter(function(f) { return f.active; });
                if (activeFruits.length === 0) {
                    // Spawn a new fruit
                    spawnFruit();
                    // Set timer to despawn it after 15 seconds (900 frames at 60fps)
                    pacmanFruitTimer = 900;
                } else {
                    // Despawn the active fruit (it expired!)
                    pacmanFruits.forEach(function(f) {
                        if (f.active) {
                            f.active = false;
                            pushAlertEvent(`⏰ A Fruta Bônus desapareceu!`);
                            
                            // Restore the dot that was hidden under the fruit
                            if (f.restoredDot) {
                                var dotUnder = pacmanDots.find(function(d) { return d.x === f.x && d.y === f.y; });
                                if (dotUnder) dotUnder.active = true;
                            }
                            updateDotFlowField(); // Atualiza IA para evitar travamento na fruta fantasma
                        }
                    });
                    // Set timer to spawn the next fruit in 25 seconds (1500 frames at 60fps)
                    pacmanFruitTimer = 1500;
                }
            }
            
            // Random Gift Spawn Logic
            if (typeof pacmanGiftSpawnTimer === 'undefined') window.pacmanGiftSpawnTimer = 7200;
            if (pacmanGiftSpawnTimer > 0) {
                pacmanGiftSpawnTimer--;
            } else {
                var activeDrops = pacmanGiftDrops.filter(function(d) { return d.active; }).length;
                if (activeDrops < 6) { // Allow up to 6 drops
                    var pos = getAvailableGiftSpawnPosition();
                    var naturalGifts = [
                        { gift: 'rose', url: 'images tiktok/Rose.png' },
                        { gift: 'rose', url: 'images tiktok/Rose.png' },
                        { gift: 'gg', url: 'images tiktok/GG.png' },
                        { gift: 'gg', url: 'images tiktok/GG.png' },
                        { gift: 'amo voce', url: 'images tiktok/Hand_Hearts.png' },
                        { gift: 'amo voce', url: 'images tiktok/Hand_Hearts.png' },
                        { gift: 'rosquinha', url: 'images tiktok/Doughnut.png' }
                    ];
                    var pick = naturalGifts[Math.floor(Math.random() * naturalGifts.length)];
                    pacmanGiftDrops.push({
                        x: pos.x,
                        y: pos.y,
                        active: true,
                        gift: pick.gift,
                        giftPictureUrl: pick.url,
                        sender: 'Sistema',
                        diamondCount: 1,
                        repeatCount: 1
                    });
                    pushAlertEvent(`🎁 Um presente misterioso (${pick.gift}) apareceu no labirinto! Corram!`);
                }
                pacmanGiftSpawnTimer = 7200 + Math.random() * 3600; // Next in 120-180 seconds
            }
        }
        
        if (pacmanGameState === 'playing' || pacmanGameState === 'round_end') {
            if (window.pacmanHitStopTimer > 0) {
                window.pacmanHitStopTimer--;
            } else {
                updateEntities();
            }
            updateParticles();
        }
        
        // Update celebration logic
        updateActiveCelebration();
        
        // Update combo popup timer
        if (pacmanComboPopup && pacmanComboPopup.timer > 0) {
            pacmanComboPopup.timer--;
            if (pacmanComboPopup.timer <= 0) {
                pacmanComboPopup = null;
            }
        }
        
        drawPacman();
        
        if (pacmanGameState === 'round_end') {
            drawRoundEndOverlay();
        }
        
        // Draw celebration particles & thank you banner on absolute top
        drawCelebrationParticles();
        drawSubscriberCelebrationBanner();
        
        // Draw combo popup
        drawComboPopup();
        


    } catch (err) {
        console.error('[GameLoop] Error during frame execution:', err);
    }
    
    requestAnimationFrame(gameLoop);
}

function drawComboPopup() {
    if (!pacmanComboPopup || pacmanComboPopup.timer <= 0) return;
    
    var w = 1080;
    pacmanCtx.save();
    
    var cx = w / 2;
    var cy = 180; // Top of the screen
    
    var maxTimer = 180;
    var life = pacmanComboPopup.timer / maxTimer; // 1.0 to 0.0
    var scale = 1.0;
    if (life > 0.9) {
        scale = 1.0 + (1.0 - life) * 10; // Pop-in effect
    } else if (life < 0.1) {
        scale = life * 10; // Pop-out effect
    }
    
    // Progression effect
    var combo = pacmanComboPopup.combo;
    var effectScale = 1.0 + (combo * 0.1); 
    var glowSize = combo * 10;
    var shadowColor = pacmanComboPopup.color;
    
    // Pulsação de acordo com o tamanho do combo
    var pulse = 1.0 + Math.sin(Date.now() / (150 - combo * 15)) * (0.05 + combo * 0.02);
    
    pacmanCtx.translate(cx, cy);
    pacmanCtx.scale(scale * effectScale * pulse, scale * effectScale * pulse);
    
    // Add screen shake for high combos
    if (combo >= 3) {
        var intensity = (combo - 2) * 2;
        pacmanCtx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
    }
    
    var bannerW = 600;
    var bannerH = 120;
    
    // Efeito de sombra removido para garantir mais fluidez (performance)
    pacmanCtx.shadowBlur = 0;
    pacmanCtx.shadowColor = 'transparent';
    
    // Draw Avatar (Left)
    var avatarSize = 80;
    var leftX = -bannerW/2 + 80;
    pacmanCtx.save();
    pacmanCtx.beginPath();
    pacmanCtx.arc(leftX, 0, avatarSize/2, 0, Math.PI * 2);
    pacmanCtx.clip();
    var avatarImg = getAvatarImage(pacmanComboPopup.user, pacmanComboPopup.avatar);
    if (avatarImg && avatarImg.complete) {
        pacmanCtx.drawImage(avatarImg, leftX - avatarSize/2, -avatarSize/2, avatarSize, avatarSize);
    } else {
        pacmanCtx.fillStyle = pacmanComboPopup.color;
        pacmanCtx.fill();
    }
    pacmanCtx.restore();
    
    // Avatar border
    pacmanCtx.beginPath();
    pacmanCtx.arc(leftX, 0, avatarSize/2, 0, Math.PI * 2);
    pacmanCtx.lineWidth = 4;
    pacmanCtx.strokeStyle = pacmanComboPopup.color;
    pacmanCtx.stroke();
    
    // Draw Ghost (Right)
    var rightX = bannerW/2 - 80;
    var ghostColor = pacmanComboPopup.ghostColor || '#0000ff';
    var ghostSprite = getGhostBodySprite(ghostColor);
    var gScale = 1.6;
    
    pacmanCtx.drawImage(ghostSprite, rightX - (ghostSprite.width*gScale)/2, - (ghostSprite.height*gScale)/2 + 5, ghostSprite.width*gScale, ghostSprite.height*gScale);
    
    // Ghost Dead Eyes
    var eyeScale = gScale;
    pacmanCtx.fillStyle = '#ffffff';
    pacmanCtx.beginPath(); pacmanCtx.arc(rightX - 5*eyeScale, - 6*eyeScale, 4*eyeScale, 0, Math.PI*2); pacmanCtx.fill();
    pacmanCtx.beginPath(); pacmanCtx.arc(rightX + 5*eyeScale, - 6*eyeScale, 4*eyeScale, 0, Math.PI*2); pacmanCtx.fill();
    pacmanCtx.fillStyle = pacmanComboPopup.color; // The eater's color in the eyes!
    pacmanCtx.beginPath(); pacmanCtx.arc(rightX - 5*eyeScale, - 6*eyeScale, 2*eyeScale, 0, Math.PI*2); pacmanCtx.fill();
    pacmanCtx.beginPath(); pacmanCtx.arc(rightX + 5*eyeScale, - 6*eyeScale, 2*eyeScale, 0, Math.PI*2); pacmanCtx.fill();
    
    // Texts
    pacmanCtx.fillStyle = '#ffff00';
    if (combo >= 4) {
        pacmanCtx.fillStyle = '#ff00ff'; // Legendary combo
    } else if (combo >= 3) {
        pacmanCtx.fillStyle = '#00ffff'; // Epic combo
    } else if (combo >= 2) {
        pacmanCtx.fillStyle = pacmanThemeDotColor; // Great combo
    } else {   
        pacmanCtx.fillStyle = pacmanThemeDotColor; 
    }
    
    pacmanCtx.font = "bold 32px 'Press Start 2P', monospace";
    pacmanCtx.textAlign = 'center';
    pacmanCtx.textBaseline = 'middle';
    pacmanCtx.fillText('COMBO X' + combo, 0, -20);
    
    pacmanCtx.fillStyle = '#ffffff';
    pacmanCtx.font = "bold 20px 'Press Start 2P', monospace";
    pacmanCtx.fillText('+' + pacmanComboPopup.points + ' PTS', 0, 20);
    
    pacmanCtx.font = "bold 14px 'Outfit', sans-serif";
    pacmanCtx.fillStyle = pacmanComboPopup.color;
    pacmanCtx.fillText('@' + pacmanComboPopup.user, 0, bannerH/2 + 25);
    
    pacmanCtx.restore();
}

function drawInactivityPopup(pl) {
    var w = 1080;
    
    pacmanCtx.save();
    var cx = w / 2;
    var cy = 1720;
    
    var avatarSize = 100;
    var pulse = 1.0 + Math.sin(Date.now() / 150) * 0.08;
    
    pacmanCtx.translate(cx, cy);
    pacmanCtx.scale(pulse, pulse);
    
    pacmanCtx.strokeStyle = '#ff3366';
    pacmanCtx.shadowBlur = 12;
    pacmanCtx.shadowColor = '#ff3366';
    pacmanCtx.lineWidth = 3;
    pacmanCtx.beginPath();
    var boxW = 600;
    var boxH = 140;
    roundRect(pacmanCtx, -boxW / 2, -boxH / 2, boxW, boxH, 15);
    pacmanCtx.stroke();
    
    pacmanCtx.save();
    var avX = -boxW / 2 + 70;
    pacmanCtx.translate(avX, 0);
    pacmanCtx.beginPath();
    pacmanCtx.arc(0, 0, avatarSize / 2, 0, Math.PI * 2);
    pacmanCtx.clip();
    
    var img = getAvatarImage(pl.name, pl.avatar);
    if (img && img.complete && img.naturalWidth !== 0) {
        pacmanCtx.drawImage(img, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
    } else {
        var genericImg = getGenericAvatarImage();
        if (genericImg && genericImg.complete) {
            pacmanCtx.drawImage(genericImg, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
        } else {
            pacmanCtx.fillStyle = pl.color;
            pacmanCtx.fillRect(-avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
        }
    }
    pacmanCtx.restore();
    
    pacmanCtx.strokeStyle = pl.color;
    pacmanCtx.lineWidth = 2.5;
    pacmanCtx.beginPath();
    pacmanCtx.arc(avX, 0, avatarSize / 2 + 1, 0, Math.PI * 2);
    pacmanCtx.stroke();
    
    pacmanCtx.textAlign = 'left';
    pacmanCtx.textBaseline = 'middle';
    pacmanCtx.fillStyle = '#ff3366';
    pacmanCtx.font = "bold 24px 'Press Start 2P', monospace";
    pacmanCtx.fillText('⚠️ SEM ENERGIA!', -boxW / 2 + 140, -18);
    
    pacmanCtx.fillStyle = '#ffffff';
    pacmanCtx.font = "bold 20px 'Inter', sans-serif";
    pacmanCtx.fillText('Dê TAP TAP na tela para se mover!', -boxW / 2 + 140, 20);
    
    pacmanCtx.restore();
}

function handleCanvasTap() {
    var offlineName = new URLSearchParams(window.location.search).get('player');
    if (!offlineName) return;
    
    var username = offlineName.toLowerCase();
    
    if (!pacmanPlayers[username] || pacmanPlayers[username].lives <= 0) {
        spawnPacmanPlayer(username, '');
        pacmanGameState = 'playing';
        AudioSynth.playRespawn();
    }
    
    var pl = pacmanPlayers[username];
    if (pl && pl.lives > 0) {
        pl.lastActivityTime = Date.now();
        
        if (!pl.tapTimestamps) pl.tapTimestamps = [];
        pl.tapTimestamps.push(Date.now());
        
        pl.likesBuffer = (pl.likesBuffer || 0) + 1;
        if (pl.likesBuffer >= 2) {
            pl.fuel += 1;
            pl.likesBuffer = 0;
            spawnHeartParticles(pl.x, pl.y, 4);
            updatePacmanLeaderboard();
        }
    }
}

// Initializer
function initPacmanGame() {
    var canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    pacmanCtx = canvas.getContext('2d');
    
    canvas.width = 1080;
    canvas.height = 1920;
    
    // Tap-Tap to move listeners for local player
    canvas.addEventListener('click', function(e) {
        handleCanvasTap();
    });
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        handleCanvasTap();
    });
    
    // Create static maze background canvas
    mazeCanvas = document.createElement('canvas');
    mazeCanvas.width = 1080;
    mazeCanvas.height = 1920;
    mazeCtx = mazeCanvas.getContext('2d');
    
    mazeCanvasFrightened1 = document.createElement('canvas');
    mazeCanvasFrightened1.width = 1080;
    mazeCanvasFrightened1.height = 1920;
    mazeCtxFrightened1 = mazeCanvasFrightened1.getContext('2d');
    
    mazeCanvasFrightened2 = document.createElement('canvas');
    mazeCanvasFrightened2.width = 1080;
    mazeCanvasFrightened2.height = 1920;
    mazeCtxFrightened2 = mazeCanvasFrightened2.getContext('2d');
    
    generateProceduralMaze(); // Generate map procedurally on load
    initPacmanMaze();
    renderMazeStatic(); // Render static neon walls cache once
    initGhosts();
    
    // Always start gameLoop at startup so the game render works immediately
    gameLoop();
    
    // Always initialize WebSocket connection
    initWebSocket();
    
    // Check if offline query param is present
    var offlineName = new URLSearchParams(window.location.search).get('player');
    if (offlineName) {
        document.body.classList.add('offline-mode');
        spawnPacmanPlayer(offlineName.toLowerCase(), '');
        pacmanGameState = 'playing';
        AudioSynth.playStartMelody();
    }
}

document.addEventListener('DOMContentLoaded', initPacmanGame);

// ==========================================
// Exposed API (Called from websocket and UI)
// ==========================================
window.processPacmanComment = function(data) {
    if (!data || !data.user) return;
    var userName = (data.user || '').replace(/^@/, '').toLowerCase();
    var msg = (data.comment || data.msg || '').toLowerCase().trim();
    
    if (pacmanPlayers[userName]) {
        pacmanPlayers[userName].lastActivityTime = Date.now();
    }
    
    // Spawn player if they don't exist yet OR if they are out of lives (revive/re-enter)
    if (!pacmanPlayers[userName] || pacmanPlayers[userName].lives <= 0) {
        spawnPacmanPlayer(userName, data.avatar || '');
    }
    
    if (msg === 'm' || msg === 'move' || msg === 'mover') {
        var pl = pacmanPlayers[userName];
        if (pl && pl.lives > 0) {
            pl.fuel += 1;
            pl.lastActivityTime = Date.now();
            spawnHeartParticles(pl.x, pl.y, 4); // Spawn small hearts floating up!
            updatePacmanLeaderboard();
        }
    }
};

function cleanupInactivePlayers() {
    var now = Date.now();
    var cleanedAny = false;
    
    for (var p in pacmanPlayers) {
        var pl = pacmanPlayers[p];
        var lastAct = pl.lastActivityTime || now;
        
        if (pl.lives <= 0) {
            if (now - lastAct > PLAYER_DEATH_TIMEOUT) {
                delete pacmanPlayers[p];
                cleanedAny = true;
                pushAlertEvent(`💀 @${p} removido por fim de jogo`);
            }
        } else {
            if (now - lastAct > PLAYER_INACTIVITY_TIMEOUT) {
                delete pacmanPlayers[p];
                cleanedAny = true;
                pushAlertEvent(`💤 @${p} saiu por inatividade`);
            }
        }
    }
    
    if (cleanedAny) {
        updatePacmanLeaderboard();
    }
}

function movePacmanPlayer(userName, direction) {
     var pl = pacmanPlayers[userName];
     if (!pl) return;
     pl.nextDir = direction;
 }

window.regenerateMap = function() {
     generateProceduralMaze();
     initPacmanMaze();
     renderMazeStatic();
     initGhosts();
     updatePacmanLeaderboard();
 };

// ==========================================
// MODO COPA DO MUNDO (UI & Estado)
// ==========================================
window.isCopaMode = false;
window.copaTeam1 = 'br';
window.copaTeam2 = 'ar';

var cvsFlag1 = document.createElement('canvas'); cvsFlag1.width = 600; cvsFlag1.height = 400;
var cvsFlag2 = document.createElement('canvas'); cvsFlag2.width = 600; cvsFlag2.height = 400;

window.worldCupTeams = [
    { id: 'ar', name: 'Argentina' }, { id: 'br', name: 'Brasil' }, { id: 'fr', name: 'França' }, { id: 'gb-eng', name: 'Inglaterra' },
    { id: 'es', name: 'Espanha' }, { id: 'de', name: 'Alemanha' }, { id: 'pt', name: 'Portugal' }, { id: 'nl', name: 'Holanda' },
    { id: 'it', name: 'Itália' }, { id: 'be', name: 'Bélgica' }, { id: 'hr', name: 'Croácia' }, { id: 'us', name: 'EUA' },
    { id: 'mx', name: 'México' }, { id: 'ca', name: 'Canadá' }, { id: 'uy', name: 'Uruguai' }, { id: 'co', name: 'Colômbia' },
    { id: 'sn', name: 'Senegal' }, { id: 'ma', name: 'Marrocos' }, { id: 'jp', name: 'Japão' }, { id: 'kr', name: 'Coreia do Sul' },
    { id: 'ch', name: 'Suíça' }, { id: 'dk', name: 'Dinamarca' }, { id: 'rs', name: 'Sérvia' }, { id: 'pl', name: 'Polônia' },
    { id: 'se', name: 'Suécia' }, { id: 'ua', name: 'Ucrânia' }, { id: 'gb-wls', name: 'País de Gales' }, { id: 'cr', name: 'Costa Rica' },
    { id: 'pa', name: 'Panamá' }, { id: 'jm', name: 'Jamaica' }, { id: 'ec', name: 'Equador' }, { id: 'pe', name: 'Peru' },
    { id: 'ir', name: 'Irã' }, { id: 'sa', name: 'Arábia Saudita' }, { id: 'au', name: 'Austrália' }, { id: 'qa', name: 'Catar' },
    { id: 'ae', name: 'Emirados Árabes' }, { id: 'uz', name: 'Uzbequistão' }, { id: 'eg', name: 'Egito' }, { id: 'dz', name: 'Argélia' },
    { id: 'ng', name: 'Nigéria' }, { id: 'cm', name: 'Camarões' }, { id: 'ci', name: 'Costa do Marfim' }, { id: 'gh', name: 'Gana' },
    { id: 'ml', name: 'Mali' }, { id: 'nz', name: 'Nova Zelândia' }, { id: 'cn', name: 'China' }, { id: 'tr', name: 'Turquia' },
    { id: 'jo', name: 'Jordânia' }
];

// Initialize UI selects on DOM load or directly if elements exist
document.addEventListener('DOMContentLoaded', function() {
    var select1 = document.getElementById('team1Select');
    var select2 = document.getElementById('team2Select');
    if(select1 && select2) {
        worldCupTeams.sort((a,b) => a.name.localeCompare(b.name)).forEach(t => {
            select1.add(new Option(t.name, t.id));
            select2.add(new Option(t.name, t.id));
        });
        select1.value = copaTeam1;
        select2.value = copaTeam2;
    }
    loadCopaFlag(copaTeam1, cvsFlag1);
    loadCopaFlag(copaTeam2, cvsFlag2);
});

window.toggleWorldCupMode = function(val) {
    isCopaMode = (val === 'on');
};

window.changeCopaTeam = function(slot, iso) {
    if(slot === 1) {
        copaTeam1 = iso;
        loadCopaFlag(iso, cvsFlag1);
    } else {
        copaTeam2 = iso;
        loadCopaFlag(iso, cvsFlag2);
    }
};

window.loadCopaFlag = function(iso, targetCvs) {
    var ctxOff = targetCvs.getContext('2d');
    var img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = 'https://flagcdn.com/w640/' + iso + '.png';
    img.onload = function() {
        ctxOff.clearRect(0,0,targetCvs.width,targetCvs.height);
        ctxOff.drawImage(img, 0, 0, targetCvs.width, targetCvs.height);
    };
};

// ==========================================
// MODO COPA DO MUNDO (Renderização Específica)
// ==========================================
window.drawWavedFlag = function(ctx, offscreen, x, y, width, height, time) {
    ctx.save();
    ctx.translate(x - width/2, y - height/2);
    var slices = 60; 
    var sliceW = offscreen.width / slices;
    var drawSliceW = width / slices;
    for (var i = 0; i < slices; i++) {
        var waveY = Math.sin(time * 0.005 + i * 0.15) * (height * 0.06);
        var waveX = Math.cos(time * 0.003 + i * 0.1) * (width * 0.02);
        ctx.globalAlpha = 0.55; 
        ctx.drawImage(offscreen, i * sliceW, 0, sliceW, offscreen.height, i * drawSliceW + waveX, waveY, drawSliceW + 1.5, height);
    }
    ctx.restore();
};

window.drawSoccerField = function(ctx, w, h, time) {
    var numStripes = 12;
    var stripeWidth = h / numStripes; 
    for (var i = 0; i < numStripes; i++) {
        ctx.fillStyle = (i % 2 === 0) ? '#1f5a1f' : '#267326'; 
        ctx.fillRect(0, i * stripeWidth, w, stripeWidth + 1);
    }
    
    if (cvsFlag1) drawWavedFlag(ctx, cvsFlag1, w/2, h/4, 500, 333, time);
    if (cvsFlag2) drawWavedFlag(ctx, cvsFlag2, w/2, h - h/4, 500, 333, time + 1000); 
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 6;
    var pad = 40;
    ctx.strokeRect(pad, pad, w - pad*2, h - pad*2);
    ctx.beginPath(); ctx.moveTo(pad, h/2); ctx.lineTo(w - pad, h/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2, h/2, 120, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath(); ctx.arc(w/2, h/2, 10, 0, Math.PI*2); ctx.fill();
    var areaW = 400; var areaH = 200;
    ctx.strokeRect(w/2 - areaW/2, pad, areaW, areaH); 
    ctx.strokeRect(w/2 - areaW/2, h - pad - areaH, areaW, areaH); 
    var smallAreaW = 200; var smallAreaH = 80;
    ctx.strokeRect(w/2 - smallAreaW/2, pad, smallAreaW, smallAreaH); 
    ctx.strokeRect(w/2 - smallAreaW/2, h - pad - smallAreaH, smallAreaW, smallAreaH); 
    ctx.beginPath(); ctx.arc(w/2, pad + areaH, 80, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2, h - pad - areaH, 80, Math.PI, Math.PI*2); ctx.stroke();
};

window.makeRealMazePath = function(ctx) {
    ctx.beginPath();
    var rows = pacmanMaze.length;
    var cols = pacmanMaze[0].length;
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (pacmanMaze[r][c] === 1) {
                ctx.rect(c * pacmanTileSize, r * pacmanTileSize, pacmanTileSize, pacmanTileSize);
            }
        }
    }
};

window.drawRealMazeBorders = function(ctx) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00aaff';
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    var rows = pacmanMaze.length;
    var cols = pacmanMaze[0].length;
    
    ctx.beginPath();
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (pacmanMaze[r][c] === 1) {
                var cx = c * pacmanTileSize + pacmanTileSize / 2;
                var cy = r * pacmanTileSize + pacmanTileSize / 2;
                
                var hasRight = (c + 1 < cols && pacmanMaze[r][c+1] === 1);
                var hasDown = (r + 1 < rows && pacmanMaze[r+1][c] === 1);
                
                if (hasRight) { ctx.moveTo(cx, cy); ctx.lineTo(cx + pacmanTileSize, cy); }
                if (hasDown) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + pacmanTileSize); }
            }
        }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
};