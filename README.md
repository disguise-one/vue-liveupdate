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

### Composable: `useLiveUpdate`

The `useLiveUpdate` composable provides a WebSocket-based live update system. Pass the `director` plugin queryparam as the argument to ensure it connects to the session correctly.

#### Example

```javascript
import { useLiveUpdate } from '@disguise-one/vue-liveupdate';

export default {
  setup() {
    const urlParams = new URLSearchParams(window.location.search);
    const directorEndpoint = urlParams.get('director');
    const liveUpdate = useLiveUpdate(directorEndpoint);
    const { offset, rotation } = liveUpdate.autoSubscribe('screen2:surface_1', ['offset', 'rotation']);

    return { liveUpdate, offset, rotation };
  }
};
```

### Component: `LiveUpdateOverlay`

The `LiveUpdateOverlay` component displays an overlay when the WebSocket connection is not active.

#### Example

```vue
<template>
  <LiveUpdateOverlay :liveUpdate="liveUpdate" />
</template>

<script>
import { useLiveUpdate } from '@disguise-one/vue-liveupdate';
import LiveUpdateOverlay from '@disguise-one/vue-liveupdate/LiveUpdateOverlay.vue';

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

- `npm run dev`: Start the development server.
- `npm run build`: Build the library for production.
- `npm run preview`: Preview the production build.

### Building the Library

The library is built using Vite. The output includes both ES modules and UMD formats.

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
