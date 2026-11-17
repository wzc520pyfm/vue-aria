import {defineComponent, isRef, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {useSliderState, type SliderState} from '../useSliderState'

const formatter = new Intl.NumberFormat('en-US', {}) as unknown as {
  format(value: number): string
  formatRange(start: number, end: number): string
  resolvedOptions(): {locale: string}
}

function mountState(props: Record<string, any> = {}) {
  let state: SliderState | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        state = useSliderState({numberFormatter: formatter, ...props})
        return () => null
      },
    }),
  )
  return {state: state!, wrapper}
}

describe('useSliderState', () => {
  it('defaults min 0, max 100, step 1, horizontal, and an array callback when value is omitted', () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const {state} = mountState({onChange, onChangeEnd})
    expect(isRef(state)).toBe(false)
    expect(state.values).toEqual([0])
    expect(state.step).toBe(1)
    expect(state.pageSize).toBe(10)
    expect(state.orientation).toBe('horizontal')
    expect(state.isDisabled).toBe(false)
    state.setThumbDragging(0, true)
    state.setThumbValue(0, 50)
    state.setThumbDragging(0, false)
    expect(onChange).toHaveBeenLastCalledWith([50])
    expect(onChangeEnd).toHaveBeenLastCalledWith([50])
  })

  it('uses a scalar callback when value or defaultValue is a number', () => {
    const onChange = vi.fn()
    const controlled = mountState({value: 10, onChange})
    controlled.state.setThumbDragging(0, true)
    controlled.state.setThumbValue(0, 12)
    expect(onChange).toHaveBeenLastCalledWith(12)
    controlled.wrapper.unmount()

    const onChangeDefault = vi.fn()
    const uncontrolled = mountState({defaultValue: 10, onChange: onChangeDefault})
    uncontrolled.state.setThumbDragging(0, true)
    uncontrolled.state.setThumbValue(0, 14)
    expect(onChangeDefault).toHaveBeenLastCalledWith(14)
  })

  it('clamps, snaps, and formats a single thumb', () => {
    const currency = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}) as unknown as typeof formatter
    const {state} = mountState({
      defaultValue: [50],
      minValue: 10,
      maxValue: 200,
      step: 10,
      numberFormatter: currency,
    })
    expect(state.getThumbValue(0)).toBe(50)
    expect(state.getThumbPercent(0)).toBe(40 / 190)
    expect(state.getValuePercent(50)).toBe(40 / 190)
    expect(state.getThumbValueLabel(0)).toBe('$50.00')
    state.setThumbValue(0, 500)
    expect(state.getThumbValue(0)).toBe(200)
    state.setThumbValue(0, 0)
    expect(state.getThumbValue(0)).toBe(10)
    state.setThumbPercent(0, 0.13)
    expect(state.getThumbValue(0)).toBe(30)
    expect(state.getFormattedValue()).toBe('$30.00')
  })

  it('keeps multiple thumbs from crossing and rounds to the step', () => {
    const {state} = mountState({
      defaultValue: [50, 70, 90],
      minValue: 10,
      maxValue: 200,
    })
    expect(state.values).toEqual([50, 70, 90])
    expect(state.getThumbMinValue(1)).toBe(50)
    expect(state.getThumbMaxValue(1)).toBe(90)
    state.setThumbValue(1, 100)
    expect(state.values).toEqual([50, 90, 90])

    const stepped = mountState({
      minValue: 1,
      maxValue: 15,
      step: 2.5,
      defaultValue: [1, 13],
    })
    expect(stepped.state.values).toEqual([1, 13.5])
    stepped.state.setThumbValue(0, 3)
    expect(stepped.state.values).toEqual([3.5, 13.5])
    stepped.state.setThumbValue(1, 5)
    expect(stepped.state.values).toEqual([3.5, 6])
  })

  it('fires onChange while dragging and onChangeEnd only when the drag finishes', () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const {state} = mountState({onChange, onChangeEnd, defaultValue: [0]})
    state.setThumbValue(0, 0)
    expect(onChange).not.toHaveBeenCalled()
    expect(onChangeEnd).not.toHaveBeenCalled()
    state.setThumbDragging(0, true)
    state.setThumbValue(0, 55)
    state.setThumbValue(0, 65)
    expect(onChangeEnd).not.toHaveBeenCalled()
    state.setThumbDragging(0, false)
    expect(onChange).toHaveBeenLastCalledWith([65])
    expect(onChangeEnd).toHaveBeenLastCalledWith([65])
  })

  it('blocks edits when the slider or one thumb is disabled, and reads dynamic props', async () => {
    const maxValue = ref(100)
    const step = ref(1)
    const disabled = ref(false)
    const orientation = ref<'horizontal' | 'vertical'>('horizontal')
    let state: SliderState | undefined
    mount(
      defineComponent({
        setup() {
          state = useSliderState({
            numberFormatter: formatter,
            defaultValue: [20, 40],
            maxValue: () => maxValue.value,
            step: () => step.value,
            isDisabled: () => disabled.value,
            orientation: () => orientation.value,
          })
          return () => null
        },
      }),
    )
    state!.setThumbEditable(1, false)
    state!.setThumbValue(1, 80)
    expect(state!.values).toEqual([20, 40])
    state!.setThumbEditable(1, true)
    disabled.value = true
    await nextTick()
    expect(state!.isDisabled).toBe(true)
    state!.setThumbDragging(0, true)
    state!.setThumbValue(0, 30)
    expect(state!.values[0]).toBe(20)
    expect(state!.isThumbDragging(0)).toBe(false)
    disabled.value = false
    maxValue.value = 50
    step.value = 5
    orientation.value = 'vertical'
    await nextTick()
    expect(state!.orientation).toBe('vertical')
    expect(state!.step).toBe(5)
    expect(state!.getThumbMaxValue(1)).toBe(50)
    state!.setThumbValue(1, 80)
    expect(state!.getThumbValue(1)).toBe(50)
  })

  it('keeps controlled public values on the parent while changeend reports the last proposal', () => {
    const value = ref<number | number[]>(20)
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    let state: SliderState | undefined
    const wrapper = mount(defineComponent({
      setup() {
        state = useSliderState({
          numberFormatter: formatter,
          value: () => value.value,
          onChange,
          onChangeEnd,
        })
        return () => null
      },
    }))
    state!.setThumbDragging(0, true)
    state!.setThumbValue(0, 30)
    expect(onChange).toHaveBeenLastCalledWith(30)
    expect(state!.values).toEqual([20])
    value.value = 50
    expect(state!.values).toEqual([50])
    state!.setThumbDragging(0, false)
    expect(onChangeEnd).toHaveBeenCalledTimes(1)
    expect(onChangeEnd).toHaveBeenLastCalledWith(30)
    wrapper.unmount()

    const transformed = ref(20)
    const onChangeTransformed = vi.fn((next: number | number[]) => {
      transformed.value = Math.min(next as number, 25)
    })
    let transformedState: SliderState | undefined
    mount(defineComponent({
      setup() {
        transformedState = useSliderState({
          numberFormatter: formatter,
          value: () => transformed.value,
          onChange: onChangeTransformed,
          onChangeEnd,
        })
        return () => null
      },
    }))
    transformedState!.setThumbDragging(0, true)
    transformedState!.setThumbValue(0, 30)
    expect(transformedState!.values).toEqual([25])
    transformedState!.setThumbDragging(0, false)
    expect(onChangeEnd).toHaveBeenLastCalledWith(30)

    const rejected = ref(20)
    const rejectedChange = vi.fn()
    const rejectedEnd = vi.fn()
    let rejectedState: SliderState | undefined
    mount(defineComponent({
      setup() {
        rejectedState = useSliderState({
          numberFormatter: formatter,
          value: () => rejected.value,
          onChange: rejectedChange,
          onChangeEnd: rejectedEnd,
        })
        return () => null
      },
    }))
    rejectedState!.setThumbDragging(0, true)
    rejectedState!.incrementThumb(0)
    rejectedState!.setThumbDragging(0, false)
    rejectedState!.setThumbDragging(0, true)
    rejectedState!.incrementThumb(0)
    rejectedState!.setThumbDragging(0, false)
    expect(rejected.value).toBe(20)
    expect(rejectedState!.values).toEqual([20])
    expect(rejectedChange.mock.calls.map((call) => call[0])).toEqual([21, 21])
    expect(rejectedEnd.mock.calls.map((call) => call[0])).toEqual([21, 21])
  })

  it('formats two thumbs with formatRange and three with a unit list', () => {
    const range = mountState({defaultValue: [30, 60]})
    expect(range.state.getFormattedValue()).toBe(formatter.formatRange(30, 60))
    const multi = mountState({defaultValue: [30, 60, 80]})
    const list = new Intl.ListFormat(formatter.resolvedOptions().locale, {type: 'unit'})
    expect(multi.state.getFormattedValue()).toBe(list.format(['30', '60', '80']))
    expect(multi.state.getFormattedValue([])).toBe('')
  })
})
