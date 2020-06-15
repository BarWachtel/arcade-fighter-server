const WebSocket = require('ws');
const MessageTypes = {
  Join: 'Join',
  Start: 'Start',
  Action: 'Action',
  Effect: 'Effect',
  LatencyAdjustment: 'LatencyAdjustment',
  Error: 'Error'
};

const PORT = process.env.PORT || 8081;
const wss = new WebSocket.Server({port: PORT});
console.log(`Websocket server running on port ${PORT}`);

const ClientWebSockets = {};
const WaitingPlayers = [];
const PairedClients = {};

wss.on('connection', function connection(ws, request) {
  const clientId = ws._socket._handle.fd;
  ClientWebSockets[clientId] = ws;
  ws.on('message', function incoming(message) {
    const msg = JSON.parse(message);
    console.log(`Client ${clientId} sent: ${msg.type}`);
    switch (msg.type) {
      case MessageTypes.Join:
        handleJoin(clientId);
        break;
      case MessageTypes.Action:
        handleAction(clientId, msg.data);
        break;
      case MessageTypes.Effect:
        handleEffect(clientId, msg.data);
        break;
      case MessageTypes.LatencyAdjustment:
        handleLatencyAdjust(clientId, msg.data);
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

function handleAction(clientId, actionData) {
  const actionMsg = {
    clientId: clientId,
    action: actionData
  };

  relayMessageToPairedClient(clientId, response(MessageTypes.Action, actionMsg));
}

function handleEffect(clientId, effectData) {
  const effectMsg = {
    clientId: clientId,
    effect: effectData
  };

  relayMessageToPairedClient(clientId, response(MessageTypes.Effect, effectMsg));
}

function handleLatencyAdjust(clientId, latencyAdjustmentData) {
  const latencyAdjustmentMsg = {
    clientId: clientId,
    data: latencyAdjustmentData
  };

  relayMessageToPairedClient(clientId, response(MessageTypes.LatencyAdjustment, latencyAdjustmentMsg));
}

function relayMessageToPairedClient(clientId, msg) {
  console.log(`sending msg to ${PairedClients[clientId]}`);
  const pairedClientWs = getClientWebsocket(clientId);
  pairedClientWs.send(msg);

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
  const resp = response(MessageTypes.Start,
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
  return response(MessageTypes.Error, {msg: msg});
};
