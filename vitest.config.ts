import {defineConfig} from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'packages/**/src/**/*.{test,spec}.ts',
      'packages/**/src/__tests__/**/*.{test,spec}.ts',
    ],
  },
})
