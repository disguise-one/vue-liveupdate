# @disguise-one/vue-liveupdate

Disguise Live Update WebSocket composable & helper component for live read & write of values into a disguise session.

## Features

- **Composable API**: Use the `useLiveUpdate` composable to easily integrate WebSocket-based live updates into your Vue 3 application.
- **Helper Component**: Includes a `LiveUpdateOverlay` component to display connection status and provide reconnection functionality.
- **Reactive Data**: Automatically updates your application state in real-time using Vue's reactivity system. Set the values back into the session simply by setting the values.
- **Error Handling and automatic resubscription**: Provides detailed error messages and connection status updates.

## Installation

Install the package via GitHub:

```bash
npm install disguise-one/vue-liveupdate
```

## Usage

### Full Example: Subscribing in a Vue Component

Below is a complete example of how to use the `useLiveUpdate` composable in a Vue component to subscribe to live updates and bind the data to your template.

```vue
<template>
  <div>
    <h1>Live Update Example</h1>
    <p>Offset: {{ offset }}</p>
    <p>Rotation: {{ rotation }}</p>
    <p>Scale X: {{ scaleX }}</p>

    <!-- Display the connection status -->
    <LiveUpdateOverlay :liveUpdate="liveUpdate" />
  </div>
</template>

<script>
import { useLiveUpdate, LiveUpdateOverlay } from '@disguise-one/vue-liveupdate';

export default {
  components: { LiveUpdateOverlay },
  setup() {
    // Extract the director endpoint from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const directorEndpoint = urlParams.get('director');

    // Initialize the live update composable
    const liveUpdate = useLiveUpdate(directorEndpoint);

    // Automatically subscribe to simple properties
    const { offset, rotation } = liveUpdate.autoSubscribe('screen2:surface_1', ['object.offset', 'object.rotation']);

    // Manually subscribe to a more complex property
    const { scaleX } = liveUpdate.subscribe('screen2:surface_1', { scaleX: 'object.scale.x' });

    return { liveUpdate, offset, rotation, scaleX };
  }
};
</script>
```

This example demonstrates how to:

1. Extract the `director` endpoint from the URL query parameters.
2. Use `autoSubscribe` for simple property subscriptions.
3. Use `subscribe` for more complex property mappings.
4. Display the live data and connection status in the template.

You can copy and paste this component into your Vue 3 project to get started with live updates.

### Composable: `useLiveUpdate`

The `useLiveUpdate` composable provides a WebSocket-based live update system. Pass the `director` plugin queryparam as the argument to ensure it connects to the session correctly. It is expected to only create one live update connection per page, as this is more efficient. Sharing the live update composition between multiple components is supported and expected.

#### Example

```javascript
import { useLiveUpdate } from '@disguise-one/vue-liveupdate';

export default {
  setup() {
    const urlParams = new URLSearchParams(window.location.search);
    const directorEndpoint = urlParams.get('director');
    const liveUpdate = useLiveUpdate(directorEndpoint);
    const { offset, rotation } = liveUpdate.autoSubscribe('screen2:surface_1', ['object.offset', 'object.rotation']);

    // Subscribe to more complex-named properties by providing the name
    const { scaleX } = liveUpdate.subscribe('screen2:surface_1', { scaleX: 'object.scale.x' });

    return { liveUpdate, offset, rotation };
  }
};
```

`autoSubscribe` attempts to make it quicker and easier to subscribe to "simple" properties which start with "object." and have the property name without any special characters. This allows a quick subscription to the name without over-specifying the destination. We can see in the example above that `object.offset` becomes `offset` in the returned dictionary, making it quick and easy to bind the value to a variable.

`subscribe` provides full control over the local name of the dictionary subscription. Both methods are otherwise identical.

### Component: `LiveUpdateOverlay`

The `LiveUpdateOverlay` component displays an overlay when the WebSocket connection is not active.

#### Example

```vue
<template>
  <LiveUpdateOverlay :liveUpdate="liveUpdate" />
</template>

<script>
import { useLiveUpdate, LiveUpdateOverlay } from '@disguise-one/vue-liveupdate';

export default {
  components: { LiveUpdateOverlay },
  setup() {
    const liveUpdate = useLiveUpdate('your-director-endpoint');
    return { liveUpdate };
  }
};
</script>
```

## Development

### Prerequisites

- Node.js 22+
- npm or yarn

### Setup

Using vscode, `Dev Containers: Clone Repository in Container Volume`

### Scripts

- `npm run dev`: Start the test runner to validate changes.
- `npm run build`: Build the library for production.
- `npm run preview`: Preview the production build.

### Building the Library

The library is built using Vite. The output includes both ES modules and UMD formats.

## Testing

To test this library locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/disguise-one/vue-liveupdate.git
   cd vue-liveupdate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run automated tests:
   ```bash
   npm test
   ```

   The tests include unit tests for the composable and component, as well as integration tests using a mock WebSocket server.

## File Structure

```
src/
├── components/
│   └── LiveUpdateOverlay.vue  # Overlay component for connection status
├── composables/
│   └── useLiveUpdate.js       # Composable for WebSocket live updates
└── index.js                   # Entry point for the library
```

## License

This project is licensed under the ISC License.
