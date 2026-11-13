/*
 * Port of `react-stately@3.51.0` `useTimeFieldState`
 * (`packages/react-stately/src/datepicker/useTimeFieldState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Wraps `useDateFieldState` with time semantics: the value
 * is converted to/from a `CalendarDateTime`, and the emitted value is a `Time`
 * (unless the value or default value carries a date/time zone).
 */

import {
  getLocalTimeZone,
  GregorianCalendar,
  Time,
  toCalendarDateTime,
  today,
  toTime,
  toZoned,
} from '@internationalized/date'
import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useDateFieldState, type DateFieldState} from './useDateFieldState'
import type {
  MappedTimeValue,
  TimeFieldProps,
  TimeValue,
} from './types'
import {useControlledState} from '../utils/useControlledState'

export interface TimeFieldStateOptions<T extends TimeValue = TimeValue>
  extends TimeFieldProps<T> {
  /** The locale to display and edit the value according to. */
  locale: MaybeRefOrGetter<string>
}

export interface TimeFieldState extends DateFieldState {
  /** The current time value. */
  readonly timeValue: Time | null
}

/**
 * Provides state management for a time field component.
 * A time field allows users to enter and edit time values using a keyboard.
 * Each part of a time value is displayed in an individually editable segment.
 */
export function useTimeFieldState<T extends TimeValue = TimeValue>(
  props: TimeFieldStateOptions<T>,
): TimeFieldState {
  const placeholderValue = computed(() => toValue(props.placeholderValue) ?? (new Time() as T))
  const minValue = computed(() => toValue(props.minValue) ?? null)
  const maxValue = computed(() => toValue(props.maxValue) ?? null)
  const defaultValue = computed(() => toValue(props.defaultValue) ?? null)
  const granularity = computed(() => toValue(props.granularity))

  const [value, setValue] = useControlledState<TimeValue | null>(
    () => toValue(props.value) as TimeValue | null | undefined,
    () => defaultValue.value as TimeValue | null,
    (val) => (props.onChange as any)?.(val),
  )

  const v = computed(() => value.value || placeholderValue.value)
  const day = computed(() => (v.value && 'day' in v.value ? (v.value as T) : undefined))
  const defaultValueTimeZone = computed(() =>
    defaultValue.value && 'timeZone' in defaultValue.value ? defaultValue.value.timeZone : undefined,
  )
  const placeholderDate = computed(() => {
    const valueTimeZone =
      v.value && 'timeZone' in v.value ? (v.value as any).timeZone : undefined

    return (valueTimeZone || defaultValueTimeZone.value) && placeholderValue.value
      ? toZoned(convertValue(placeholderValue.value)!, valueTimeZone || defaultValueTimeZone.value!)
      : convertValue(placeholderValue.value)
  })
  const minDate = computed(() => convertValue(minValue.value as any, day.value as any))
  const maxDate = computed(() => convertValue(maxValue.value as any, day.value as any))

  const timeValue = computed<Time | null>(() =>
    value.value && 'day' in value.value
      ? toTime(value.value as any)
      : (value.value as unknown as Time | null),
  )
  const dateTime = computed(() => (value.value == null ? null : convertValue(value.value)))
  const defaultDateTime = computed(() =>
    defaultValue.value == null ? null : convertValue(defaultValue.value),
  )
  const onChange = (newValue: DateValueLike) => {
    setValue(
      day.value || defaultValueTimeZone.value ? (newValue as any) : newValue && toTime(newValue as any),
    )
  }

  const state = useDateFieldState<CalendarDateTimeLike>({
    ...props,
    value: () => (dateTime.value as any) ?? null,
    defaultValue: () => (defaultDateTime.value as any) ?? null,
    minValue: () => minDate.value as any,
    maxValue: () => maxDate.value as any,
    onChange: onChange as any,
    granularity: () => (granularity.value || 'minute') as any,
    maxGranularity: () => 'hour' as const,
    placeholderValue: () => (placeholderDate.value ?? undefined) as any,
    // Calendar should not matter for time fields.
    createCalendar: () => new GregorianCalendar() as any,
    validate: (val) => props.validate?.(value.value as any) as any,
    locale: () => toValue(props.locale),
    isDisabled: () => toValue(props.isDisabled),
    isReadOnly: () => toValue(props.isReadOnly),
    isRequired: () => toValue(props.isRequired),
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    validationBehavior: () => toValue(props.validationBehavior),
    autoFocus: () => toValue(props.autoFocus),
    name: () => toValue(props.name),
    form: () => toValue(props.form),
    hourCycle: () => toValue(props.hourCycle),
    hideTimeZone: () => toValue(props.hideTimeZone),
    shouldForceLeadingZeros: () => toValue(props.shouldForceLeadingZeros),
    label: () => toValue(props.label),
    description: () => toValue(props.description),
    errorMessage: () => toValue(props.errorMessage),
  })

  // `out` must keep live accessors: a plain `{...state, timeValue}` spread
  // would evaluate every getter once and freeze a stale snapshot of
  // value/segments/etc. (unlike React, object identity here is permanent).
  const descriptors = Object.getOwnPropertyDescriptors(state)
  const out = Object.defineProperties({}, descriptors) as TimeFieldState
  Object.defineProperty(out, 'timeValue', {
    get: () => timeValue.value,
    enumerable: true,
    configurable: true,
  })
  // Keep the wrapped state's setValue behavior (it routes through onChange above).
  return out
}

function convertValue(
  value: TimeValue | null | undefined,
  date: DateValueLike = today(getLocalTimeZone()) as unknown as DateValueLike,
) {
  if (!value) {
    return null
  }

  if ('day' in value) {
    return value
  }

  return toCalendarDateTime(date as any, value as any) as unknown as DateValueLike
}

type DateValueLike = import('@internationalized/date').CalendarDateTime
type CalendarDateTimeLike = import('@internationalized/date').CalendarDateTime
