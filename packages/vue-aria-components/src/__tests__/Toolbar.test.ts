import {createApp, defineComponent, Fragment, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createSSRApp} from 'vue'
import {I18nProvider} from 'vue-aria'
import {Button, Checkbox, DEFAULT_SLOT, Toolbar, ToolbarContext} from 'vue-aria-components'
import * as ToolbarSubpath from 'vue-aria-components/Toolbar'
import type {ToolbarProps, ToolbarRenderProps} from 'vue-aria-components'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function mountInDoc(body: () => any) {
  return mount(defineComponent({
    setup() {
      const result = body()
      if (typeof result === 'function') return result
      return () => body()
    },
  }), {attachTo: document.body})
}

function press(target: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...init})
  target.dispatchEvent(event)
  return event
}

const stringStyle: ToolbarProps = {style: 'color: red'}
const objectStyle: ToolbarProps = {style: {color: 'blue'}}
const functionStyle: ToolbarProps = {
  style: (values) => ({
    color: values.defaultStyle.color ?? 'black',
    outlineColor: values.orientation,
  }),
}
const functionClass: ToolbarProps = {
  className: (values) => `${values.defaultClassName ?? ''} ${values.orientation}`.trim(),
}
const renderProbe: ToolbarRenderProps = {orientation: 'vertical'}

describe('Toolbar', () => {
  it('accepts string, object, and orientation-only function style and class types', () => {
    expect(stringStyle.style).toBe('color: red')
    expect(objectStyle.style).toEqual({color: 'blue'})
    expect(typeof functionStyle.style).toBe('function')
    expect(typeof functionClass.className).toBe('function')
    expect(renderProbe.orientation).toBe('vertical')
    expect(Object.keys(renderProbe)).toEqual(['orientation'])
  })

  it('renders the default toolbar contract and navigates native controls, Button, and Checkbox', async () => {
    const wrapper = mountInDoc(() => h(Toolbar, {'aria-label': 'Tools'}, {
      default: ({orientation}: ToolbarRenderProps) => h(Fragment, [
        h('span', {'data-orientation': orientation}, 'state'),
        h('input', {'aria-label': 'Find'}),
        h(Button, {}, () => 'Bold'),
        h('div', [h(Checkbox, {}, () => 'Night')]),
        h('a', {href: '#help'}, 'Help'),
      ]),
    }))
    await nextTick()
    const el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(el.className).toBe('react-aria-Toolbar')
    expect(el.getAttribute('data-orientation')).toBe('horizontal')
    expect(el.getAttribute('aria-orientation')).toBe('horizontal')
    expect(el.getAttribute('aria-label')).toBe('Tools')
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(el.hasAttribute('data-rac')).toBe(false)
    expect(el.querySelector('[data-orientation="horizontal"]')?.textContent).toBe('state')

    const find = el.querySelector('input') as HTMLInputElement
    const bold = [...el.querySelectorAll('button')].find((node) => node.textContent === 'Bold')!
    const night = el.querySelector('input[type="checkbox"]') as HTMLInputElement
    const help = el.querySelector('a') as HTMLAnchorElement
    find.focus()
    press(find, 'ArrowRight')
    expect(document.activeElement).toBe(bold)
    press(bold, 'ArrowRight')
    expect(document.activeElement).toBe(night)
    press(night, 'ArrowRight')
    expect(document.activeElement).toBe(help)
    const stay = press(help, 'ArrowRight')
    expect(stay.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(help)
    expect(bold.getAttribute('tabindex')).not.toBe('-1')
    wrapper.unmount()
  })

  it('keeps non-null aria-label ahead of labelledby and restores context after local removal', async () => {
    const localLabel = ref<string | undefined>('Local')
    const localBy = ref<string | undefined>('local-by')
    const tick = ref(0)
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'aria-label', {enumerable: true, configurable: true, get: () => 'Context'})
    Object.defineProperty(ctx, 'aria-labelledby', {enumerable: true, configurable: true, get: () => 'context-by'})
    Object.defineProperty(ctx, 'aria-describedby', {enumerable: true, configurable: true, get: () => 'context-desc'})
    Object.defineProperty(ctx, 'aria-details', {enumerable: true, configurable: true, get: () => 'context-details'})
    const wrapper = mountInDoc(() => {
      provide(ToolbarContext, ctx)
      return () => h(Toolbar, {
        'aria-label': localLabel.value,
        'aria-labelledby': localBy.value,
        'aria-describedby': 'local-desc',
        'aria-details': 'local-details',
        'data-tick': tick.value,
      })
    })
    await nextTick()
    let el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(el.getAttribute('aria-label')).toBe('Local')
    expect(el.hasAttribute('aria-labelledby')).toBe(false)
    expect(el.getAttribute('aria-describedby')).toBe('local-desc')
    expect(el.getAttribute('aria-details')).toBe('local-details')
    expect(el.getAttribute('aria-label')).not.toBe(el.getAttribute('ariaLabel'))

    localLabel.value = undefined
    localBy.value = undefined
    await nextTick()
    el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(el.getAttribute('aria-label')).toBe('Context')
    expect(el.hasAttribute('aria-labelledby')).toBe(false)
    expect(el.getAttribute('aria-describedby')).toBe('local-desc')

    Object.defineProperty(ctx, 'aria-label', {enumerable: true, configurable: true, get: () => undefined})
    tick.value++
    await nextTick()
    el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(el.hasAttribute('aria-label')).toBe(false)
    expect(el.getAttribute('aria-labelledby')).toBe('context-by')
    expect(el.getAttribute('aria-details')).toBe('local-details')
    wrapper.unmount()
  })

  it('opts out of flat and named context with slot null, then restores it', async () => {
    const slot = ref<string | null | undefined>(null)
    const ctx: Record<string, any> = {
      'aria-label': 'Flat',
      className: 'flat',
      hidden: false,
      'data-foo': 'flat-data',
      slots: {
        [DEFAULT_SLOT]: {'aria-label': 'Default', className: 'deflt', 'data-foo': 'context', hidden: false},
        test: {'aria-label': 'Named', className: 'named', 'data-slot-name': 'test'},
      },
    }
    const wrapper = mountInDoc(() => {
      provide(ToolbarContext, ctx)
      return () => h(Toolbar, {slot: slot.value})
    })
    await nextTick()
    let el = document.querySelector('div.react-aria-Toolbar, div.flat, div.named') as HTMLElement
    expect(el.className).toBe('react-aria-Toolbar')
    expect(el.hasAttribute('aria-label')).toBe(false)
    expect(el.hasAttribute('data-foo')).toBe(false)
    expect(el.getAttribute('slot')).toBeNull()
    expect(el.hidden).toBe(false)

    slot.value = undefined
    await nextTick()
    el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(el.getAttribute('aria-label')).toBe('Default')
    expect(el.className).toContain('deflt')
    expect(el.className).not.toContain('flat')
    expect(el.getAttribute('data-foo')).toBe('context')
    expect(el.hidden).toBe(false)

    slot.value = 'test'
    await nextTick()
    el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(el.getAttribute('slot')).toBe('test')
    expect(el.getAttribute('aria-label')).toBe('Named')
    expect(el.className).toContain('named')
    expect(el.hasAttribute('data-foo')).toBe(false)
    expect(el.getAttribute('data-slot-name')).toBe('test')

    slot.value = null
    await nextTick()
    el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(el.getAttribute('aria-label')).toBeNull()
    expect(el.className).toBe('react-aria-Toolbar')
    expect(el.getAttribute('slot')).toBeNull()
    wrapper.unmount()
  })

  it('keeps an object ref through a reactive context, including replacement, opt-out, and a named slot', async () => {
    const A = ref<Element | null>(null)
    const B = ref<Element | null>(null)
    const named = ref<Element | null>(null)
    const slot = ref<string | null | undefined>(undefined)
    const ctx = ref<Record<string, any>>({ref: A, 'aria-label': 'First'})
    const wrapper = mountInDoc(() => {
      provide(ToolbarContext, ctx)
      return () => h(Toolbar, {slot: slot.value})
    })
    await nextTick()
    const el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(A.value).toBe(el)
    expect(el.getAttribute('aria-label')).toBe('First')

    ctx.value = {ref: B, 'aria-label': 'Second'}
    await nextTick()
    await nextTick()
    expect(A.value).toBeNull()
    expect(B.value).toBe(el)
    expect(el.getAttribute('aria-label')).toBe('Second')

    slot.value = null
    await nextTick()
    expect(B.value).toBeNull()
    expect(el.hasAttribute('aria-label')).toBe(false)

    slot.value = undefined
    await nextTick()
    expect(B.value).toBe(el)
    expect(el.getAttribute('aria-label')).toBe('Second')

    wrapper.unmount()
    await nextTick()
    expect(B.value).toBeNull()

    const namedCtx = ref({slots: {test: {ref: named, 'aria-label': 'Named'}}})
    const namedSlot = ref<string | null>('test')
    const namedWrapper = mountInDoc(() => {
      provide(ToolbarContext, namedCtx)
      return () => h(Toolbar, {slot: namedSlot.value})
    })
    await nextTick()
    const namedEl = document.querySelector('[aria-label="Named"]') as HTMLElement
    expect(named.value).toBe(namedEl)
    namedSlot.value = null
    await nextTick()
    expect(named.value).toBeNull()
    namedSlot.value = 'test'
    await nextTick()
    expect(named.value).toBe(namedEl)
    namedWrapper.unmount()
    await nextTick()
    expect(named.value).toBeNull()
  })

  it('tracks in-place flat context edits and a nested ref swap without replacing the context object', async () => {
    const A = ref<Element | null>(null)
    const B = ref<Element | null>(null)
    const ctx = ref({
      ref: A,
      orientation: 'horizontal' as 'horizontal' | 'vertical',
      'aria-label': 'Before',
      style: {color: 'red'},
    })
    const wrapper = mountInDoc(() => {
      provide(ToolbarContext, ctx)
      return () => h(Toolbar, {})
    })
    await nextTick()
    const el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(A.value).toBe(el)
    expect(el.getAttribute('aria-orientation')).toBe('horizontal')
    expect(el.getAttribute('data-orientation')).toBe('horizontal')
    expect(el.getAttribute('aria-label')).toBe('Before')
    expect(el.style.color).toBe('red')

    ctx.value.orientation = 'vertical'
    ctx.value['aria-label'] = 'After'
    ctx.value.style.color = 'blue'
    await nextTick()
    expect(el.getAttribute('aria-orientation')).toBe('vertical')
    expect(el.getAttribute('data-orientation')).toBe('vertical')
    expect(el.getAttribute('aria-label')).toBe('After')
    expect(el.style.color).toBe('blue')
    expect(A.value).toBe(el)
    expect(B.value).toBeNull()

    ;(ctx.value as unknown as {ref: typeof B}).ref = B
    await nextTick()
    await nextTick()
    expect(A.value).toBeNull()
    expect(B.value).toBe(el)
    wrapper.unmount()
    await nextTick()
    expect(B.value).toBeNull()
  })

  it('tracks in-place named and default slot edits, ref swaps, and slot-entry replacement', async () => {
    const cases = [
      {name: 'default', slot: undefined as string | undefined, key: DEFAULT_SLOT as PropertyKey},
      {name: 'named', slot: 'test', key: 'test' as PropertyKey},
    ]
    for (const item of cases) {
      const A = ref<Element | null>(null)
      const B = ref<Element | null>(null)
      const C = ref<Element | null>(null)
      const entry = () => ({
        ref: A,
        orientation: 'horizontal' as 'horizontal' | 'vertical',
        'aria-label': 'Before',
        style: {color: 'red'},
      })
      const slots: Record<PropertyKey, ReturnType<typeof entry>> = {[item.key]: entry()}
      if (item.name === 'named') slots[DEFAULT_SLOT] = {ref: ref(null), orientation: 'horizontal', 'aria-label': 'Other', style: {color: 'black'}}
      const ctx = ref({slots, 'aria-label': 'Flat', orientation: 'vertical' as const, style: {color: 'black'}})
      const wrapper = mountInDoc(() => {
        provide(ToolbarContext, ctx)
        return () => h(Toolbar, {slot: item.slot})
      })
      await nextTick()
      const el = document.querySelector('[aria-label="Before"]') as HTMLElement
      expect(A.value, item.name).toBe(el)
      expect(el.getAttribute('aria-orientation'), item.name).toBe('horizontal')
      expect(el.style.color, item.name).toBe('red')

      const selected = ctx.value.slots[item.key]
      selected.orientation = 'vertical'
      selected['aria-label'] = 'After'
      selected.style.color = 'blue'
      await nextTick()
      expect(el.getAttribute('aria-orientation'), item.name).toBe('vertical')
      expect(el.getAttribute('data-orientation'), item.name).toBe('vertical')
      expect(el.getAttribute('aria-label'), item.name).toBe('After')
      expect(el.style.color, item.name).toBe('blue')
      expect(A.value, item.name).toBe(el)

      ;(selected as unknown as {ref: typeof B}).ref = B
      await nextTick()
      await nextTick()
      expect(A.value, item.name).toBeNull()
      expect(B.value, item.name).toBe(el)

      ctx.value.slots[item.key] = {
        ref: C,
        orientation: 'horizontal',
        'aria-label': 'Replaced',
        style: {color: 'green'},
      }
      await nextTick()
      await nextTick()
      expect(B.value, item.name).toBeNull()
      expect(C.value, item.name).toBe(el)
      expect(el.getAttribute('aria-label'), item.name).toBe('Replaced')
      expect(el.getAttribute('aria-orientation'), item.name).toBe('horizontal')
      expect(el.style.color, item.name).toBe('green')
      expect(el.getAttribute('aria-label'), item.name).not.toBe('Flat')
      wrapper.unmount()
      await nextTick()
      expect(C.value, item.name).toBeNull()
      document.body.innerHTML = ''
    }
    expect(ToolbarSubpath).not.toHaveProperty('DEFAULT_SLOT')
    expect(DEFAULT_SLOT).toBe((await import('vue-aria-components')).DEFAULT_SLOT)
  })

  it('throws when a slots bag lacks the requested or default entry instead of inheriting flat props', async () => {
    expect(() => mountInDoc(() => {
      provide(ToolbarContext, {slots: {test: {'aria-label': 'Named'}}, 'aria-label': 'Flat'})
      return () => h(Toolbar, {slot: 'absent'})
    })).toThrow(/Invalid slot "absent"/)

    expect(() => mountInDoc(() => {
      provide(ToolbarContext, {slots: {test: {'aria-label': 'Named'}}, 'aria-label': 'Flat', className: 'flat'})
      return () => h(Toolbar, {})
    })).toThrow(/A slot prop is required/)

    const slot = ref<string | null>('test')
    const errors: string[] = []
    const Host = defineComponent({
      setup() {
        provide(ToolbarContext, {slots: {test: {'aria-label': 'Named'}}, 'aria-label': 'Flat'})
        return () => h(Toolbar, {slot: slot.value})
      },
    })
    const Parent = defineComponent({
      setup() {
        return () => h(Host)
      },
      errorCaptured(error) {
        errors.push(String(error))
        return false
      },
    })
    const wrapper = mount(Parent, {attachTo: document.body})
    await nextTick()
    expect(document.querySelector('[aria-label="Named"]')).not.toBeNull()
    slot.value = 'gone'
    await nextTick()
    expect(errors.join('\n')).toMatch(/Invalid slot "gone"/)
    slot.value = null
    await nextTick()
    expect(document.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBeNull()
    wrapper.unmount()
  })

  it('navigates a Toolbar mounted in an iframe document', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument!
    const host = doc.createElement('div')
    doc.body.appendChild(host)
    const app = createApp({
      setup() {
        return () => h(Toolbar, {'aria-label': 'Frame'}, {
          default: () => [h('button', {type: 'button'}, 'One'), h('button', {type: 'button'}, 'Two')],
        })
      },
    })
    app.mount(host)
    const buttons = [...host.querySelectorAll('button')]
    expect(buttons).toHaveLength(2)
    const nodeView = buttons[0].ownerDocument.defaultView!
    buttons[0].focus()
    const right = new nodeView.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true})
    buttons[0].dispatchEvent(right)
    expect(right.defaultPrevented).toBe(true)
    expect(buttons[0].ownerDocument.activeElement).toBe(buttons[1])
    app.unmount()
  })

  it('calls context and local listeners once and preserves empty classes and merged styles', async () => {
    const contextClick = vi.fn()
    const localClick = vi.fn()
    const replaced = vi.fn()
    let current = contextClick
    const tone = ref('red')
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'onClick', {enumerable: true, configurable: true, get: () => current})
    Object.defineProperty(ctx, 'style', {enumerable: true, configurable: true, get: () => ({color: tone.value, padding: '4px'})})
    Object.defineProperty(ctx, 'className', {enumerable: true, get: () => 'from-context'})
    const className = ref<unknown>('local')
    const tick = ref(0)
    const wrapper = mountInDoc(() => {
      provide(ToolbarContext, ctx)
      return () => h(Toolbar, {
        'aria-label': 'Styled',
        'data-tick': tick.value,
        className: className.value as string,
        style: ({defaultStyle}: {defaultStyle: Record<string, string>; orientation: string}) => defaultStyle,
        onClick: localClick,
      })
    })
    await nextTick()
    const el = document.querySelector('[role="toolbar"]') as HTMLElement
    el.click()
    expect(contextClick).toHaveBeenCalledTimes(1)
    expect(localClick).toHaveBeenCalledTimes(1)
    current = replaced
    tick.value++
    await nextTick()
    el.click()
    expect(replaced).toHaveBeenCalledTimes(1)
    expect(contextClick).toHaveBeenCalledTimes(1)
    expect(localClick).toHaveBeenCalledTimes(2)
    expect(el.style.color).toBe('red')
    expect(el.style.padding).toBe('4px')
    expect(el.className).toContain('from-context')
    expect(el.className).toContain('local')
    expect(el.className).not.toContain('react-aria-Toolbar')
    tone.value = 'blue'
    await nextTick()
    expect(el.style.color).toBe('blue')

    className.value = ''
    await nextTick()
    expect(el.className).toBe('from-context')
    wrapper.unmount()

    const empty = mountInDoc(() => h(Toolbar, {'aria-label': 'Empty', className: ''}))
    await nextTick()
    expect((document.querySelector('[role="toolbar"]') as HTMLElement).className).toBe('')
    empty.unmount()

    const fnEmpty = mountInDoc(() => h(Toolbar, {
      'aria-label': 'Empty',
      className: () => '',
      style: functionStyle.style,
    }))
    await nextTick()
    const styled = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(styled.className).toBe('')
    fnEmpty.unmount()

    const stringCtx: Record<string, any> = {}
    Object.defineProperty(stringCtx, 'style', {enumerable: true, get: () => 'color: red'})
    const kept = mountInDoc(() => {
      provide(ToolbarContext, stringCtx)
      return () => h(Toolbar, {
        'aria-label': 'String',
        className: ({orientation, defaultClassName}: ToolbarRenderProps & {defaultClassName?: string}) =>
          `${defaultClassName} ${orientation}`,
        style: ({defaultStyle}: {defaultStyle?: Record<string, string>}) => defaultStyle ?? {},
      })
    })
    await nextTick()
    const stringEl = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(stringEl.className).toContain('react-aria-Toolbar')
    expect(stringEl.className).toContain('horizontal')
    expect(stringEl.style.color).toBe('red')
    kept.unmount()
  })

  it('releases context ref A when the binding moves to B, opts out, restores, and unmounts', async () => {
    const A = ref<Element | null>(null)
    const B = ref<Element | null>(null)
    let current: unknown = A
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'ref', {enumerable: true, configurable: true, get: () => current})
    const slot = ref<string | null | undefined>(undefined)
    const tick = ref(0)
    const wrapper = mountInDoc(() => {
      provide(ToolbarContext, ctx)
      return () => h(Toolbar, {'aria-label': 'Refs', slot: slot.value, 'data-tick': tick.value})
    })
    await nextTick()
    const el = document.querySelector('[role="toolbar"]') as HTMLElement
    expect(A.value).toBe(el)
    expect(B.value).toBeNull()

    current = B
    tick.value++
    await nextTick()
    await nextTick()
    expect(A.value).toBeNull()
    expect(B.value).toBe(el)

    slot.value = null
    tick.value++
    await nextTick()
    expect(B.value).toBeNull()

    slot.value = undefined
    tick.value++
    await nextTick()
    expect(B.value).toBe(el)

    const nextCtx = ref<Record<string, any> | null>({className: 'replaced', 'aria-label': 'Replaced'})
    const replaced = mountInDoc(() => {
      provide(ToolbarContext, nextCtx)
      return () => h(Toolbar, {})
    })
    await nextTick()
    let replacedEl = document.querySelectorAll('[role="toolbar"]')[1] as HTMLElement
    expect(replacedEl.className).toContain('replaced')
    expect(replacedEl.getAttribute('aria-label')).toBe('Replaced')
    nextCtx.value = {'aria-label': 'Next', className: 'next-class'}
    await nextTick()
    replacedEl = document.querySelectorAll('[role="toolbar"]')[1] as HTMLElement
    expect(replacedEl.getAttribute('aria-label')).toBe('Next')
    expect(replacedEl.className).toContain('next-class')
    expect(replacedEl.className).not.toContain('replaced')

    wrapper.unmount()
    await nextTick()
    expect(B.value).toBeNull()
    replaced.unmount()
  })

  it('nests after mount, captures only the outer toolbar, and follows orientation', async () => {
    const orientation = ref<'horizontal' | 'vertical'>('horizontal')
    const locale = ref('en-US')
    const seen = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mountInDoc(() => h(I18nProvider, {locale: locale.value}, {
      default: () => h('div', [
        h('button', {type: 'button'}, 'Before'),
        h(Toolbar, {'aria-label': 'Tools', orientation: orientation.value}, {
          default: ({orientation: value}: ToolbarRenderProps) => [
            h(Toolbar, {'aria-label': 'Align'}, {
              default: () => [
                h('button', {type: 'button', onKeydown: seen}, 'Left'),
                h('button', {type: 'button'}, 'Center'),
              ],
            }),
            h('hr'),
            h('button', {type: 'button'}, 'Zoom'),
            h('span', {'data-live': value}),
          ],
        }),
        h('button', {type: 'button'}, 'After'),
      ]),
    }))
    await nextTick()
    await nextTick()
    const bars = [...document.querySelectorAll('[aria-label]')] as HTMLElement[]
    const outer = bars.find((el) => el.getAttribute('aria-label') === 'Tools')!
    const inner = bars.find((el) => el.getAttribute('aria-label') === 'Align')!
    expect(outer.getAttribute('role')).toBe('toolbar')
    expect(inner.getAttribute('role')).toBe('group')
    expect(warn.mock.calls.some((call) => String(call[0]).includes('recursive'))).toBe(false)

    const left = [...inner.querySelectorAll('button')][0]
    const center = [...inner.querySelectorAll('button')][1]
    const zoom = [...outer.querySelectorAll('button')].find((node) => node.textContent === 'Zoom')!
    left.focus()
    const right = press(left, 'ArrowRight')
    expect(right.defaultPrevented).toBe(true)
    expect(seen).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(center)
    press(center, 'ArrowRight')
    expect(document.activeElement).toBe(zoom)
    press(zoom, 'ArrowLeft')
    expect(document.activeElement).toBe(center)

    orientation.value = 'vertical'
    await nextTick()
    expect(outer.getAttribute('data-orientation')).toBe('vertical')
    expect(outer.getAttribute('aria-orientation')).toBe('vertical')
    expect(inner.getAttribute('aria-orientation')).toBe('horizontal')
    expect(outer.querySelector('[data-live]')?.getAttribute('data-live')).toBe('vertical')
    center.focus()
    const verticalRight = press(center, 'ArrowRight')
    expect(verticalRight.defaultPrevented).toBe(false)
    press(center, 'ArrowDown')
    expect(document.activeElement).toBe(zoom)

    locale.value = 'he-IL'
    orientation.value = 'horizontal'
    await nextTick()
    left.focus()
    press(left, 'ArrowLeft')
    expect(document.activeElement).toBe(center)
    wrapper.unmount()
    warn.mockRestore()
  })

  it('hydrates nested toolbars without a mismatch and updates the inner role once', async () => {
    const nodeModule = 'node:module'
    const {createRequire} = (await import(nodeModule)) as {
      createRequire: (from: string) => {resolve: (id: string, options?: {paths?: string[]}) => string}
    }
    const require = createRequire(import.meta.url)
    const rendererEntry = require.resolve('@vue/server-renderer/dist/server-renderer.esm-bundler.js', {
      paths: [require.resolve('vue/package.json')],
    })
    const {renderToString} = (await import(rendererEntry)) as {
      renderToString: (app: ReturnType<typeof createSSRApp>) => Promise<string>
    }
    const tree = () => h('div', [
      h(Toolbar, {'aria-label': 'Tools', orientation: 'vertical', className: 'outer', style: {color: 'red'}}, {
        default: () => h(Toolbar, {'aria-label': 'Inner', className: 'inner'}, {
          default: () => h('button', {type: 'button'}, 'One'),
        }),
      }),
    ])
    const html = await renderToString(createSSRApp({setup: () => tree}))
    expect(html).toContain('role="toolbar"')
    expect(html.match(/role="toolbar"/g)?.length).toBe(2)
    expect(html).toContain('aria-label="Tools"')
    expect(html).toContain('aria-label="Inner"')
    expect(html).toContain('data-orientation="vertical"')
    expect(html).toContain('class="outer"')
    expect(html).toContain('class="inner"')

    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    createSSRApp({setup: () => tree}).mount(host)
    await nextTick()
    await nextTick()
    const messages = [...warn.mock.calls, ...error.mock.calls].map((call) => call.join(' '))
    expect(messages.some((message) => /hydration/i.test(message))).toBe(false)
    expect(messages.some((message) => /recursive/i.test(message))).toBe(false)
    const labels = [...host.querySelectorAll('[aria-label]')] as HTMLElement[]
    expect(labels.find((el) => el.getAttribute('aria-label') === 'Tools')?.getAttribute('role')).toBe('toolbar')
    expect(labels.find((el) => el.getAttribute('aria-label') === 'Inner')?.getAttribute('role')).toBe('group')
  })
})
