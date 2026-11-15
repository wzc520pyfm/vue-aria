/*
 * Tests for the Switch hook (`useSwitch`), aligned with the official
 * react-aria switch behavior.
 */

import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {useSwitch} from '../useSwitch'
import {useToggleState} from 'vue-stately/useToggleState'

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

afterEach(() => {
  document.body.replaceChildren()
})

function mountSwitchHook(props: any = {}) {
  let state: any
  let aria: any
  const inputRef = ref<HTMLInputElement | null>(null)
  const Probe = defineComponent({
    setup() {
      state = useToggleState({
        defaultSelected: props.defaultSelected,
        isSelected: props.isSelected,
        isReadOnly: props.isReadOnly,
        onChange: props.onChange,
      })
      aria = useSwitch(props, state, inputRef)
      return () => h('input', {ref: (el: any) => (inputRef.value = el)})
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, state, aria, inputRef}
}

describe('useSwitch hook', () => {
  it('renders a checkbox input with role switch', () => {
    const {wrapper, aria} = mountSwitchHook({isSelected: false})
    expect(aria).toBeTruthy()
    expect(aria.isSelected).toBe(false)
    expect(aria.isPressed).toBe(false)
    expect(aria.isDisabled).toBe(false)
    expect(aria.inputProps.type).toBe('checkbox')
    expect(aria.inputProps.role).toBe('switch')
    expect(typeof aria.labelProps.onClick).toBe('function')
    wrapper.unmount()
  })

  it('defaults the hook validationBehavior to aria (component default is native)', () => {
    const {wrapper, aria} = mountSwitchHook({isRequired: true})
    expect(aria.inputProps['aria-required']).toBe(true)
    expect(aria.inputProps.required).toBeUndefined()
    wrapper.unmount()

    const second = mountSwitchHook({isRequired: true, validationBehavior: 'native'})
    expect(second.aria.inputProps.required).toBe(true)
    expect(second.aria.inputProps['aria-required']).toBeUndefined()
    second.wrapper.unmount()
  })

  it('keeps a controlled isSelected live and toggles uncontrolled switches', () => {
    const value = ref(false)
    const controlled = mountSwitchHook({isSelected: () => value.value})
    controlled.state.toggle()
    expect(controlled.aria.isSelected).toBe(false)
    controlled.wrapper.unmount()

    const {wrapper: wrapper2, state, aria} = mountSwitchHook({defaultSelected: true})
    expect(aria.isSelected).toBe(true)
    state.toggle()
    expect(aria.isSelected).toBe(false)
    wrapper2.unmount()
  })
})
