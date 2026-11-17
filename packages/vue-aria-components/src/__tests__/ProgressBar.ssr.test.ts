/**
 * @vitest-environment node
 *
 * Real renderToString with no window. Uses the Vue server renderer already
 * installed with vue. No package or lockfile change.
 */
import {createSSRApp, h} from 'vue'
import {describe, expect, it} from 'vitest'
import {Label, Meter, ProgressBar} from 'vue-aria-components'

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

function progressApp(label: string, indeterminate = false) {
  return createSSRApp({
    name: 'ProgressSSRProbe',
    setup() {
      return () => h(ProgressBar, {value: 25, isIndeterminate: indeterminate || undefined}, {
        default: () => h('div', {class: 'nest'}, [h(Label, {}, () => label)]),
      })
    },
  })
}

function meterApp(label: string) {
  return createSSRApp({
    name: 'MeterSSRProbe',
    setup() {
      return () => h(Meter, {value: 25}, {
        default: () => h('section', [h(Label, {}, () => label)]),
      })
    },
  })
}

describe('ProgressBar and Meter renderToString', () => {
  it('renders nested labels and indeterminate progress without window', async () => {
    expect(typeof window).toBe('undefined')
    const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
    const text = new Intl.NumberFormat(locale, {style: 'percent'}).format(0.25)
    const determinate = await renderToString(progressApp('Loading'))
    const indeterminate = await renderToString(progressApp('Waiting', true))
    const meter = await renderToString(meterApp('Storage'))
    expect(determinate).toContain('role="progressbar"')
    expect(determinate).toContain('aria-valuenow="25"')
    expect(determinate).toContain(`aria-valuetext="${text}"`)
    expect(determinate).toContain('Loading')
    expect(determinate).not.toContain('<label')
    expect(determinate).not.toContain('<input')
    expect(determinate).not.toContain('tabindex')
    const labelledBy = determinate.match(/aria-labelledby="([^"]+)"/)
    expect(labelledBy?.[1]).toBeTruthy()
    expect(determinate).toContain(`id="${labelledBy?.[1]}"`)

    expect(indeterminate).toContain('role="progressbar"')
    expect(indeterminate).not.toContain('aria-valuenow')
    expect(indeterminate).not.toContain('aria-valuetext')
    expect(indeterminate).toContain('aria-valuemin="0"')
    expect(indeterminate).toContain('aria-valuemax="100"')
    expect(indeterminate).toContain('Waiting')
    const waiting = indeterminate.match(/aria-labelledby="([^"]+)"/)
    expect(waiting?.[1]).toBeTruthy()
    expect(indeterminate).toContain(`id="${waiting?.[1]}"`)
    expect(waiting?.[1]).not.toBe(labelledBy?.[1])

    expect(meter).toContain('role="meter"')
    expect(meter).toContain('aria-valuenow="25"')
    expect(meter).toContain('Storage')
    expect(meter).not.toContain('<input')
    const meterLabel = meter.match(/aria-labelledby="([^"]+)"/)
    expect(meter).toContain(`id="${meterLabel?.[1]}"`)
    expect(meterLabel?.[1]).not.toBe(labelledBy?.[1])
  })
})
