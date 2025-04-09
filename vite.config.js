import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ts from 'vite-plugin-ts';

export default defineConfig({
  plugins: [
    vue(),
    ts()
  ],
});
