import {readdirSync} from 'node:fs'
import {defineConfig} from 'tsup'

const entries = readdirSync('exports')
  .filter((file) => file.endsWith('.ts'))
  .map((file) => `exports/${file}`)

export default defineConfig({
  entry: entries,
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  target: 'es2022',
  external: ['vue', 'vue-aria', 'vue-stately'],
  treeshake: true,
  splitting: false,
})
