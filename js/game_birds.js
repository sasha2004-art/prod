/* js/game_birds.js */

// ????? Matter.js
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint,
      Constraint = Matter.Constraint,
      Body = Matter.Body,
      Vector = Matter.Vector;

let birdsEngine, birdsRender, birdsRunner;
let birdQueue = [];
let currentBird = null;
let slingConstraint = null;
let isFired = false;
let enemies = [];
let currentLevelIndex = 0;

// ???????? ???????
const SLING_X = 200;
const SLING_Y = 450; // ????? ???????

// ===  ? ===
const BIRD_TYPES = [
    { type: 'red', img: 'images/knazyv.jpg', radius: 25, density: 0.002 },     
    { type: 'blue', img: 'images/max.jpg', radius: 20, density: 0.0015 },      
    { type: 'yellow', img: 'images/photo_2023-05-30_12-09-39.jpg', radius: 25, density: 0.002 }, 
    { type: 'white', img: 'images/photo_2025-12-09_11-27-57.jpg', radius: 30, density: 0.0025 }, 
    { type: 'black', img: 'images/photo_2024-09-11_11-11-39.jpg', radius: 35, density: 0.003 }  
];

const ENEMY_IMG = 'images/magnite_logo.png';

// ???????????
const loadedImages = {};
function preloadImages() {
    BIRD_TYPES.forEach(b => {
        const img = new Image();
        img.src = b.img;
        loadedImages[b.type] = img;
    });
    const enemyImg = new Image();
    enemyImg.src = ENEMY_IMG;
    loadedImages['enemy'] = enemyImg;
}
preloadImages();

// === ? ? ===
function initBirds() {
    currentLevelIndex = 0;
    startLevel(currentLevelIndex);
}

function nextLevel() {
    currentLevelIndex++;
    if (currentLevelIndex >= levels.length) {
        currentLevelIndex = 0; // ?????????? ??? ?????????? ?????
    }
    startLevel(currentLevelIndex);
}

function startLevel(levelIndex) {
    console.log(Starting Level );
    const container = document.getElementById('birds-container');
    const msg = document.getElementById('birds-msg');
    const lvlInd = document.getElementById('level-indicator');
    
    // UI
    if (msg) msg.style.display = 'none';
    if (lvlInd) lvlInd.innerText = LEVEL ;

    // ?????? ??????? ????
    if (birdsEngine) {
        Matter.World.clear(birdsEngine.world);
        Matter.Engine.clear(birdsEngine);
        Matter.Render.stop(birdsRender);
        Matter.Runner.stop(birdsRunner);
        if (birdsRender.canvas) birdsRender.canvas.remove();
        birdsEngine = null;
    }

    // ???????? ??????
    birdsEngine = Engine.create();
    birdsEngine.positionIterations = 8;
    birdsEngine.velocityIterations = 8;
    const world = birdsEngine.world;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // ???????
    birdsRender = Render.create({
        element: container,
        engine: birdsEngine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent',
            showAngleIndicator: false
        }
    });

    // ??????
    const ground = Bodies.rectangle(width / 2, height - 20, width, 60, { 
        isStatic: true, 
        label: 'Ground',
        render: { fillStyle: '#222', strokeStyle: '#C6FF00', lineWidth: 2 }
    });
    const wallRight = Bodies.rectangle(width + 30, height/2, 60, height, { isStatic: true });
    const wallTop = Bodies.rectangle(width/2, -500, width, 100, { isStatic: true }); 
    const wallLeft = Bodies.rectangle(-30, height/2, 60, height, { isStatic: true });

    Composite.add(world, [ground, wallRight, wallTop, wallLeft]);

    // ??????? ?????? ?? ???????
    if (levels[levelIndex]) {
        levels[levelIndex](width, height);
    } else {
        levels[0](width, height);
    }

    // ????? ??????? ???? (??? 4 ????? ?? ??????? ? ????????? ??????? ??? ?????????????)
    // ?????? ?????? ?? ????? ????? ????
    birdQueue = [
        BIRD_TYPES[0], BIRD_TYPES[1], BIRD_TYPES[2], BIRD_TYPES[3], BIRD_TYPES[4]
    ];
    spawnBird();

    // ???
    const mouse = Mouse.create(birdsRender.canvas);
    const mouseConstraint = MouseConstraint.create(birdsEngine, {
        mouse: mouse,
        constraint: { stiffness: 0.05, render: { visible: false } }
    });
    mouseConstraint.collisionFilter.mask = 0x0001; 
    Composite.add(world, mouseConstraint);

    // --- ???? ---

    // 1. ????????
    Events.on(birdsEngine, 'afterUpdate', function() {
        if (!currentBird || !slingConstraint || isFired) return;
        const dist = Vector.magnitude(Vector.sub(currentBird.position, slingConstraint.pointA));
        if (mouse.button === -1 && dist > 15) {
            fireBird();
        }
    });

    // 2. ?????
    Events.on(mouseConstraint, 'mousedown', function() {
        if (isFired && currentBird && !currentBird.abilityUsed) {
            activateAbility(currentBird);
        }
    });

    // 3. ???????? (?????? + ?????? ?????)
    Events.on(birdsRender, 'afterRender', function() {
        const ctx = birdsRender.context;
        drawSlingshot(ctx); // ????? ???????
        drawRoundBirds(ctx); // ????? ????
    });

    // 4. ??????? (?????? ??????)
    Events.on(birdsEngine, 'collisionStart', function(event) {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            const enemy = enemies.find(e => e === bodyA || e === bodyB);
            if (enemy) {
                const other = (enemy === bodyA) ? bodyB : bodyA;
                // ?????? ?????
                const impact = other.speed * other.mass;
                
                // ?????? ??????:
                // 1. ??????? ???? (??????? ?????)
                // 2. ????? ????????? ????? (???? ??????)
                // 3. ???????? "???????" ??? ????-?? ????????
                
                let threshold = 1.0; // ?????? ?????
                if (other.label === 'Bird') threshold = 0.2; // ???? ??????? ????? ?????

                if (impact > threshold) {
                    removeEnemy(enemy);
                }
            }
        });
    });

    birdsRunner = Runner.create();
    Runner.run(birdsRunner, birdsEngine);
    Render.run(birdsRender);
}

// ===  ? ===

function spawnBird() {
    if (birdQueue.length === 0) {
        // ???? ?????????, ? ????? ????
        if (enemies.length > 0) {
            setTimeout(() => {
                if (enemies.length > 0) alert("GAME OVER! Try Reset.");
            }, 3000);
        }
        return;
    }

    const config = birdQueue.shift();
    isFired = false;
    currentBird = null;
    slingConstraint = null;

    // ????? ?????? (? ???????)
    const bird = Bodies.circle(SLING_X, SLING_Y - 20, config.radius, {
        label: 'Bird',
        density: config.density,
        restitution: 0.6,
        friction: 0.05,
        render: { visible: false }, 
        collisionFilter: { category: 0x0002, mask: 0x0001 }
    });

    bird.gameType = config.type;
    bird.abilityUsed = false;
    currentBird = bird;

    Composite.add(birdsEngine.world, bird);

    // ?????? (???????? ?????????? ?????, ?????? ????)
    slingConstraint = Constraint.create({
        pointA: { x: SLING_X, y: SLING_Y - 20 },
        bodyB: bird,
        stiffness: 0.05,
        damping: 0.05,
        length: 1,
        render: { visible: false } // ???????? ??????????? ?????
    });
    Composite.add(birdsEngine.world, slingConstraint);
}

function fireBird() {
    isFired = true;
    
    // ???????? ???????
    setTimeout(() => {
        if (slingConstraint) {
            Composite.remove(birdsEngine.world, slingConstraint);
            slingConstraint = null;
        }
    }, 20);

    // ??????? ?????????
    setTimeout(() => {
        if (currentBird) {
            // ??????????? ?????? ?????
            // Composite.remove(birdsEngine.world, currentBird); 
            // ?????? ???? ????? ????????, ??? ???????. 
            // ? ?????????? ????? ?? ?????.
            currentBird = null; 
        }
        if (enemies.length > 0) {
            spawnBird();
        }
    }, 4000); 
}

// === ?? (VISUALS) ===

function drawRoundBirds(ctx) {
    const bodies = Composite.allBodies(birdsEngine.world);
    bodies.forEach(body => {
        if (body.label === 'Bird' && loadedImages[body.gameType]) {
            const img = loadedImages[body.gameType];
            ctx.save();
            ctx.translate(body.position.x, body.position.y);
            ctx.rotate(body.angle);
            
            ctx.beginPath();
            ctx.arc(0, 0, body.circleRadius, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.clip(); 

            const size = body.circleRadius * 2;
            ctx.drawImage(img, -body.circleRadius, -body.circleRadius, size, size);
            
            ctx.beginPath();
            ctx.arc(0, 0, body.circleRadius, 0, 2 * Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            ctx.restore();
        }
    });
}

function drawSlingshot(ctx) {
    if (!ctx) return;

    const x = SLING_X;
    const y = SLING_Y; // ????? ????????

    // ????????? ????? ???????
    const forkLeft = { x: x - 15, y: y - 20 };
    const forkRight = { x: x + 15, y: y - 20 };

    ctx.save();

    // 1. ?????  ??????? (???? ????? ????)
    if (currentBird && !isFired) {
        ctx.beginPath();
        ctx.moveTo(forkLeft.x, forkLeft.y);
        ctx.lineTo(currentBird.position.x - 10, currentBird.position.y); // ??? ????? ?????? ?????
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#301808'; // ?????? ??????
        ctx.stroke();
    }

    // 2. ????? ???? ??????? (????? ????? ?????)
    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#8B4513'; // ?????
    ctx.moveTo(x, y + 50); // ????????
    ctx.lineTo(x, y);
    ctx.lineTo(forkLeft.x, forkLeft.y);
    ctx.moveTo(x, y);
    ctx.lineTo(forkRight.x, forkRight.y);
    ctx.stroke();

    // (???? ???????? ????? ????? ????????? ???????? drawRoundBirds, 
    // ?? ??? ??? ?? ? ????? ?????, ??? ????? ?????????????? ???????. 
    // Matter.Render ?????? ????  afterRender. ????? ?????  ?????????? (???? ?? ?? ?????? ??).
    // ? ?????? body.render.visible = false ? ?????? ???? ? drawRoundBirds.
    // ????? drawRoundBirds ???? ???????? ? ?????? ???????, ??  ????????.
    // ??????? ??????? ?????? ? Events.on('afterRender')...
    // ??????? ??? ???: ??????? ????????? ?? ????? ????? ???.
    
    if (currentBird) {
        drawOneBird(ctx, currentBird);
    }

    // 3. ?????  ???????
    if (currentBird && !isFired) {
        ctx.beginPath();
        ctx.moveTo(forkRight.x, forkRight.y);
        ctx.lineTo(currentBird.position.x + 10, currentBird.position.y); 
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#522'; // ??? ???????
        ctx.stroke();
    }

    ctx.restore();
}

function drawOneBird(ctx, body) {
    // ?????????????? ???????, ????? ?????????? ????? ?????? ???????
    if (!loadedImages[body.gameType]) return;
    const img = loadedImages[body.gameType];
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.beginPath();
    ctx.arc(0, 0, body.circleRadius, 0, 2 * Math.PI);
    ctx.clip();
    const size = body.circleRadius * 2;
    ctx.drawImage(img, -body.circleRadius, -body.circleRadius, size, size);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
}

// ===   ===

function createEnemy(x, y) {
    const radius = 25;
    const enemy = Bodies.circle(x, y, radius, {
        label: 'Enemy',
        density: 0.005, 
        friction: 0.5,
        render: {
            sprite: {
                texture: ENEMY_IMG,
                xScale: (radius * 2.1) / 500, 
                yScale: (radius * 2.1) / 500
            }
        }
    });
    enemies.push(enemy);
    Composite.add(birdsEngine.world, enemy);
}

function removeEnemy(enemy) {
    if (!enemies.includes(enemy)) return;
    
    // ????? "???????" (????? ????????)
    Composite.remove(birdsEngine.world, enemy);
    enemies = enemies.filter(e => e !== enemy);

    if (enemies.length === 0) {
        // ?????? ???????!
        setTimeout(() => {
            const msg = document.getElementById('birds-msg');
            const btn = document.getElementById('next-level-btn');
            
            if (currentLevelIndex < levels.length - 1) {
                btn.innerText = "NEXT LEVEL ?";
                btn.onclick = nextLevel;
            } else {
                btn.innerText = "RESTART ALL ??";
                btn.onclick = initBirds;
            }
            msg.style.display = 'block';
        }, 1000);
    }
}

// ===  ===
const levels = [
    // LEVEL 1: ???????
    function(w, h) {
        enemies = [];
        const offX = w * 0.6;
        const gY = h - 50;
        const wood = { fillStyle: '#eecfa1', strokeStyle: '#d4a76a', lineWidth: 2 };
        
        const stack = [
            Bodies.rectangle(offX, gY - 40, 20, 80, { render: wood }),
            Bodies.rectangle(offX + 100, gY - 40, 20, 80, { render: wood }),
            Bodies.rectangle(offX + 50, gY - 90, 140, 20, { render: wood }),
            Bodies.rectangle(offX + 50, gY - 140, 20, 80, { render: wood }), // ???
            Bodies.rectangle(offX + 50, gY - 190, 140, 20, { render: wood }) // ????
        ];
        createEnemy(offX + 50, gY - 30);
        createEnemy(offX + 50, gY - 220); // ? ????? ?????
        Composite.add(birdsEngine.world, stack);
    },

    // LEVEL 2: ??????? ??????
    function(w, h) {
        enemies = [];
        const offX = w * 0.7;
        const gY = h - 50;
        const stone = { fillStyle: '#888', strokeStyle: '#555', lineWidth: 2, density: 0.005 }; // ???????
        
        const stack = [
            Bodies.rectangle(offX, gY - 50, 30, 100, { render: stone }),
            Bodies.rectangle(offX + 120, gY - 50, 30, 100, { render: stone }),
            Bodies.rectangle(offX + 60, gY - 110, 200, 20, { render: stone }), // ????
            // ????? ??????
            Bodies.rectangle(offX + 60, gY - 30, 20, 60, { render: { fillStyle: '#eecfa1' } }),
        ];
        createEnemy(offX + 60, gY - 140); // ? ?????
        createEnemy(offX + 60, gY - 30);  // ?????
        createEnemy(offX + 150, gY - 30); // ?????
        Composite.add(birdsEngine.world, stack);
    },

    // LEVEL 3: ?????
    function(w, h) {
        enemies = [];
        const offX = w * 0.65;
        const gY = h - 50;
        const wood = { fillStyle: '#eecfa1' };

        // ????????
        const pivot = Bodies.rectangle(offX, gY - 30, 40, 60, { isStatic: true, render: { fillStyle: '#555' } });
        // ????
        const plank = Bodies.rectangle(offX, gY - 70, 300, 20, { render: wood, density: 0.001 });
        
        Composite.add(birdsEngine.world, [pivot, plank]);

        // Constraint ??? ???????
        const joint = Constraint.create({
            bodyA: pivot,
            bodyB: plank,
            pointB: { x: 0, y: 0 },
            stiffness: 1,
            length: 0,
            render: { visible: false }
        });
        Composite.add(birdsEngine.world, joint);

        // ???? ?? ?????
        createEnemy(offX - 120, gY - 100);
        createEnemy(offX + 120, gY - 100);
        
        // ???, ????? ?????????
        Composite.add(birdsEngine.world, Bodies.rectangle(offX + 120, gY - 150, 40, 40, { render: wood }));
    }
];

// ===  ===
function activateAbility(bird) {
    bird.abilityUsed = true;
    const v = bird.velocity;
    if (bird.gameType === 'yellow') Body.setVelocity(bird, Vector.mult(v, 2.2));
    else if (bird.gameType === 'blue') {
        Composite.add(birdsEngine.world, [cloneBird(bird, -20), cloneBird(bird, 20)]);
    }
    else if (bird.gameType === 'white') {
        const egg = Bodies.circle(bird.position.x, bird.position.y + 20, 15, { density: 0.05, render: { fillStyle: '#fff'} });
        Composite.add(birdsEngine.world, egg);
        Body.setVelocity(bird, { x: v.x + 5, y: -15 }); // ???? ?????
        Body.setVelocity(egg, { x: 0, y: 15 }); // ???? ????
    }
    else if (bird.gameType === 'black') {
        const bodies = Composite.allBodies(birdsEngine.world);
        bodies.forEach(b => {
            if (b.isStatic || b === bird) return;
            if (Vector.magnitude(Vector.sub(b.position, bird.position)) < 150) {
                const force = Vector.normalise(Vector.sub(b.position, bird.position));
                Body.applyForce(b, b.position, Vector.mult(force, 0.3 * b.mass));
            }
        });
        bird.render.visible = true; bird.render.fillStyle = 'orange'; bird.render.sprite = null;
        setTimeout(() => Composite.remove(birdsEngine.world, bird), 100);
    }
}

function cloneBird(original, angleDeg) {
    const clone = Bodies.circle(original.position.x, original.position.y, original.circleRadius, {
        label: 'Bird', render: { visible: false }, restitution: 0.6
    });
    clone.gameType = original.gameType; clone.abilityUsed = true;
    Body.setVelocity(clone, Vector.rotate(original.velocity, angleDeg * (Math.PI/180)));
    return clone;
}

// ????????? ??????? ?????????:
// ??????? ??????????? Matter.Render ?????? ???.
// ???? ?? ? 'afterRender' ?????? ???????.
// ????? drawSlingshot ?? ??????:
// 1. ????? ???????.
// 2. ??????? ????? (drawOneBird) — ????? ??? ???? ? ?????? ???????.
// 3. ??????? ??????? ? ??????.
// ???????? ???? (????? ??? ?????????????) ?????? drawRoundBirds ? ?????.
