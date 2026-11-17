import {defineComponent, Fragment, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {I18nProvider, Label} from 'vue-aria-components'
import {ProgressBar, ProgressBarContext} from '../ProgressBar'
import {Meter, MeterContext} from '../Meter'
import * as aria from 'vue-aria'
import * as components from 'vue-aria-components'
import * as stately from 'vue-stately'
import type {
  AriaMeterProps,
  AriaProgressBarProps,
  MeterAria,
  MeterProps as AriaMeterPropsAlias,
  ProgressBarAria,
  ProgressBarBaseProps,
  ProgressBarProps as AriaProgressBarPropsAlias,
} from 'vue-aria'
import type {
  LabelProps,
  MeterProps,
  MeterRenderProps,
  ProgressBarProps,
  ProgressBarRenderProps,
} from 'vue-aria-components'

type Expect<T extends true> = T
type HasNo<T, K extends PropertyKey> = K extends keyof T ? false : true

function mountInDoc(component: any) {
  return mount(component, {attachTo: document.body})
}

afterEach(() => {
  document.body.innerHTML = ''
})

function bar(props: Record<string, any> = {}, children?: any) {
  return h(ProgressBar, {'aria-label': 'Loading', value: 25, ...props}, children)
}

describe('ProgressBar', () => {
  it('renders a determinate progressbar and a span label with no for', async () => {
    let renderProps: ProgressBarRenderProps | undefined
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(ProgressBar, {value: 25, 'data-foo': 'bar'}, {
          default: (values: ProgressBarRenderProps) => {
            renderProps = values
            return [
              h(Label, {}, () => 'Loading'),
              h('span', {class: 'value'}, values.valueText ?? ''),
            ]
          },
        })
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    const label = el.querySelector('span') as HTMLElement
    expect(el.className).toBe('react-aria-ProgressBar')
    expect(el.getAttribute('aria-valuenow')).toBe('25')
    expect(el.getAttribute('aria-valuemin')).toBe('0')
    expect(el.getAttribute('aria-valuemax')).toBe('100')
    expect(el.getAttribute('aria-valuetext')).toBe('25%')
    expect(el.getAttribute('data-foo')).toBe('bar')
    expect(el.getAttribute('aria-labelledby')).toBe(label.id)
    expect(label.textContent).toBe('Loading')
    expect(label.tagName).toBe('SPAN')
    expect(label.hasAttribute('for')).toBe(false)
    expect(el.querySelector('.value')?.textContent).toBe('25%')
    expect(renderProps).toEqual({percentage: 25, valueText: '25%', isIndeterminate: false})
    expect(el.querySelector('input')).toBeNull()
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(el.hasAttribute('aria-live')).toBe(false)
    wrapper.unmount()
  })

  it('updates the mounted progressbar when value, range, format, language, and indeterminate change', async () => {
    const value = ref(50)
    const maxValue = ref(100)
    const formatOptions = ref<Intl.NumberFormatOptions | undefined>(undefined)
    const locale = ref('en-US')
    const indeterminate = ref(false)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(I18nProvider, {locale: locale.value}, () => h(ProgressBar, {
          'aria-label': 'Loading',
          value: value.value,
          maxValue: maxValue.value,
          formatOptions: formatOptions.value,
          isIndeterminate: indeterminate.value,
        }, {
          default: ({percentage, valueText}: ProgressBarRenderProps) => h('span', {class: 'pct'}, `${percentage ?? 'none'}:${valueText ?? 'none'}`),
        }))
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    const text = () => el.querySelector('.pct')?.textContent
    expect(el.getAttribute('aria-valuenow')).toBe('50')
    expect(el.getAttribute('aria-valuetext')).toBe('50%')
    expect(text()).toBe('50:50%')
    value.value = 25
    maxValue.value = 200
    await nextTick()
    expect(el.getAttribute('aria-valuenow')).toBe('25')
    expect(el.getAttribute('aria-valuemax')).toBe('200')
    expect(el.getAttribute('aria-valuetext')).toBe('13%')
    expect(text()).toBe('12.5:13%')
    formatOptions.value = {style: 'decimal'}
    await nextTick()
    expect(el.getAttribute('aria-valuetext')).toBe(new Intl.NumberFormat('en-US', {style: 'decimal'}).format(25))
    locale.value = 'de-DE'
    formatOptions.value = undefined
    await nextTick()
    const german = new Intl.NumberFormat('de-DE', {style: 'percent'}).format(0.125)
    expect(el.getAttribute('aria-valuetext')).toBe(german)
    indeterminate.value = true
    await nextTick()
    expect(el.hasAttribute('aria-valuenow')).toBe(false)
    expect(el.hasAttribute('aria-valuetext')).toBe(false)
    expect(el.getAttribute('aria-valuemin')).toBe('0')
    expect(el.getAttribute('aria-valuemax')).toBe('200')
    expect(text()).toBe('none:none')
    indeterminate.value = false
    await nextTick()
    expect(el.getAttribute('aria-valuenow')).toBe('25')
    expect(el.getAttribute('aria-valuetext')).toBe(german)
    wrapper.unmount()
  })

  it('clamps the DOM value and renders 0 percent for an empty range', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(ProgressBar, {value: 5, minValue: 5, maxValue: 5, 'aria-label': 'Loading'}, {
          default: ({percentage}: ProgressBarRenderProps) => h('span', {class: 'pct'}, String(percentage)),
        })
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(el.getAttribute('aria-valuenow')).toBe('5')
    expect(el.getAttribute('aria-valuemin')).toBe('5')
    expect(el.getAttribute('aria-valuemax')).toBe('5')
    expect(el.getAttribute('aria-valuetext')).toBe('0%')
    expect(el.querySelector('.pct')?.textContent).toBe('0')
    wrapper.unmount()

    const high = mountInDoc(defineComponent({
      setup() {
        return () => bar({value: 150, minValue: 0, maxValue: 100})
      },
    }))
    await nextTick()
    expect(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100')
    expect(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuetext')).toBe('100%')
    high.unmount()
  })

  it('prefers a truthy valueLabel and restores the formatted text when it is removed', async () => {
    const valueLabel = ref<unknown>('1 of 4')
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(ProgressBar, {'aria-label': 'Steps', value: 25, valueLabel: valueLabel.value})
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(el.getAttribute('aria-valuetext')).toBe('1 of 4')
    valueLabel.value = ''
    await nextTick()
    expect(el.getAttribute('aria-valuetext')).toBe('25%')
    valueLabel.value = 0
    await nextTick()
    expect(el.getAttribute('aria-valuetext')).toBe('25%')
    valueLabel.value = '0'
    await nextTick()
    expect(el.getAttribute('aria-valuetext')).toBe('0')
    wrapper.unmount()
  })

  it('names the progressbar from Fragment, nested, and scoped labels and drops the name when the label goes away', async () => {
    const show = ref(true)
    const text = ref('Alpha')
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h('div', [
          h(ProgressBar, {'data-testid': 'fragment'}, {
            default: () => h(Fragment, [show.value ? h(Label, {}, () => text.value) : null]),
          }),
          h(ProgressBar, {value: 40, 'data-testid': 'scoped'}, {
            default: ({valueText}: ProgressBarRenderProps) => h(Label, {}, () => valueText ?? ''),
          }),
          h(ProgressBar, {'data-testid': 'nested'}, {
            default: () => h('div', {class: 'nest'}, [h(Label, {}, () => 'Nested')]),
          }),
        ])
      },
    }))
    await nextTick()
    const fragment = document.querySelector('[data-testid="fragment"]') as HTMLElement
    const scoped = document.querySelector('[data-testid="scoped"]') as HTMLElement
    const nested = document.querySelector('[data-testid="nested"]') as HTMLElement
    const alpha = fragment.querySelector('span') as HTMLElement
    const nestedLabel = nested.querySelector('span') as HTMLElement
    expect(alpha.textContent).toBe('Alpha')
    expect(fragment.getAttribute('aria-labelledby')).toBe(alpha.id)
    expect(nestedLabel.textContent).toBe('Nested')
    expect(nested.getAttribute('aria-labelledby')).toBe(nestedLabel.id)
    const scopedLabel = scoped.querySelector('span') as HTMLElement
    expect(scopedLabel.textContent).toBe('40%')
    expect(scoped.getAttribute('aria-labelledby')).toBe(scopedLabel.id)
    expect(new Set([alpha.id, nestedLabel.id, scopedLabel.id]).size).toBe(3)
    text.value = 'Beta'
    await nextTick()
    expect(alpha.textContent).toBe('Beta')
    expect(fragment.getAttribute('aria-labelledby')).toBe(alpha.id)
    show.value = false
    await nextTick()
    expect(fragment.querySelector('span')).toBeNull()
    expect(fragment.hasAttribute('aria-labelledby')).toBe(false)
    show.value = true
    await nextTick()
    const restored = fragment.querySelector('span') as HTMLElement
    expect(restored.textContent).toBe('Beta')
    expect(fragment.getAttribute('aria-labelledby')).toBe(restored.id)
    wrapper.unmount()
    expect(document.getElementById(restored.id)).toBeNull()
  })

  it('uses live context defaults, lets explicit false override indeterminate, and merges object styles', async () => {
    const value = ref(10)
    const indeterminate = ref(true)
    const tone = ref('green')
    const ctx: Record<string, any> = {'data-foo': 'bar'}
    Object.defineProperty(ctx, 'value', {enumerable: true, configurable: true, get: () => value.value})
    Object.defineProperty(ctx, 'isIndeterminate', {enumerable: true, configurable: true, get: () => indeterminate.value})
    Object.defineProperty(ctx, 'className', {enumerable: true, configurable: true, get: () => 'from-context'})
    Object.defineProperty(ctx, 'style', {enumerable: true, configurable: true, get: () => ({color: tone.value, padding: '4px'})})
    const defaults = mountInDoc(defineComponent({
      setup() {
        provide(ProgressBarContext, ctx)
        return () => h(ProgressBar, {'aria-label': 'Loading'})
      },
    }))
    await nextTick()
    const open = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(open.hasAttribute('aria-valuenow')).toBe(false)
    expect(open.getAttribute('data-foo')).toBe('bar')
    defaults.unmount()

    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(ProgressBarContext, ctx)
        return () => h(ProgressBar, {
          'aria-label': 'Loading',
          isIndeterminate: false,
          className: 'local',
          style: ({defaultStyle}: {defaultStyle?: Record<string, string>}) => defaultStyle ?? {},
        })
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(el.getAttribute('aria-valuenow')).toBe('10')
    expect(el.className).toContain('from-context')
    expect(el.className).toContain('local')
    expect(el.className).not.toContain('react-aria-ProgressBar')
    expect(el.style.color).toBe('green')
    expect(el.style.padding).toBe('4px')
    value.value = 40
    tone.value = 'blue'
    await nextTick()
    expect(el.getAttribute('aria-valuenow')).toBe('40')
    expect(el.getAttribute('aria-valuetext')).toBe('40%')
    expect(el.style.color).toBe('blue')
    wrapper.unmount()
  })

  it('keeps a string context style when the local style is a function that returns defaultStyle', async () => {
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'style', {enumerable: true, configurable: true, get: () => 'color: red'})
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(ProgressBarContext, ctx)
        return () => h(ProgressBar, {
          'aria-label': 'Loading',
          value: 25,
          className: ({isIndeterminate}: ProgressBarRenderProps) => (isIndeterminate ? 'spin' : 'still'),
          style: ({defaultStyle}: {defaultStyle?: Record<string, string>}) => defaultStyle ?? {},
        })
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(el.className).toContain('still')
    expect(el.className).not.toBe('')
    expect(el.style.color).toBe('red')
    wrapper.unmount()
  })

  it('calls context and local click listeners once, then the replacement after the next render', async () => {
    const first = vi.fn()
    const local = vi.fn()
    const next = vi.fn()
    let current = first
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'onClick', {enumerable: true, configurable: true, get: () => current})
    const tick = ref(0)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(ProgressBarContext, ctx)
        return () => h(ProgressBar, {'aria-label': 'Loading', 'data-tick': String(tick.value), onClick: local})
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    el.click()
    expect(first).toHaveBeenCalledTimes(1)
    expect(local).toHaveBeenCalledTimes(1)
    current = next
    tick.value = 1
    await nextTick()
    el.click()
    expect(first).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
    expect(local).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('sets context and local refs on mount, moves them to the replacement element, and clears them on unmount', async () => {
    const contextRef = ref<Element | null>(null)
    const localRef = ref<Element | null>(null)
    const key = ref('a')
    const ctx: Record<string, any> = {ref: contextRef}
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(ProgressBarContext, ctx)
        return () => h(ProgressBar, {key: key.value, ref: localRef, 'aria-label': 'Loading'})
      },
    }))
    await nextTick()
    const first = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(contextRef.value).toBe(first)
    expect(localRef.value).toBe(first)
    key.value = 'b'
    await nextTick()
    const second = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(second).not.toBe(first)
    expect(contextRef.value).toBe(second)
    expect(localRef.value).toBe(second)
    wrapper.unmount()
    await nextTick()
    expect(contextRef.value).toBeNull()
    expect(localRef.value).toBeNull()
  })

  it('does not add a window or document listener while mounting', async () => {
    const windowCalls: string[] = []
    const documentCalls: string[] = []
    const windowAdd = window.addEventListener.bind(window)
    const documentAdd = document.addEventListener.bind(document)
    const windowSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      windowCalls.push(String(type))
      windowAdd(type, listener as EventListener, options)
    })
    const documentSpy = vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      documentCalls.push(String(type))
      documentAdd(type, listener as EventListener, options)
    })
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => bar()
      },
    }))
    await nextTick()
    expect(windowCalls).toEqual([])
    expect(documentCalls).toEqual([])
    expect(document.querySelector('input')).toBeNull()
    windowSpy.mockRestore()
    documentSpy.mockRestore()
    wrapper.unmount()
  })

  it('reads a named slot from ProgressBarContext', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(ProgressBarContext, {slots: {test: {'aria-label': 'Slotted', 'data-slot': 'yes'}}})
        return () => h(ProgressBar, {slot: 'test', value: 5})
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(el.getAttribute('slot')).toBe('test')
    expect(el.getAttribute('aria-label')).toBe('Slotted')
    expect(el.getAttribute('data-slot')).toBe('yes')
    expect(el.getAttribute('aria-valuetext')).toBe('5%')
    wrapper.unmount()
  })
})

describe('Meter', () => {
  it('renders a meter with percentage and valueText only', async () => {
    let keys: string[] = []
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Meter, {value: 25, 'data-foo': 'bar'}, {
          default: (values: MeterRenderProps) => {
            keys = Object.keys(values)
            return [
              h(Label, {}, () => 'Storage'),
              h('span', {class: 'pct'}, String(values.percentage)),
            ]
          },
        })
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="meter"]') as HTMLElement
    const label = el.querySelector('span') as HTMLElement
    expect(document.querySelector('[role="progressbar"]')).toBeNull()
    expect(el.className).toBe('react-aria-Meter')
    expect(el.getAttribute('aria-valuenow')).toBe('25')
    expect(el.getAttribute('aria-valuetext')).toBe('25%')
    expect(el.getAttribute('aria-labelledby')).toBe(label.id)
    expect(label.tagName).toBe('SPAN')
    expect(label.hasAttribute('for')).toBe(false)
    expect(keys).toEqual(['percentage', 'valueText'])
    expect(el.querySelector('.pct')?.textContent).toBe('25')
    expect(el.querySelector('input')).toBeNull()
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(el.getAttribute('data-foo')).toBe('bar')
    wrapper.unmount()
  })

  it('formats a context range, falls back from an empty value label, and renders 0 percent for an empty range', async () => {
    const value = ref(3)
    const valueLabel = ref<unknown>('full')
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'minValue', {enumerable: true, get: () => 0})
    Object.defineProperty(ctx, 'maxValue', {enumerable: true, get: () => 6})
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(MeterContext, ctx)
        return () => h(Meter, {value: value.value, valueLabel: valueLabel.value}, {
          default: ({percentage}: MeterRenderProps) => h('span', {class: 'pct'}, String(percentage)),
        })
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="meter"]') as HTMLElement
    expect(el.getAttribute('aria-valuenow')).toBe('3')
    expect(el.getAttribute('aria-valuemax')).toBe('6')
    expect(el.getAttribute('aria-valuetext')).toBe('full')
    expect(el.querySelector('.pct')?.textContent).toBe('50')
    valueLabel.value = ''
    await nextTick()
    expect(el.getAttribute('aria-valuetext')).toBe('50%')
    value.value = 0
    await nextTick()
    wrapper.unmount()

    const empty = mountInDoc(defineComponent({
      setup() {
        return () => h(Meter, {value: 0, minValue: 0, maxValue: 0, 'aria-label': 'Empty'}, {
          default: ({percentage}: MeterRenderProps) => h('span', {class: 'pct'}, String(percentage)),
        })
      },
    }))
    await nextTick()
    const zero = document.querySelector('[role="meter"]') as HTMLElement
    expect(zero.getAttribute('aria-valuetext')).toBe('0%')
    expect(zero.querySelector('.pct')?.textContent).toBe('0')
    empty.unmount()
  })

  it('keeps a string context style beside a local style function', async () => {
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'style', {enumerable: true, get: () => 'color: red'})
    Object.defineProperty(ctx, 'className', {enumerable: true, get: () => 'from-context'})
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(MeterContext, ctx)
        return () => h(Meter, {
          'aria-label': 'Storage',
          className: 'local',
          style: ({defaultStyle}: {defaultStyle?: Record<string, string>}) => defaultStyle ?? {},
        })
      },
    }))
    await nextTick()
    const el = document.querySelector('[role="meter"]') as HTMLElement
    expect(el.style.color).toBe('red')
    expect(el.className).toContain('from-context')
    expect(el.className).toContain('local')
    wrapper.unmount()
  })
})

describe('ProgressBar and Meter public exports', () => {
  it('exports the official surfaces and refuses the denylist', async () => {
    expect(typeof aria.useProgressBar).toBe('function')
    expect(typeof aria.useMeter).toBe('function')
    expect(components.ProgressBar).toBeTruthy()
    expect(components.ProgressBarContext).toBeTruthy()
    expect(components.Meter).toBeTruthy()
    expect(components.MeterContext).toBeTruthy()
    expect((aria as any).useProgressCircle).toBeUndefined()
    expect((components as any).useProgressBar).toBeUndefined()
    expect((components as any).useMeter).toBeUndefined()
    expect((stately as any).useProgressBar).toBeUndefined()
    expect((stately as any).useMeter).toBeUndefined()

    const progressEntry = await import('vue-aria/useProgressBar')
    const meterEntry = await import('vue-aria/useMeter')
    const progressComponent = await import('vue-aria-components/ProgressBar')
    const meterComponent = await import('vue-aria-components/Meter')
    expect(typeof progressEntry.useProgressBar).toBe('function')
    expect((progressEntry as any).useMeter).toBeUndefined()
    expect(typeof meterEntry.useMeter).toBe('function')
    expect((meterEntry as any).useProgressBar).toBeUndefined()
    expect(progressComponent.ProgressBar).toBeTruthy()
    expect(progressComponent.ProgressBarContext).toBeTruthy()
    expect(progressComponent.Meter).toBeTruthy()
    expect((progressComponent as any).MeterContext).toBeUndefined()
    expect((progressComponent as any).Label).toBeUndefined()
    expect(meterComponent.Meter).toBeTruthy()
    expect(meterComponent.Label).toBeTruthy()
    expect((meterComponent as any).MeterContext).toBeUndefined()
    expect((meterComponent as any).ProgressBar).toBeUndefined()

    const denied = [
      'vue-aria-components/MeterContext',
      'vue-aria-components/ProgressBarContext',
      'vue-stately/useProgressBar',
      'vue-aria/useProgressCircle',
    ]
    for (const id of denied) {
      await expect(import(/* @vite-ignore */ id)).rejects.toBeTruthy()
    }

    const typeProbe = (
      _base: ProgressBarBaseProps | null,
      _ariaBase: AriaProgressBarPropsAlias | null,
      _ariaProps: AriaProgressBarProps | null,
      _aria: ProgressBarAria | null,
      _meterProps: AriaMeterPropsAlias | null,
      _meterAriaProps: AriaMeterProps | null,
      _meterAria: MeterAria | null,
      _component: ProgressBarProps | null,
      _render: ProgressBarRenderProps | null,
      _meter: MeterProps | null,
      _meterRender: MeterRenderProps | null,
      _label: LabelProps | null,
    ) => _base ?? _ariaBase ?? _ariaProps ?? _aria ?? _meterProps ?? _meterAriaProps ?? _meterAria ?? _component ?? _render ?? _meter ?? _meterRender ?? _label
    const fields = (render: ProgressBarRenderProps, meter: MeterRenderProps) => [
      render.percentage,
      render.valueText,
      render.isIndeterminate,
      meter.percentage,
      meter.valueText,
    ]
    const absent = [
      true as Expect<HasNo<ProgressBarProps, 'label'>>,
      true as Expect<HasNo<MeterProps, 'isIndeterminate'>>,
      true as Expect<HasNo<MeterRenderProps, 'isIndeterminate'>>,
      true as Expect<HasNo<AriaMeterProps, 'isIndeterminate'>>,
      true as Expect<HasNo<ProgressBarRenderProps, 'value'>>,
    ]
    expect(typeof typeProbe).toBe('function')
    expect(typeof fields).toBe('function')
    expect(absent.every(Boolean)).toBe(true)
  })
})
