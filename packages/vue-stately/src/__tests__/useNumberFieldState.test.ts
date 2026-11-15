import {defineComponent, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {useNumberFieldState} from 'vue-stately/useNumberFieldState'

function mountState(options?: Parameters<typeof useNumberFieldState>[0]) {
  let state: ReturnType<typeof useNumberFieldState> | undefined
  const Probe = defineComponent({
    setup() {
      state = useNumberFieldState(options as any)
      return () => null
    },
  })
  const wrapper = mount(Probe)
  return {state: state!, wrapper}
}

describe('useNumberFieldState', () => {
  it('starts empty uncontrolled by default and formats a defaultValue', () => {
    const {state, wrapper} = mountState({locale: 'en-US', defaultValue: 5})
    expect(state.numberValue).toBe(5)
    expect(state.inputValue).toBe('5')
    expect(state.defaultNumberValue).toBe(5)
    expect(state.minValue).toBeUndefined()
    expect(state.maxValue).toBeUndefined()
    wrapper.unmount()
  })

  it('treats a controlled null value as an empty (NaN) number', () => {
    const {state, wrapper} = mountState({locale: 'en-US', value: null as any})
    expect(state.numberValue).toBeNaN()
    expect(state.inputValue).toBe('')
    expect(state.canDecrement).toBe(true)
    expect(state.canIncrement).toBe(true)
    wrapper.unmount()
  })

  it('controlled value updates are live, not snapshotted at setup', async () => {
    const value = ref<number | undefined>(2)
    const {state, wrapper} = mountState({locale: 'en-US', value})
    expect(state.numberValue).toBe(2)
    value.value = 42
    await wrapper.vm.$nextTick()
    expect(state.numberValue).toBe(42)
    expect(state.inputValue).toBe('42')
    wrapper.unmount()
  })

  it('snap commitBehavior clamps to min/max and snaps to step on commit', () => {
    const onChange = vi.fn()
    const {state, wrapper} = mountState({
      locale: 'en-US',
      defaultValue: 0,
      minValue: 0,
      maxValue: 10,
      step: 2,
      commitBehavior: 'snap',
      onChange,
    })
    state.setInputValue('7.3')
    state.commit()
    expect(onChange).toHaveBeenLastCalledWith(8)
    expect(state.numberValue).toBe(8)
    // clamps above max
    state.setInputValue('99')
    state.commit()
    expect(onChange).toHaveBeenLastCalledWith(10)
    expect(state.numberValue).toBe(10)
    // clamps below min
    state.setInputValue('-50')
    state.commit()
    expect(onChange).toHaveBeenLastCalledWith(0)
    wrapper.unmount()
  })

  it('validate commitBehavior does not clamp on commit', () => {
    const onChange = vi.fn()
    const {state, wrapper} = mountState({
      locale: 'en-US',
      defaultValue: 0,
      minValue: 0,
      maxValue: 10,
      step: 2,
      commitBehavior: 'validate',
      onChange,
    })
    state.setInputValue('25')
    state.commit()
    expect(onChange).toHaveBeenLastCalledWith(25)
    expect(state.numberValue).toBe(25)
    wrapper.unmount()
  })

  it('snaps an out-of-step controlled defaultValue for display', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      defaultValue: 7,
      step: 2,
      commitBehavior: 'snap',
    })
    expect(state.numberValue).toBe(8)
    wrapper.unmount()
  })

  it('formats and parses percent values via formatOptions', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      defaultValue: 0.25,
      formatOptions: {style: 'percent'},
    })
    expect(state.inputValue).toBe('25%')
    expect(state.numberValue).toBe(0.25)
    state.setInputValue('50%')
    state.commit()
    expect(state.numberValue).toBe(0.5)
    expect(state.inputValue).toBe('50%')
    wrapper.unmount()
  })

  it('uses a percent default clamp step of 0.01 when no step is set', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      defaultValue: 0.5,
      formatOptions: {style: 'percent'},
    })
    state.increment()
    expect(state.numberValue).toBeCloseTo(0.51, 10)
    wrapper.unmount()
  })

  it('handles decimal steps without floating point error', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      defaultValue: 0,
      step: 0.2,
    })
    state.increment()
    expect(state.numberValue).toBe(0.2)
    state.increment()
    expect(state.numberValue).toBe(0.4)
    state.increment()
    expect(state.numberValue).toBe(0.6)
    wrapper.unmount()
  })

  it('does not parse invalid input on commit; resets the text to the current value', () => {
    const {state, wrapper} = mountState({locale: 'en-US', defaultValue: 3})
    state.setInputValue('abc')
    expect(state.numberValue).toBeNaN()
    state.commit()
    expect(state.inputValue).toBe('3')
    expect(state.numberValue).toBe(3)
    wrapper.unmount()
  })

  it('clears to NaN when committing an empty input', () => {
    const onChange = vi.fn()
    const {state, wrapper} = mountState({locale: 'en-US', defaultValue: 5, onChange})
    state.setInputValue('')
    state.commit()
    expect(onChange).toHaveBeenLastCalledWith(NaN)
    expect(state.numberValue).toBeNaN()
    expect(state.inputValue).toBe('')
    wrapper.unmount()
  })

  it('increment/decrement respect min and max bounds (canIncrement/canDecrement)', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      minValue: 0,
      maxValue: 2,
      step: 1,
      defaultValue: 2,
    })
    expect(state.canIncrement).toBe(false)
    expect(state.canDecrement).toBe(true)
    state.increment()
    expect(state.numberValue).toBe(2)
    state.decrement()
    expect(state.numberValue).toBe(1)
    state.decrement()
    expect(state.numberValue).toBe(0)
    expect(state.canDecrement).toBe(false)
    state.decrement()
    expect(state.numberValue).toBe(0)
    wrapper.unmount()
  })

  it('increment/decrement from an empty input start at min/max (or 0)', () => {
    const {state, wrapper} = mountState({locale: 'en-US', minValue: 5, maxValue: 20, step: 5})
    expect(state.numberValue).toBeNaN()
    state.increment()
    expect(state.numberValue).toBe(5)
    // empty again, decrement starts from max
    state.setInputValue('')
    state.commit()
    state.decrement()
    expect(state.numberValue).toBe(20)
    wrapper.unmount()
  })

  it('incrementToMax/decrementToMin jump to the bounds and snap max to step', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      minValue: 1,
      maxValue: 10,
      step: 3,
      defaultValue: 4,
    })
    state.incrementToMax()
    // 10 snaps down to the largest step-aligned value within [1, 10]
    expect(state.numberValue).toBe(10)
    state.decrementToMin()
    expect(state.numberValue).toBe(1)
    wrapper.unmount()
  })

  it('snaps maxValue to the step grid for incrementToMax', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      minValue: 0,
      maxValue: 10,
      step: 4,
      defaultValue: 0,
    })
    state.incrementToMax()
    expect(state.numberValue).toBe(8)
    wrapper.unmount()
  })

  it('validate() reflects partial valid input according to locale and sign constraints', () => {
    const {state, wrapper} = mountState({
      locale: 'en-US',
      minValue: 0,
      maxValue: 100,
    })
    expect(state.validate('12')).toBe(true)
    expect(state.validate('abc')).toBe(false)
    expect(state.validate('-5')).toBe(false)
    wrapper.unmount()
  })

  it('commitValidation is wired to the validation state', () => {
    const validate = vi.fn((value: number | null) => (value != null && value > 5 ? ['Too big' as string] : (true as const)))
    const {state, wrapper} = mountState({
      locale: 'en-US',
      defaultValue: 1,
      validate,
    })
    state.setInputValue('10')
    state.commit()
    expect(validate).toHaveBeenCalled()
    expect(state.displayValidation.isInvalid).toBe(true)
    wrapper.unmount()
  })

  it('setNumberValue updates an uncontrolled value and fires onChange only on change', () => {
    const onChange = vi.fn()
    const {state, wrapper} = mountState({locale: 'en-US', defaultValue: 1, onChange})
    state.setNumberValue(7)
    expect(state.numberValue).toBe(7)
    expect(onChange).toHaveBeenCalledTimes(1)
    state.setNumberValue(7)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(state.inputValue).toBe('7')
    wrapper.unmount()
  })
})
