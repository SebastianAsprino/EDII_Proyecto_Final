const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let players = {};
let myId;
const keysPressed = {};

socket.on('requestUsername', () => {
    const username = prompt('Please enter your username:');
    socket.emit('sendUsername', username);
});

socket.on('welcome', (data) => {
    myId = socket.id;
    document.getElementById('welcomeMessage').innerText = data.message;
    document.getElementById('gameOptions').style.display = 'block';
    startGame(data.x, data.y);
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
        drawPlayers();
    }
});

document.getElementById('startGameButton').addEventListener('click', () => {
    document.getElementById('gameOptions').style.display = 'none';
    canvas.style.display = 'block';
    window.addEventListener('keydown', handleMovement);
});

// Teclas
window.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true; // Marcar la tecla como presionada
    handleMovement(); // Actualizar el movimiento
});

window.addEventListener('keyup', (event) => {
    delete keysPressed[event.key]; // Eliminar la tecla de las teclas presionadas
    handleMovement(); // Actualizar el movimiento
});

function startGame(x, y) {
    players[socket.id] = { x, y };
    drawPlayers();
}

function drawPlayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const id in players) {
        const player = players[id];
        drawShip(player.x, player.y, player.username);
    }
}

function drawShip(x, y, username, dx, dy) {
    // No sirve xd
    const angle = Math.atan2(dy, dx);

    // Dibujar la nave
    ctx.save(); // Guardar el estado actual del contexto
    ctx.translate(x, y); // Mover el origen al centro de la nave
    ctx.rotate(angle); // Rotar el contexto según el ángulo de rotación, tampoco sirve joa
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, 20);
    ctx.lineTo(10, 20);
    ctx.closePath();
    ctx.fill();

    // Restaurar el estado del contexto
    ctx.restore();

    // Dibujar el nombre del jugador sobre la nave
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(username, x, y - 10);
}


function handleMovement() {
    const movement = { dx: 0, dy: 0 };
    const speed = 5;

    // Determinar la dirección del movimiento basada en las teclas presionadas
    if (keysPressed['ArrowUp']) {
        movement.dy -= speed;
    }
    if (keysPressed['ArrowDown']) {
        movement.dy += speed;
    }
    if (keysPressed['ArrowLeft']) {
        movement.dx -= speed;
    }
    if (keysPressed['ArrowRight']) {
        movement.dx += speed;
    }

    // Normalizar el movimiento diagonal para mantener la velocidad constante
    if ((keysPressed['ArrowUp'] || keysPressed['ArrowDown']) && (keysPressed['ArrowLeft'] || keysPressed['ArrowRight'])) {
        movement.dx *= 0.7071; // Dividir por la raíz cuadrada de 2 para mantener la velocidad constante en diagonales
        movement.dy *= 0.7071;
    }

    // Enviar el movimiento al servidor
    if (movement.dx !== 0 || movement.dy !== 0) {
        socket.emit('move', movement);
    }
}
