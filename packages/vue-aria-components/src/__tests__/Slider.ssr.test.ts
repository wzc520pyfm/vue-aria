/**
 * @vitest-environment node
 *
 * Real renderToString with no window. Uses the Vue server renderer already
 * installed with vue. No package or lockfile change.
 */
import {createSSRApp, h} from 'vue'
import {describe, expect, it} from 'vitest'
import {Label, Slider, SliderFill, SliderOutput, SliderThumb, SliderTrack} from 'vue-aria-components'

const nodeModule = 'node:module'
const {createRequire} = (await import(nodeModule)) as {
  createRequire: (from: string) => {
    (id: string): unknown
    resolve: (id: string, options?: {paths?: string[]}) => string
  }
}
const require = createRequire(import.meta.url)
const rendererEntry = require.resolve('@vue/server-renderer/dist/server-renderer.esm-bundler.js', {
  paths: [require.resolve('vue/package.json')],
})
const {renderToString} = (await import(rendererEntry)) as {
  renderToString: (app: ReturnType<typeof createSSRApp>) => Promise<string>
}

function app(label: string) {
  return createSSRApp({
    name: 'SliderSSRProbe',
    setup() {
      return () => h(Slider, {'aria-label': label, defaultValue: 25}, {
        default: () => [
          h(Label, {}, {default: () => label}),
          h(SliderOutput),
          h(SliderTrack, {}, {default: () => [h(SliderFill), h(SliderThumb)]}),
        ],
      })
    },
  })
}

describe('Slider renderToString', () => {
  it('renders two sliders with unique ids and no window', async () => {
    expect(typeof window).toBe('undefined')
    const first = await renderToString(app('One'))
    const second = await renderToString(app('Two'))
    expect(first).toContain('type="range"')
    expect(first).toContain('aria-valuetext="25"')
    expect(first).toContain('data-orientation="horizontal"')
    expect(first).not.toContain('data-disabled')
    const ids = [...first.matchAll(/id="([^"]+)"/g)].map((match) => match[1])
    const secondIds = [...second.matchAll(/id="([^"]+)"/g)].map((match) => match[1])
    expect(ids.length).toBeGreaterThan(0)
    expect(secondIds.some((id) => ids.includes(id))).toBe(false)
  })

  it('renders SliderFill positioning for a real range without window', async () => {
    expect(typeof window).toBe('undefined')
    const html = await renderToString(app('Fill'))
    expect(html).toContain('react-aria-SliderFill')
    expect(html).toMatch(/width:\s*25%/)
    expect(html).toMatch(/inset-inline-start:\s*0%/)
    expect(html).toContain('react-aria-SliderThumb')
    expect(html).toContain('type="range"')
  })
})
