import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import { libInjectCss } from 'vite-plugin-lib-inject-css';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), libInjectCss()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: '@disguise-one/vue-liveupdate'
    },
    rollupOptions: {
      external: ['vue', '@vueuse/core'],
      output: {
        globals: {
          'vue': 'Vue',
          '@vueuse/core': 'VueUse'
        }
      }
    }
  }
})
