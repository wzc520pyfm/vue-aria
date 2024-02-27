import {defineConfig} from 'tsup'
import vuePlugin from 'esbuild-plugin-vue3'

export default defineConfig({
  entry: ['./src/index.ts'],
  clean: true,
  target: 'es2019',
  format: ['cjs', 'esm'],
  banner: {js: '"use client";'},
  esbuildPlugins: [vuePlugin()],
})
