import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ComputedGetter } from 'vue';
import { useLiveUpdate } from '../src/composables/useLiveUpdate';
import { createMockLiveUpdateServer } from './mockLiveUpdateServer';

let mockServer;

// This is a reusable component which initializes the live update system with a WebSocket connection.
// It returns the liveUpdate object as a prop.
const liveUpdateComponent = defineComponent({
    setup() {
        const liveUpdate = useLiveUpdate('localhost');
        return { liveUpdate };
    },
    template: '<div></div>',
})

// This is a reusable component which only subscribes to the a set of properties, and returns them as props.
// It requires the liveUpdate object to be passed in as a prop. This is the expected use case, where multiple
// components are subscribing to various live update properties within an app, and they all share the same
// liveUpdate object.
function autoSubscriberComponent(objectPath, propPaths) {
    return defineComponent({
        props: {
            liveUpdate: {
                type: Object,
                required: true,
            },
        },
        setup(props) {
            const { liveUpdate } = props;
            const { offset } = liveUpdate.autoSubscribe(objectPath, propPaths);

            expect(offset).toBeDefined();

            return { offset };
        },
        template: '<div></div>',
    });
}

describe('useLiveUpdate', () => {
    beforeEach(() => {
        mockServer = createMockLiveUpdateServer({
            'screen2:surface_1': {
                offset: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
            },
        });
    });

    afterEach(() => {
        mockServer.stop();
    });

    it('should connect to the WebSocket and subscribe to properties', async () => {
        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offset, rotation } = liveUpdate.autoSubscribe('screen2:surface_1', ['object.offset', 'object.rotation']);

                    expect(offset).toBeDefined();
                    expect(rotation).toBeDefined();

                    return { liveUpdate, offset, rotation };
                },
                template: '<div></div>',
            })
        );

        await vi.waitFor(() => expect(wrapper.vm.liveUpdate.debugInfo.subscriptions.value).toEqual([
            {
                id: 0,
                objectPath: 'screen2:surface_1',
                propertyPath: 'object.offset',
            },
            {
                id: 1,
                objectPath: 'screen2:surface_1',
                propertyPath: 'object.rotation',
            },
        ]));

        await vi.waitFor(() => expect(wrapper.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));
        await vi.waitFor(() => expect(wrapper.vm.rotation).toEqual({ x: 0, y: 0, z: 0 }));
    });

    it('should allow renaming of properties in the returned dictionary', async () => {
        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offsetX } = liveUpdate.subscribe('screen2:surface_1', { offsetX: 'object.offset.x' });

                    expect(offsetX).toBeDefined();

                    return { liveUpdate, offsetX };
                },
                template: '<div></div>',
            })
        );

        await vi.waitFor(() => expect(wrapper.vm.liveUpdate.debugInfo.subscriptions.value).toEqual([]));
    });

    it('should handle property updates from the WebSocket server', async () => {
        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offset } = liveUpdate.subscribe('screen2:surface_1', { offset: 'object.offset' });

                    expect(offset).toBeDefined();

                    return { liveUpdate, offset };
                },
                template: '<div></div>',
            })
        );

        await vi.waitFor(() => expect(wrapper.vm.liveUpdate.debugInfo.subscriptions.value).toEqual([
            {
                id: 0,
                objectPath: 'screen2:surface_1',
                propertyPath: 'object.offset',
            }
        ]));

        await vi.waitFor(() => expect(wrapper.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));

        mockServer.simulateChange('screen2:surface_1', 'object.offset', { x: 10, y: 20 });

        await vi.waitFor(() => expect(wrapper.vm.offset).toEqual({ x: 10, y: 20, z: 0 }));
    });

    it('should handle subscription errors from the WebSocket server', async () => {
        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { invalidProp } = liveUpdate.subscribe('screen2:surface_1', { invalidProp: 'invalid.path' });

                    expect(invalidProp.value).toBeUndefined();

                    return { liveUpdate, invalidProp };
                },
                template: '<div></div>',
            })
        );

        await vi.waitFor(() => expect(wrapper.vm.liveUpdate.debugInfo.subscriptions.value).toEqual([]));

        // It remains undefined even after the server responds.
        expect(wrapper.vm.invalidProp).toBeUndefined();
    });

    it('should unsubscribe from properties on unmount', async () => {
        const liveUpdateWrapper = mount(liveUpdateComponent);

        const liveUpdate = liveUpdateWrapper.vm.liveUpdate;
        const subscriptions = liveUpdate.debugInfo.subscriptions;
        const expectedSubscription = [
            {
                id: 0,
                objectPath: 'screen2:surface_1',
                propertyPath: 'object.offset',
            }
        ];


        // Initial state is no subscriptions.
        await vi.waitFor(() => expect(subscriptions.value).toEqual([]));

        const offsetWrapper = mount(autoSubscriberComponent('screen2:surface_1', ['object.offset']), { props: {
            liveUpdate
        }});

        // The offset component subscribes to the 'offset' property of 'screen2:surface_1'.
        await vi.waitFor(() => expect(subscriptions.value).toEqual(expectedSubscription));

        await vi.waitFor(() => expect(offsetWrapper.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));

        mockServer.simulateChange('screen2:surface_1', 'object.offset', { x: 30, y: 40 });

        await vi.waitFor(() => expect(offsetWrapper.vm.offset).toEqual({ x: 30, y: 40, z: 0 }));

        offsetWrapper.unmount(); // this unmounts the `offset` computed property, causing unsubscribe to be fired.

        await vi.waitFor(() => expect(subscriptions.value).toEqual([]));
    });

    it('should unsubscribe from properties only when the last is unmounted', async () => {
        const liveUpdateWrapper = mount(liveUpdateComponent);

        const liveUpdate = liveUpdateWrapper.vm.liveUpdate;
        const subscriptions = liveUpdate.debugInfo.subscriptions;
        const expectedSubscription = [
            {
                id: 0,
                objectPath: 'screen2:surface_1',
                propertyPath: 'object.offset',
            }
        ];

        // Initial state is no subscriptions.
        await vi.waitFor(() => expect(subscriptions.value).toEqual([]));

        const offsetWrapper1 = mount(autoSubscriberComponent('screen2:surface_1', ['object.offset']), { props: {
            liveUpdate
        }});

        await vi.waitFor(() => expect(subscriptions.value).toEqual(expectedSubscription));

        await vi.waitFor(() => expect(offsetWrapper1.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));

        // Subscribe to the same property again.
        const offsetWrapper2 = mount(autoSubscriberComponent('screen2:surface_1', ['object.offset']), { props: {
            liveUpdate
        }});

        // It's definitely subscribed.
        await vi.waitFor(() => expect(offsetWrapper2.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));

        // Still looks like 1 subscription.
        await vi.waitFor(() => expect(subscriptions.value).toEqual(expectedSubscription));

        mockServer.simulateChange('screen2:surface_1', 'object.offset', { x: 30, y: 40 });

        // Both update.
        await vi.waitFor(() => expect(offsetWrapper1.vm.offset).toEqual({ x: 30, y: 40, z: 0 }));
        await vi.waitFor(() => expect(offsetWrapper2.vm.offset).toEqual({ x: 30, y: 40, z: 0 }));

        // Unmount the first one.
        offsetWrapper1.unmount();

        // Delay for 100ms to allow the unmount to be processed.
        // This is a workaround for the fact that Vue's unmounting process is asynchronous.
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(subscriptions.value).toEqual(expectedSubscription);

        // Unmount the second one.
        offsetWrapper2.unmount();

        // Now the core session is unsubscribed.
        await vi.waitFor(() => expect(subscriptions.value).toEqual([]));
    });

    it('should freeze and thaw subscriptions correctly', async () => {
        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offset } = liveUpdate.subscribe('screen2:surface_1', { offset: 'object.offset' });

                    expect(offset).toBeDefined();



                    return { liveUpdate, offset, freeze: offset.freeze, thaw: offset.thaw, isFrozen: offset.isFrozen };
                },
                template: '<div></div>',
            })
        );

        const expectedSubscription = [
            {
                id: 0,
                objectPath: 'screen2:surface_1',
                propertyPath: 'object.offset',
            }
        ];

        await vi.waitFor(() => expect(wrapper.vm.liveUpdate.debugInfo.subscriptions.value).toEqual(expectedSubscription));

        const freeze = wrapper.vm.freeze;
        const thaw = wrapper.vm.thaw;
        const isFrozen = wrapper.vm.isFrozen;

        // Initially, the subscription is active.
        await vi.waitFor(() => expect(wrapper.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));

        // Freeze the subscription.
        freeze();
        expect(isFrozen()).toBe(true);

        // The subscription should be unsubscribed.
        await vi.waitFor(() => expect(wrapper.vm.liveUpdate.debugInfo.subscriptions.value).toEqual([]));

        // Simulate a server change while frozen.
        mockServer.simulateChange('screen2:surface_1', 'object.offset', { x: 10, y: 20 });

        // Force a delay to ensure we definitely processed the simulated change.
        await new Promise(resolve => setTimeout(resolve, 100));

        // The value should not update while frozen.
        await vi.waitFor(() => expect(wrapper.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));

        // Thaw the subscription.
        thaw();
        expect(isFrozen()).toBe(false);

        // Validate the subscription was reinstated (note with a new ID)
        const newSubscription = [
            {
                id: 1,
                objectPath: 'screen2:surface_1',
                propertyPath: 'object.offset',
            }
        ];
        await vi.waitFor(() => expect(wrapper.vm.liveUpdate.debugInfo.subscriptions.value).toEqual(newSubscription));

        // The value should now update after thawing.
        await vi.waitFor(() => expect(wrapper.vm.offset).toEqual({ x: 10, y: 20, z: 0 }));
    });

    it('should include configuration in subscription message when provided', async () => {
        let receivedMessage = null;
        const originalSend = WebSocket.prototype.send;
        
        // Mock the WebSocket send method to capture messages
        WebSocket.prototype.send = vi.fn().mockImplementation(function(message) {
            if (this.readyState === this.constructor.OPEN) {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.subscribe && parsed.subscribe.configuration) {
                        receivedMessage = parsed;
                    }
                } catch (e) {
                    // Ignore parsing errors for other messages
                }
            }
            // Call the original send to maintain functionality
            return originalSend.call(this, message);
        });

        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offset } = liveUpdate.subscribe(
                        'screen2:surface_1', 
                        { offset: 'object.offset' },
                        { updateFrequencyMs: 1000 }
                    );

                    return { liveUpdate, offset };
                },
                template: '<div></div>',
            })
        );

        // Wait for the subscription to be processed
        await vi.waitFor(() => expect(receivedMessage).not.toBeNull());

        // Verify the message includes configuration
        expect(receivedMessage.subscribe.configuration).toHaveProperty('updateFrequencyMs', 1000);

        // Restore original send method
        WebSocket.prototype.send = originalSend;
    });

    it('should include configuration in autoSubscribe when provided', async () => {
        let receivedMessage = null;
        const originalSend = WebSocket.prototype.send;
        
        // Mock the WebSocket send method to capture messages
        WebSocket.prototype.send = vi.fn().mockImplementation(function(message) {
            if (this.readyState === this.constructor.OPEN) {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.subscribe && parsed.subscribe.configuration) {
                        receivedMessage = parsed;
                    }
                } catch (e) {
                    // Ignore parsing errors for other messages
                }
            }
            // Call the original send to maintain functionality
            return originalSend.call(this, message);
        });

        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offset } = liveUpdate.autoSubscribe(
                        'screen2:surface_1', 
                        ['object.offset'],
                        { updateFrequencyMs: 500 }
                    );

                    return { liveUpdate, offset };
                },
                template: '<div></div>',
            })
        );

        // Wait for the subscription to be processed
        await vi.waitFor(() => expect(receivedMessage).not.toBeNull());

        // Verify the message includes configuration
        expect(receivedMessage.subscribe.configuration).toHaveProperty('updateFrequencyMs', 500);

        // Restore original send method
        WebSocket.prototype.send = originalSend;
    });

    it('should not include configuration in message when not provided', async () => {
        let subscribeMessage = null;
        const originalSend = WebSocket.prototype.send;
        
        // Mock the WebSocket send method to capture messages
        WebSocket.prototype.send = vi.fn().mockImplementation(function(message) {
            if (this.readyState === this.constructor.OPEN) {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.subscribe && parsed.subscribe.object === 'screen2:surface_1') {
                        subscribeMessage = parsed;
                    }
                } catch (e) {
                    // Ignore parsing errors for other messages
                }
            }
            // Call the original send to maintain functionality
            return originalSend.call(this, message);
        });

        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offset } = liveUpdate.subscribe(
                        'screen2:surface_1', 
                        { offset: 'object.offset' }
                        // No configuration provided
                    );

                    return { liveUpdate, offset };
                },
                template: '<div></div>',
            })
        );

        // Wait for the subscription to be processed
        await vi.waitFor(() => expect(subscribeMessage).not.toBeNull());

        // Verify the message does NOT include configuration
        expect(subscribeMessage.subscribe).not.toHaveProperty('configuration');

        // Restore original send method
        WebSocket.prototype.send = originalSend;
    });

    it('should use default configuration when provided to useLiveUpdate', async () => {
        let receivedMessage = null;
        const originalSend = WebSocket.prototype.send;
        
        // Mock the WebSocket send method to capture messages
        WebSocket.prototype.send = vi.fn().mockImplementation(function(message) {
            if (this.readyState === this.constructor.OPEN) {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.subscribe && parsed.subscribe.configuration) {
                        receivedMessage = parsed;
                    }
                } catch (e) {
                    // Ignore parsing errors for other messages
                }
            }
            // Call the original send to maintain functionality
            return originalSend.call(this, message);
        });

        const wrapper = mount(
            defineComponent({
                setup() {
                    // Create liveUpdate with default configuration
                    const liveUpdate = useLiveUpdate('localhost', { updateFrequencyMs: 2000 });
                    const { offset } = liveUpdate.subscribe(
                        'screen2:surface_1', 
                        { offset: 'object.offset' }
                        // No configuration provided - should use default
                    );

                    return { liveUpdate, offset };
                },
                template: '<div></div>',
            })
        );

        // Wait for the subscription to be processed
        await vi.waitFor(() => expect(receivedMessage).not.toBeNull());

        // Verify the message includes default configuration
        expect(receivedMessage.subscribe.configuration).toHaveProperty('updateFrequencyMs', 2000);

        // Restore original send method
        WebSocket.prototype.send = originalSend;
    });

    it('should override default configuration with per-subscription configuration', async () => {
        let receivedMessage = null;
        const originalSend = WebSocket.prototype.send;
        
        // Mock the WebSocket send method to capture messages
        WebSocket.prototype.send = vi.fn().mockImplementation(function(message) {
            if (this.readyState === this.constructor.OPEN) {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.subscribe && parsed.subscribe.configuration) {
                        receivedMessage = parsed;
                    }
                } catch (e) {
                    // Ignore parsing errors for other messages
                }
            }
            // Call the original send to maintain functionality
            return originalSend.call(this, message);
        });

        const wrapper = mount(
            defineComponent({
                setup() {
                    // Create liveUpdate with default configuration
                    const liveUpdate = useLiveUpdate('localhost', { updateFrequencyMs: 2000 });
                    const { offset } = liveUpdate.subscribe(
                        'screen2:surface_1', 
                        { offset: 'object.offset' },
                        { updateFrequencyMs: 500 } // Override default
                    );

                    return { liveUpdate, offset };
                },
                template: '<div></div>',
            })
        );

        // Wait for the subscription to be processed
        await vi.waitFor(() => expect(receivedMessage).not.toBeNull());

        // Verify the message includes overridden configuration
        expect(receivedMessage.subscribe.configuration).toHaveProperty('updateFrequencyMs', 500);

        // Restore original send method
        WebSocket.prototype.send = originalSend;
    });

    it('should work without default configuration when none provided', async () => {
        let subscribeMessage = null;
        const originalSend = WebSocket.prototype.send;
        
        // Mock the WebSocket send method to capture messages
        WebSocket.prototype.send = vi.fn().mockImplementation(function(message) {
            if (this.readyState === this.constructor.OPEN) {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.subscribe && parsed.subscribe.object === 'screen2:surface_1') {
                        subscribeMessage = parsed;
                    }
                } catch (e) {
                    // Ignore parsing errors for other messages
                }
            }
            // Call the original send to maintain functionality
            return originalSend.call(this, message);
        });

        const wrapper = mount(
            defineComponent({
                setup() {
                    // Create liveUpdate without default configuration
                    const liveUpdate = useLiveUpdate('localhost');
                    const { offset } = liveUpdate.subscribe(
                        'screen2:surface_1', 
                        { offset: 'object.offset' }
                        // No configuration provided and no default
                    );

                    return { liveUpdate, offset };
                },
                template: '<div></div>',
            })
        );

        // Wait for the subscription to be processed
        await vi.waitFor(() => expect(subscribeMessage).not.toBeNull());

        // Verify the message does NOT include configuration
        expect(subscribeMessage.subscribe).not.toHaveProperty('configuration');

        // Restore original send method
        WebSocket.prototype.send = originalSend;
    });

    it('should throw error for invalid configuration keys', () => {
        expect(() => {
            useLiveUpdate('localhost', { invalidKey: 'value' });
        }).toThrow('Invalid configuration keys: invalidKey');
    });

    it('should throw error for invalid subscription configuration keys', async () => {
        const wrapper = mount(
            defineComponent({
                setup() {
                    const liveUpdate = useLiveUpdate('localhost');
                    
                    expect(() => {
                        liveUpdate.subscribe(
                            'screen2:surface_1',
                            { offset: 'object.offset' },
                            { invalidKey: 'value' }
                        );
                    }).toThrow('Invalid subscription configuration keys: invalidKey');

                    return { liveUpdate };
                },
                template: '<div></div>',
            })
        );
    });
});
