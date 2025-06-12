const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory lobby storage
const lobbies = new Map();

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // ensure uniqueness
  if (lobbies.has(code)) return generateCode();
  return code;
}

function broadcast(lobby, msg, exclude) {
  lobby.players.forEach((p) => {
    if (p !== exclude && p.readyState === WebSocket.OPEN) {
      p.send(JSON.stringify(msg));
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    switch (msg.type) {
      case 'createLobby':
        {
          const code = generateCode();
          const lobby = {
            code,
            host: ws,
            players: new Set([ws]),
            state: {},
          };
          lobbies.set(code, lobby);
          ws.lobby = lobby;
          ws.name = msg.name || 'Host';
          ws.send(JSON.stringify({ type: 'lobbyCreated', code }));
        }
        break;
      case 'joinLobby':
        {
          const lobby = lobbies.get(msg.code);
          if (!lobby) {
            ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
            break;
          }
          lobby.players.add(ws);
          ws.lobby = lobby;
          ws.name = msg.name || 'Player';
          ws.send(JSON.stringify({ type: 'joinedLobby', code: lobby.code, state: lobby.state }));
          broadcast(lobby, { type: 'playerJoined', name: ws.name }, ws);
        }
        break;
      case 'updateState':
        {
          const lobby = ws.lobby;
          if (!lobby) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not in a lobby' }));
            break;
          }
          lobby.state = msg.state;
          broadcast(lobby, { type: 'stateUpdate', state: lobby.state });
        }
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  });

  ws.on('close', () => {
    const lobby = ws.lobby;
    if (!lobby) return;

    lobby.players.delete(ws);
    if (ws === lobby.host) {
      // Close lobby if host disconnects
      broadcast(lobby, { type: 'lobbyClosed' }, ws);
      lobby.players.forEach((p) => p.close());
      lobbies.delete(lobby.code);
    } else {
      broadcast(lobby, { type: 'playerLeft', name: ws.name }, ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
