import { expectType, expectError } from 'tsd';
import { Ref, ComputedRef } from 'vue';
import { useLiveUpdate } from '../src';

// Valid usage
const liveUpdate = useLiveUpdate('localhost:8080');
expectType<Ref<string>>(liveUpdate.status);
expectType<Ref<string>>(liveUpdate.connectionUserInfo);

// Test subscribe
const computedValues = liveUpdate.subscribe('objectPath', {
    ref1: 'property1',
    ref2: 'property2',
});
expectType<ComputedRef<any>>(computedValues.ref1);
expectType<ComputedRef<any>>(computedValues.ref2);

// Test autoSubscribe
const autoComputedValues = liveUpdate.autoSubscribe('objectPath', ['property1', 'property2']);
expectType<ComputedRef<any>>(autoComputedValues.property1);
expectType<ComputedRef<any>>(autoComputedValues.property2);

// Invalid usage (should cause TypeScript errors)
expectError(useLiveUpdate()); // Missing argument
expectError(liveUpdate.subscribe('objectPath', { ref1: 123 })); // Invalid property path type
