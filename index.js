

const WebSocket = require('ws');

const port = process.env.PORT || 1337;

const wss = new WebSocket.Server({ port: port });
console.log("Server running at http://localhost:%d", port);


wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
    });

    ws.send('Hello Client! from Server <3');
});

