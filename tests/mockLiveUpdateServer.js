import { get } from '@vueuse/core';
import { EventEmitter } from 'events';
import { MockWebSocketServer } from './mock-ws/mockWebSocketServer';

export function createMockLiveUpdateServer(objects) {
    const mockServer = new MockWebSocketServer();
    mockServer.bind('ws://localhost/api/session/liveupdate');
    const eventEmitter = new EventEmitter(); // Create an event emitter
    let nextId = 0; // Start IDs from 0 and are global across connections

    function getProperty(objectPath, propertyPath) {
        const object = get(objects, objectPath);
        if (!object) {
            return null;
        }

        return get(object, propertyPath);
    }

    function setProperty(objectPath, propertyPath, value) {
        const object = get(objects, objectPath);
        if (!object) {
            throw new Error(`Object '${objectPath}' not found`);
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const originalValue = object[propertyPath] || {};
            if (typeof originalValue === 'object' && originalValue !== null && !Array.isArray(originalValue)) {
                value = { ...originalValue, ...value };
            }
        }

        return object[propertyPath] = value;
    }

    mockServer.simulateChange = (objectPath, propertyPath, value) => {
        if (getProperty(objectPath, propertyPath) === value) {
            return;
        }

        // Set the new value (updating it if it's a partial set)
        value = setProperty(objectPath, propertyPath, value);

        // Emit the event with the change details
        eventEmitter.emit('valueChanged', objectPath, propertyPath, value);
    };

    mockServer.on('connection', (socket) => {
        const subscriptions = {}; // key -> { id, objectPath, propertyPath, subscriptionCount }

        function sendSubscriptions() {
            socket.send(
                JSON.stringify({
                    subscriptions: Object.values(subscriptions).map(({ id, objectPath, propertyPath }) => ({
                        id,
                        objectPath,
                        propertyPath,
                    })),
                })
            );
        }

        function onValueChanged(objectPath, propertyPath, value) {
            const subscription = Object.values(subscriptions).find(
                (subscription) => subscription.objectPath === objectPath && subscription.propertyPath === propertyPath
            );
            if (subscription) {
                socket.send(
                    JSON.stringify({
                        valuesChanged: [
                            {
                                id: subscription.id,
                                value,
                            },
                        ],
                    })
                );
            }
        }

        eventEmitter.on('valueChanged', onValueChanged);

        socket.on('message', ({data}) => {
            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch (err) {
                throw new Error(`Error parsing data: ${data}`);
            }

            if (parsed.subscribe) {
                const { object, properties } = parsed.subscribe;

                properties.forEach((propertyPath) => {
                    const key = `${object}:${propertyPath}`;
                    if (!getProperty(object, propertyPath)) {
                        socket.send(
                            JSON.stringify({
                                error: `propertyPath '${propertyPath}' not found`,
                            })
                        );
                        return;
                    }

                    if (!subscriptions[key]) {
                        subscriptions[key] = {
                            id: nextId++,
                            subscriptionCount: 0,
                            objectPath: object,
                            propertyPath,
                        };
                    }
                    subscriptions[key].subscriptionCount++;
                });

                sendSubscriptions();

                // Wait a few milliseconds before sending the values
                // This seems to be a mock-socket issue where the messages will be received out of order..
                // Note we only send values for successful subscriptions!
                // Unsuccessful subscriptions will receive an error message.
                setTimeout(() => {
                    socket.send(
                        JSON.stringify({
                            valuesChanged: properties
                                .filter((propertyPath) => subscriptions[`${object}:${propertyPath}`] != undefined)
                                .map((propertyPath) => ({
                                    id: subscriptions[`${object}:${propertyPath}`].id,
                                    value: getProperty(object, propertyPath)
                                }))
                        })
                    );
                }, 10);
            }

            if (parsed.unsubscribe) {
                const { ids } = parsed.unsubscribe;
                Object.keys(subscriptions).forEach((key) => {
                    if (ids.includes(subscriptions[key].id)) {
                        subscriptions[key].subscriptionCount--;
                        if (subscriptions[key].subscriptionCount <= 0) {
                            delete subscriptions[key];
                        }
                    }
                    else {
                        // Would be an error response in real server.
                        throw new Error(`Subscription with ID ${id} not found`);
                    }
                });

                sendSubscriptions();
            }

            if (parsed.set) {
                parsed.set.forEach(({ id, value }) => {
                    const subscription = Object.values(subscriptions).find((subscription) => subscription.id === id);
                    if (subscription) {
                        mockServer.simulateChange(subscription.objectPath, subscription.propertyPath, value);
                    } else {
                        throw new Error(`Subscription with ID ${id} not found`);
                    }
                });
            }
        });

        socket.on('close', () => {
            // Remove the listener for this connection when it closes
            eventEmitter.off('valueChanged', onValueChanged);
        });
    });

    return mockServer;
}
