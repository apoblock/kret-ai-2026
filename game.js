/**
 * KRET (1991) - Game logic and rendering
 * Created in 100% Vanilla JS with Web Audio API sound synthesis.
 */

// Grid dimensions
const COLS = 20;
const ROWS = 40;
const VISIBLE_ROWS = 20;
let CELL_SIZE = 25; // 500x500 Canvas is 20 columns * 25px wide, 20 rows * 25px high

// Canvas elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// HUD elements
const pointsVal = document.getElementById('points-val');
const blocksVal = document.getElementById('blocks-val');
const speedVal = document.getElementById('speed-val');
const overlayScreen = document.getElementById('overlay-screen');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');
const btnLang = document.getElementById('btn-lang');
const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const volumeSlider = document.getElementById('volume-slider');

// Settings Toggles
const togglePl = document.getElementById('lang-pl');
const toggleEn = document.getElementById('lang-en');
const toggleCrtOn = document.getElementById('crt-on');
const toggleCrtOff = document.getElementById('crt-off');
const toggleSoundOn = document.getElementById('sound-on');
const toggleSoundOff = document.getElementById('sound-off');
const highScoresList = document.getElementById('high-scores-list');
const overlayHighScoreBanner = document.getElementById('overlay-highscore-banner');
const overlayHighScoreVal = document.getElementById('overlay-highscore-val');

// Game state
let blocks = []; // Unified list of block objects
let mole = { x: 10, y: 39, animFrame: 0, facingLeft: false };
let currentBlockId = 1;
let score = 0;
let totalBlocksDropped = 0;
let speed = 0;
let gameState = 'START'; // START, PLAYING, PAUSED, GAMEOVER
let lang = 'pl'; // pl, en
let soundActive = true;
let soundVolume = 0.5;
let crtActive = true;
let highScores = [];
let boardSize = 'medium'; // small, medium, large

// Timers
let lastTime = 0;
let gravityAccumulator = 0;
let moleGravityDelay = 200;

// Periodic Block Dissolve Mechanic
let dissolveTimer = 0;
const DISSOLVE_INTERVAL = 15000; // 15 seconds
const BLINK_DURATION = 3000; // 3 seconds

// Tetromino types and shapes
const TETROMINOES = {
    I: {
        shape: [[0, 0], [0, 1], [0, 2], [0, 3]],
        color: '#00ff00' // green I
    },
    O: {
        shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
        color: '#0000ff' // blue O
    },
    T: {
        shape: [[0, 0], [1, 0], [2, 0], [1, 1]],
        color: '#ffffff' // white T
    },
    S: {
        shape: [[1, 0], [2, 0], [0, 1], [1, 1]],
        color: '#ff00ff' // magenta S
    },
    Z: {
        shape: [[0, 0], [1, 0], [1, 1], [2, 1]],
        color: '#ff0000' // red Z
    },
    J: {
        shape: [[0, 0], [0, 1], [1, 1], [2, 1]],
        color: '#ffff00' // yellow J
    },
    L: {
        shape: [[2, 0], [0, 1], [1, 1], [2, 1]],
        color: '#00ffff' // cyan L
    }
};

const TETROMINO_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Web Audio API Context
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Sound effects synthesizer
function playSynthSound(freqStart, freqEnd, duration, type = 'sine', volumeScale = 1.0) {
    if (!soundActive) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(soundVolume * 0.2 * volumeScale, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn('Audio play failed:', e);
    }
}

// Sound presets
function playEatSound() {
    playSynthSound(400, 1000, 0.08, 'triangle', 1.2);
}

function playLandSound() {
    playSynthSound(180, 80, 0.15, 'sine', 0.8);
}

function playGameOverSound() {
    if (!soundActive) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const notes = [261.63, 196.00, 164.81, 130.81]; // C4, G3, E3, C3
        notes.forEach((note, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note, now + index * 0.15);
            gain.gain.setValueAtTime(soundVolume * 0.15, now + index * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + index * 0.15);
            osc.stop(now + index * 0.15 + 0.25);
        });
    } catch(e){}
}

function playLevelUpSound() {
    if (!soundActive) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((note, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note, now + index * 0.08);
            gain.gain.setValueAtTime(soundVolume * 0.15, now + index * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + index * 0.08);
            osc.stop(now + index * 0.08 + 0.2);
        });
    } catch(e){}
}

function playMoveSound() {
    playSynthSound(440, 520, 0.04, 'sine', 0.4);
}

// Translations dictionary
const translations = {
    pl: {
        title: "K R E T",
        startSubtitle: "Naciśnij START aby zagrać",
        gameOverTitle: "KONIEC GRY",
        gameOverSubtitle: "Twój wynik to: {score} punktów\nZjedzone klocki: {blocks}\n\nNaciśnij START by zagrać ponownie",
        paused: "PAUZA",
        pausedSubtitle: "Gra wstrzymana.\nNaciśnij PAUZA aby wznowić.",
        startBtn: "START",
        pauseBtn: "PAUZA",
        resumeBtn: "WZNÓW",
        restartBtn: "RESTART",
        points: "Punkty",
        blocks: "Klocki",
        speed: "Szybkość",
        left: "Lewo",
        right: "Prawo",
        up: "Góra"
    },
    en: {
        title: "T H E  M O L E",
        startSubtitle: "Press START to play",
        gameOverTitle: "GAME OVER",
        gameOverSubtitle: "Your score: {score} points\nBlocks cleared: {blocks}\n\nPress START to play again",
        paused: "PAUSED",
        pausedSubtitle: "Game paused.\nPress PAUSE to resume.",
        startBtn: "START",
        pauseBtn: "PAUSE",
        resumeBtn: "RESUME",
        restartBtn: "RESTART",
        points: "Points",
        blocks: "Blocks",
        speed: "Speed",
        left: "Left",
        right: "Right",
        up: "Up"
    }
};

// Safe Local Storage Wrapper to prevent runtime crashes (SecurityError) in some browsers
function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn('localStorage access blocked:', e);
        return null;
    }
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('localStorage write blocked:', e);
    }
}

// Local storage helpers
function loadSettings() {
    const savedLang = safeGetItem('kret_lang');
    if (savedLang) lang = savedLang;
    
    const savedCrt = safeGetItem('kret_crt');
    if (savedCrt !== null) crtActive = savedCrt === 'true';
    
    const savedSound = safeGetItem('kret_sound');
    if (savedSound !== null) soundActive = savedSound === 'true';
    
    const savedVol = safeGetItem('kret_volume');
    if (savedVol !== null) {
        soundVolume = parseFloat(savedVol);
        volumeSlider.value = Math.floor(soundVolume * 100);
    }
    
    const savedScores = safeGetItem('kret_highscores');
    if (savedScores) {
        try {
            highScores = JSON.parse(savedScores);
        } catch (e) {
            highScores = [];
        }
    } else {
        highScores = [
            { name: "RETR", score: 500 },
            { name: "BAKA", score: 300 },
            { name: "BURA", score: 200 },
            { name: "KRET", score: 100 }
        ];
    }
    
    const savedSize = safeGetItem('kret_boardsize');
    if (savedSize) boardSize = savedSize;
    
    updateSettingsUI();
    applyLanguage();
    updateCrtFilter();
    applyBoardSize();
}

function saveSettings() {
    safeSetItem('kret_lang', lang);
    safeSetItem('kret_crt', crtActive.toString());
    safeSetItem('kret_sound', soundActive.toString());
    safeSetItem('kret_volume', soundVolume.toString());
    safeSetItem('kret_highscores', JSON.stringify(highScores));
    safeSetItem('kret_boardsize', boardSize);
}

function updateSettingsUI() {
    // Language Buttons
    togglePl.classList.toggle('active', lang === 'pl');
    toggleEn.classList.toggle('active', lang === 'en');
    
    // CRT Buttons
    toggleCrtOn.classList.toggle('active', crtActive);
    toggleCrtOff.classList.toggle('active', !crtActive);
    
    // Sound Buttons
    toggleSoundOn.classList.toggle('active', soundActive);
    toggleSoundOff.classList.toggle('active', !soundActive);
    
    // Render High Scores list
    highScoresList.innerHTML = '';
    highScores.slice(0, 5).forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${item.name} - ${item.score}`;
        highScoresList.appendChild(li);
    });
    
    // Update main screen banner highscore
    if (highScores.length > 0) {
        overlayHighScoreBanner.style.display = 'block';
        overlayHighScoreVal.textContent = highScores[0].score;
    }
}

function updateCrtFilter() {
    const overlay = document.getElementById('crt-overlay');
    if (crtActive) {
        overlay.classList.add('crt-active');
    } else {
        overlay.classList.remove('crt-active');
    }
}

function applyLanguage() {
    const t = translations[lang];
    
    // Update HTML elements with translation attributes
    document.querySelectorAll('[data-lang-pl]').forEach(el => {
        if (el.id === 'btn-start' && gameState === 'PAUSED') {
            el.textContent = t.resumeBtn;
            return;
        }
        
        const txt = lang === 'pl' ? el.getAttribute('data-lang-pl') : el.getAttribute('data-lang-en');
        if (txt) {
            if (el.tagName === 'INPUT' && el.type === 'button') {
                el.value = txt;
            } else {
                el.textContent = txt;
            }
        }
    });
    
    // Translate dynamic buttons
    btnPause.textContent = gameState === 'PAUSED' ? t.resumeBtn : t.pauseBtn;
}

// Rebuild grid from block list for rendering or quick cell lookups
function getOccupiedGrid() {
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid.push(new Array(COLS).fill(null));
    }
    blocks.forEach(block => {
        block.shape.forEach(cell => {
            const cx = block.x + cell[0];
            const cy = block.y + cell[1];
            if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
                grid[cy][cx] = block;
            }
        });
    });
    return grid;
}

function getBlockAt(x, y) {
    for (const block of blocks) {
        for (const cell of block.shape) {
            if (block.x + cell[0] === x && block.y + cell[1] === y) {
                return block;
            }
        }
    }
    return null;
}

// Generate the board at start with random tetrominoes simulation
function generatePreFilledBoard() {
    blocks = [];
    currentBlockId = 1;
    
    const targetBlocksCount = 85 + Math.floor(Math.random() * 15); // 85 to 100 starting blocks successfully placed!
    let placedCount = 0;
    let attempts = 0;
    
    while (placedCount < targetBlocksCount && attempts < 800) {
        attempts++;
        const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
        const proto = TETROMINOES[key];
        const blockColor = proto.color;
        
        let width = 1;
        proto.shape.forEach(cell => {
            if (cell[0] + 1 > width) width = cell[0] + 1;
        });
        
        const spawnX = Math.floor(Math.random() * (COLS - width + 1));
        
        // Simulating drop starting from row 0
        let finalY = 0;
        let canDrop = true;
        
        while (canDrop && finalY < ROWS) {
            let collides = false;
            for (let j = 0; j < proto.shape.length; j++) {
                const cell = proto.shape[j];
                const checkX = spawnX + cell[0];
                const checkY = finalY + cell[1] + 1;
                
                if (checkY >= ROWS || getBlockAt(checkX, checkY) !== null) {
                    collides = true;
                    break;
                }
            }
            if (collides) {
                canDrop = false;
            } else {
                finalY++;
            }
        }
        
        // Place if we landed in the visible area (leave top rows clear)
        if (finalY >= 20) {
            blocks.push({
                id: currentBlockId++,
                type: key,
                color: blockColor,
                shape: proto.shape.map(c => [...c]),
                x: spawnX,
                y: finalY,
                fallCooldown: 0,
                isDissolving: false,
                blinkTimer: 0
            });
            placedCount++;
        }
    }
    
    // Find an empty column on the bottom row (ROWS - 1 = 39)
    let emptyCols = [];
    for (let c = 0; c < COLS; c++) {
        if (getBlockAt(c, ROWS - 1) === null) {
            emptyCols.push(c);
        }
    }
    
    let startX = 10; // Default fallback
    if (emptyCols.length > 0) {
        startX = emptyCols[Math.floor(Math.random() * emptyCols.length)];
    } else {
        // If bottom row is completely full, remove the block in a random column
        const randomCol = Math.floor(Math.random() * COLS);
        const blockToRemove = getBlockAt(randomCol, ROWS - 1);
        if (blockToRemove !== null) {
            blocks = blocks.filter(b => b.id !== blockToRemove.id);
        }
        startX = randomCol;
    }
    
    mole.x = startX;
    mole.y = ROWS - 1;
    mole.facingLeft = false;
}

// Rotate a shape 90 degrees clockwise
function rotateShape(shape) {
    let maxX = 0, maxY = 0;
    shape.forEach(cell => {
        if (cell[0] > maxX) maxX = cell[0];
        if (cell[1] > maxY) maxY = cell[1];
    });
    return shape.map(cell => [maxY - cell[1], cell[0]]);
}

// Normalize a shape's coordinates to be 0-indexed
function normalizeShape(shape) {
    const minX = Math.min(...shape.map(c => c[0]));
    const minY = Math.min(...shape.map(c => c[1]));
    return shape.map(cell => [cell[0] - minX, cell[1] - minY]);
}

// Spawn a new falling tetromino at the top with random position and rotation
function spawnFallingBlock() {
    const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
    const proto = TETROMINOES[key];
    
    // Copy shape and apply random rotation (0 to 3 times)
    let shape = proto.shape.map(cell => [...cell]);
    const rotations = Math.floor(Math.random() * 4);
    for (let r = 0; r < rotations; r++) {
        shape = rotateShape(shape);
    }
    shape = normalizeShape(shape);
    
    // Find shape width
    let maxX = 0;
    shape.forEach(cell => {
        if (cell[0] > maxX) maxX = cell[0];
    });
    const shapeWidth = maxX + 1;
    
    // Random starting column within bounds
    const spawnX = Math.floor(Math.random() * (COLS - shapeWidth + 1));
    const blockId = currentBlockId++;
    
    blocks.push({
        id: blockId,
        type: key,
        color: proto.color,
        shape: shape,
        x: spawnX,
        y: 0,
        fallCooldown: 0,
        isDissolving: false,
        blinkTimer: 0
    });
    
    totalBlocksDropped++;
    blocksVal.textContent = totalBlocksDropped;
}

// Get the fall interval based on speed level (0-9)
function getFallInterval() {
    // 0 -> 1000ms, 9 -> 100ms
    return Math.max(100, 1000 - speed * 100);
}

function checkAndSpawnFallingBlock() {
    let topAreaClear = true;
    for (const block of blocks) {
        for (const cell of block.shape) {
            const cy = block.y + cell[1];
            if (cy < 4) { // Check if top 4 rows are empty (allows fast spawning without overlapping y=0)
                topAreaClear = false;
                break;
            }
        }
        if (!topAreaClear) break;
    }
    if (topAreaClear) {
        spawnFallingBlock();
    }
}

function hasSupport(x, y) {
    if (y >= ROWS - 1) return true; // Ground support
    return getBlockAt(x, y + 1) !== null;
}

function canBlockFall(block) {
    for (const cell of block.shape) {
        const nextX = block.x + cell[0];
        const nextY = block.y + cell[1] + 1;
        
        if (nextY >= ROWS) {
            return false;
        }
        
        const other = getBlockAt(nextX, nextY);
        if (other !== null && other.id !== block.id) {
            return false;
        }
    }
    return true;
}

function checkBlockOverlapsMole(block) {
    for (const cell of block.shape) {
        if (block.x + cell[0] === mole.x && block.y + cell[1] === mole.y) {
            return true;
        }
    }
    return false;
}

// Update falls for all blocks
function tickBlockFalls(dt) {
    const fallInterval = getFallInterval();
    
    // Sort bottom-to-top to process lower ones first
    blocks.sort((a, b) => b.y - a.y);
    
    blocks.forEach(block => {
        block.fallCooldown += dt;
        if (block.fallCooldown >= fallInterval) {
            block.fallCooldown = 0; // Reset
            
            if (canBlockFall(block)) {
                block.y++;
                
                // Death check - check if the block's new position overlaps with the mole
                if (checkBlockOverlapsMole(block)) {
                    triggerGameOver();
                    return;
                }
                
                // Play sound if landed in this step
                if (!canBlockFall(block)) {
                    playLandSound();
                }
            }
        }
    });
}

// Mole Physics and Movement
function moveMole(dx, dy) {
    if (gameState !== 'PLAYING') return;
    
    const targetX = mole.x + dx;
    const targetY = mole.y + dy;
    
    // Bounds check
    if (targetX < 0 || targetX >= COLS || targetY < 0 || targetY >= ROWS) {
        return;
    }
    
    if (dx < 0) mole.facingLeft = true;
    if (dx > 0) mole.facingLeft = false;
    
    const destBlock = getBlockAt(targetX, targetY);
    
    // Move the mole
    mole.x = targetX;
    mole.y = targetY;
    mole.animFrame = (mole.animFrame + 1) % 4;
    
    if (destBlock !== null) {
        // Mole eats the entire tetromino piece!
        createParticlesForBlock(destBlock);
        
        // Remove block from the active list
        blocks = blocks.filter(b => b.id !== destBlock.id);
        
        score += 40;
        playEatSound();
        playLevelUpSound(); // Special double chime
        
        // Check speed scaling
        const newSpeed = Math.min(9, Math.floor(score / 200));
        if (newSpeed > speed) {
            speed = newSpeed;
            playLevelUpSound();
        }
        
        updateHUD();
    } else {
        playMoveSound();
    }
    
    // Set mole gravity delay
    if (dy < 0) {
        moleGravityDelay = 1000;
    } else if (hasSupport(mole.x, mole.y)) {
        moleGravityDelay = 200;
    }
    
    gravityAccumulator = 0;
}

// Gravity tick for the mole
function tickMoleGravity() {
    if (!hasSupport(mole.x, mole.y)) {
        mole.y++;
        playLandSound();
        moleGravityDelay = 200;
        
        // Check if mole fell into any block
        if (getBlockAt(mole.x, mole.y) !== null) {
            triggerGameOver();
        }
    }
}


// Select a random block in the grid to mark for dissolution
function selectBlockToDissolve() {
    if (blocks.length > 0) {
        const randomBlock = blocks[Math.floor(Math.random() * blocks.length)];
        randomBlock.isDissolving = true;
        randomBlock.blinkTimer = BLINK_DURATION;
        playSynthSound(800, 1000, 0.15, 'square', 0.8);
    }
}

// Particle system for visual reward
let particles = [];
function createParticles(x, y, color) {
    const canvasX = x * CELL_SIZE + CELL_SIZE / 2;
    const canvasY = y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: canvasX,
            y: canvasY,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2,
            size: Math.random() * 4 + 2,
            color: color,
            alpha: 1,
            life: 1
        });
    }
}

function createParticlesForBlock(block) {
    block.shape.forEach(cell => {
        createParticles(block.x + cell[0], block.y + cell[1], block.color);
    });
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity on particles
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
}

// HUD updates
function updateHUD() {
    pointsVal.textContent = score;
    speedVal.textContent = speed;
}

// Game States management
function startGame() {
    initAudio();
    generatePreFilledBoard();
    score = 0;
    totalBlocksDropped = 0;
    speed = 0;
    particles = [];
    
    // Reset block dissolution state
    dissolveTimer = 0;
    
    updateHUD();
    blocksVal.textContent = 0;
    
    checkAndSpawnFallingBlock();
    
    gameState = 'PLAYING';
    overlayScreen.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function createBloodParticles(x, y) {
    const canvasX = x * CELL_SIZE + CELL_SIZE / 2;
    const canvasY = y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: canvasX,
            y: canvasY,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 4,
            size: Math.random() * 5 + 3,
            color: '#ff0000',
            alpha: 1,
            life: 1
        });
    }
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    createBloodParticles(mole.x, mole.y);
    playGameOverSound();
    
    setTimeout(() => {
        const scoreName = prompt(lang === 'pl' ? "KONIEC GRY! Podaj swoje imię (3 litery):" : "GAME OVER! Enter your name (3 letters):", "AAA");
        const name = (scoreName || "AAA").substring(0, 3).toUpperCase();
        
        highScores.push({ name, score });
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 10);
        saveSettings();
        updateSettingsUI();
        
        applyLanguage(); // Reset button texts
        
        const t = translations[lang];
        overlayTitle.textContent = t.gameOverTitle;
        overlaySubtitle.innerHTML = t.gameOverSubtitle
            .replace('{score}', score)
            .replace('{blocks}', totalBlocksDropped);
        overlayScreen.style.display = 'flex';
    }, 2000);
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        const t = translations[lang];
        overlayTitle.textContent = t.paused;
        overlaySubtitle.textContent = t.pausedSubtitle;
        btnStart.textContent = t.resumeBtn; // Set overlay button to RESUME
        overlayScreen.style.display = 'flex';
        btnPause.textContent = t.resumeBtn;
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        overlayScreen.style.display = 'none';
        btnPause.textContent = translations[lang].pauseBtn;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function resetGame() {
    if (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAMEOVER') {
        startGame();
    }
}

// Drawing Functions
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const occupiedGrid = getOccupiedGrid();
    
    // Draw blocks
    blocks.forEach(block => {
        if (block.isDissolving) {
            const blinkOn = Math.floor(performance.now() / 150) % 2 === 0;
            if (!blinkOn) {
                // Draw black outline
                block.shape.forEach(cell => {
                    const cx = block.x + cell[0];
                    const cy = block.y + cell[1];
                    if (cy >= ROWS - VISIBLE_ROWS) {
                        const renderRow = cy - (ROWS - VISIBLE_ROWS);
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(cx * CELL_SIZE, renderRow * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                });
                return;
            }
        }
        
        block.shape.forEach(cell => {
            const cx = block.x + cell[0];
            const cy = block.y + cell[1];
            if (cy >= ROWS - VISIBLE_ROWS) {
                drawCellWithBorders(cx, cy, block, occupiedGrid);
            }
        });
    });
}

function getRGBAColor(hex, alpha) {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawCellWithBorders(c, r, block, occupiedGrid) {
    const renderRow = r - (ROWS - VISIBLE_ROWS);
    const x = c * CELL_SIZE;
    const y = renderRow * CELL_SIZE;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    
    // Fill the inside with a translucent version of the block's color
    ctx.fillStyle = getRGBAColor(block.color, 0.25);
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    
    const matchesId = (nc, nr) => {
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
        return occupiedGrid[nr][nc] && occupiedGrid[nr][nc].id === block.id;
    };
    
    ctx.strokeStyle = block.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    if (!matchesId(c, r - 1)) {
        ctx.moveTo(x, y + 1.5);
        ctx.lineTo(x + CELL_SIZE, y + 1.5);
    }
    if (!matchesId(c, r + 1)) {
        ctx.moveTo(x, y + CELL_SIZE - 1.5);
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - 1.5);
    }
    if (!matchesId(c - 1, r)) {
        ctx.moveTo(x + 1.5, y);
        ctx.lineTo(x + 1.5, y + CELL_SIZE);
    }
    if (!matchesId(c + 1, r)) {
        ctx.moveTo(x + CELL_SIZE - 1.5, y);
        ctx.lineTo(x + CELL_SIZE - 1.5, y + CELL_SIZE);
    }
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    if (matchesId(c, r - 1)) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + CELL_SIZE, y);
    }
    if (matchesId(c, r + 1)) {
        ctx.moveTo(x, y + CELL_SIZE);
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
    }
    if (matchesId(c - 1, r)) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + CELL_SIZE);
    }
    if (matchesId(c + 1, r)) {
        ctx.moveTo(x + CELL_SIZE, y);
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
    }
    ctx.stroke();
}

function drawMoleCharacter() {
    if (gameState === 'GAMEOVER') {
        const renderY = mole.y - (ROWS - VISIBLE_ROWS);
        const x = mole.x * CELL_SIZE + CELL_SIZE / 2;
        const y = renderY * CELL_SIZE + CELL_SIZE / 2;
        
        // Draw a bloody mass splat
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        // Main blood puddle
        ctx.arc(x, y + 4, 10, 0, Math.PI * 2);
        // Splatters
        ctx.arc(x - 6, y + 6, 6, 0, Math.PI * 2);
        ctx.arc(x + 7, y + 5, 5, 0, Math.PI * 2);
        ctx.arc(x - 2, y - 4, 4, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    const x = mole.x * CELL_SIZE + CELL_SIZE / 2;
    const renderY = mole.y - (ROWS - VISIBLE_ROWS);
    const y = renderY * CELL_SIZE + CELL_SIZE / 2;
    const radius = 9;
    
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y + 1, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    const dirOffset = mole.facingLeft ? -2 : 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 3 + dirOffset, y - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 2 + dirOffset, y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + dirOffset, y + 1, 2.5, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x - 2, y - radius);
    ctx.lineTo(x - 5, y - radius - 3);
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x, y - radius - 4);
    ctx.moveTo(x + 2, y - radius);
    ctx.lineTo(x + 5, y - radius - 3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x - 5, y + radius);
    ctx.lineTo(x - 7, y + radius + 3);
    ctx.lineTo(x - 3, y + radius + 3);
    ctx.moveTo(x + 5, y + radius);
    ctx.lineTo(x + 7, y + radius + 3);
    ctx.lineTo(x + 3, y + radius + 3);
    ctx.stroke();
    
    ctx.beginPath();
    const handWave = Math.sin(performance.now() * 0.015) * 2;
    if (mole.facingLeft) {
        ctx.arc(x + radius - 1, y + 2, 2, 0, Math.PI * 2);
        ctx.arc(x - radius - 1, y + handWave, 2, 0, Math.PI * 2);
    } else {
        ctx.arc(x - radius + 1, y + 2, 2, 0, Math.PI * 2);
        ctx.arc(x + radius + 1, y + handWave, 2, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
}

// Game loop
function gameLoop(time) {
    if (gameState !== 'PLAYING' && gameState !== 'GAMEOVER') return;
    if (gameState === 'GAMEOVER' && overlayScreen.style.display === 'flex') return;
    
    const dt = time - lastTime;
    lastTime = time;
    
    if (gameState === 'PLAYING') {
        // Update block falls
        tickBlockFalls(dt);
        
        // Periodically check and spawn new blocks
        checkAndSpawnFallingBlock();
        
        // Update mole gravity timer
        gravityAccumulator += dt;
        if (gravityAccumulator >= moleGravityDelay) {
            tickMoleGravity();
            gravityAccumulator %= moleGravityDelay;
        }
        
        // Update dissolve scheduling
        const dissolvingBlock = blocks.find(b => b.isDissolving);
        if (!dissolvingBlock) {
            dissolveTimer += dt;
            if (dissolveTimer >= DISSOLVE_INTERVAL) {
                dissolveTimer = 0;
                selectBlockToDissolve();
            }
        } else {
            dissolvingBlock.blinkTimer -= dt;
            if (dissolvingBlock.blinkTimer <= 0) {
                createParticlesForBlock(dissolvingBlock);
                playSynthSound(600, 200, 0.3, 'sawtooth', 0.7);
                blocks = blocks.filter(b => b.id !== dissolvingBlock.id);
                dissolveTimer = 0; // reset timer
            }
        }
    }

    // Update particles
    updateParticles(dt);
    
    // Render everything
    drawGrid();
    drawMoleCharacter();
    drawParticles();
    
    requestAnimationFrame(gameLoop);
}

// Controls configuration
window.addEventListener('keydown', e => {
    if (gameState !== 'PLAYING') return;
    
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            moveMole(-1, 0);
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            moveMole(1, 0);
            e.preventDefault();
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            moveMole(0, -1);
            e.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            break;
    }
});

// Touch controls setup
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');
const touchUp = document.getElementById('touch-up');

function setupTouchControls() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) {
        document.getElementById('touch-controls').style.display = 'flex';
    }
    
    const handleControl = (dx, dy) => {
        if (gameState === 'PLAYING') {
            moveMole(dx, dy);
        }
    };
    
    touchLeft.addEventListener('pointerdown', e => { e.preventDefault(); handleControl(-1, 0); });
    touchRight.addEventListener('pointerdown', e => { e.preventDefault(); handleControl(1, 0); });
    touchUp.addEventListener('pointerdown', e => { e.preventDefault(); handleControl(0, -1); });
}

// Settings and Info menu interactions
const btnInfo = document.getElementById('btn-info');
const infoModal = document.getElementById('info-modal');
const btnCloseInfo = document.getElementById('btn-close-info');

btnSettings.addEventListener('click', () => {
    const wasPlaying = gameState === 'PLAYING';
    if (wasPlaying) {
        togglePause();
    }
    settingsModal.style.display = 'flex';
});

btnCloseSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    saveSettings();
});

btnInfo.addEventListener('click', () => {
    const wasPlaying = gameState === 'PLAYING';
    if (wasPlaying) {
        togglePause();
    }
    infoModal.style.display = 'flex';
});

btnCloseInfo.addEventListener('click', () => {
    infoModal.style.display = 'none';
});

togglePl.addEventListener('click', () => {
    lang = 'pl';
    saveSettings();
    updateSettingsUI();
    applyLanguage();
});

toggleEn.addEventListener('click', () => {
    lang = 'en';
    saveSettings();
    updateSettingsUI();
    applyLanguage();
});

toggleCrtOn.addEventListener('click', () => {
    crtActive = true;
    saveSettings();
    updateSettingsUI();
    updateCrtFilter();
});

toggleCrtOff.addEventListener('click', () => {
    crtActive = false;
    saveSettings();
    updateSettingsUI();
    updateCrtFilter();
});

toggleSoundOn.addEventListener('click', () => {
    soundActive = true;
    saveSettings();
    updateSettingsUI();
});

toggleSoundOff.addEventListener('click', () => {
    soundActive = false;
    saveSettings();
    updateSettingsUI();
});

volumeSlider.addEventListener('input', e => {
    soundVolume = parseInt(e.target.value) / 100;
    if (soundVolume > 0 && !soundActive) {
        soundActive = true;
    } else if (soundVolume === 0) {
        soundActive = false;
    }
    saveSettings();
    updateSettingsUI();
});

function applyBoardSize() {
    const btnSmall = document.getElementById('size-small');
    const btnMedium = document.getElementById('size-medium');
    const btnLarge = document.getElementById('size-large');
    
    if (btnSmall) btnSmall.classList.toggle('active', boardSize === 'small');
    if (btnMedium) btnMedium.classList.toggle('active', boardSize === 'medium');
    if (btnLarge) btnLarge.classList.toggle('active', boardSize === 'large');
    
    if (boardSize === 'small') {
        CELL_SIZE = 20;
    } else if (boardSize === 'large') {
        CELL_SIZE = 30;
    } else {
        CELL_SIZE = 25;
    }
    
    // Resize canvas
    canvas.width = COLS * CELL_SIZE;
    canvas.height = VISIBLE_ROWS * CELL_SIZE;
    
    // Resize side columns
    document.querySelectorAll('.side-column').forEach(col => {
        if (window.innerWidth > 1040) {
            col.style.height = canvas.height + 'px';
        } else {
            col.style.height = 'auto';
        }
    });
}

window.addEventListener('resize', () => {
    applyBoardSize();
});

document.getElementById('size-small').addEventListener('click', () => {
    boardSize = 'small';
    saveSettings();
    applyBoardSize();
});

document.getElementById('size-medium').addEventListener('click', () => {
    boardSize = 'medium';
    saveSettings();
    applyBoardSize();
});

document.getElementById('size-large').addEventListener('click', () => {
    boardSize = 'large';
    saveSettings();
    applyBoardSize();
});

btnLang.addEventListener('click', () => {
    lang = lang === 'pl' ? 'en' : 'pl';
    saveSettings();
    updateSettingsUI();
    applyLanguage();
});

btnPause.addEventListener('click', togglePause);
btnReset.addEventListener('click', resetGame);
btnStart.addEventListener('click', () => {
    if (gameState === 'PAUSED') {
        togglePause();
    } else {
        startGame();
    }
});

window.addEventListener('load', () => {
    loadSettings();
    applyBoardSize();
    setupTouchControls();
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#555555';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('Andrzej Baka', canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillText('& Mariusz Buras', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('1991', canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.fillStyle = '#ffff00';
    ctx.fillText('RETRO CLONE 2026', canvas.width / 2, canvas.height / 2 + 60);
});
