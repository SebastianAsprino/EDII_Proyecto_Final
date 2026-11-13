const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const socketIo = require('socket.io');

const app = express();
const server = createServer(app);
const io = socketIo(server);

const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_DIR = join(__dirname, '../frontend');

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 500;
const INVINCIBILITY_DURATION_MS = 5000;
const PREPARATION_DURATION_MS = 10000;
const HIT_RADIUS = 18;
const MAX_USERNAME_LENGTH = 20;
const MAX_BULLET_SPEED = 10;
const TICK_MS = 1000 / 60;

const players = {};
let bullets = [];

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const isInsideCanvas = (x, y) => x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT;

const sanitizeUsername = (username) => {
  if (typeof username !== 'string') return '';
  return username.trim().slice(0, MAX_USERNAME_LENGTH);
};

/**
 * Quita la invencibilidad de un jugador tras `delay` ms,
 * siempre que siga conectado cuando el temporizador se dispare.
 */
const scheduleVulnerability = (playerId, delay) => {
  setTimeout(() => {
    if (!players[playerId]) return;
    players[playerId].invincible = false;
    io.emit('updateInvincibility', { id: playerId, invincible: false });
  }, delay);
};

app.use(express.static(FRONTEND_DIR));

app.get('/', (req, res) => {
  res.sendFile(join(FRONTEND_DIR, 'index.html'));
});

io.on('connection', (socket) => {
  socket.emit('requestUsername');

  socket.on('sendUsername', (rawUsername) => {
    const username = sanitizeUsername(rawUsername);
    if (!username) return;

    socket.username = username;

    const x = Math.random() * CANVAS_WIDTH;
    const y = Math.random() * CANVAS_HEIGHT;
    players[socket.id] = { username, x, y, angle: 0, invincible: true, points: 0 };

    socket.emit('welcome', { message: `Welcome to the game, ${username}!`, x, y });
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });
    socket.emit('existingPlayers', players);

    scheduleVulnerability(socket.id, PREPARATION_DURATION_MS);
  });

  socket.on('move', (movement) => {
    const player = players[socket.id];
    if (!player || player.invincible || !movement) return;

    const { x, y, angle } = movement;
    if (![x, y, angle].every(isFiniteNumber) || !isInsideCanvas(x, y)) return;

    player.x = x;
    player.y = y;
    player.angle = angle;

    io.emit('playerMoved', { id: socket.id, x, y, angle });
  });

  socket.on('shoot', (bullet) => {
    const player = players[socket.id];
    if (!player || player.invincible || !bullet) return;

    const { dx, dy } = bullet;
    if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) return;
    if (Math.hypot(dx, dy) > MAX_BULLET_SPEED + 1e-6) return;

    // La posición y el autor de la bala los decide el servidor, no el cliente.
    bullets.push({ x: player.x, y: player.y, dx, dy, id: socket.id });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    socket.broadcast.emit('playerDisconnected', socket.id);
  });
});

/**
 * Devuelve el id del primer jugador alcanzado por la bala, o null si no hay impacto.
 */
const findHitPlayer = (bullet) => {
  for (const playerId in players) {
    const player = players[playerId];
    if (player.invincible || bullet.id === playerId) continue;

    if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < HIT_RADIUS) {
      return playerId;
    }
  }
  return null;
};

const handleHit = (shooterId, playerId) => {
  const shooter = players[shooterId];
  if (shooter) {
    shooter.points += 1;
    io.emit('updatePoints', { id: shooterId, points: shooter.points });
  }

  const target = players[playerId];
  io.emit('playerRespawned', { id: playerId, x: target.x, y: target.y });
  target.invincible = true;
  scheduleVulnerability(playerId, INVINCIBILITY_DURATION_MS);
};

const updateBullets = () => {
  bullets = bullets.filter((bullet) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    const hitPlayerId = findHitPlayer(bullet);
    if (hitPlayerId) {
      handleHit(bullet.id, hitPlayerId);
      return false;
    }

    return isInsideCanvas(bullet.x, bullet.y);
  });

  io.emit('updateBullets', bullets);
};

setInterval(updateBullets, TICK_MS);

server.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
});
