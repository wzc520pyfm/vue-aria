/**
 * @vitest-environment node
 *
 * Real renderToString with no window. Uses the Vue server renderer already
 * installed with vue. No package or lockfile change.
 */
import {createSSRApp, defineComponent, h, provide} from 'vue'
import {describe, expect, it} from 'vitest'
import {Toolbar, ToolbarContext} from 'vue-aria-components'

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
  name: 'ToolbarContextHost',
  setup(_, {slots}) {
    provide(ToolbarContext, {
      className: 'from-context',
      style: 'padding: 2px',
      'aria-describedby': 'from-context',
    })
    return () => slots.default?.()
  },
})

describe('Toolbar renderToString', () => {
  it('renders nested toolbars, names, orientation, and context style without window', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const app = createSSRApp({
      name: 'ToolbarSSRTree',
      setup() {
        return () => h(ContextHost, {}, () => h(Toolbar, {
          'aria-label': 'Tools',
          'aria-labelledby': 'ignored',
          'aria-describedby': 'desc',
          orientation: 'vertical',
          className: ({orientation, defaultClassName}: {orientation: string; defaultClassName?: string}) =>
            `${defaultClassName} ${orientation}`,
          style: {color: 'red'},
        }, {
          default: ({orientation}: {orientation: string}) => h(Toolbar, {
            'aria-labelledby': 'inner-label',
            className: 'inner',
            'data-live': orientation,
          }, {
            default: () => h('button', {type: 'button'}, 'One'),
          }),
        }))
      },
    })
    const tree = await renderToString(app)
    expect(typeof window).toBe('undefined')
    expect(tree.match(/role="toolbar"/g)?.length).toBe(2)
    expect(tree).not.toContain('role="group"')
    expect(tree).toContain('aria-label="Tools"')
    expect(tree).not.toContain('aria-labelledby="ignored"')
    expect(tree).toContain('aria-describedby="desc"')
    expect(tree).toContain('aria-orientation="vertical"')
    expect(tree).toContain('data-orientation="vertical"')
    expect(tree).toContain('class="react-aria-Toolbar vertical"')
    expect(tree).toMatch(/color:\s*red/)
    expect(tree).toMatch(/padding:\s*2px/)
    expect(tree).toContain('aria-describedby="desc"')
    expect(tree).toContain('aria-labelledby="inner-label"')
    expect(tree).toContain('class="from-context inner"')
    expect(tree).toContain('data-live="vertical"')
    expect(tree).not.toContain('data-rac')
    expect(tree).not.toContain('tabindex')
  })
})
