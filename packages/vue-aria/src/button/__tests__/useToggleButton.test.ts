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

function bindForeign(el: Element, source: Record<string, any>) {
  const types = new Set<string>()
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (typeof value !== 'function' || !key.startsWith('on')) continue
    const type = key.slice(2).toLowerCase()
    if (types.has(type)) continue
    types.add(type)
    el.addEventListener(type, value as EventListener)
  }
  for (const key of ['role', 'tabindex', 'aria-pressed', 'type']) {
    const value = key === 'tabindex' ? source.tabIndex : source[key]
    if (value != null) el.setAttribute(key, String(value))
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

  it('selects again after a pointer leaves and the host changes or disable toggles, even when the button no longer looks pressed', async () => {
    for (const tag of ['button', 'div'] as const) {
      const seen: boolean[] = []
      const which = ref<'a' | 'b'>('a')
      const host = ref<HTMLElement | null>(null)
      const wrapper = mount(defineComponent({
        setup() {
          const state = useToggleState({onChange: (value: boolean) => seen.push(value)})
          const api = useToggleButton({elementType: tag}, state, host)
          return () => h(tag, {...bindProps(api.buttonProps, host), key: which.value}, [
            h('span', {class: 'child'}, which.value),
          ])
        },
      }), {attachTo: document.body})
      const first = host.value!
      const child = first.querySelector('.child')!
      child.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
      child.dispatchEvent(new PointerEvent('pointerleave', {bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
      expect(seen).toEqual([])
      which.value = 'b'
      await nextTick()
      const second = host.value!
      expect(second).not.toBe(first)
      const nextChild = second.querySelector('.child')!
      nextChild.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 2, pointerType: 'mouse'}))
      nextChild.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 2, pointerType: 'mouse'}))
      expect(seen).toEqual([true])
      wrapper.unmount()
      seen.length = 0

      const disabled = ref(false)
      const again = ref<HTMLElement | null>(null)
      const secondMount = mount(defineComponent({
        setup() {
          const state = useToggleState({onChange: (value: boolean) => seen.push(value)})
          const api = useToggleButton({elementType: tag, isDisabled: () => disabled.value}, state, again)
          return () => h(tag, bindProps(api.buttonProps, again), [
            h('span', {class: 'child'}, 'X'),
          ])
        },
      }), {attachTo: document.body})
      const node = again.value!
      const inner = node.querySelector('.child')!
      inner.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 3, pointerType: 'mouse'}))
      inner.dispatchEvent(new PointerEvent('pointerleave', {bubbles: true, button: 0, pointerId: 3, pointerType: 'mouse'}))
      disabled.value = true
      await nextTick()
      disabled.value = false
      await nextTick()
      inner.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 4, pointerType: 'mouse'}))
      inner.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 4, pointerType: 'mouse'}))
      expect(seen).toEqual([true])
      secondMount.unmount()
    }
  })

  it('does not select when a latent press is cancelled or the host unmounts after pointer leave', () => {
    const seen: boolean[] = []
    const view = mountToggle({onChange: (value: boolean) => seen.push(value)})
    view.el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 5, pointerType: 'mouse'}))
    view.el.dispatchEvent(new PointerEvent('pointerleave', {bubbles: true, button: 0, pointerId: 5, pointerType: 'mouse'}))
    view.el.dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId: 5, pointerType: 'mouse'}))
    view.el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 6, pointerType: 'mouse'}))
    view.el.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 6, pointerType: 'mouse'}))
    expect(seen).toEqual([true])
    view.wrapper.unmount()

    const late: boolean[] = []
    const lateView = mountToggle({onChange: (value: boolean) => late.push(value)})
    const node = lateView.el
    node.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 7, pointerType: 'mouse'}))
    node.dispatchEvent(new PointerEvent('pointerleave', {bubbles: true, button: 0, pointerId: 7, pointerType: 'mouse'}))
    lateView.wrapper.unmount()
    node.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 7, pointerType: 'mouse'}))
    expect(late).toEqual([])
  })

  it('selects from a child created in an iframe document for a native button and a non-native span', () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument!
    const view = iframe.contentWindow as Window & typeof globalThis
    const host = ref<HTMLElement | null>(null)
    const seen: boolean[] = []
    const keys: string[] = []
    const wrapper = mount(defineComponent({
      setup() {
        const state = useToggleState({onChange: (value: boolean) => seen.push(value)})
        const api = useToggleButton({
          elementType: 'button',
          onKeyDown: (event: KeyboardEvent) => keys.push(event.key),
        }, state, host)
        return () => {
          const button = doc.createElement('button')
          const child = doc.createElement('span')
          child.textContent = 'In'
          button.appendChild(child)
          doc.body.appendChild(button)
          host.value = button
          bindForeign(button, api.buttonProps)
          return h('span', {style: 'display:none'}, 'anchor')
        }
      },
    }), {attachTo: document.body})
    const button = doc.querySelector('button')!
    const child = button.querySelector('span')!
    const PointerEvt = typeof view.PointerEvent === 'function' ? view.PointerEvent : PointerEvent
    child.dispatchEvent(new PointerEvt('pointerdown', {bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
    child.dispatchEvent(new PointerEvt('pointerup', {bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
    expect(seen).toEqual([true])
    button.dispatchEvent(new view.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
    expect(keys).toEqual(['Escape'])
    wrapper.unmount()

    const spanHost = ref<HTMLElement | null>(null)
    const spanSeen: boolean[] = []
    const spanMount = mount(defineComponent({
      setup() {
        const state = useToggleState({onChange: (value: boolean) => spanSeen.push(value)})
        const api = useToggleButton({elementType: 'span'}, state, spanHost)
        return () => {
          const root = doc.createElement('span')
          root.dataset.root = 'span'
          const inner = doc.createElement('span')
          inner.textContent = 'Child'
          root.appendChild(inner)
          doc.body.appendChild(root)
          spanHost.value = root
          bindForeign(root, api.buttonProps)
          return h('i')
        }
      },
    }), {attachTo: document.body})
    const root = doc.querySelector('[data-root="span"]')!
    const target = root.firstElementChild!
    target.dispatchEvent(new PointerEvt('pointerdown', {bubbles: true, button: 0, pointerId: 9, pointerType: 'mouse'}))
    target.dispatchEvent(new PointerEvt('pointerup', {bubbles: true, button: 0, pointerId: 9, pointerType: 'mouse'}))
    expect(spanSeen).toEqual([true])
    expect(root.getAttribute('role')).toBe('button')
    spanMount.unmount()
    iframe.remove()
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
