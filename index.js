const WebSocket = require('ws');
const MSG_TYPES = {
  JOIN: 'join',
  START: 'start',
  ACTION: 'action',
  EFFECT: 'effect',
  ERROR: 'error'
};

const PORT = process.env.PORT || 8081;
const wss = new WebSocket.Server({port: PORT});
console.log(`Websocket server running on port ${PORT}`);

const ClientWebSockets = {};
const WaitingPlayers = [];
const PairedClients = {};

wss.on('connection', function connection(ws, request) {
  ws.send('Hola senior!');
  const clientId = ws._socket._handle.fd;
  ClientWebSockets[clientId] = ws;
  ws.on('message', function incoming(message) {
    const msg = JSON.parse(message);
    console.log(`Client ${clientId} sent: ${msg.type}`);
    switch (msg.type) {
      case MSG_TYPES.JOIN:
        handleJoin(clientId);
        break;
      case MSG_TYPES.ACTION:
        handleAction(clientId, msg.data);
        break;
      case MSG_TYPES.EFFECT:
        handleEffect(clientId, msg.data);
        break;
      default:
        ws.send(error('Unrecognized message type'));
    }
  });
});

function handleJoin(clientId) {
  WaitingPlayers.push(clientId);
  if (WaitingPlayers.length >= 2) {
    startGame()
  }
}

function handleAction(clientId, action) {
  const pairedClientWs = getClientWebsocket(clientId);

  const actionMsg = {
    clientId: clientId,
    action: action
  };

  pairedClientWs.send(response(MSG_TYPES.ACTION, actionMsg));
}

function handleEffect(clientId, effect) {
  console.log(`sending effect to ${PairedClients[clientId]}`);
  const pairedClientWs = getClientWebsocket(clientId);

  const effectMsg = {
    clientId: clientId,
    effect: effect
  };

  pairedClientWs.send(response(MSG_TYPES.EFFECT, effectMsg));
}

function startGame() {
  let clientOneId = WaitingPlayers.pop();
  let clientTwoId = WaitingPlayers.pop();

  const initData = {
    startingPositions: {
      [clientOneId]: horizontalPosition(),
      [clientTwoId]: horizontalPosition()
    }
  };

  notifyClientOfGameStart(clientOneId, clientTwoId, initData);
  notifyClientOfGameStart(clientTwoId, clientOneId, initData);

  PairedClients[clientOneId] = clientTwoId;
  PairedClients[clientTwoId] = clientOneId;
}

function notifyClientOfGameStart(clientId, opponentClientId, initData) {
  let ws = ClientWebSockets[clientId];
  const resp = response(MSG_TYPES.START,
    {
      clientId: clientId,
      opponentClientId: opponentClientId,
      initData: initData
    });
  ws.send(resp);
}

function horizontalPosition() {
  return Math.floor((Math.random() * 6) + 1) * 100;
}

function getClientWebsocket(clientId) {
  const pairedClientId = PairedClients[clientId];
  return ClientWebSockets[pairedClientId];
}

const response = (type, data = {}) => {
  return JSON.stringify({
    type: type,
    data: data
  });
};

const error = (msg) => {
  return response(MSG_TYPES.ERROR, {msg: msg});
};
