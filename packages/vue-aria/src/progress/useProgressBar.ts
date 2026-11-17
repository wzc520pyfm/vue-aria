/*
 * Port of `react-aria@3.53.1` `useProgressBar`
 * (`packages/react-aria/src/progress/useProgressBar.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. `progressBarProps` and `labelProps` are plain objects
 * with live getters. Inputs accept refs or getters.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'
import {useNumberFormatter} from '../i18n/useNumberFormatter'
import {useLabel} from '../label/useLabel'

function clamp(value: number, min = -Infinity, max = Infinity) {
  return Math.min(Math.max(value, min), max)
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
}

function readNumber(source: MaybeRefOrGetter<number | undefined> | undefined, fallback: number) {
  const value = toValue(source as MaybeRefOrGetter<number | undefined>)
  if (value == null) return fallback
  return Number(value)
}

export interface ProgressBarBaseProps {
  /** The current value (controlled). @default 0 */
  value?: MaybeRefOrGetter<number | undefined>
  /** The smallest value allowed. @default 0 */
  minValue?: MaybeRefOrGetter<number | undefined>
  /** The largest value allowed. @default 100 */
  maxValue?: MaybeRefOrGetter<number | undefined>
  /** The content to display as the label. */
  label?: MaybeRefOrGetter<unknown>
  /**
   * The display format of the value label.
   * @default { style: 'percent' }
   */
  formatOptions?: MaybeRefOrGetter<Intl.NumberFormatOptions | undefined>
  /** The content to display as the value's label (e.g. 1 of 4). */
  valueLabel?: MaybeRefOrGetter<unknown>
}

interface AriaLabeling {
  id?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-details'?: MaybeRefOrGetter<string | undefined>
}

export interface AriaProgressBarBaseProps extends ProgressBarBaseProps, AriaLabeling {}

export interface ProgressBarProps extends ProgressBarBaseProps {
  /** Whether presentation is indeterminate when progress isn't known. */
  isIndeterminate?: MaybeRefOrGetter<boolean | undefined>
}

export interface AriaProgressBarProps extends ProgressBarProps, AriaLabeling {}

export interface ProgressBarAria {
  /** Props for the progress bar container element. */
  progressBarProps: Record<string, any>
  /** Props for the progress bar's visual label element (if any). */
  labelProps: Record<string, any>
}

/**
 * Provides the accessibility implementation for a progress bar component.
 * Progress bars show either determinate or indeterminate progress of an operation
 * over time.
 */
export function useProgressBar(props: AriaProgressBarProps = {}): ProgressBarAria {
  const {labelProps: labelRef, fieldProps} = useLabel({
    id: () => toValue(props.id),
    label: () => toValue(props.label),
    'aria-label': () => toValue(props['aria-label']),
    'aria-labelledby': () => toValue(props['aria-labelledby']),
    // Progress bar is not an HTML input element, so it is not labeled by a <label>.
    labelElementType: 'span',
  })

  const formatter = useNumberFormatter(() => toValue(props.formatOptions) ?? {style: 'percent'})

  const labelProps: Record<string, any> = {}
  defineLive(labelProps, 'id', () => labelRef.value.id)
  defineLive(labelProps, 'htmlFor', () => labelRef.value.htmlFor)

  function bounds() {
    const minValue = readNumber(props.minValue, 0)
    const maxValue = readNumber(props.maxValue, 100)
    const value = clamp(readNumber(props.value, 0), minValue, maxValue)
    return {minValue, maxValue, value}
  }

  function indeterminate() {
    return Boolean(toValue(props.isIndeterminate))
  }

  function valueText() {
    if (indeterminate()) return undefined
    const explicit = toValue(props.valueLabel)
    if (explicit) return explicit
    const {minValue, maxValue, value} = bounds()
    const format = toValue(props.formatOptions) ?? {style: 'percent'}
    const range = maxValue - minValue
    const percentage = range === 0 ? 0 : (value - minValue) / range
    const valueToFormat = format.style === 'percent' ? percentage : value
    return formatter.format(valueToFormat)
  }

  const progressBarProps: Record<string, any> = {}
  defineLive(progressBarProps, 'id', () => fieldProps.value.id)
  defineLive(progressBarProps, 'aria-label', () => fieldProps.value['aria-label'])
  defineLive(progressBarProps, 'aria-labelledby', () => fieldProps.value['aria-labelledby'])
  defineLive(progressBarProps, 'aria-describedby', () => toValue(props['aria-describedby']))
  defineLive(progressBarProps, 'aria-details', () => toValue(props['aria-details']))
  defineLive(progressBarProps, 'aria-valuemin', () => bounds().minValue)
  defineLive(progressBarProps, 'aria-valuemax', () => bounds().maxValue)
  defineLive(progressBarProps, 'aria-valuenow', () => (indeterminate() ? undefined : bounds().value))
  defineLive(progressBarProps, 'aria-valuetext', () => valueText())
  defineLive(progressBarProps, 'role', () => 'progressbar')

  for (const key of Object.keys(props)) {
    if (key.startsWith('data-')) {
      defineLive(progressBarProps, key, () => toValue((props as Record<string, unknown>)[key] as MaybeRefOrGetter<unknown>))
    }
  }

  return {progressBarProps, labelProps}
}
