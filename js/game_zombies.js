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
    mower:      'images/knazyv.jpg',
    bullet:     '#C6FF00', // Acid green bullet
    lawnColor:  ['#7CFC00', '#32CD32'], // Lighter, more vibrant grass (Lawn Green / Lime Green)
    
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
        Z_ASSETS.house, Z_ASSETS.mower, Z_ASSETS.zombieNormal.img, Z_ASSETS.zombieCone.img, Z_ASSETS.zombieGarg.img
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

let zMowers = [];
let zZombiesToSpawn = 0;
let zLevelCleared = false;

function startZLevel(lvl) {
    zLevel = lvl;
    zPlants = [];
    zZombies = [];
    zBullets = [];
    zSuns = [];
    zSun = 150; // Starting sun
    zFrame = 0;
    zGameOver = false;
    zLevelCleared = false;

    // Config based on Level
    if (lvl === 1) {
        GRID_ROWS = 3;
        GRID_OFFSET_Y = 180; // Center vertically
        zZombiesToSpawn = 10;
    } else {
        GRID_ROWS = 5;
        GRID_OFFSET_Y = 100;
        zZombiesToSpawn = 25;
    }

    // Init Mowers
    zMowers = [];
    for(let r=0; r<GRID_ROWS; r++) {
        zMowers.push({ row: r, x: GRID_OFFSET_X - 60, active: false });
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

    // Level Clear Check
    if (zZombiesToSpawn <= 0 && zZombies.length === 0 && !zLevelCleared) {
        zLevelCleared = true;
        setTimeout(() => startZLevel(zLevel + 1), 4000);
    }

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
        
        // Doom-shroom explosion logic (Timer)
        if (p.type === 'bomb') {
            if (!p.timer) p.timer = 90; // 1.5 sec at 60fps
            p.timer--;
            if (p.timer <= 0) {
                triggerExplosion(p);
                zPlants.splice(pi, 1);
            }
        }
    });

    // Mowers Logic
    zMowers.forEach((m, mi) => {
        if (m.active) {
            m.x += 8; // Fast speed
            // Kill zombies in row
            zZombies.forEach(z => {
                if (z.row === m.row && Math.abs(z.x - m.x) < 50) {
                    z.hp = -999; // Instant kill
                }
            });
            // Remove if off screen
            if (m.x > zCanvas.width) {
                // Mark as gone? Or just keep moving off screen
            }
        } else {
            // Check trigger
            let triggerZ = zZombies.find(z => z.row === m.row && z.x < m.x + 40);
            if (triggerZ) m.active = true;
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
    if (zZombiesToSpawn <= 0) return;

    // Wave logic
    let rate = 300; 
    if (zFrame > 2000) rate = 150;
    if (zFrame > 4000) rate = 100;

    if (zFrame % rate === 0) {
        zZombiesToSpawn--;
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
        // Convert mouse to grid (Standard PvZ 2D)
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
                    img: zSelectedCard.img,
                    timer: (zSelectedCard.type === 'bomb') ? 90 : 0 // Init timer for bomb
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

    // 1. Draw Grid (Checkerboard Lawn)
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            // Checkerboard pattern: (row + col) % 2
            // Use slightly different shades of green
            let isDark = (r + c) % 2 === 1;
            zCtx.fillStyle = isDark ? '#00a800' : '#00c400'; // Classic PvZ greens
            zCtx.fillRect(GRID_OFFSET_X + c * CELL_W, GRID_OFFSET_Y + r * CELL_H, CELL_W, CELL_H);
            
            // Subtle border for depth
            zCtx.strokeStyle = 'rgba(0,0,0,0.1)';
            zCtx.strokeRect(GRID_OFFSET_X + c * CELL_W, GRID_OFFSET_Y + r * CELL_H, CELL_W, CELL_H);
        }
    }

    // 2. House / Mowers Area
    // Draw a "safe zone" to the left
    zCtx.fillStyle = '#3a2418'; // Dirt path color
    zCtx.fillRect(0, GRID_OFFSET_Y, GRID_OFFSET_X, GRID_ROWS * CELL_H);
    
    let hImg = zImages[Z_ASSETS.house];
    if (hImg) {
        // Draw the "House" logo rotated -90 degrees
        zCtx.save();
        // Center of the house area
        let hCx = 60; 
        let hCy = GRID_OFFSET_Y + (GRID_ROWS * CELL_H) / 2;
        zCtx.translate(hCx, hCy);
        zCtx.rotate(-Math.PI / 2);
        zCtx.drawImage(hImg, -150, -60, 300, 120);
        zCtx.restore();
    }

    // Draw "Lawn Mowers"
    let mowerImg = zImages[Z_ASSETS.mower];
    zMowers.forEach(m => {
        if (mowerImg) {
            zCtx.drawImage(mowerImg, m.x, GRID_OFFSET_Y + m.row * CELL_H + 10, 70, 70);
        } else {
            // Simple Mower Graphic (Fallback)
            zCtx.fillStyle = '#ff0000';
            zCtx.fillRect(m.x, GRID_OFFSET_Y + m.row * CELL_H + 20, 40, 40);
            
            // Wheels
            zCtx.fillStyle = '#000';
            zCtx.beginPath(); zCtx.arc(m.x + 10, GRID_OFFSET_Y + m.row * CELL_H + 60, 10, 0, Math.PI*2); zCtx.fill();
            zCtx.beginPath(); zCtx.arc(m.x + 30, GRID_OFFSET_Y + m.row * CELL_H + 60, 10, 0, Math.PI*2); zCtx.fill();
            
            // Handle
            zCtx.strokeStyle = '#ccc';
            zCtx.lineWidth = 3;
            zCtx.beginPath();
            zCtx.moveTo(m.x, GRID_OFFSET_Y + m.row * CELL_H + 40);
            zCtx.lineTo(m.x - 20, GRID_OFFSET_Y + m.row * CELL_H + 10);
            zCtx.stroke();
        }
    });

    // 3. Entities (Sorted by depth: Row by Row)
    for (let r = 0; r < GRID_ROWS; r++) {
        // Draw Plants in this row
        let rowPlants = zPlants.filter(p => p.row === r).sort((a, b) => a.col - b.col);
        rowPlants.forEach(p => {
            let img = zImages[p.img];
            let cx = GRID_OFFSET_X + p.col * CELL_W + CELL_W/2;
            let cy = GRID_OFFSET_Y + p.row * CELL_H + CELL_H/2;
            
            // Shadow
            zCtx.fillStyle = 'rgba(0,0,0,0.3)';
            zCtx.beginPath();
            zCtx.ellipse(cx, cy + 30, 25, 10, 0, 0, Math.PI * 2);
            zCtx.fill();

            if (p.type === 'bomb') {
                // Doom-shroom Animation
                let scale = 1;
                let filter = 'none';
                
                if (p.timer) {
                    // Grow
                    scale = 1 + (90 - p.timer) / 90 * 0.3; 
                    // Blink White
                    if (Math.floor(zFrame / 5) % 2 === 0) {
                        zCtx.globalCompositeOperation = 'source-over'; // Normal
                        filter = 'brightness(200%)'; // Bright
                    }
                }
                
                zCtx.save();
                zCtx.translate(cx, cy);
                zCtx.scale(scale, scale);
                if (filter !== 'none') zCtx.filter = filter;
                
                if (img) zCtx.drawImage(img, -35, -40, 70, 70);
                
                zCtx.restore();
                zCtx.filter = 'none'; // Reset
            } else {
                if (img) {
                    zCtx.drawImage(img, cx - 35, cy - 40, 70, 70);
                }
            }

            if (p.type === 'wall' && p.hp < 1000) {
                zCtx.fillStyle = 'red';
                zCtx.fillRect(cx - 35, cy - 50, 70 * (p.hp/1000), 4);
            }
        });

        // Draw Zombies in this row
        let rowZombies = zZombies.filter(z => z.row === r);
        rowZombies.forEach(z => {
            let img = zImages[z.img];
            let w = z.w || 80;
            let h = z.h || 80;
            
            // Shadow
            zCtx.fillStyle = 'rgba(0,0,0,0.3)';
            zCtx.beginPath();
            zCtx.ellipse(z.x + w/2, z.y + h - 5, 30, 10, 0, 0, Math.PI * 2);
            zCtx.fill();

            if (img) zCtx.drawImage(img, z.x, z.y - 20, w, h);
        });

        // Draw Bullets in this row
        let rowBullets = zBullets.filter(b => b.row === r);
        zCtx.fillStyle = Z_ASSETS.bullet;
        rowBullets.forEach(b => {
            zCtx.beginPath();
            zCtx.arc(b.x, b.y, 10, 0, Math.PI * 2);
            zCtx.fill();
            // Shine
            zCtx.fillStyle = '#fff';
            zCtx.beginPath();
            zCtx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2);
            zCtx.fill();
            zCtx.fillStyle = Z_ASSETS.bullet;
        });
    }

    // 6. Suns (Screen Space)
    zSuns.forEach(s => {
        // Glow
        zCtx.shadowBlur = 15;
        zCtx.shadowColor = '#ffeb3b';
        
        zCtx.fillStyle = '#ffe100';
        zCtx.strokeStyle = '#ff9800';
        zCtx.lineWidth = 3;
        zCtx.beginPath();
        zCtx.arc(s.x, s.y, 25, 0, Math.PI * 2);
        zCtx.fill();
        zCtx.stroke();
        
        zCtx.shadowBlur = 0; // Reset
    });

    // 7. Explosion Particles
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
        zCtx.fillStyle = 'rgba(0,0,0,0.85)';
        zCtx.fillRect(0, 0, zCanvas.width, zCanvas.height);
        zCtx.fillStyle = '#C6FF00'; 
        zCtx.font = '900 60px "Segoe UI", sans-serif';
        zCtx.textAlign = 'center';
        zCtx.fillText('ZOMBIES ATE YOUR', zCanvas.width/2, zCanvas.height/2 - 40);
        zCtx.fillText('ANALYTICS', zCanvas.width/2, zCanvas.height/2 + 40);
        zCtx.font = '20px "Segoe UI"';
        zCtx.fillText('Click to restart', zCanvas.width/2, zCanvas.height/2 + 90);
    }
}

function drawUI() {
    // Top Bar Background (Wood texture style)
    zCtx.fillStyle = '#654321'; // Dark wood
    zCtx.fillRect(0, 0, zCanvas.width, 90);
    
    // Wood grain effect (simple lines)
    zCtx.strokeStyle = '#503010';
    zCtx.lineWidth = 2;
    for(let i=0; i<10; i++) {
        let y = i * 9;
        zCtx.beginPath();
        zCtx.moveTo(0, y);
        zCtx.lineTo(zCanvas.width, y);
        zCtx.stroke();
    }

    // Sun Counter Box
    zCtx.fillStyle = '#3e2723'; // Darker wood for inset
    zCtx.fillRect(10, 10, 100, 70);
    zCtx.strokeStyle = '#8d6e63';
    zCtx.strokeRect(10, 10, 100, 70);

    // Sun Icon
    zCtx.fillStyle = '#ffe100';
    zCtx.beginPath();
    zCtx.arc(35, 45, 18, 0, Math.PI * 2);
    zCtx.fill();
    zCtx.strokeStyle = '#ff9800';
    zCtx.lineWidth = 2;
    zCtx.stroke();

    // Sun Text
    zCtx.fillStyle = '#fff';
    zCtx.font = 'bold 24px "Segoe UI", sans-serif';
    zCtx.textAlign = 'center';
    zCtx.fillText(zSun, 80, 53);

    // Cards Area
    const cards = getAvailableCards();
    cards.forEach((card, i) => {
        let x = 130 + i * 90; // Spacing
        let y = 5;
        let w = 80;
        let h = 80;
        
        // Card Background (Seed Packet)
        zCtx.fillStyle = (zSun >= card.cost) ? '#f0f0d0' : '#a0a090'; // Beige or Grayed out
        if (zSelectedCard && zSelectedCard.name === card.name) zCtx.fillStyle = '#fffacd'; // Highlight
        
        zCtx.fillRect(x, y, w, h);
        
        // Card Border
        zCtx.strokeStyle = '#2e7d32'; // Green border
        zCtx.lineWidth = 3;
        zCtx.strokeRect(x, y, w, h);

        // Plant Image
        let img = zImages[card.img];
        if (img) zCtx.drawImage(img, x + 15, y + 15, 50, 50);

        // Cost Badge
        zCtx.fillStyle = '#ffe100';
        zCtx.fillRect(x + w - 30, y + h - 20, 28, 18);
        zCtx.fillStyle = '#000';
        zCtx.font = 'bold 12px sans-serif';
        zCtx.textAlign = 'center';
        zCtx.fillText(card.cost, x + w - 16, y + h - 6);
    });

    // Menu Button (Placeholder)
    zCtx.fillStyle = '#8d6e63';
    zCtx.fillRect(zCanvas.width - 110, 10, 100, 40);
    zCtx.fillStyle = '#3e2723';
    zCtx.font = 'bold 16px sans-serif';
    zCtx.textAlign = 'center';
    zCtx.fillText("MENU", zCanvas.width - 60, 35);

    // Level Info
    zCtx.fillStyle = '#ccc';
    zCtx.font = '14px sans-serif';
    zCtx.fillText(`LEVEL ${zLevel}`, zCanvas.width - 60, 70);

    if (zLevel === 1 && zGameOver) {
        if (zMouse.down) initZombies(); 
    }
    
    // Level 2 Transition
    if (zLevel === 1 && zFrame > 3500 && !zGameOver) {
        zCtx.fillStyle = '#C6FF00';
        zCtx.font = '40px "Segoe UI"';
        zCtx.textAlign = 'center';
        zCtx.fillText("LEVEL CLEARED!", zCanvas.width/2, zCanvas.height/2);
        setTimeout(() => startZLevel(2), 2000);
    }
}