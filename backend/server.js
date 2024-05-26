const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const socketIo = require('socket.io');

const app = express();
const server = createServer(app);
const io = socketIo(server);

const players = {};

// Servir archivos estáticos desde la carpeta 'frontend'
app.use(express.static(join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../frontend', 'index.html'));
});



io.on('connection', (socket) => {
  console.log('A user connected');

 //Username
  socket.emit('requestUsername');

  // Listen for the username from the client
  socket.on('sendUsername', (username) => {
    console.log('Username received: ' + username);
    socket.username = username;

    // Assign a random position to the player
    const x = Math.random() * 1270; 
    const y = Math.random() * 720;
    players[socket.id] = { username, x, y };

    // Player pos
    socket.emit('welcome', { message: `Welcome to the game, ${username}!`, x, y });

    // Notify other players about the new player
    socket.broadcast.emit('newPlayer', { id: socket.id, username, x, y });

    // Send existing players to the new player
    socket.emit('existingPlayers', players);
  });

  // Handle movement
  socket.on('move', (movement) => {
    if (players[socket.id]) {
      players[socket.id].x += movement.dx;
      players[socket.id].y += movement.dy;

      // Notify all clients about the player's new position
      io.emit('playerMoved', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
    socket.broadcast.emit('playerDisconnected', socket.id);
  });
});


server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
