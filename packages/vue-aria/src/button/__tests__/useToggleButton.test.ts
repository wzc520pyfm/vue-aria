/**
 * `useToggleButton` against `react-aria` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc.
 * Press dedupe, cancellation, disable, host replacement, and unmount cleanup
 * live on this path. The shared `useButton` / `usePress` modules are unchanged.
 */

import {defineComponent, h, isRef, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {useToggleState} from '../../../../vue-stately/src/toggle/useToggleState'
import {useToggleButton} from '../useToggleButton'
import type {ToggleButtonAria} from '../useToggleButton'
import type {ToggleState} from '../../../../vue-stately/src/toggle/useToggleState'

afterEach(() => {
  document.body.innerHTML = ''
})

function bindProps(source: Record<string, any>, host: {value: HTMLElement | null}) {
  const dom: Record<string, any> = {}
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (value !== undefined) dom[key] = value
  }
  dom.ref = (el: Element | null) => {
    host.value = el as HTMLElement | null
  }
  return dom
}

function mountToggle(props: Record<string, any> = {}, tag?: string) {
  const host = ref<HTMLElement | null>(null)
  let api!: ToggleButtonAria
  let state!: ToggleState
  const wrapper = mount(defineComponent({
    setup() {
      state = useToggleState(props)
      api = useToggleButton(props, state, host)
      return () => h(tag ?? props.elementType ?? 'button', bindProps(api.buttonProps, host), 'Toggle')
    },
  }), {attachTo: document.body})
  return {
    wrapper,
    host,
    get api() {
      return api
    },
    get state() {
      return state
    },
    get el() {
      return host.value as HTMLElement
    },
  }
}

function pointerClick(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
  el.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
  el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, button: 0, detail: 1}))
}

function keyToggle(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}))
  el.dispatchEvent(new KeyboardEvent('keyup', {key, bubbles: true, cancelable: true}))
  el.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0}))
}

describe('useToggleButton', () => {
  it('exposes a plain button contract with type button and aria-pressed', () => {
    const view = mountToggle()
    expect(isRef(view.api.buttonProps)).toBe(false)
    expect(isRef(view.api.isPressed)).toBe(false)
    expect(view.api.isSelected).toBe(false)
    expect(view.api.isDisabled).toBe(false)
    expect(view.el.tagName).toBe('BUTTON')
    expect(view.el.getAttribute('type')).toBe('button')
    expect(view.el.getAttribute('aria-pressed')).toBe('false')
    expect(view.el.hasAttribute('data-rac')).toBe(false)
    view.wrapper.unmount()
  })

  it('toggles once for a pointer press followed by click', async () => {
    const seen: boolean[] = []
    const presses: string[] = []
    const view = mountToggle({
      onChange: (value: boolean) => seen.push(value),
      onPress: () => presses.push('press'),
      onClick: () => presses.push('click'),
    })
    pointerClick(view.el)
    expect(seen).toEqual([true])
    expect(presses).toEqual(['press', 'click'])
    await nextTick()
    expect(view.el.getAttribute('aria-pressed')).toBe('true')
    pointerClick(view.el)
    expect(seen).toEqual([true, false])
    view.wrapper.unmount()
  })

  it('toggles once when Space or Enter is followed by a virtual click', () => {
    const seen: boolean[] = []
    const view = mountToggle({onChange: (value: boolean) => seen.push(value)})
    const space = new KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true})
    view.el.dispatchEvent(space)
    expect(space.defaultPrevented).toBe(true)
    view.el.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true, repeat: true}))
    view.el.dispatchEvent(new KeyboardEvent('keyup', {key: ' ', bubbles: true, cancelable: true}))
    view.el.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0}))
    expect(seen).toEqual([true])
    keyToggle(view.el, 'Enter')
    expect(seen).toEqual([true, false])
    view.wrapper.unmount()
  })

  it('still toggles for a virtual click that is not following a keyboard press', () => {
    const seen: boolean[] = []
    const view = mountToggle({onChange: (value: boolean) => seen.push(value)})
    view.el.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0}))
    expect(seen).toEqual([true])
    view.wrapper.unmount()
  })

  it('does not select when the pointer is cancelled, the control unmounts, or it is disabled mid press', async () => {
    const cancelled: boolean[] = []
    const cancelView = mountToggle({onChange: (value: boolean) => cancelled.push(value)})
    cancelView.el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 2, pointerType: 'mouse'}))
    expect(cancelView.api.isPressed).toBe(true)
    cancelView.el.dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId: 2, pointerType: 'mouse'}))
    expect(cancelView.api.isPressed).toBe(false)
    expect(cancelled).toEqual([])
    cancelView.wrapper.unmount()

    const late: boolean[] = []
    const lateView = mountToggle({onChange: (value: boolean) => late.push(value)})
    const node = lateView.el
    node.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 3, pointerType: 'mouse'}))
    lateView.wrapper.unmount()
    node.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 3, pointerType: 'mouse'}))
    expect(late).toEqual([])

    const disabled = ref(false)
    const mid: boolean[] = []
    const host = ref<HTMLElement | null>(null)
    let state!: ToggleState
    const wrapper = mount(defineComponent({
      setup() {
        state = useToggleState({onChange: (value: boolean) => mid.push(value)})
        const api = useToggleButton({isDisabled: () => disabled.value}, state, host)
        return () => h('button', bindProps(api.buttonProps, host), 'Toggle')
      },
    }), {attachTo: document.body})
    host.value!.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 4, pointerType: 'mouse'}))
    disabled.value = true
    await nextTick()
    disabled.value = false
    await nextTick()
    host.value!.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 4, pointerType: 'mouse'}))
    expect(mid).toEqual([])
    expect(state.isSelected).toBe(false)
    wrapper.unmount()
  })

  it('drops an in-flight press when the host element is replaced', async () => {
    const seen: boolean[] = []
    const which = ref<'a' | 'b'>('a')
    const host = ref<HTMLElement | null>(null)
    let state!: ToggleState
    const wrapper = mount(defineComponent({
      setup() {
        state = useToggleState({onChange: (value: boolean) => seen.push(value)})
        const api = useToggleButton({}, state, host)
        return () => h('button', {...bindProps(api.buttonProps, host), key: which.value}, which.value)
      },
    }), {attachTo: document.body})
    const first = host.value!
    first.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 8, pointerType: 'mouse'}))
    which.value = 'b'
    await nextTick()
    expect(host.value).not.toBe(first)
    first.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 8, pointerType: 'mouse'}))
    host.value!.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 8, pointerType: 'mouse'}))
    expect(seen).toEqual([])
    expect(state.isSelected).toBe(false)
    wrapper.unmount()
  })

  it('keeps asking for the controlled base when the parent rejects the change', () => {
    const selected = ref(false)
    const seen: boolean[] = []
    const host = ref<HTMLElement | null>(null)
    const wrapper = mount(defineComponent({
      setup() {
        const state = useToggleState({
          isSelected: () => selected.value,
          onChange: (value: boolean) => seen.push(value),
        })
        const api = useToggleButton({}, state, host)
        return () => h('button', bindProps(api.buttonProps, host), 'Toggle')
      },
    }), {attachTo: document.body})
    pointerClick(host.value!)
    pointerClick(host.value!)
    expect(seen).toEqual([true, true])
    expect(host.value!.getAttribute('aria-pressed')).toBe('false')
    wrapper.unmount()
  })

  it('implements the non-native element path and autofocus plus key callbacks', async () => {
    const keys: string[] = []
    const view = mountToggle({
      elementType: 'div',
      autoFocus: true,
      onKeyDown: (event: KeyboardEvent) => keys.push(event.key),
    }, 'div')
    await nextTick()
    expect(view.el.tagName).toBe('DIV')
    expect(view.el.getAttribute('role')).toBe('button')
    expect(view.el.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(view.el)
    keyToggle(view.el, ' ')
    expect(view.state.isSelected).toBe(true)
    await nextTick()
    expect(view.el.getAttribute('aria-pressed')).toBe('true')
    view.el.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    expect(keys).toContain('Escape')
    view.wrapper.unmount()

    const disabled = mountToggle({elementType: 'div', isDisabled: true}, 'div')
    expect(disabled.el.getAttribute('aria-disabled')).toBe('true')
    expect(disabled.el.hasAttribute('disabled')).toBe(false)
    expect(disabled.el.hasAttribute('tabindex')).toBe(false)
    keyToggle(disabled.el, 'Enter')
    expect(disabled.state.isSelected).toBe(false)
    disabled.wrapper.unmount()
  })

  it('updates aria-pressed from setSelected without a press', async () => {
    const view = mountToggle()
    view.state.setSelected(true)
    await nextTick()
    expect(view.api.isSelected).toBe(true)
    expect(view.el.getAttribute('aria-pressed')).toBe('true')
    view.wrapper.unmount()
  })
})
