import {resolve} from 'node:path'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dts from 'vite-plugin-dts'

const projectRootDir = resolve(__dirname)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    dts({
      tsconfigPath: 'tsconfig.json',
      cleanVueFileName: true,
      exclude: ['src/__test__/**'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRootDir, 'src'),
    },
  },
  build: {
    lib: {
      name: '@nev-ui/button',
      formats: ['es', 'cjs', 'umd'],
      entry: resolve(__dirname, 'src/index.ts'),
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library (Vue)
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue',
        },
        assetFileNames: (chunkInfo) => {
          return chunkInfo.name as string
        },
        banner: '"use client";',
      },
    },
  },
})
