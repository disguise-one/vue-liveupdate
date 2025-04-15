import { expectType, expectError } from 'tsd';
import { Ref, ref } from 'vue';
import { useLiveUpdate } from '../src';
import { LiveUpdateOverlay } from '../src';
import type { LiveUpdateOverlayProps, SubscriptionValue, UseLiveUpdateReturn } from '../src';

// Valid usage
const liveUpdate = useLiveUpdate('localhost:8080');
expectType<Ref<string>>(liveUpdate.status);
expectType<Ref<string>>(liveUpdate.connectionUserInfo);

// Test subscribe
const computedValues = liveUpdate.subscribe('objectPath', {
    ref1: 'property1',
    ref2: 'property2',
});
expectType<SubscriptionValue>(computedValues.ref1);
expectType<SubscriptionValue>(computedValues.ref2);

// Test autoSubscribe
const autoComputedValues = liveUpdate.autoSubscribe('objectPath', ['property1', 'property2']);
expectType<SubscriptionValue>(autoComputedValues.property1);
expectType<SubscriptionValue>(autoComputedValues.property2);

// Valid usage
const mockLiveUpdate: UseLiveUpdateReturn = {
    status: ref('CLOSED'),
    connectionUserInfo: ref('User Info'),
    reconnect: () => {},
    subscribe: (objectPath, refNameToPropertyPaths) => ({}),
    autoSubscribe: (objectPath, propertyPaths) => ({}),
    debugInfo: {
        status: ref('CLOSED'),
        subscriptions: ref([]),
        values: {}
    }
};

// Correct usage of LiveUpdateOverlay as a value
expectType<typeof LiveUpdateOverlay>(LiveUpdateOverlay);

// Valid usage
expectType<LiveUpdateOverlayProps>({ liveUpdate: mockLiveUpdate });

// Invalid usage (should cause TypeScript errors)
expectError(useLiveUpdate()); // Missing argument
expectError(liveUpdate.subscribe('objectPath', { ref1: 123 })); // Invalid property path type
expectError(() => {
    const invalidProps: LiveUpdateOverlayProps = { liveUpdate: {} }; // missing properties
});
expectError(() => {
    const missingProps: LiveUpdateOverlayProps = { }; // Missing required prop
});
