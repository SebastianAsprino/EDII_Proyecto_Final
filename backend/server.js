const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const socketIo = require('socket.io');

const app = express();
const server = createServer(app);
const io = socketIo(server);

const players = {};
const bullets = [];
const canvasWidth = 1270;
const canvasHeight = 720;
const invincibilityDuration = 5000; // 5 segundos para reaparición
const preparationDuration = 10000; // 10 segundos para preparación inicial

// Servir archivos estáticos desde la carpeta 'frontend'
app.use(express.static(join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../frontend', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  // Username
  socket.emit('requestUsername');

  // Listen for the username from the client
  socket.on('sendUsername', (username) => {
    console.log('Username received: ' + username);
    socket.username = username;

    // Assign a random position to the player
    const x = Math.random() * canvasWidth; 
    const y = Math.random() * canvasHeight;
    players[socket.id] = { username, x, y, angle: 0, invincible: true };

    // Player pos
    socket.emit('welcome', { message: `Welcome to the game, ${username}!`, x, y });

    // Notify other players about the new player
    socket.broadcast.emit('newPlayer', { id: socket.id, username, x, y, angle: 0, invincible: true });

    // Send existing players to the new player
    socket.emit('existingPlayers', players);

    // Handle invincibility timer
    setTimeout(() => {
      players[socket.id].invincible = false;
      io.emit('updateInvincibility', { id: socket.id, invincible: false });
    }, preparationDuration);
  });

  // Handle movement
  socket.on('move', (movement) => {
    if (players[socket.id] && !players[socket.id].invincible) {
      const player = players[socket.id];
      const newX = movement.x;
      const newY = movement.y;

      if (newX >= 0 && newX <= canvasWidth && newY >= 0 && newY <= canvasHeight) {
        players[socket.id].x = newX;
        players[socket.id].y = newY;
        players[socket.id].angle = movement.angle;

        // Notify all clients about the player's new position
        io.emit('playerMoved', { id: socket.id, x: newX, y: newY, angle: movement.angle });
      }
    }
  });

  // Handle shooting
  socket.on('shoot', (bullet) => {
    if (players[socket.id] && !players[socket.id].invincible) {
      bullets.push(bullet);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
    socket.broadcast.emit('playerDisconnected', socket.id);
  });
});

setInterval(() => {
  bullets.forEach((bullet, bulletIndex) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    for (const playerId in players) {
      const player = players[playerId];
      if (!player.invincible && bullet.id !== playerId) {
        const dist = Math.hypot(player.x - bullet.x, player.y - bullet.y);
        if (dist < 10) { // collision detected
          io.emit('playerRespawned', { id: playerId, x: player.x, y: player.y });
          players[playerId].invincible = true;
          setTimeout(() => {
            players[playerId].invincible = false;
            io.emit('updateInvincibility', { id: playerId, invincible: false });
          }, invincibilityDuration);

          bullets.splice(bulletIndex, 1);
          break;
        }
      }
    }

    if (bullet.x < 0 || bullet.x > canvasWidth || bullet.y < 0 || bullet.y > canvasHeight) {
      bullets.splice(bulletIndex, 1);
    }
  });

  io.emit('updateBullets', bullets);
}, 1000 / 60);

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
