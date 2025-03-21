import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ComputedGetter } from 'vue';
import { useLiveUpdate } from '../src/composables/useLiveUpdate';
import { createMockLiveUpdateServer } from './mockLiveUpdateServer';

let mockServer;

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
                    const { offset, rotation } = liveUpdate.autoSubscribe('screen2:surface_1', ['offset', 'rotation']);

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
                propertyPath: 'offset',
            },
            {
                id: 1,
                objectPath: 'screen2:surface_1',
                propertyPath: 'rotation',
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
                    const { offsetX } = liveUpdate.subscribe('screen2:surface_1', { offsetX: 'offset.x' });

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
                    const { offset } = liveUpdate.subscribe('screen2:surface_1', { offset: 'offset' });

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
                propertyPath: 'offset',
            }
        ]));

        await vi.waitFor(() => expect(wrapper.vm.offset).toEqual({ x: 0, y: 0, z: 0 }));

        mockServer.simulateChange('screen2:surface_1', 'offset', { x: 10, y: 20 });

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

    // it('should handle unsubscribing from properties', async () => {
    //     const wrapper = mount(
    //         defineComponent({
    //             setup() {
    //                 const liveUpdate = useLiveUpdate('localhost');
    //                 const { offset } = liveUpdate.subscribe('screen2:surface_1', { offset: 'offset' });

    //                 expect(offset).toBeDefined();

    //                 liveUpdate.unsubscribe('screen2:surface_1', ['offset']);

    //                 return { offset };
    //             },
    //             template: '<div></div>',
    //         })
    //     );

    //     mockServer.simulateChange('screen2:surface_1', 'offset', { x: 30, y: 40 });

    //     await wrapper.vm.$nextTick();

    //     expect(wrapper.vm.offset).not.toEqual({ x: 30, y: 40 });
    // });
});
