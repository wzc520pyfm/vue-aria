/**
 * @vitest-environment node
 *
 * Real renderToString against the already-installed @vue/server-renderer@3.5.45
 * (Vue's own dependency, same version as the workspace `vue`). The ESM bundler
 * build is imported so Vite dedupes it onto this workspace's `vue`. No package
 * or lockfile change.
 */
import { createSSRApp, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { Button, Disclosure, DisclosurePanel, Heading } from 'vue-aria-components'

// Loaded at runtime from the copy Vue already depends on. A literal
// `node:module` import fails typecheck because this repo has no `@types/node`.
const nodeModule = 'node:module'
const { createRequire } = (await import(nodeModule)) as {
  createRequire: (from: string) => {
    (id: string): unknown
    resolve: (id: string, options?: { paths?: string[] }) => string
  }
}
const require = createRequire(import.meta.url)
const rendererEntry = require.resolve(
  '@vue/server-renderer/dist/server-renderer.esm-bundler.js',
  {
    paths: [require.resolve('vue/package.json')],
  },
)

const { renderToString } = (await import(rendererEntry)) as {
  renderToString: (app: ReturnType<typeof createSSRApp>) => Promise<string>
}

function app(props: Record<string, unknown> = {}) {
  return createSSRApp({
    name: 'DisclosureSSRProbe',
    setup() {
      return () =>
        h(Disclosure, props, {
          default: () => [
            h(Heading, { level: 3 }, {
              default: () => h(Button, { slot: 'trigger' }, { default: () => 'Trigger' }),
            }),
            h(DisclosurePanel, {}, { default: () => h('p', 'Content') }),
          ],
        })
    },
  })
}

describe('Disclosure renderToString', () => {
  it('hides a collapsed panel and leaves an expanded panel visible, with no window', async () => {
    expect(typeof window).toBe('undefined')
    const collapsed = await renderToString(app())
    expect(collapsed).toContain(' hidden ')
    expect(collapsed).toContain('aria-hidden="true"')
    expect(collapsed).not.toContain('data-expanded')
    const expanded = await renderToString(app({ defaultExpanded: true }))
    expect(expanded).toContain('data-expanded="true"')
    expect(expanded).toContain('aria-hidden="false"')
    expect(expanded).not.toMatch(/ hidden(="[^"]*")?(?=[\s>])/)
  })
})
