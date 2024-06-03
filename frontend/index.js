const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let players = {};
let bullets = [];
let myId;
const keysPressed = {};
const invincibilityDuration = 5000; // 5 segundos para reaparición
const preparationDuration = 10000; // 10 segundos para preparación inicial


socket.on('requestUsername', () => {
    document.getElementById('gameOptions').style.display = 'block';
});

document.getElementById('startGameButton').addEventListener('click', () => {
    const username = document.getElementById('playerName').value;
    if (username) {
        socket.emit('sendUsername', username);
        document.getElementById('gameOptions').style.display = 'none';
    } else {
        alert('Please enter a username.');
    }
});

socket.on('welcome', (data) => {
    myId = socket.id;
    document.getElementById('welcomeMessage').innerText = data.message;
    startGame(data.x, data.y, true);
});

socket.on('newPlayer', (player) => {
    players[player.id] = player;
    drawPlayers();
});

socket.on('existingPlayers', (existingPlayers) => {
    players = existingPlayers;
    drawPlayers();
});

socket.on('playerDisconnected', (id) => {
    delete players[id];
    drawPlayers();
});

socket.on('playerMoved', (player) => {
    if (players[player.id]) {
        players[player.id].x = player.x;
        players[player.id].y = player.y;
        players[player.id].angle = player.angle;
        drawPlayers();
    }
});

socket.on('bulletShot', (bullet) => {
    bullets.push(bullet);
});

socket.on('updateBullets', (serverBullets) => {
    bullets = serverBullets;
    drawPlayers();
});

socket.on('playerRespawned', (player) => {
    if (players[player.id]) {
        players[player.id].x = player.x;
        players[player.id].y = player.y;
        players[player.id].invincible = true;
        setTimeout(() => {
            players[player.id].invincible = false;
            socket.emit('updateInvincibility', { id: player.id, invincible: false });
        }, invincibilityDuration);
        drawPlayers();
    }
});

socket.on('updateInvincibility', (data) => {
    if (players[data.id]) {
        players[data.id].invincible = data.invincible;
        drawPlayers();
    }
});

socket.on('updatePoints', (data) => {
    if (players[data.id]) {
        players[data.id].points = data.points;
        document.getElementById('points').innerText = `Points: ${players[myId].points}`;
    }
});

document.getElementById('startGameButton').addEventListener('click', () => {
    document.getElementById('gameOptions').style.display = 'none';
    canvas.style.display = 'block';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
});

function handleKeyDown(event) {
    if (players[socket.id] && !players[socket.id].invincible) {
        keysPressed[event.key] = true;
        handleMovement();
        if (event.key === ' ') {
            shoot();
        }
    }
}

function handleKeyUp(event) {
    if (players[socket.id] && !players[socket.id].invincible) {
        delete keysPressed[event.key];
        handleMovement();
    }
}

function startGame(x, y, isFirstTime) {
    players[socket.id] = { x, y, angle: 0, invincible: isFirstTime, points: 0 };
    drawPlayers();
    if (isFirstTime) {
        let countdown = preparationDuration / 1000;
        const countdownInterval = setInterval(() => {
            countdown -= 1;
            document.getElementById('welcomeMessage').innerText = `Game starts in ${countdown} seconds!`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                players[socket.id].invincible = false;
                socket.emit('updateInvincibility', { id: socket.id, invincible: false });
                document.getElementById('welcomeMessage').innerText = '';
            }
            drawPlayers();
        }, 1000);
    }
}

function drawPlayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const id in players) {
        const player = players[id];
        drawShip(player.x, player.y, player.username, player.angle, player.invincible);
    }

    bullets.forEach((bullet) => {
        drawBullet(bullet.x, bullet.y);
    });

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    let yOffset = 20;
    for (const id in players) {
    const player = players[id];
    ctx.fillText(`${player.username}: ${player.points} points`, 10, yOffset);
    yOffset += 20;
}
}

function drawShip(x, y, username, angle, invincible) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = invincible ? 'rgba(0, 0, 255, 0.5)' : 'blue';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-10, 10);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(username, x, y - 20);
}

function drawBullet(x, y) {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
}

function handleMovement() {
    const player = players[socket.id];
    if (!player || player.invincible) return;

    const movement = { dx: 0, dy: 0, angle: player.angle };
    const speed = 3;

    if (keysPressed['ArrowUp']) {
        movement.dy -= speed;
        movement.angle = 0;
    }
    if (keysPressed['ArrowDown']) {
        movement.dy += speed;
        movement.angle = Math.PI;
    }
    if (keysPressed['ArrowLeft']) {
        movement.dx -= speed;
        movement.angle = -Math.PI / 2;
    }
    if (keysPressed['ArrowRight']) {
        movement.dx += speed;
        movement.angle = Math.PI / 2;
    }

    if ((keysPressed['ArrowUp'] || keysPressed['ArrowDown']) && (keysPressed['ArrowLeft'] || keysPressed['ArrowRight'])) {
        movement.dx *= 0.7071;
        movement.dy *= 0.7071;
        if (keysPressed['ArrowUp'] && keysPressed['ArrowLeft']) movement.angle = -Math.PI / 4;
        if (keysPressed['ArrowUp'] && keysPressed['ArrowRight']) movement.angle = Math.PI / 4;
        if (keysPressed['ArrowDown'] && keysPressed['ArrowLeft']) movement.angle = -3 * Math.PI / 4;
        if (keysPressed['ArrowDown'] && keysPressed['ArrowRight']) movement.angle = 3 * Math.PI / 4;
    }

    const newX = player.x + movement.dx;
    const newY = player.y + movement.dy;

    if (newX >= 0 && newX <= canvas.width && newY >= 0 && newY <= canvas.height) {
        players[socket.id].x = newX;
        players[socket.id].y = newY;
        players[socket.id].angle = movement.angle;
        socket.emit('move', { x: newX, y: newY, angle: movement.angle });
    }
}

function shoot() {
    const player = players[socket.id];
    if (player && !player.invincible) {
        const bullet = {
            x: player.x,
            y: player.y,
            dx: Math.cos(player.angle) * 10,
            dy: Math.sin(player.angle) * 10,
            id: socket.id,
        };
        socket.emit('shoot', bullet);
    }
}

function gameLoop() {
    handleMovement();
    drawPlayers();
    requestAnimationFrame(gameLoop);
}

gameLoop();
