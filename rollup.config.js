import vue from 'rollup-plugin-vue';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/vue-liveupdate.esm.js',
      format: 'esm'
    },
    {
      file: 'dist/vue-liveupdate.umd.js',
      format: 'umd',
      name: 'VueLiveUpdate',
      globals: {
        vue: 'Vue',
        '@vueuse/core': 'VueUseCore'
      }
    }
  ],
  external: ['vue', '@vueuse/core'],
  plugins: [
    // Disable Vue's built-in CSS handling so that CSS gets passed on to postcss.
    vue({
      css: false
    }),
    // Process and inline CSS into the JS bundle.
    postcss({
      inject: true, // Inject CSS into the JavaScript bundle
      extract: false // Do not create a separate CSS file
    }),
    typescript({
      exclude: ['test-d/**/*'], // Exclude test-d folder
    }),
    copy({
      targets: [
        { src: 'src/index.d.ts', dest: 'dist' }
      ]
    })
  ]
};
