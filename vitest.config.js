import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setupTests.js', // Ensure the mock setup is executed before tests
  },
});
