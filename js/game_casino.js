// ==========================================
// НАСТРОЙКИ И ПЕРЕМЕННЫЕ
// ==========================================

let casinoClickCount = 0;

// Список картинок
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
    'images/pudge.png',
    'images/sf.png' 
];

// Предзагрузка
teamImages.forEach(src => {
    const img = new Image();
    img.src = src;
});

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ: PLAY CASINO
// ==========================================
function playCasino() {
    const btn = document.getElementById('casinoBtn');
    
    // Блокируем кнопку
    if(btn) {
        btn.disabled = true;
        btn.innerText = "КРУТИМ...";
    }
    
    casinoClickCount++;
    // Каждый 5-й раз — гарантированный ДЖЕКПОТ (все ячейки одинаковые)
    const isMaxWin = (casinoClickCount % 5 === 0); 

    // 1. Сброс
    const cells = document.querySelectorAll('.slot-cell');
    const photoBoxes = document.querySelectorAll('#mode-casino .team-photo-box');
    
    cells.forEach(cell => {
        cell.classList.remove('win');
        cell.classList.add('spinning');
    });
    
    // Скрываем старые сообщения
    const msg = document.getElementById('win-message');
    if(msg) msg.style.display = 'none';
    document.body.classList.remove('body-max-win');
    const frame = document.querySelector('.slot-machine-frame');
    if(frame) frame.classList.remove('frame-max-win');

    // 2. Звук и Эффекты
    playSound('casinoSound');
    document.body.classList.add('casino-shake');
    setTimeout(() => document.body.classList.remove('casino-shake'), 500);

    // 3. Визуальная прокрутка
    const spinInterval = setInterval(() => {
        photoBoxes.forEach(box => {
            const randomImg = teamImages[Math.floor(Math.random() * teamImages.length)];
            box.style.backgroundImage = `url('${randomImg}')`;
        });
    }, 80);

    // 4. ОСТАНОВКА И РЕЗУЛЬТАТ (через 2 секунды)
    setTimeout(() => {
        clearInterval(spinInterval);
        cells.forEach(cell => cell.classList.remove('spinning'));

        const gridCells = Array.from(photoBoxes);
        // Массив для итоговых картинок
        let currentGridImages = new Array(gridCells.length).fill(null);

        // --- ЛОГИКА ГЕНЕРАЦИИ (Подкрутка) ---
        if (isMaxWin) {
            // МАКС ВИН: Абсолютно все ячейки одинаковые
            const winImg = teamImages[Math.floor(Math.random() * teamImages.length)];
            currentGridImages.fill(winImg);
        } else {
            // ОБЫЧНЫЙ СПИН: 40% шанс собрать ЦЕЛУЮ ЛИНИЮ
            const forceWin = Math.random() < 0.4; 

            if (forceWin) {
                // Линии теперь ТОЛЬКО полные (по 6 штук)
                const fullRows = [
                    [0, 1, 2, 3, 4, 5],       // Верхний ряд целиком
                    [6, 7, 8, 9, 10, 11],     // Средний ряд целиком
                    [12, 13, 14, 15, 16, 17]  // Нижний ряд целиком
                ];
                
                // Выбираем случайный ряд
                const randomLine = fullRows[Math.floor(Math.random() * fullRows.length)];
                const winImg = teamImages[Math.floor(Math.random() * teamImages.length)];
                
                // Заполняем ВЕСЬ ряд одной картинкой
                randomLine.forEach(idx => {
                    if(idx < currentGridImages.length) currentGridImages[idx] = winImg;
                });
            }

            // Остальные пустые ячейки заполняем рандомом
            for(let i=0; i < gridCells.length; i++) {
                if (!currentGridImages[i]) {
                    currentGridImages[i] = teamImages[Math.floor(Math.random() * teamImages.length)];
                }
            }
        }

        // --- ОТРИСОВКА ---
        gridCells.forEach((box, index) => {
            if(currentGridImages[index]) {
                box.style.backgroundImage = `url('${currentGridImages[index]}')`;
            }
        });

        // Стоп звук спина
        const audio = document.getElementById('casinoSound');
        if(audio) { audio.pause(); audio.currentTime = 0; }

        // --- ПРОВЕРКА ПОБЕД ---
        if (isMaxWin) {
            cells.forEach(cell => cell.classList.add('win'));
            triggerWin(5000000, true);
        } else {
            // Проверяем честно
            const winResult = checkWins(currentGridImages);
            
            if (winResult.totalWin > 0) {
                winResult.winningIndices.forEach(idx => {
                    if(cells[idx]) cells[idx].classList.add('win');
                });
                triggerWin(winResult.totalWin, false);
            }
        }

        // Возвращаем кнопку
        if(btn) {
            btn.disabled = false;
            btn.innerText = "🎰 ДЕПАТЬ 🎰";
        }

    }, 2000);
}

// ==========================================
// ЛОГИКА ПОДСЧЕТА ПОБЕД (ИСПРАВЛЕННАЯ)
// ==========================================
function checkWins(gridImages) {
    // ВАЖНО: Здесь определяем, что считается победой.
    // Оставляем ТОЛЬКО полные ряды (6 из 6).
    
    const lines = [
        [0, 1, 2, 3, 4, 5],        // Ряд 1 (Верхний)
        [6, 7, 8, 9, 10, 11],      // Ряд 2 (Средний, активный)
        [12, 13, 14, 15, 16, 17]   // Ряд 3 (Нижний)
    ];

    let totalWin = 0;
    let winningIndices = new Set();

    lines.forEach(line => {
        // Берем картинки по индексам линии
        const lineImgs = line.map(idx => gridImages[idx]);
        
        // Проверяем: есть ли картинки и ВСЕ ли они равны первой
        if (lineImgs.length > 0) {
            const first = lineImgs[0];
            const allMatch = lineImgs.every(img => img === first);
            
            if (allMatch) {
                // Если весь ряд совпал - победа
                totalWin += 1000; // Большая сумма за полный ряд
                line.forEach(idx => winningIndices.add(idx));
            }
        }
    });

    return { totalWin, winningIndices: Array.from(winningIndices) };
}

// ==========================================
// ЭФФЕКТЫ (Без изменений, только вспомогательные функции)
// ==========================================

function triggerWin(amount, isMaxWin) {
    if (isMaxWin) {
        playSound('jackpotSound');
        document.body.classList.add('body-max-win');
        const frame = document.querySelector('.slot-machine-frame');
        if(frame) frame.classList.add('frame-max-win');
    } else {
        playSound('winSound');
    }

    const msg = document.getElementById('win-message');
    if(msg) {
        msg.style.display = 'block';
        
        if (isMaxWin) {
            msg.classList.add('text-max-win');
            animateJackpotCounter(msg, amount, 5000);
        } else {
            msg.classList.remove('text-max-win');
            // Обычная победа
            msg.innerHTML = `<div style="font-size: 3rem; color: #fff; text-shadow: 0 0 10px #000;">LINE HIT!</div>
                             <div style="font-size: 5rem; color: #C6FF00; font-weight: 900; text-shadow: 0 0 20px #000;">+${amount} $</div>`;
            
            setTimeout(() => { msg.style.display = 'none'; }, 2500);
        }
    }

    const explosion = document.getElementById('resurrection-explosion');
    if (explosion) {
        explosion.style.display = 'block';
        explosion.classList.add('explode-anim');
        setTimeout(() => {
            explosion.style.display = 'none';
            explosion.classList.remove('explode-anim');
        }, 1500);
    }

    startMoneyRain(isMaxWin ? 300 : 50, isMaxWin);
}

function animateJackpotCounter(element, targetValue, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * targetValue);
        const formatted = current.toLocaleString('ru-RU'); 
        
        element.innerHTML = `<div style="font-size: 3rem; color: red; text-shadow: 0 0 10px #fff;">JACKPOT</div>
                             <div style="font-size: 5rem; color: #fff; font-weight: 900;">$ ${formatted}</div>`;

        if (progress < 1 && element.style.display !== 'none') {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function startMoneyRain(count, isGold) {
    const container = document.getElementById('money-rain-container');
    if(!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const money = document.createElement('div');
        money.classList.add('money');
        if(isGold) money.classList.add('gold');
        money.innerText = isGold ? ['💎','🏆','💰'][Math.floor(Math.random()*3)] : '💵';
        money.style.left = Math.random() * 100 + 'vw';
        money.style.animationDuration = (Math.random() * 2 + 2) + 's';
        money.style.fontSize = (Math.random() * 2 + 2) + 'rem';
        container.appendChild(money);
    }
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play prevented:", e));
    }
}