import {defineComponent, Fragment, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {Label} from 'vue-aria-components'
import type {MeterProps, ProgressBarProps} from 'vue-aria-components'
import {ProgressBar, ProgressBarContext} from '../ProgressBar'
import {Meter, MeterContext} from '../Meter'

afterEach(() => {
  document.body.innerHTML = ''
})

function mountWith(component: any, render: () => any, contextKey?: any, context?: any) {
  return mount(defineComponent({
    setup() {
      if (contextKey) provide(contextKey, context)
      return render
    },
  }), {attachTo: document.body})
}

const cases = [
  {name: 'ProgressBar', Component: ProgressBar, Context: ProgressBarContext, role: 'progressbar', defaultClass: 'react-aria-ProgressBar'},
  {name: 'Meter', Component: Meter, Context: MeterContext, role: 'meter', defaultClass: 'react-aria-Meter'},
] as const

describe('ProgressBar and Meter review fixes', () => {
  for (const {name, Component, Context, role, defaultClass} of cases) {
    it(`${name} keeps the hyphenated ARIA API and reads Vue-normalized runtime keys`, async () => {
      const ctx = {
        'aria-label': 'context label',
        'aria-labelledby': 'context-labelledby',
        'aria-describedby': 'context-describedby',
        'aria-details': 'context-details',
      }
      const local = mountWith(Component, () => h(Component, {
        'aria-label': 'local label',
        'aria-labelledby': 'local-labelledby',
        'aria-describedby': 'local-describedby',
        'aria-details': 'local-details',
        value: 25,
      }), Context, ctx)
      await nextTick()
      let el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.getAttribute('aria-label')).toBe('local label')
      // Official `useLabels` points at the element itself when both
      // aria-label and aria-labelledby exist.
      expect(el.getAttribute('aria-labelledby')).toBe(`${el.id} local-labelledby`)
      expect(el.getAttribute('aria-describedby')).toBe('local-describedby')
      expect(el.getAttribute('aria-details')).toBe('local-details')
      local.unmount()

      const inherited = mountWith(Component, () => h(Component, {value: 25}), Context, ctx)
      await nextTick()
      el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.getAttribute('aria-label')).toBe('context label')
      expect(el.getAttribute('aria-labelledby')).toBe(`${el.id} context-labelledby`)
      expect(el.getAttribute('aria-describedby')).toBe('context-describedby')
      expect(el.getAttribute('aria-details')).toBe('context-details')
      inherited.unmount()
    })

    it(`${name} associates a wrapper component that renders Label`, async () => {
      const Caption = defineComponent({
        name: 'Caption',
        setup() {
          return () => h(Label, {}, () => 'Wrapped label')
        },
      })
      const wrapper = mountWith(Component, () => h(Component, {}, {
        default: () => h(Caption),
      }))
      await nextTick()
      await nextTick()
      const el = document.querySelector(`[role="${role}"]`) as HTMLElement
      const label = el.querySelector('span') as HTMLElement
      expect(label.textContent).toBe('Wrapped label')
      expect(label.id).toBeTruthy()
      expect(el.getAttribute('aria-labelledby')).toBe(label.id)
      wrapper.unmount()
    })

    it(`${name} follows dynamic Label mount, text, unmount, and remount in the real DOM`, async () => {
      const show = ref(false)
      const text = ref('Alpha')
      const wrapper = mountWith(Component, () => h(Component, {}, {
        default: () => show.value
          ? h(Label, {}, () => text.value)
          : h('span', {class: 'placeholder'}, 'placeholder'),
      }))
      await nextTick()
      let el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.hasAttribute('aria-labelledby')).toBe(false)

      show.value = true
      await nextTick()
      await nextTick()
      let label = el.querySelector('span') as HTMLElement
      const firstId = label.id
      expect(label.textContent).toBe('Alpha')
      expect(firstId).toBeTruthy()
      expect(el.getAttribute('aria-labelledby')).toBe(firstId)

      text.value = 'Beta'
      await nextTick()
      label = el.querySelector('span') as HTMLElement
      expect(label.textContent).toBe('Beta')
      expect(label.id).toBe(firstId)

      show.value = false
      await nextTick()
      await nextTick()
      expect(el.querySelector('span.placeholder')).not.toBeNull()
      expect(el.hasAttribute('aria-labelledby')).toBe(false)

      show.value = true
      await nextTick()
      await nextTick()
      const restored = el.querySelector('span') as HTMLElement
      expect(restored.textContent).toBe('Beta')
      expect(restored.id).toBe(firstId)
      expect(el.getAttribute('aria-labelledby')).toBe(restored.id)
      wrapper.unmount()
    })

    it(`${name} fully opts out of context when slot is explicitly null`, async () => {
      const ctx: Record<string, any> = {}
      Object.defineProperty(ctx, 'value', {enumerable: true, get: () => 70})
      Object.defineProperty(ctx, 'className', {enumerable: true, get: () => 'inherited'})
      Object.defineProperty(ctx, 'style', {enumerable: true, get: () => ({color: 'red'})})
      Object.defineProperty(ctx, 'aria-describedby', {enumerable: true, get: () => 'context-describedby'})
      ctx['data-foo'] = 'context'
      const slot = ref<string | null | undefined>(undefined)
      const wrapper = mountWith(Component, () => h(Component, {
        slot: slot.value,
        'aria-label': 'Local',
      }), Context, ctx)
      await nextTick()
      let el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.getAttribute('aria-valuenow')).toBe('70')
      expect(el.className).toContain('inherited')
      expect(el.style.color).toBe('red')
      expect(el.getAttribute('data-foo')).toBe('context')
      expect(el.getAttribute('aria-describedby')).toBe('context-describedby')

      slot.value = null
      await nextTick()
      el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.getAttribute('aria-valuenow')).toBe('0')
      expect(el.className).toBe(defaultClass)
      expect(el.style.color).toBe('')
      expect(el.hasAttribute('data-foo')).toBe(false)
      expect(el.hasAttribute('aria-describedby')).toBe(false)
      expect(el.getAttribute('slot')).toBeNull()

      slot.value = undefined
      await nextTick()
      el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.getAttribute('aria-valuenow')).toBe('70')
      expect(el.className).toContain('inherited')
      expect(el.style.color).toBe('red')
      wrapper.unmount()
    })

    it(`${name} releases the old context ref binding on the same instance`, async () => {
      const A = ref<Element | null>(null)
      const B = ref<Element | null>(null)
      let current: any = A
      const ctx: Record<string, any> = {}
      Object.defineProperty(ctx, 'ref', {enumerable: true, configurable: true, get: () => current})
      const slot = ref<string | null | undefined>(undefined)
      const tick = ref(0)
      const wrapper = mountWith(Component, () => h(Component, {
        slot: slot.value,
        'aria-label': 'Named',
        'data-tick': tick.value,
      }), Context, ctx)
      await nextTick()
      const el = document.querySelector(`[role="${role}"]`) as HTMLElement
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

      wrapper.unmount()
      await nextTick()
      expect(B.value).toBeNull()
    })

    it(`${name} preserves an explicitly empty className`, async () => {
      const className = ref<unknown>('custom')
      const wrapper = mountWith(Component, () => h(Component, {
        'aria-label': 'Empty',
        className: className.value,
      }))
      await nextTick()
      let el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.className).toBe('custom')

      className.value = ''
      await nextTick()
      el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.className).toBe('')

      className.value = () => ''
      await nextTick()
      el = document.querySelector(`[role="${role}"]`) as HTMLElement
      expect(el.className).toBe('')
      wrapper.unmount()

      const initial = mountWith(Component, () => h(Component, {
        'aria-label': 'Empty',
        className: '',
      }))
      await nextTick()
      expect((document.querySelector(`[role="${role}"]`) as HTMLElement).className).toBe('')
      initial.unmount()
    })
  }

  it('names Meter from Fragment, nested, and scoped labels without cross-instance ids', async () => {
    const wrapper = mountWith(Meter, () => h('div', [
      h(Meter, {'data-testid': 'fragment'}, {
        default: () => h(Fragment, [h(Label, {}, () => 'Frag')]),
      }),
      h(Meter, {value: 40, 'data-testid': 'scoped'}, {
        default: ({valueText}: {valueText?: string}) => h(Label, {}, () => valueText ?? ''),
      }),
      h(Meter, {'data-testid': 'nested'}, {
        default: () => h('div', {class: 'nest'}, [h(Label, {}, () => 'Nested')]),
      }),
    ]))
    await nextTick()
    const fragment = document.querySelector('[data-testid="fragment"]') as HTMLElement
    const scoped = document.querySelector('[data-testid="scoped"]') as HTMLElement
    const nested = document.querySelector('[data-testid="nested"]') as HTMLElement
    const fragLabel = fragment.querySelector('span') as HTMLElement
    const scopedLabel = scoped.querySelector('span') as HTMLElement
    const nestedLabel = nested.querySelector('span') as HTMLElement
    expect(fragment.getAttribute('aria-labelledby')).toBe(fragLabel.id)
    expect(scoped.getAttribute('aria-labelledby')).toBe(scopedLabel.id)
    expect(nested.getAttribute('aria-labelledby')).toBe(nestedLabel.id)
    expect(scopedLabel.textContent).toBe('40%')
    expect(new Set([fragLabel.id, scopedLabel.id, nestedLabel.id]).size).toBe(3)
    wrapper.unmount()
  })

  it('accepts accurate object and function style assignments for both components', async () => {
    const progressObject: ProgressBarProps = {style: {color: 'red'}}
    const progressFunction: ProgressBarProps = {
      style: ({percentage, valueText, isIndeterminate, defaultStyle}) => ({
        width: `${percentage ?? 0}%`,
        color: defaultStyle.color ?? 'black',
        opacity: valueText !== undefined && !isIndeterminate ? 1 : 0,
      }),
    }
    const meterObject: MeterProps = {style: {color: 'blue'}}
    const meterFunction: MeterProps = {
      style: ({percentage, valueText, defaultStyle}) => ({
        width: `${percentage}%`,
        color: defaultStyle.color ?? 'black',
        opacity: valueText === undefined ? 0 : 1,
      }),
    }
    expect(progressObject.style).toEqual({color: 'red'})
    expect(typeof progressFunction.style).toBe('function')
    expect(meterObject.style).toEqual({color: 'blue'})
    expect(typeof meterFunction.style).toBe('function')

    const wrapper = mountWith(ProgressBar, () => h(ProgressBar, {
      'aria-label': 'Styled',
      value: 25,
      ...progressFunction,
    }))
    await nextTick()
    const el = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(el.style.width).toBe('25%')
    wrapper.unmount()

    const meterWrapper = mountWith(Meter, () => h(Meter, {
      'aria-label': 'Styled',
      value: 25,
      ...meterFunction,
    }))
    await nextTick()
    const meterEl = document.querySelector('[role="meter"]') as HTMLElement
    expect(meterEl.style.width).toBe('25%')
    meterWrapper.unmount()
  })
})
