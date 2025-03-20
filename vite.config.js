import { defineConfig } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
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
