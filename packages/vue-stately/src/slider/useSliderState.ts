/*
 * Port of `react-stately@3.51.0` `useSliderState`
 * (`packages/react-stately/src/slider/useSliderState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Props are read live. The returned state is a plain object
 * with live getters, not a ComputedRef and not a setup-time snapshot.
 */

import {ref, toValue, type MaybeRefOrGetter} from 'vue'
import {useControlledState} from '../utils/useControlledState'
import {clamp, snapValueToStep} from '../utils/number'

export type Orientation = 'horizontal' | 'vertical'

export interface SliderProps<T = number | number[]> {
  /** The slider's current value (controlled). A number is scalar; an array is one entry per thumb. */
  value?: MaybeRefOrGetter<T | undefined>
  /** The slider's default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<T | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: T) => void
  /**
   * The slider's minimum value.
   * @default 0
   */
  minValue?: MaybeRefOrGetter<number | undefined>
  /**
   * The slider's maximum value.
   * @default 100
   */
  maxValue?: MaybeRefOrGetter<number | undefined>
  /**
   * The slider's step value.
   * @default 1
   */
  step?: MaybeRefOrGetter<number | undefined>
  /**
   * The orientation of the slider.
   * @default 'horizontal'
   */
  orientation?: MaybeRefOrGetter<Orientation | undefined>
  /** Whether the whole slider is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Fired when the slider stops moving, due to being let go. */
  onChangeEnd?: (value: T) => void
  label?: MaybeRefOrGetter<unknown>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
}

export interface SliderState {
  readonly values: number[]
  readonly defaultValues: number[]
  getThumbValue(index: number): number
  setThumbValue(index: number, value: number): void
  setThumbPercent(index: number, percent: number): void
  isThumbDragging(index: number): boolean
  setThumbDragging(index: number, dragging: boolean): void
  readonly focusedThumb: number | undefined
  setFocusedThumb(index: number | undefined): void
  getThumbPercent(index: number): number
  getValuePercent(value: number): number
  getThumbValueLabel(index: number): string
  getFormattedValue(value?: number | number[]): string
  getThumbMinValue(index: number): number
  getThumbMaxValue(index: number): number
  getPercentValue(percent: number): number
  isThumbEditable(index: number): boolean
  setThumbEditable(index: number, editable: boolean): void
  incrementThumb(index: number, stepSize?: number): void
  decrementThumb(index: number, stepSize?: number): void
  readonly step: number
  readonly pageSize: number
  readonly orientation: Orientation
  readonly isDisabled: boolean
}

export interface SliderNumberFormatter {
  format(value: number): string
  formatRange(start: number, end: number): string
  resolvedOptions(): {locale: string}
}

export interface SliderStateOptions<T> extends SliderProps<T> {
  numberFormatter: SliderNumberFormatter
}

const DEFAULT_MIN_VALUE = 0
const DEFAULT_MAX_VALUE = 100
const DEFAULT_STEP_VALUE = 1

function sameNumbers(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/**
 * Provides state management for a slider component. Stores values for all thumbs,
 * formats values for localization, and provides methods to update the position
 * of any thumbs.
 */
export function useSliderState<T extends number | number[]>(props: SliderStateOptions<T>): SliderState {
  const minValue = () => {
    const value = toValue(props.minValue)
    return value == null ? DEFAULT_MIN_VALUE : value
  }
  const maxValue = () => {
    const value = toValue(props.maxValue)
    return value == null ? DEFAULT_MAX_VALUE : value
  }
  const step = () => {
    const value = toValue(props.step)
    return value == null ? DEFAULT_STEP_VALUE : value
  }
  const orientation = () => toValue(props.orientation) ?? 'horizontal'
  const isDisabled = () => Boolean(toValue(props.isDisabled))

  const pageSize = () => {
    const min = minValue()
    const max = maxValue()
    const stepValue = step()
    let calcPageSize = (max - min) / 10
    calcPageSize = snapValueToStep(calcPageSize, 0, calcPageSize + stepValue, stepValue)
    return Math.max(calcPageSize, stepValue)
  }

  const restrictValues = (values: number[] | undefined) =>
    values?.map((val, idx) => {
      const min = idx === 0 ? minValue() : values[idx - 1]
      const max = idx === values.length - 1 ? maxValue() : values[idx + 1]
      return snapValueToStep(val, min, max, step())
    })

  const convertValue = (value?: number | number[]) => {
    if (value == null) return undefined
    return Array.isArray(value) ? value : [value]
  }

  let cachedKey = ''
  let cachedValues: number[] | undefined
  const controlledValues = (): number[] | undefined => {
    const source = toValue(props.value)
    if (source === undefined) return undefined
    const key = `${minValue()}|${maxValue()}|${step()}|${JSON.stringify(source)}`
    if (key === cachedKey && cachedValues) return cachedValues
    const next = restrictValues(convertValue(source as number | number[]))!
    if (cachedValues && sameNumbers(cachedValues, next)) {
      cachedKey = key
      return cachedValues
    }
    cachedValues = next
    cachedKey = key
    return next
  }

  const defaultValues = () => restrictValues(convertValue(toValue(props.defaultValue) as number | number[] | undefined) ?? [minValue()])!

  const emitChange = (newValue: number[]) => {
    const value = toValue(props.value)
    const fallback = toValue(props.defaultValue)
    if (typeof value === 'number' || typeof fallback === 'number') {
      props.onChange?.(newValue[0] as T)
    } else {
      props.onChange?.(newValue as T)
    }
  }
  const emitChangeEnd = (newValue: number[]) => {
    const value = toValue(props.value)
    const fallback = toValue(props.defaultValue)
    if (typeof value === 'number' || typeof fallback === 'number') {
      props.onChangeEnd?.(newValue[0] as T)
    } else {
      props.onChangeEnd?.(newValue as T)
    }
  }

  const [valuesState, setValuesState] = useControlledState<number[]>(controlledValues, defaultValues, emitChange)
  const initialValues = valuesState.value.slice()
  const isDraggings = ref<boolean[]>(new Array(valuesState.value.length).fill(false))
  const isEditables: boolean[] = new Array(Math.max(valuesState.value.length, 1)).fill(true)
  const focusedIndex = ref<number | undefined>(undefined)
  const valuesRef: {current: number[]} = {current: valuesState.value.slice()}
  let listFormat: Intl.ListFormat | null = null

  const readValues = () => {
    const current = valuesState.value
    if (!isDraggings.value.some(Boolean)) valuesRef.current = current.slice()
    return isDraggings.value.some(Boolean) ? valuesRef.current : current
  }

  function ensureSlots(length: number) {
    while (isDraggings.value.length < length) isDraggings.value.push(false)
    while (isEditables.length < length) isEditables.push(true)
  }

  function setValues(next: number[]) {
    valuesRef.current = next
    ensureSlots(next.length)
    setValuesState(next)
  }

  function getThumbMinValue(index: number) {
    const values = readValues()
    return index === 0 ? minValue() : values[index - 1]
  }
  function getThumbMaxValue(index: number) {
    const values = readValues()
    return index === values.length - 1 ? maxValue() : values[index + 1]
  }

  function updateValue(index: number, value: number) {
    if (isDisabled() || !isEditables[index]) return
    const values = readValues()
    ensureSlots(values.length)
    const thisMin = index === 0 ? minValue() : values[index - 1]
    const thisMax = index === values.length - 1 ? maxValue() : values[index + 1]
    value = snapValueToStep(value, thisMin, thisMax, step())
    if (values[index] === value) {
      valuesRef.current = values
      return
    }
    const next = values.slice()
    next[index] = value
    setValues(next)
  }

  function updateDragging(index: number, dragging: boolean) {
    if (isDisabled() || isEditables[index] === false) return
    const values = valuesState.value
    ensureSlots(Math.max(values.length, index + 1))
    if (dragging) valuesRef.current = values.slice()
    const wasDragging = isDraggings.value[index]
    if (isDraggings.value[index] === dragging) {
      if (!dragging && wasDragging && !isDraggings.value.some(Boolean)) emitChangeEnd(valuesRef.current.slice())
      return
    }
    const next = isDraggings.value.slice()
    next[index] = dragging
    isDraggings.value = next
    if (wasDragging && !isDraggings.value.some(Boolean)) emitChangeEnd(valuesRef.current.slice())
  }

  function getValuePercent(value: number) {
    return (value - minValue()) / (maxValue() - minValue())
  }

  function getRoundedValue(value: number) {
    return Math.round((value - minValue()) / step()) * step() + minValue()
  }

  function getPercentValue(percent: number) {
    const val = percent * (maxValue() - minValue()) + minValue()
    return clamp(getRoundedValue(val), minValue(), maxValue())
  }

  function getFormattedValue(valueParam: number | number[] = readValues()) {
    const formatter = props.numberFormatter
    let values = valueParam
    if (typeof values === 'number') values = [values]
    switch (values.length) {
      case 0:
        return ''
      case 1:
        return formatter.format(values[0])
      case 2:
        return formatter.formatRange(values[0], values[1])
      default: {
        const formatted = values.map((value) => formatter.format(value))
        const locale = formatter.resolvedOptions().locale
        if (!listFormat || listFormat.resolvedOptions().locale !== locale) {
          listFormat = new Intl.ListFormat(locale, {type: 'unit'})
        }
        return listFormat.format(formatted)
      }
    }
  }

  const state: SliderState = {
    get values() {
      return readValues().slice()
    },
    get defaultValues() {
      return toValue(props.defaultValue) !== undefined ? defaultValues() : initialValues.slice()
    },
    getThumbValue(index) {
      return readValues()[index]
    },
    setThumbValue: updateValue,
    setThumbPercent(index, percent) {
      updateValue(index, getPercentValue(percent))
    },
    isThumbDragging(index) {
      return Boolean(isDraggings.value[index])
    },
    setThumbDragging: updateDragging,
    get focusedThumb() {
      return focusedIndex.value
    },
    setFocusedThumb(index) {
      focusedIndex.value = index
    },
    getThumbPercent(index) {
      return getValuePercent(readValues()[index])
    },
    getValuePercent,
    getThumbValueLabel(index) {
      return getFormattedValue(readValues()[index])
    },
    getFormattedValue,
    getThumbMinValue,
    getThumbMaxValue,
    getPercentValue,
    isThumbEditable(index) {
      return isEditables[index] !== false
    },
    setThumbEditable(index, editable) {
      ensureSlots(index + 1)
      isEditables[index] = editable
    },
    incrementThumb(index, stepSize = 1) {
      const amount = Math.max(stepSize, step())
      updateValue(index, snapValueToStep(readValues()[index] + amount, minValue(), maxValue(), step()))
    },
    decrementThumb(index, stepSize = 1) {
      const amount = Math.max(stepSize, step())
      updateValue(index, snapValueToStep(readValues()[index] - amount, minValue(), maxValue(), step()))
    },
    get step() {
      return step()
    },
    get pageSize() {
      return pageSize()
    },
    get orientation() {
      return orientation()
    },
    get isDisabled() {
      return isDisabled()
    },
  }

  return state
}
