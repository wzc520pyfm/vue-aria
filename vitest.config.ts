import {readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('.', import.meta.url))

function packageAliases() {
  const aliases: {find: string; replacement: string}[] = []
  for (const pkg of ['vue-aria', 'vue-stately', 'vue-aria-components']) {
    const dir = `${root}packages/${pkg}/exports`
    for (const file of readdirSync(dir)) {
      if (file.endsWith('.ts') && file !== 'index.ts') {
        aliases.push({
          find: `${pkg}/${file.slice(0, -3)}`,
          replacement: `${dir}/${file}`,
        })
      }
    }
    // Exact package name last so it does not swallow subpath imports.
    aliases.push({
      find: pkg,
      replacement: `${dir}/index.ts`,
    })
  }
  return aliases
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: packageAliases(),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/**/src/**/*.{test,spec}.ts', 'packages/**/src/__tests__/**/*.{test,spec}.ts'],
  },
})
