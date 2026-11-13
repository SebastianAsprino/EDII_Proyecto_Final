# Barcos PvP

Juego multijugador en tiempo real de batallas navales para el navegador. Cada jugador controla un
barco, se mueve por el mapa y dispara a los demás; cada impacto suma un punto al tirador. Proyecto
final del curso de Estructuras de Datos II.

## Características

- Partidas multijugador en tiempo real con [Socket.IO](https://socket.io/).
- Servidor autoritativo: el servidor valida los movimientos, crea las balas a partir de la posición
  real del jugador y resuelve las colisiones a 60 ticks por segundo.
- Fase de preparación de 10 segundos al entrar y 5 segundos de invencibilidad tras recibir un impacto.
- Marcador de puntos en vivo y nombre de cada jugador sobre su barco.
- Música de fondo y sprites propios.

## Controles

| Tecla       | Acción                        |
| ----------- | ----------------------------- |
| Flechas     | Mover el barco (8 direcciones) |
| Barra espaciadora | Disparar en la dirección del barco |

## Stack

- **Backend:** Node.js, Express (archivos estáticos) y Socket.IO (eventos en tiempo real).
- **Frontend:** HTML, CSS y JavaScript sin frameworks, dibujado sobre `<canvas>`.

## Estructura

```
.
├── backend/
│   ├── package.json     # Dependencias y scripts del servidor
│   └── server.js        # Servidor HTTP + Socket.IO: estado de jugadores, balas y colisiones
└── frontend/
    ├── index.html       # Pantalla de inicio y canvas del juego
    ├── index.css        # Estilos
    ├── index.js         # Cliente: entrada de teclado, render y comunicación con el servidor
    └── sources/         # Sprites, fondos y música
```

### Flujo de eventos

1. Al conectarse, el servidor pide un nombre (`requestUsername`) y el cliente lo envía (`sendUsername`).
2. El servidor ubica al barco en una posición aleatoria y notifica a todos (`welcome`, `newPlayer`,
   `existingPlayers`).
3. El cliente envía `move` y `shoot`; el servidor valida, actualiza el estado y difunde
   `playerMoved` y `updateBullets` en cada tick.
4. Si una bala impacta, el servidor emite `updatePoints`, `playerRespawned` y, al terminar la
   invencibilidad, `updateInvincibility`.

## Ejecución local

Requisitos: Node.js 18 o superior.

```bash
cd backend
npm install
npm start
```

Luego abrí <http://localhost:3000> en dos o más pestañas para jugar. El puerto se puede cambiar con
la variable de entorno `PORT` (por ejemplo `PORT=8080 npm start`).

Para verificar la sintaxis de servidor y cliente sin levantar el juego: `npm run check`.
