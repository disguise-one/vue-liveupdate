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

        setTimeout(() => {
            // Still 1 subscription.
            expect(subscriptions.value).toEqual(expectedSubscription);
        }, 100); // 100ms should be enough for the unmount to be processed.

        // Unmount the second one.
        offsetWrapper2.unmount();

        // Now the core session is unsubscribed.
        await vi.waitFor(() => expect(subscriptions.value).toEqual([]));
    });
});
