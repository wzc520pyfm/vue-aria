/*
 * Tests for the standalone Checkbox hook (`useCheckbox`) and the
 * CheckboxGroupItem hook (`useCheckboxGroupItem`), aligned with the official
 * react-aria checkbox behavior.
 */

import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {useCheckbox} from '../useCheckbox'
import {useCheckboxGroupItem} from '../useCheckboxGroupItem'
import {checkboxGroupData} from '../utils'
import {useToggleState} from 'vue-stately/useToggleState'
import {useCheckboxGroupState} from 'vue-stately/useCheckboxGroupState'
import type {CheckboxGroupState} from 'vue-stately/useCheckboxGroupState'

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

function mountToggleHook(props: any = {}) {
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
      aria = useCheckbox(props, state, inputRef)
      return () => h('input', {ref: (el: any) => (inputRef.value = el)})
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, state, aria, inputRef}
}

function mountGroupItem(props: any = {}, groupProps: any = {}) {
  let state: any
  let aria: any
  const inputRef = ref<HTMLInputElement | null>(null)
  const Probe = defineComponent({
    setup() {
      state = useCheckboxGroupState(groupProps)
      checkboxGroupData.set(state, {
        name: () => groupProps.name,
        form: () => undefined,
        descriptionId: () => undefined,
        errorMessageId: () => undefined,
        validationBehavior: () => groupProps.validationBehavior ?? 'aria',
      })
      aria = useCheckboxGroupItem({...props, value: props.value ?? 'red'}, state, inputRef)
      return () => h('input', {ref: (el: any) => (inputRef.value = el)})
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, state, aria, inputRef}
}

describe('useCheckbox hook', () => {
  it('returns plain live-getter prop objects with checkbox input semantics', () => {
    const {wrapper, aria} = mountToggleHook({'aria-label': 'Accept terms'})
    expect(aria).toBeTruthy()
    expect(aria.isSelected).toBe(false)
    expect(aria.isPressed).toBe(false)
    expect(aria.isDisabled).toBe(false)
    expect(aria.isReadOnly).toBe(false)
    expect(aria.isInvalid).toBe(false)
    expect(aria.inputProps.type).toBe('checkbox')
    expect(typeof aria.inputProps.onChange).toBe('function')
    expect(aria.inputProps.checked).toBe(false)
    expect(typeof aria.labelProps.onClick).toBe('function')
    expect(typeof aria.labelProps.onMouseDown).toBe('function')
    expect(typeof aria.descriptionProps).toBe('object')
    wrapper.unmount()
  })

  it('defaults the hook validationBehavior to aria (component default is native)', () => {
    const {wrapper, aria} = mountToggleHook({isRequired: true})
    expect(aria.inputProps['aria-required']).toBe(true)
    expect(aria.inputProps.required).toBeUndefined()
    wrapper.unmount()

    const second = mountToggleHook({isRequired: true, validationBehavior: 'native'})
    expect(second.aria.inputProps.required).toBe(true)
    expect(second.aria.inputProps['aria-required']).toBeUndefined()
    second.wrapper.unmount()
  })

  it('keeps a controlled isSelected live and never snapshots it', async () => {
    const value = ref(false)
    const {wrapper, state, aria} = mountToggleHook({isSelected: () => value.value})
    expect(aria.isSelected).toBe(false)
    state.toggle()
    // Controlled: the value only changes when the parent updates it.
    expect(aria.isSelected).toBe(false)
    expect(aria.inputProps.checked).toBe(false)
    value.value = true
    await nextTick()
    expect(aria.isSelected).toBe(true)
    expect(aria.inputProps.checked).toBe(true)
    wrapper.unmount()
  })

  it('tracks an uncontrolled defaultSelected and toggles', () => {
    const {wrapper, state, aria} = mountToggleHook({defaultSelected: true})
    expect(aria.isSelected).toBe(true)
    expect(aria.inputProps.checked).toBe(true)
    state.toggle()
    expect(aria.isSelected).toBe(false)
    expect(aria.inputProps.checked).toBe(false)
    state.setSelected(true)
    expect(aria.isSelected).toBe(true)
    wrapper.unmount()
  })

  it('drives the native indeterminate property from isIndeterminate', async () => {
    const {wrapper, inputRef} = mountToggleHook({defaultSelected: true, isIndeterminate: true})
    await tick()
    const input = inputRef.value as HTMLInputElement | null
    expect(input).toBeTruthy()
    expect(input!.indeterminate).toBe(true)
    wrapper.unmount()
  })
})

describe('useCheckboxGroupItem hook', () => {
  it('registers with the group state and toggles values add/remove', () => {
    const {wrapper, state, aria} = mountGroupItem(
      {onChange: () => {}},
      {defaultValue: [], name: 'colors', isRequired: true},
    )
    expect(aria.isSelected).toBe(false)
    state.addValue('red')
    expect(aria.isSelected).toBe(true)
    expect(state.value).toEqual(['red'])
    state.removeValue('red')
    expect(aria.isSelected).toBe(false)
    expect(state.value).toEqual([])
    state.toggleValue('red')
    expect(aria.isSelected).toBe(true)
    state.toggleValue('red')
    expect(aria.isSelected).toBe(false)
    wrapper.unmount()
  })

  it('fires the group add/remove through the input change handler', () => {
    const {wrapper, state, aria} = mountGroupItem(
      {onChange: () => {}},
      {defaultValue: [], name: 'colors'},
    )
    const event = (checked: boolean) =>
      ({target: {checked}, stopPropagation: () => {}}) as any
    aria.inputProps.onChange(event(true))
    expect(state.value).toEqual(['red'])
    aria.inputProps.onChange(event(false))
    expect(state.value).toEqual([])
    wrapper.unmount()
  })

  it('merges per-item realtime validation into the group invalid map', async () => {
    const {wrapper, state, aria} = mountGroupItem(
      {value: 'red', validate: (v: boolean) => (!v ? 'red required' : null), onChange: () => {}},
      {defaultValue: [], name: 'colors', validationBehavior: 'aria'},
    )
    // The item is unselected, so its local validation is invalid immediately.
    expect(aria.isInvalid).toBe(true)
    state.addValue('red')
    await tick()
    expect(aria.isInvalid).toBe(false)
    expect(state.isInvalid).toBe(false)
    // Deselecting re-opens the local error via the group's per-item invalid map.
    state.removeValue('red')
    await tick()
    expect(aria.isInvalid).toBe(true)
    expect(state.isInvalid).toBe(true)
    wrapper.unmount()
  })
})
