/**
 * `useToggleButtonGroup` / `useToggleButtonGroupItem` against `react-aria` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc.
 * Single selection is a radiogroup. Multiple selection keeps toolbar semantics.
 * Arrows move focus and do not change the selection.
 */

import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {I18nProvider} from '../../i18n/I18nProvider'
import {useToggleGroupState} from '../../../../vue-stately/src/toggle/useToggleGroupState'
import {useToggleButtonGroup, useToggleButtonGroupItem} from '../useToggleButtonGroup'
import type {ToggleGroupState} from '../../../../vue-stately/src/toggle/useToggleGroupState'

afterEach(() => {
  document.body.innerHTML = ''
})

function domProps(source: Record<string, any>, assign?: (el: Element | null) => void) {
  const dom: Record<string, any> = {}
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (value !== undefined) dom[key] = value
  }
  if (assign) dom.ref = assign
  return dom
}

function mountGroup(props: Record<string, any> = {}) {
  const host = ref<HTMLElement | null>(null)
  const itemHosts = [ref<HTMLElement | null>(null), ref<HTMLElement | null>(null)]
  let state!: ToggleGroupState
  const ids = ['foo', 'bar'] as const
  const wrapper = mount(defineComponent({
    setup() {
      state = useToggleGroupState(props)
      const group = useToggleButtonGroup(props, state, host)
      const items = ids.map((id, index) => useToggleButtonGroupItem({
        id,
        isDisabled: index === 0 ? props.itemDisabled : false,
        elementType: props.itemElement,
      }, state, itemHosts[index]!))
      return () => h('div', domProps(group.groupProps, (el) => {
        host.value = el as HTMLElement | null
      }), items.map((item, index) => h(
        props.itemElement ?? 'button',
        domProps(item.buttonProps, (el) => {
          itemHosts[index]!.value = el as HTMLElement | null
        }),
        ids[index],
      )))
    },
  }), {attachTo: document.body})
  return {
    wrapper,
    get state() {
      return state
    },
    get el() {
      return host.value as HTMLElement
    },
    buttons() {
      return [...host.value!.querySelectorAll(props.itemElement ?? 'button')] as HTMLElement[]
    },
  }
}

describe('useToggleButtonGroup', () => {
  it('uses radio semantics for single selection and does not put the item id on the DOM', async () => {
    const seen: string[][] = []
    const view = mountGroup({
      'aria-label': 'Format',
      onSelectionChange: (keys: Set<string>) => seen.push([...keys]),
    })
    await nextTick()
    expect(view.el.getAttribute('role')).toBe('radiogroup')
    expect(view.el.getAttribute('aria-orientation')).toBe('horizontal')
    expect(view.el.getAttribute('aria-label')).toBe('Format')
    const [foo, bar] = view.buttons()
    expect(foo.getAttribute('role')).toBe('radio')
    expect(bar.getAttribute('role')).toBe('radio')
    expect(foo.getAttribute('aria-checked')).toBe('false')
    expect(foo.hasAttribute('aria-pressed')).toBe(false)
    expect(foo.hasAttribute('id')).toBe(false)
    foo.click()
    await nextTick()
    expect(seen.map((keys) => keys.slice().sort())).toEqual([['foo']])
    expect(foo.getAttribute('aria-checked')).toBe('true')
    expect(bar.getAttribute('aria-checked')).toBe('false')
    foo.click()
    await nextTick()
    expect(foo.getAttribute('aria-checked')).toBe('false')
    view.wrapper.unmount()
  })

  it('uses toolbar semantics and aria-pressed for multiple selection', async () => {
    const view = mountGroup({selectionMode: 'multiple', 'aria-label': 'Align'})
    await nextTick()
    expect(view.el.getAttribute('role')).toBe('toolbar')
    const [foo, bar] = view.buttons()
    expect(foo.getAttribute('role')).toBeNull()
    expect(foo.getAttribute('aria-pressed')).toBe('false')
    expect(foo.hasAttribute('aria-checked')).toBe(false)
    foo.click()
    bar.click()
    await nextTick()
    expect(foo.getAttribute('aria-pressed')).toBe('true')
    expect(bar.getAttribute('aria-pressed')).toBe('true')
    expect([...view.state.selectedKeys].sort()).toEqual(['bar', 'foo'])
    view.wrapper.unmount()
  })

  it('moves focus with arrows and does not change the selection', async () => {
    const seen: number[] = []
    const view = mountGroup({onSelectionChange: () => seen.push(1), 'aria-label': 'Format'})
    await nextTick()
    const [foo, bar] = view.buttons()
    foo.focus()
    const right = new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true})
    foo.dispatchEvent(right)
    expect(right.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(bar)
    expect(foo.getAttribute('aria-checked')).toBe('false')
    expect(bar.getAttribute('aria-checked')).toBe('false')
    expect(seen).toEqual([])
    const home = new KeyboardEvent('keydown', {key: 'Home', bubbles: true, cancelable: true})
    bar.dispatchEvent(home)
    expect(home.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(bar)
    const end = new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true})
    bar.dispatchEvent(end)
    expect(document.activeElement).toBe(bar)
    view.wrapper.unmount()
  })

  it('reverses horizontal arrows for RTL and uses vertical arrows when orientation changes', async () => {
    const locale = ref('ar')
    const orientation = ref<'horizontal' | 'vertical'>('horizontal')
    const host = ref<HTMLElement | null>(null)
    const Group = defineComponent({
      setup() {
        const state = useToggleGroupState({})
        const group = useToggleButtonGroup({
          orientation: () => orientation.value,
          'aria-label': 'Format',
        }, state, host)
        const first = ref<HTMLElement | null>(null)
        const second = ref<HTMLElement | null>(null)
        const a = useToggleButtonGroupItem({id: 'a'}, state, first)
        const b = useToggleButtonGroupItem({id: 'b'}, state, second)
        return () => h('div', domProps(group.groupProps, (el) => {
          host.value = el as HTMLElement | null
        }), [
          h('button', domProps(a.buttonProps, (el) => { first.value = el as HTMLElement | null }), 'A'),
          h('button', domProps(b.buttonProps, (el) => { second.value = el as HTMLElement | null }), 'B'),
        ])
      },
    })
    const wrapper = mount(defineComponent({
      setup() {
        return () => h(I18nProvider, {locale: locale.value}, () => h(Group))
      },
    }), {attachTo: document.body})
    await nextTick()
    const buttons = [...host.value!.querySelectorAll('button')]
    buttons[1].focus()
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    expect(document.activeElement).toBe(buttons[0])
    orientation.value = 'vertical'
    locale.value = 'en-US'
    await nextTick()
    expect(host.value!.getAttribute('aria-orientation')).toBe('vertical')
    buttons[0].focus()
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, cancelable: true}))
    expect(document.activeElement).toBe(buttons[1])
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    expect(document.activeElement).toBe(buttons[1])
    wrapper.unmount()
  })

  it('disables every item when the group is disabled, including a local false', async () => {
    const view = mountGroup({isDisabled: true, itemDisabled: false, 'aria-label': 'Format'})
    await nextTick()
    expect(view.el.getAttribute('aria-disabled')).toBe('true')
    const [foo, bar] = view.buttons() as HTMLButtonElement[]
    expect(foo.disabled).toBe(true)
    expect(bar.disabled).toBe(true)
    foo.click()
    expect(view.state.selectedKeys.size).toBe(0)
    view.state.toggleKey('foo')
    expect([...view.state.selectedKeys]).toEqual(['foo'])
    view.wrapper.unmount()
  })

  it('checks a numeric id without writing it as a DOM id', async () => {
    const host = ref<HTMLElement | null>(null)
    const item = ref<HTMLElement | null>(null)
    const wrapper = mount(defineComponent({
      setup() {
        const state = useToggleGroupState({defaultSelectedKeys: [0]})
        const group = useToggleButtonGroup({'aria-label': 'Nums'}, state, host)
        const button = useToggleButtonGroupItem({id: 0, elementType: 'div'}, state, item)
        return () => h('div', domProps(group.groupProps, (el) => {
          host.value = el as HTMLElement | null
        }), [
          h('div', domProps(button.buttonProps, (el) => { item.value = el as HTMLElement | null }), 'Zero'),
        ])
      },
    }), {attachTo: document.body})
    await nextTick()
    const zero = item.value!
    expect(zero.getAttribute('role')).toBe('radio')
    expect(zero.getAttribute('aria-checked')).toBe('true')
    expect(zero.hasAttribute('id')).toBe(false)
    expect(zero.hasAttribute('aria-pressed')).toBe(false)
    wrapper.unmount()
  })
})
