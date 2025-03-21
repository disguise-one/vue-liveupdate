import { getServerMapping } from './mockConnections.js';
import { MockWebSocket } from './mockWebSocket.js';
import { EventEmitter } from 'events';

export class MockWebSocketServer extends EventEmitter {
    constructor() {
        super();
        this.clients = []; // Changed from object to array
        this.connectionDelay = 0;
    }

    // Binds the server to a specific URL
    bind(url) {
        const serverMapping = getServerMapping(globalThis);
        this.boundUrl = url;
        if (serverMapping[url]) {
            throw new Error("A server already bound to URL: " + url);
        }
        serverMapping[url] = this;
    }

    // Stops the server, freeing the URL
    stop() {
        const serverMapping = getServerMapping(globalThis);
        if (serverMapping[this.boundUrl] === this) {
            delete serverMapping[this.boundUrl];
        }
    }

    // Simulates a client connecting to the server
    connectClient(client) {
        const sendSocket = new MockWebSocket(null);
        sendSocket.other = client;
        client.other = sendSocket;

        // Store client and sendSocket as an object
        // In order to avoid affecting the lifetime of the client object,
        // we store it as a WeakRef.
        this.clients.push({ clientWeakRef: client, sendSocket });

        const clientWeakRef = this.clients[this.clients.length - 1].clientWeakRef;
        client._connectTimeout = setTimeout(() => {
            // It's possible the client has been destroyed before the connection delay
            if (clientWeakRef) {
                this.emit('connection', sendSocket); // Emit 'connection' event
                clientWeakRef._onOpen();
            }
        }, this.connectionDelay);
    }

    // Simulates a client disconnecting
    disconnectClient(client, code, reason) {
        const index = this.clients.findIndex(entry => entry.client === client);
        if (index !== -1) {
            const { sendSocket } = this.clients[index];
            sendSocket.close();
            this.clients.splice(index, 1); // Remove the client from the array
        }
    }
}