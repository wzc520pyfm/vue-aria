/**
 * @vitest-environment node
 *
 * Real renderToString with no window. Uses the Vue server renderer already
 * installed with vue. No package or lockfile change.
 */
import {createSSRApp, defineComponent, h, provide} from 'vue'
import {describe, expect, it} from 'vitest'
import {ToggleButton, ToggleButtonContext, ToggleButtonGroup, Toolbar} from 'vue-aria-components'

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

const ContextHost = defineComponent({
  name: 'ToggleContextHost',
  setup(_, {slots}) {
    provide(ToggleButtonContext, {
      className: 'from-context',
      'aria-describedby': 'from-context',
    })
    return () => slots.default?.()
  },
})

describe('ToggleButton renderToString', () => {
  it('renders standalone, single, multiple, and nested initial ARIA without window', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const app = createSSRApp({
      name: 'ToggleSSRTree',
      setup() {
        return () => h(ContextHost, {}, () => [
          h(ToggleButton, {
            id: 'solo',
            'aria-label': 'Bold',
            className: ({isSelected, defaultClassName}: {isSelected: boolean; defaultClassName?: string}) =>
              `${defaultClassName} ${isSelected ? 'on' : 'off'}`,
          }, () => 'Bold'),
          h(ToggleButtonGroup, {
            'aria-label': 'Format',
            defaultSelectedKeys: ['left'],
          }, () => [
            h(ToggleButton, {id: 'left'}, () => 'Left'),
            h(ToggleButton, {id: 'right'}, () => 'Right'),
          ]),
          h(Toolbar, {'aria-label': 'Tools'}, () => h(ToggleButtonGroup, {
            selectionMode: 'multiple',
            defaultSelectedKeys: ['bold'],
            'aria-labelledby': 'tools-label',
            className: 'multi',
          }, () => [
            h(ToggleButton, {id: 'bold'}, () => 'B'),
            h(ToggleButton, {id: 'italic'}, () => 'I'),
          ])),
        ])
      },
    })
    const tree = await renderToString(app)
    expect(typeof window).toBe('undefined')
    expect(tree).toContain('aria-label="Bold"')
    expect(tree).toContain('id="solo"')
    expect(tree).toContain('aria-pressed="false"')
    expect(tree).toContain('>Bold<')
    expect(tree).toContain('class="react-aria-ToggleButton off"')
    expect(tree).toContain('aria-describedby="from-context"')
    expect(tree).toContain('from-context')
    expect(tree).toContain('role="radiogroup"')
    expect(tree).toContain('aria-label="Format"')
    expect(tree).toContain('aria-checked="true"')
    expect(tree).toContain('aria-checked="false"')
    expect(tree).toContain('>Left<')
    expect(tree).toContain('>Right<')
    expect(tree).toContain('aria-pressed="true"')
    expect(tree).toContain('aria-pressed="false"')
    expect(tree.match(/role="toolbar"/g)?.length).toBe(2)
    expect(tree).toContain('aria-labelledby="tools-label"')
    expect(tree).toContain('class="multi"')
    expect(tree).toContain('>B<')
    expect(tree).toContain('>I<')
    expect(tree).not.toContain('data-rac')
    expect(tree).not.toContain('<input')
  })
})
