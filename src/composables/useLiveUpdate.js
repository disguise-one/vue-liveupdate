// useLiveUpdate.js
import { computed, onUnmounted, ref, reactive, watch } from 'vue'
import { useWebSocket } from '@vueuse/core'

/**
 * Initializes the live update system with a WebSocket connection.
 * @param {string} director - The WebSocket endpoint (director) to connect to.
 * @returns {Object} - The live update API including status, subscribe, autoSubscribe, and debugInfo.
 */
export function useLiveUpdate(director) {
    if (!director) {
        console.error("Error: 'director' parameter is required.");
        throw new Error("'director' parameter is required.");
    }

    // Initialize the WebSocket connection & provide reactive data.
    const socketUrl = `ws://${director}/api/session/liveupdate`;
    const { status, data, send, open, ws } = useWebSocket(socketUrl, {
        autoConnect: false
    });

    const connectionUserInfo = ref('');
    function installWsEventHandlers(ws) {
        ws.addEventListener('error', (ev) => {
            // Usually immediately followed by a close event.
            // This event contains no information about the error.
            connectionUserInfo.value = 'WebSocket error';
        });
        ws.addEventListener('close', (ev) => {
            // Provide information about the close reason code
            let reason = {
                1000: 'Normal closure',
                1001: 'Going away',
                1002: 'Protocol error',
                1003: 'Unsupported data',
                1005: 'No status code',
                1006: 'Could not establish connection',
                1007: 'Invalid data',
                1008: 'Policy violation',
                1009: 'Message too big',
                1010: 'Extension required',
                1011: 'Internal error',
                1015: 'TLS handshake'
            }[ev.code] || ev.code;
            connectionUserInfo.value = reason;
            //setTimeout(reconnect, 5000);
        });
    }
    watch(ws, installWsEventHandlers);
    watch(status, (newStatus) => {
        if (newStatus === 'OPEN') {
            // Resubscribe to all subscriptions when the connection is re-established.
            // group by objectPath.
            const objectPathToProperties = {};
            subscriptions.value.forEach((sub) => {
                if (!objectPathToProperties[sub.objectPath]) {
                    objectPathToProperties[sub.objectPath] = [];
                }
                objectPathToProperties[sub.objectPath].push(sub.propertyPath);
            });
            for (const [objectPath, propertyPaths] of Object.entries(objectPathToProperties)) {
                innerSubscribe(objectPath, propertyPaths);
            }
        }
    });
    
    function reconnect() {
        open();
    };

    installWsEventHandlers(ws.value);

    // Reactive data for the live update system.
    const subscriptions = ref([]);
    const keyToValue = reactive({});
    const keyToId = {};
    const idToKey = {};

    function innerSubscribe(objectPath, properties) {
        const msg = {
            subscribe: {
                object: objectPath,
                properties
            }
        };
        send(JSON.stringify(msg));
    }

    function subscribe(objectPath, refNameToPropertyPaths) {
        const properties = Object.values(refNameToPropertyPaths);
        innerSubscribe(objectPath, properties);

        const keys = [];
        const computedValues = {};
        for (const [refName, propertyPath] of Object.entries(refNameToPropertyPaths)) {
            const key = `${objectPath}/${propertyPath}`;
            keys.push(key);

            let frozenValue = null;
            const accessor = computed({
                get: () => frozenValue ?? keyToValue[key],
                set: (newValue) => {
                    const id = keyToId[key];
                    if (id) {
                        setValues([{ id, value: newValue }]);
                    }
                }
            });
            accessor.isFrozen = () => frozenValue !== null;
            accessor.freeze = () => {
                if (frozenValue !== null) return;
                frozenValue = keyToValue[key];
                unsubscribe([key]);
            };
            accessor.thaw = () => {
                if (frozenValue === null) return;
                frozenValue = null;
                innerSubscribe(objectPath, [propertyPath]);
            };
            computedValues[refName] = accessor;
        }

        onUnmounted(() => {
            unsubscribe(keys);
        });
        return computedValues;
    }

    function autoSubscribe(objectPath, propertyPaths) {
        const refNameToPropertyPaths = {};
        propertyPaths.forEach((propertyPath) => {
            const sanitizedPropertyPath = propertyPath.startsWith('object.') 
                ? propertyPath.slice(7) 
                : propertyPath;
            const refName = sanitizedPropertyPath.replace(/\./g, '_');
            refNameToPropertyPaths[refName] = propertyPath;
        });
        return subscribe(objectPath, refNameToPropertyPaths);
    }

    function unsubscribe(keys) {
        const ids = [];
        keys.forEach((key) => {
            const id = keyToId[key];
            if (id !== undefined) {
                ids.push(id);
            }
        });
        if (ids.length > 0) {
            const msg = { unsubscribe: { ids } };
            send(JSON.stringify(msg));
        }
    }

    function setValues(newValues) {
        const setMessages = [];
        newValues.forEach(({ id, value }) => {
            setMessages.push({ id, value });
        });
        if (setMessages.length > 0) {
            const msg = { set: setMessages };
            send(JSON.stringify(msg));
        }
    }

    watch(data, (newMessage) => {
        if (!newMessage) return;

        let parsed;
        try {
            parsed = JSON.parse(newMessage);
        } catch (err) {
            console.error("Error parsing Live Update message:", newMessage);
            return;
        }

        if (parsed.error) {
            console.error("Live Update Error:", parsed.error);
            return;
        }

        if (parsed.subscriptions) {
            subscriptions.value = parsed.subscriptions;

            Object.keys(keyToId).forEach((key) => delete keyToId[key]);
            Object.keys(idToKey).forEach((id) => delete idToKey[id]);
            subscriptions.value.forEach((sub) => {
                const key = `${sub.objectPath}/${sub.propertyPath}`;
                keyToId[key] = sub.id;
                idToKey[sub.id] = key;
            });

            // Remove entries from the keyToValue object for unsubscribed keys
            Object.keys(keyToValue).forEach((key) => {
                if (!keyToId[key]) {
                    delete keyToValue[key];
                }
            });
        }

        if (parsed.valuesChanged) {
            parsed.valuesChanged.forEach((change) => {
                const key = idToKey[change.id];
                keyToValue[key] = change.value;
            });
        }
    });

    return {
        status,
        connectionUserInfo,
        reconnect,
        subscribe,
        autoSubscribe,
        debugInfo: {
            status,
            subscriptions,
            values: keyToValue
        }
    };
}
