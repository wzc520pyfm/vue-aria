/*
 * Tests for the Radio / RadioGroup hooks (`useRadio`, `useRadioGroup`),
 * aligned with the official react-aria radio behavior.
 */

import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {useRadio} from '../useRadio'
import {useRadioGroup} from '../useRadioGroup'
import {useRadioGroupState} from 'vue-stately/useRadioGroupState'

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

afterEach(() => {
  document.body.replaceChildren()
})

function mountRadioGroup(props: any = {}, groupProps: any = {}) {
  let groupState: any
  let groupAria: any
  const Probe = defineComponent({
    setup() {
      groupState = useRadioGroupState(groupProps)
      groupAria = useRadioGroup(props, groupState)
      return () => null
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, groupState, groupAria}
}

function mountRadio(props: any = {}, groupProps: any = {}) {
  let groupState: any
  let aria: any
  const inputRef = ref<HTMLInputElement | null>(null)
  const Probe = defineComponent({
    setup() {
      groupState = useRadioGroupState(groupProps)
      aria = useRadio(props, groupState, inputRef)
      return () => h('input', {ref: (el: any) => (inputRef.value = el)})
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, groupState, aria}
}

describe('useRadioGroup hook', () => {
  it('returns a radiogroup group element with orientation and keyboard handlers', () => {
    const {wrapper, groupAria} = mountRadioGroup(
      {name: 'colors', orientation: 'horizontal'},
      {defaultValue: 'red', name: 'colors', orientation: 'horizontal'},
    )
    expect(groupAria).toBeTruthy()
    expect(groupAria.radioGroupProps.role).toBe('radiogroup')
    expect(groupAria.radioGroupProps['aria-orientation']).toBe('horizontal')
    expect(typeof groupAria.radioGroupProps.onKeydown).toBe('function')
    wrapper.unmount()
  })

  it('tracks the selected value and updates it from the group state', () => {
    const {wrapper, groupState} = mountRadioGroup(
      {name: 'colors', onChange: () => {}},
      {defaultValue: 'red', name: 'colors'},
    )
    expect(groupState.selectedValue).toBe('red')
    groupState.setSelectedValue('blue')
    expect(groupState.selectedValue).toBe('blue')
    wrapper.unmount()
  })
})

describe('useRadio hook', () => {
  it('computes roving tabIndex from the group selection', () => {
    const {wrapper, groupState, aria} = mountRadio(
      {value: 'blue', isDisabled: false},
      {defaultValue: 'red', name: 'colors'},
    )
    expect(aria.inputProps.type).toBe('radio')
    expect(aria.isSelected).toBe(false)
    // "red" is selected in the group, so "blue" is not tabbable (-1).
    expect(aria.inputProps.tabIndex).toBe(-1)
    expect(typeof aria.inputProps.onChange).toBe('function')

    groupState.setSelectedValue('blue')
    expect(aria.isSelected).toBe(true)
    expect(aria.inputProps.checked).toBe(true)
    expect(aria.inputProps.tabIndex).toBe(0)

    groupState.setSelectedValue('red')
    expect(aria.isSelected).toBe(false)
    expect(aria.inputProps.checked).toBe(false)
    expect(aria.inputProps.tabIndex).toBe(-1)
    wrapper.unmount()
  })

  it('disables the tabIndex when the radio is disabled', () => {
    const {wrapper, aria} = mountRadio({value: 'red', isDisabled: true}, {defaultValue: 'red'})
    expect(aria.isDisabled).toBe(true)
    expect(aria.inputProps.disabled).toBe(true)
    expect(aria.inputProps.tabIndex).toBeUndefined()
    wrapper.unmount()
  })
})
