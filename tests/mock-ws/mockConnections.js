const testContextMap = new WeakMap();

// Retrieves or creates a unique server mapping for the given test context
export function getServerMapping(testContext) {
    if (!testContextMap.has(testContext)) {
        testContextMap.set(testContext, {});
    }
    return testContextMap.get(testContext);
}
