import { getServerMapping } from './mockConnections.js';
import EventEmitter from 'events'; // Import EventEmitter

let nextSocketId = 0;

export class MockWebSocket extends EventEmitter {
    constructor(url, protocols=null) {
        super(); // Call EventEmitter constructor
        this.id = nextSocketId++; // Assign a unique ID to help with debugging
        this.url = url;
        this.protocols = protocols;

        this._connectTimeout = null; // If CONNECTING, this is the timeout for OPEN

        this.onopen = null; // Initialize onopen
        this.onmessage = null; // Initialize onmessage
        this.onclose = null; // Initialize onclose
        this.onerror = null; // Initialize onerror
        if (url === null) {
            // This is a server-response socket.
            this.readyState = MockWebSocket.OPEN;
            this.connectedServer = null; // No server for server-response sockets
        }
        else
        {
            this.readyState = MockWebSocket.CONNECTING;
            this.connectedServer = getServerMapping(globalThis)[url];
            this.connectedServer.connectClient(this);
        }
    }

    _onOpen() {
        this.readyState = MockWebSocket.OPEN;

        const openEvent = new Event('open');
        this.emit('open', openEvent); // Emit 'open' event
        if (this.onopen) {
            this.onopen(openEvent);
        }
    }

    _onError() {
        const errorEvent = new Event('error');
        this.emit('error', errorEvent); // Emit 'error' event
        if (this.onerror) {
            this.onerror(errorEvent); // Call onerror if defined
        }
    }

    _receiveMessage(message) {
        if (this.readyState === MockWebSocket.OPEN) {
            const messageEvent = new MessageEvent('message', {
                 data: message,
                  origin: this.connectedServer?.boundUrl || ''
            });
            this.emit('message', messageEvent); // Emit 'message' event
            if (this.onmessage) {
                this.onmessage(messageEvent); // Call onmessage if defined
            }
        }
    }

    send(message) {
        if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error('WebSocket is not open');
        }

        if (this.other) {
            this.other._receiveMessage(message);
        }
    }

    close(code = 1000, reason = null) {
        if (this.readyState === MockWebSocket.CONNECTING) {
            if (this._connectTimeout) {
                clearTimeout(this._connectTimeout);
            }            
        } else if (this.readyState === MockWebSocket.OPEN) {
            if (this.connectedServer) {
                this.connectedServer.disconnectClient(this, code, reason);
                this.connectedServer = null;
            }

            const closeEvent = new CloseEvent('close', {
                 code: code,
                 reason: reason || 'Server disconnect',
                 wasClean: true
            });
            this.emit('close', closeEvent); // Emit 'close' event
            if (this.onclose) {
                this.onclose(closeEvent); // Call onclose if defined
            }
        }

        this.readyState = MockWebSocket.CLOSED;
    }

    addEventListener(event, callback) {
        this.on(event, callback); // Use EventEmitter's 'on' method
    }

    removeEventListener(event, callback) {
        this.off(event, callback); // Use EventEmitter's 'off' method
    }

    emit(event, ...args) {
        super.emit(event, ...args); // Emit event using EventEmitter
        if (event === 'error' && this.onerror) {
            this.onerror(...args); // Call onerror if defined
        }
    }
}

// Mock WebSocket constants
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// Patch the global WebSocket
window.WebSocket = MockWebSocket;
