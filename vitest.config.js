import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.js'; // Import Vite's configuration

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setupTests.js', // Ensure the mock setup is executed before tests
  },
  ...viteConfig, // Properly merge Vite's configuration
});
