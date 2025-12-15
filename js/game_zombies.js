/* js/game_zombies.js */

// === CONFIGURATION ===
const Z_ASSETS = {
    // Plants
    peashooter: { img: 'images/max.jpg', cost: 100, hp: 100, dmg: 20, rate: 60, type: 'shooter' },
    sunflower:  { img: 'images/photo_2025-12-09_11-27-57.jpg', cost: 50, hp: 80, dmg: 0, rate: 300, type: 'producer' },
    wallnut:    { img: 'images/photo_2023-05-30_12-09-39.jpg', cost: 50, hp: 1000, dmg: 0, rate: 0, type: 'wall' },
    doomshroom: { img: 'images/photo_2024-09-11_11-11-39.jpg', cost: 125, hp: 50, dmg: 500, rate: 0, type: 'bomb' }, // Instant kill area
    
    // Environment
    house:      'images/X5_Tech.svg',
    bullet:     '#C6FF00', // Acid green bullet
    lawnColor:  ['#0d2b0d', '#133a13'], // Dark checkerboard
    
    // Zombies
    zombieNormal: { img: 'images/magnite_logo.png', hp: 100, speed: 0.3, dmg: 0.5 },
    zombieCone:   { img: 'images/dicsi.png', hp: 250, speed: 0.25, dmg: 0.5 }, // Transforms to Normal at 100HP
    zombieGarg:   { img: 'images/KB.png', hp: 800, speed: 0.15, dmg: 50 }       // Boss
};

// === GAME STATE ===
let zCanvas, zCtx;
let zGameLoopId;
let zLevel = 1;
let zSun = 150;
let zFrame = 0;
let zGameOver = false;

// Entities
let zPlants = [];
let zZombies = [];
let zBullets = [];
let zParticles = []; // Sun and explosions
let zSuns = [];

// Grid Config
const CELL_W = 90;
const CELL_H = 100;
const GRID_COLS = 9;
let GRID_ROWS = 5;
let GRID_OFFSET_Y = 100;
let GRID_OFFSET_X = 140;

// Mouse & UI
let zMouse = { x: 0, y: 0, down: false };
let zSelectedCard = null;

// Images Cache
const zImages = {};

// === INIT & CONTROL ===

function initZombies() {
    const container = document.getElementById('mode-zombies');
    container.innerHTML = ''; // Clear placeholder

    // Create Canvas
    zCanvas = document.createElement('canvas');
    zCanvas.width = container.clientWidth || 1000;
    zCanvas.height = container.clientHeight || 700;
    zCanvas.style.background = '#000';
    zCanvas.style.borderRadius = '10px';
    zCanvas.style.border = '2px solid #333';
    container.appendChild(zCanvas);
    zCtx = zCanvas.getContext('2d');

    // Event Listeners
    zCanvas.addEventListener('mousedown', (e) => handleInput(e, true));
    zCanvas.addEventListener('mousemove', (e) => handleInput(e, false));
    zCanvas.addEventListener('mouseup', () => zMouse.down = false);

    preloadZAssets(() => {
        startZLevel(1);
        loopZombies();
    });
}

function stopZombies() {
    cancelAnimationFrame(zGameLoopId);
    zGameLoopId = null;
}

function preloadZAssets(callback) {
    let loaded = 0;
    const sources = [
        Z_ASSETS.peashooter.img, Z_ASSETS.sunflower.img, Z_ASSETS.wallnut.img, Z_ASSETS.doomshroom.img,
        Z_ASSETS.house, Z_ASSETS.zombieNormal.img, Z_ASSETS.zombieCone.img, Z_ASSETS.zombieGarg.img
    ];

    sources.forEach(src => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            loaded++;
            if (loaded === sources.length) callback();
        };
        zImages[src] = img;
    });
}

// === LEVEL LOGIC ===

function startZLevel(lvl) {
    zLevel = lvl;
    zPlants = [];
    zZombies = [];
    zBullets = [];
    zSuns = [];
    zSun = 150; // Starting sun
    zFrame = 0;
    zGameOver = false;

    // Config based on Level
    if (lvl === 1) {
        GRID_ROWS = 3;
        GRID_OFFSET_Y = 180; // Center vertically
    } else {
        GRID_ROWS = 5;
        GRID_OFFSET_Y = 100;
    }
}

// === GAME LOOP ===

function loopZombies() {
    updateZ();
    drawZ();
    zGameLoopId = requestAnimationFrame(loopZombies);
}

function updateZ() {
    if (zGameOver) return;
    zFrame++;

    // 1. Spawner
    spawnZombiesLogic();
    spawnSkySun();

    // 2. Plants Logic
    zPlants.forEach((p, pi) => {
        // Shooting
        if (p.type === 'shooter' && zFrame % p.rate === 0) {
            // Check if zombie in lane
            const hasZombie = zZombies.some(z => z.row === p.row && z.x > p.x);
            if (hasZombie) {
                zBullets.push({ x: p.x + 50, y: p.y + 20, row: p.row, dmg: p.dmg });
            }
        }
        // Sun production
        if (p.type === 'producer' && zFrame % p.rate === 0) {
            zSuns.push({ x: p.x, y: p.y, val: 25, life: 300, vy: -1 });
        }
        
        // Doom-shroom explosion logic (Immediate)
        if (p.type === 'bomb') {
            triggerExplosion(p);
            zPlants.splice(pi, 1);
        }
    });

    // 3. Bullets
    for (let i = zBullets.length - 1; i >= 0; i--) {
        let b = zBullets[i];
        b.x += 7; // Speed
        
        // Collision with Zombies
        let hit = false;
        for (let j = 0; j < zZombies.length; j++) {
            let z = zZombies[j];
            if (z.row === b.row && b.x > z.x && b.x < z.x + 60) {
                damageZombie(z, b.dmg);
                hit = true;
                break;
            }
        }
        if (hit || b.x > zCanvas.width) zBullets.splice(i, 1);
    }

    // 4. Zombies
    for (let i = zZombies.length - 1; i >= 0; i--) {
        let z = zZombies[i];
        
        // Movement & Eating
        let eating = false;
        for (let j = 0; j < zPlants.length; j++) {
            let p = zPlants[j];
            if (p.row === z.row && z.x < p.x + 60 && z.x > p.x - 20) {
                eating = true;
                p.hp -= z.dmg;
                if (p.hp <= 0) zPlants.splice(j, 1);
                break;
            }
        }

        if (!eating) z.x -= z.speed;

        // Image Swap Logic (Dixy -> Magnit)
        if (z.isCone && z.hp <= 100) {
            z.img = Z_ASSETS.zombieNormal.img;
            z.isCone = false; // Hat fell off
        }

        // Game Over Check (Reaching X5 House)
        if (z.x < 50) {
            zGameOver = true;
        }

        if (z.hp <= 0) zZombies.splice(i, 1);
    }

    // 5. Sun logic
    for (let i = zSuns.length - 1; i >= 0; i--) {
        let s = zSuns[i];
        s.life--;
        if (s.vy) { s.y += s.vy; s.vy += 0.05; if(s.y > s.baseY) s.vy = 0; } // Little hop
        if (s.life <= 0) zSuns.splice(i, 1);
    }
}

// === LOGIC HELPERS ===

function spawnZombiesLogic() {
    // Wave logic
    let rate = 300; 
    if (zFrame > 2000) rate = 150;
    if (zFrame > 4000) rate = 100;

    if (zFrame % rate === 0) {
        let row = Math.floor(Math.random() * GRID_ROWS);
        let typeRand = Math.random();
        
        let zConfig = Z_ASSETS.zombieNormal;
        let isCone = false;

        // Difficulty scaling
        if (zLevel === 1) {
             if (zFrame > 1500 && typeRand > 0.7) { zConfig = Z_ASSETS.zombieCone; isCone = true; }
        } else {
             if (typeRand > 0.8) { zConfig = Z_ASSETS.zombieGarg; } // KB GARGANTUAR
             else if (typeRand > 0.5) { zConfig = Z_ASSETS.zombieCone; isCone = true; }
        }

        zZombies.push({
            x: zCanvas.width + 50,
            y: GRID_OFFSET_Y + row * CELL_H + 10,
            row: row,
            hp: zConfig.hp,
            maxHp: zConfig.hp,
            speed: zConfig.speed,
            dmg: zConfig.dmg,
            img: zConfig.img,
            isCone: isCone,
            w: zConfig === Z_ASSETS.zombieGarg ? 120 : 80, // Gargantuar is bigger
            h: zConfig === Z_ASSETS.zombieGarg ? 120 : 80
        });
    }
}

function spawnSkySun() {
    if (zFrame % 400 === 0) {
        zSuns.push({
            x: Math.random() * (zCanvas.width - 200) + 150,
            y: Math.random() * (zCanvas.height - 200) + 100,
            val: 25,
            life: 500,
            baseY: 1000 // Fall down
        });
    }
}

function damageZombie(z, dmg) {
    z.hp -= dmg;
}

function triggerExplosion(plant) {
    // Kill everything in 3x3 radius (effectively whole screen for fun)
    zZombies.forEach(z => {
        // Simple distance check
        let dist = Math.sqrt(Math.pow(z.x - plant.x, 2) + Math.pow((z.y) - (plant.y), 2));
        if (dist < 400) {
            z.hp -= 500;
        }
    });
    // Visual effect
    zParticles.push({x: plant.x, y: plant.y, life: 20});
}

// === INPUT ===

function handleInput(e, isClick) {
    const rect = zCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // UI: Card Selection
    if (isClick && my < 90) { // Top bar area
        const cards = getAvailableCards();
        cards.forEach((card, i) => {
            let cx = 150 + i * 85;
            if (mx > cx && mx < cx + 80) {
                if (zSun >= card.cost) {
                    zSelectedCard = card;
                }
            }
        });
        return;
    }

    // Gameplay: Collect Sun
    if (isClick) {
        for (let i = zSuns.length - 1; i >= 0; i--) {
            let s = zSuns[i];
            let dist = Math.sqrt(Math.pow(mx - s.x, 2) + Math.pow(my - s.y, 2));
            if (dist < 40) {
                zSun += s.val;
                zSuns.splice(i, 1);
                return; // Collect one at a time or handled click
            }
        }
    }

    // Gameplay: Place Plant
    if (isClick && zSelectedCard) {
        // Convert mouse to grid
        let col = Math.floor((mx - GRID_OFFSET_X) / CELL_W);
        let row = Math.floor((my - GRID_OFFSET_Y) / CELL_H);

        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
            // Check if occupied
            const occupied = zPlants.some(p => p.col === col && p.row === row);
            if (!occupied) {
                zPlants.push({
                    x: GRID_OFFSET_X + col * CELL_W + 10,
                    y: GRID_OFFSET_Y + row * CELL_H + 10,
                    col: col,
                    row: row,
                    type: zSelectedCard.type,
                    hp: zSelectedCard.hp,
                    dmg: zSelectedCard.dmg,
                    rate: zSelectedCard.rate,
                    img: zSelectedCard.img
                });
                zSun -= zSelectedCard.cost;
                zSelectedCard = null;
            }
        }
    }
}

function getAvailableCards() {
    const cards = [
        { ...Z_ASSETS.peashooter, name: 'max' },
        { ...Z_ASSETS.sunflower, name: 'sun' },
        { ...Z_ASSETS.wallnut, name: 'nut' }
    ];
    if (zLevel === 2) {
        cards.push({ ...Z_ASSETS.doomshroom, name: 'doom' });
    }
    return cards;
}

// === DRAWING ===

function drawZ() {
    // Clear
    zCtx.fillStyle = '#222';
    zCtx.fillRect(0, 0, zCanvas.width, zCanvas.height);

    // 1. Draw Grid (Lawn)
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            zCtx.fillStyle = (r + c) % 2 === 0 ? Z_ASSETS.lawnColor[0] : Z_ASSETS.lawnColor[1];
            zCtx.fillRect(GRID_OFFSET_X + c * CELL_W, GRID_OFFSET_Y + r * CELL_H, CELL_W, CELL_H);
        }
    }

    // 2. House (X5 Life Line)
    let hImg = zImages[Z_ASSETS.house];
    if (hImg) {
        zCtx.drawImage(hImg, 10, GRID_OFFSET_Y, 120, GRID_ROWS * CELL_H);
    }

    // 3. Plants
    zPlants.forEach(p => {
        let img = zImages[p.img];
        if (img) zCtx.drawImage(img, p.x, p.y, 70, 70);
        // HP bar for wallnut
        if (p.type === 'wall' && p.hp < 1000) {
            zCtx.fillStyle = 'red';
            zCtx.fillRect(p.x, p.y - 5, 70 * (p.hp/1000), 4);
        }
    });

    // 4. Zombies
    zZombies.forEach(z => {
        let img = zImages[z.img];
        let w = z.w || 80;
        let h = z.h || 80;
        if (img) zCtx.drawImage(img, z.x, z.y - 10, w, h);
    });

    // 5. Bullets
    zCtx.fillStyle = Z_ASSETS.bullet;
    zBullets.forEach(b => {
        zCtx.beginPath();
        zCtx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        zCtx.fill();
    });

    // 6. Suns
    zSuns.forEach(s => {
        zCtx.fillStyle = '#ffe100';
        zCtx.strokeStyle = '#d48900';
        zCtx.lineWidth = 2;
        zCtx.beginPath();
        zCtx.arc(s.x, s.y, 20, 0, Math.PI * 2);
        zCtx.fill();
        zCtx.stroke();
    });

    // 7. Explosion Particles (Doom shroom)
    zParticles.forEach(p => {
        zCtx.fillStyle = 'rgba(255, 0, 255, 0.5)';
        zCtx.beginPath();
        zCtx.arc(p.x + 35, p.y + 35, 200, 0, Math.PI * 2);
        zCtx.fill();
        p.life--;
    });
    zParticles = zParticles.filter(p => p.life > 0);

    // 8. UI Overlay
    drawUI();

    // 9. Game Over / Win
    if (zGameOver) {
        zCtx.fillStyle = 'rgba(0,0,0,0.8)';
        zCtx.fillRect(0, 0, zCanvas.width, zCanvas.height);
        zCtx.fillStyle = '#C6FF00'; // Accent color
        zCtx.font = '900 60px "Monument Extended", sans-serif';
        zCtx.textAlign = 'center';
        zCtx.fillText('ZOMBIES ATE YOUR', zCanvas.width/2, zCanvas.height/2 - 40);
        zCtx.fillText('ANALYTICS', zCanvas.width/2, zCanvas.height/2 + 40);
        zCtx.font = '20px Inter';
        zCtx.fillText('Click to restart', zCanvas.width/2, zCanvas.height/2 + 90);
    }
}

function drawUI() {
    // Top Bar Background
    zCtx.fillStyle = 'rgba(0,0,0,0.6)';
    zCtx.fillRect(0, 0, zCanvas.width, 90);

    // Sun Counter
    zCtx.fillStyle = '#ffe100';
    zCtx.font = 'bold 24px Inter';
    zCtx.textAlign = 'left';
    zCtx.fillText(`SUN: ${zSun}`, 20, 50);

    // Cards
    const cards = getAvailableCards();
    cards.forEach((card, i) => {
        let x = 150 + i * 85;
        let y = 10;
        
        // Card BG
        zCtx.fillStyle = (zSun >= card.cost) ? '#444' : '#222';
        if (zSelectedCard && zSelectedCard.name === card.name) zCtx.fillStyle = '#666';
        zCtx.fillRect(x, y, 75, 70);
        zCtx.strokeStyle = '#C6FF00';
        zCtx.lineWidth = 1;
        zCtx.strokeRect(x, y, 75, 70);

        // Icon
        let img = zImages[card.img];
        if (img) zCtx.drawImage(img, x + 10, y + 10, 55, 55);

        // Cost
        zCtx.fillStyle = '#fff';
        zCtx.font = 'bold 14px Inter';
        zCtx.fillText(card.cost, x + 5, y + 65);
    });

    // Level Info
    zCtx.fillStyle = '#888';
    zCtx.font = '16px Inter';
    zCtx.fillText(`LEVEL ${zLevel}`, zCanvas.width - 100, 50);

    if (zLevel === 1 && zGameOver) {
        // Simple click to reset logic inside handleInput or here?
        // For simplicity, click anywhere resets if gameover
        if (zMouse.down) initZombies(); 
    }
    
    // Level 2 Transition (Simple logic: Survive X frames)
    if (zLevel === 1 && zFrame > 3500 && !zGameOver) {
        zCtx.fillStyle = '#C6FF00';
        zCtx.font = '40px "Monument Extended"';
        zCtx.textAlign = 'center';
        zCtx.fillText("LEVEL CLEARED!", zCanvas.width/2, zCanvas.height/2);
        setTimeout(() => startZLevel(2), 2000);
    }
}