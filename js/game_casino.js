/* js/game_casino.js */

let casinoClickCount = 0;

// Список картинок (пути должны быть относительны index.html)
const teamImages = [
    'images/gg_wp.jpg',
    'images/knazyv.jpg',
    'images/max.jpg',
    'images/penis.jpg',
    'images/photo_2025-10-09_21-09-55.jpg',
    'images/photo_2025-12-09_11-27-21.jpg',
    'images/photo_2025-12-09_11-27-57.jpg',
    'images/photo_2025-12-12_16-32-37.jpg',
    'images/photo_2025-12-14_14-53-28.jpg',
    'images/tete.jpg',
    'images/photo_2020-02-16_19-15-52.jpg',
    "images/photo_2023-05-30_12-09-39.jpg",
    "images/photo_2024-09-11_11-11-39.jpg"
];

function playCasino() {
    const btn = document.getElementById('casinoBtn');
    if(btn) btn.disabled = true; 
    
    casinoClickCount++;
    const isMaxWin = (casinoClickCount % 5 === 0); // Каждый 5-й раз

    // 1. Play Sound
    const audio = document.getElementById('casinoSound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.playbackRate = 1.1;
        audio.play().catch(e => console.log("Audio play failed:", e));
    }

    // 2. Shake screen
    document.body.classList.add('casino-shake');
    setTimeout(() => document.body.classList.remove('casino-shake'), 500);

    // 3. Animation
    const cells = document.querySelectorAll('.slot-cell');
    const photoBoxes = document.querySelectorAll('#teamSlide .team-photo-box');
    
    cells.forEach(cell => {
        cell.classList.add('spinning');
        cell.classList.remove('win');
    });

    const spinInterval = setInterval(() => {
        photoBoxes.forEach(box => {
            const randomImg = teamImages[Math.floor(Math.random() * teamImages.length)];
            box.style.backgroundImage = `url('${randomImg}')`;
        });
    }, 100);

    // 4. Outcome
    setTimeout(() => {
        clearInterval(spinInterval);

        const gridCells = Array.from(photoBoxes);
        let currentGridImages = new Array(gridCells.length).fill(null);

        if (isMaxWin) {
            const winImg = teamImages[Math.floor(Math.random() * teamImages.length)];
            currentGridImages.fill(winImg);
        } else {
            const forceWin = Math.random() < 0.4; 

            if (forceWin) {
                const lines = [
                    [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], 
                    [0, 5, 10], [1, 6, 11], [8, 5, 2], [9, 6, 3], 
                    [0, 5, 10, 11], [3, 6, 9, 8],
                    [0, 5, 2, 7], [4, 9, 6, 11], [4, 1, 6, 3], [8, 5, 10, 7],
                    [0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11],
                    [0, 3, 8, 11]
                ];
                const randomLine = lines[Math.floor(Math.random() * lines.length)];
                const winImg = teamImages[Math.floor(Math.random() * teamImages.length)];
                
                randomLine.forEach(idx => {
                    currentGridImages[idx] = winImg;
                });
            }

            for(let i=0; i < gridCells.length; i++) {
                if (!currentGridImages[i]) {
                    currentGridImages[i] = teamImages[Math.floor(Math.random() * teamImages.length)];
                }
            }
        }

        gridCells.forEach((box, index) => {
            if(currentGridImages[index]) {
                box.style.backgroundImage = `url('${currentGridImages[index]}')`;
            }
        });

        cells.forEach(cell => cell.classList.remove('spinning'));
        if(audio) {
            audio.pause();
            audio.currentTime = 0;
        }

        const winResult = checkWins(currentGridImages);
        
        if (isMaxWin) {
            cells.forEach(cell => cell.classList.add('win'));
            triggerWin(1000000, true);
        } else if (winResult.totalWin > 0) {
            winResult.winningIndices.forEach(idx => {
                if(cells[idx]) cells[idx].classList.add('win');
            });
            triggerWin(winResult.totalWin, false);
        }

        if(btn) btn.disabled = false;

    }, 2000);
}

function checkWins(gridImages) {
    const lines = [
        [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], 
        [0, 5, 10], [1, 6, 11], [8, 5, 2], [9, 6, 3], 
        [0, 5, 10, 11], [3, 6, 9, 8],
        [0, 5, 2, 7], [4, 9, 6, 11], [4, 1, 6, 3], [8, 5, 10, 7],
        [0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11],
        [0, 3, 8, 11]
    ];

    let totalWin = 0;
    let winningIndices = new Set();

    lines.forEach(line => {
        const lineImgs = line.map(idx => gridImages[idx]);
        if (lineImgs.length > 0) {
            const first = lineImgs[0];
            const allMatch = lineImgs.every(img => img === first);
            if (allMatch) {
                totalWin += 100 * line.length;
                line.forEach(idx => winningIndices.add(idx));
            }
        }
    });

    return { totalWin, winningIndices: Array.from(winningIndices) };
}

function triggerWin(amount, isMaxWin) {
    if (isMaxWin) {
        const jackpotAudio = document.getElementById('jackpotSound');
        if (jackpotAudio) {
            jackpotAudio.currentTime = 0; 
            jackpotAudio.play().catch(e => console.log("Jackpot audio error:", e));
        }
        document.body.classList.add('body-max-win');
        const frame = document.querySelector('.slot-machine-frame');
        if(frame) frame.classList.add('frame-max-win');
    } else {
        const winAudio = document.getElementById('winSound');
        if (winAudio) {
            winAudio.currentTime = 0;
            winAudio.play().catch(e => console.log("Win audio error:", e));
        }
    }

    const msg = document.getElementById('win-message');
    if(msg) {
        msg.style.display = 'block';
        
        if (isMaxWin) {
            msg.classList.add('text-max-win');
            const minWin = 1000;
            const maxWin = 100000000000000; 
            const finalAmount = Math.floor(Math.random() * (maxWin - minWin + 1)) + minWin;
            animateJackpotCounter(msg, finalAmount, 12000);
        } else {
            msg.classList.remove('text-max-win');
            msg.innerHTML = `WIN!<br><span style="font-size: 3rem; color: #fff; font-family: 'Monument Extended', sans-serif;">+${amount} $</span>`;
        }

        const explosion = document.getElementById('resurrection-explosion');
        if (explosion) {
            explosion.style.display = 'block';
            explosion.classList.add('explode-anim');
            setTimeout(() => {
                explosion.style.display = 'none';
                explosion.classList.remove('explode-anim');
            }, isMaxWin ? 5000 : 1000);
        }

        startMoneyRain(isMaxWin ? 500 : 50, isGold = isMaxWin);

        setTimeout(() => {
            msg.style.display = 'none';
            msg.classList.remove('text-max-win');
            document.body.classList.remove('body-max-win');
            const frame = document.querySelector('.slot-machine-frame');
            if(frame) frame.classList.remove('frame-max-win');
        }, isMaxWin ? 12000 : 3500); 
    }
}

function animateJackpotCounter(element, targetValue, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const current = Math.floor(progress * targetValue);
        const formatted = current.toLocaleString('ru-RU'); 
        
        element.innerHTML = `JACKPOT!<br><span style="font-size: 3rem; color: #fff;">+${formatted} $</span>`;

        if (progress < 1 && element.style.display !== 'none') {
            window.requestAnimationFrame(step);
        } else if (progress >= 1) {
             element.innerHTML = `JACKPOT!<br><span style="font-size: 3rem; color: #fff;">+${targetValue.toLocaleString('ru-RU')} $</span>`;
        }
    };
    window.requestAnimationFrame(step);
}

function startMoneyRain(count = 50, isGold = false) {
    const container = document.getElementById('money-rain-container');
    if(!container) return;

    for (let i = 0; i < count; i++) {
        const money = document.createElement('div');
        money.classList.add('money');

        if (isGold) {
            money.classList.add('gold');
            const emojis = ['💎', '👑', '💰', '🤑', '🏆'];
            money.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        } else {
            money.innerText = Math.random() > 0.5 ? '💵' : '💰';
        }

        money.style.left = Math.random() * 100 + 'vw';
        const duration = isGold ? (Math.random() * 1 + 1) : (Math.random() * 2 + 2);
        money.style.animationDuration = duration + 's';
        const size = isGold ? (Math.random() * 4 + 3) : (Math.random() * 2 + 1);
        money.style.fontSize = size + 'rem';

        container.appendChild(money);
        setTimeout(() => money.remove(), duration * 1000);
    }
}