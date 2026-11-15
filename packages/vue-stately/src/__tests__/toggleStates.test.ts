/*
 * Tests for the Checkbox / Radio / Switch state slice, aligned with the
 * official `react-stately` useToggleState / useCheckboxGroupState /
 * useRadioGroupState behavior.
 */

import {ref} from 'vue'
import {describe, expect, it} from 'vitest'
import {useCheckboxGroupState} from '../checkbox/useCheckboxGroupState'
import {useRadioGroupState} from '../radio/useRadioGroupState'
import {useToggleState} from '../toggle/useToggleState'

describe('useToggleState', () => {
  it('is unselected by default and toggles', () => {
    const changes: boolean[] = []
    const state = useToggleState({onChange: (v) => changes.push(v)})
    expect(state.isSelected).toBe(false)
    state.toggle()
    expect(state.isSelected).toBe(true)
    expect(changes).toEqual([true])
    state.setSelected(false)
    expect(state.isSelected).toBe(false)
    expect(changes).toEqual([true, false])
  })

  it('supports defaultSelected and exposes defaultSelected', () => {
    const state = useToggleState({defaultSelected: true})
    expect(state.isSelected).toBe(true)
    expect(state.defaultSelected).toBe(true)
    state.setSelected(false)
    expect(state.defaultSelected).toBe(true)
  })

  it('is controlled by isSelected', () => {
    const value = ref(false)
    const state = useToggleState({isSelected: () => value.value})
    state.toggle()
    // Controlled: the state stays at the controlled value; onChange fires.
    expect(state.isSelected).toBe(false)
    const changes: boolean[] = []
    const controlled = useToggleState({
      isSelected: () => value.value,
      onChange: (v) => {
        value.value = v
        changes.push(v)
      },
    })
    controlled.setSelected(true)
    expect(value.value).toBe(true)
    expect(controlled.isSelected).toBe(true)
    expect(changes).toEqual([true])
  })

  it('respects isReadOnly', () => {
    const state = useToggleState({isReadOnly: true, defaultSelected: false})
    state.setSelected(true)
    expect(state.isSelected).toBe(false)
    state.toggle()
    expect(state.isSelected).toBe(false)
  })
})

describe('useCheckboxGroupState', () => {
  it('manages an uncontrolled array of values', () => {
    const changes: any[] = []
    const state = useCheckboxGroupState({defaultValue: ['a'], onChange: (v) => changes.push(v)})
    expect(state.value).toEqual(['a'])
    state.addValue('b')
    expect(state.value).toEqual(['a', 'b'])
    state.removeValue('a')
    expect(state.value).toEqual(['b'])
    state.toggleValue('c')
    expect(state.value).toEqual(['b', 'c'])
    state.toggleValue('c')
    expect(state.value).toEqual(['b'])
    expect(changes.map((v) => [...v].sort())).toEqual([['a', 'b'], ['b'], ['b', 'c'], ['b']])
  })

  it('is controlled', () => {
    const value = ref<string[]>(['x'])
    const changes: any[] = []
    const state = useCheckboxGroupState({
      value: () => value.value,
      onChange: (v) => {
        value.value = [...v]
        changes.push(v)
      },
    })
    state.addValue('y')
    expect(value.value).toEqual(['x', 'y'])
    expect(state.value).toEqual(['x', 'y'])
  })

  it('isSelected / isDisabled / isRequired / isInvalid and validation', () => {
    const state = useCheckboxGroupState({
      defaultValue: [],
      isRequired: true,
      isDisabled: true,
      validate: (v: string[]) => (v.length === 0 ? 'required' : null),
    })
    expect(state.isDisabled).toBe(true)
    expect(state.isRequired).toBe(true)
    expect(state.isSelected('a')).toBe(false)
    expect(state.isSelected('b')).toBe(false)
    state.commitValidation()
    expect(state.isInvalid).toBe(true)
  })
})

describe('useRadioGroupState', () => {
  it('manages an uncontrolled selected value with a generated name', () => {
    const changes: (string | null)[] = []
    const state = useRadioGroupState({defaultValue: 'a', onChange: (v) => changes.push(v)})
    expect(state.selectedValue).toBe('a')
    expect(state.name).toMatch(/^radio-group-/)
    state.setSelectedValue('b')
    expect(state.selectedValue).toBe('b')
    expect(changes).toEqual(['b'])
  })

  it('is controlled and keeps the controlled value until the caller updates it', () => {
    const value = ref<string | null>('a')
    const changes: (string | null)[] = []
    const state = useRadioGroupState({
      value: () => value.value,
      onChange: (v) => {
        value.value = v
        changes.push(v)
      },
    })
    expect(state.selectedValue).toBe('a')
    state.setSelectedValue('b')
    expect(value.value).toBe('b')
    expect(state.selectedValue).toBe('b')
  })

  it('tracks lastFocusedValue and respects read only / disabled', () => {
    const state = useRadioGroupState({isReadOnly: true, defaultValue: 'a'})
    state.setLastFocusedValue('b')
    expect(state.lastFocusedValue).toBe('b')
    state.setSelectedValue('c')
    expect(state.selectedValue).toBe('a')
    const disabled = useRadioGroupState({isDisabled: true})
    disabled.setSelectedValue('c')
    expect(disabled.selectedValue).toBeNull()
  })

  it('supports controlled value prop and validation', () => {
    const value = ref<string | null>('a')
    const state = useRadioGroupState({
      value: () => value.value,
      isRequired: true,
      onChange: (v) => {
        value.value = v
      },
      validate: (v: string) => (v !== 'b' ? 'must be b' : null),
    })
    expect(state.selectedValue).toBe('a')
    state.commitValidation()
    expect(state.isInvalid).toBe(true)
    state.setSelectedValue('b')
    state.commitValidation()
    expect(state.isInvalid).toBe(false)
  })
})
