/*
 * Port of `react-stately@3.51.0` `useRangeCalendarState`
 * (`packages/react-stately/src/calendar/useRangeCalendarState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Options are MaybeRefOrGetter-aware and state
 * fields are live getters over computed refs, matching the single calendar's
 * getter-based surface. Live objects (the `isDateUnavailable` wrapper and its
 * anchor argument) are never snapshotted at setup time.
 */

import {
  constrainValue,
  isInvalid,
  previousAvailableDate,
  alignCenter,
} from './utils'
import {
  GregorianCalendar,
  maxDate,
  minDate,
  toCalendar,
  toCalendarDate,
  type Calendar,
  type CalendarDate,
  type CalendarIdentifier,
  type DateDuration,
} from '@internationalized/date'
import type {
  CalendarPropsBase,
  DateValue,
  MappedDateValue,
  RangeCalendarState,
  RangeValue,
} from './types'
import {computed, ref, shallowRef, toValue, type MaybeRefOrGetter} from 'vue'
import {useCalendarState} from './useCalendarState'
import {useControlledState} from '../utils/useControlledState'

export type DateRange = RangeValue<DateValue> | null

export interface RangeCalendarProps<T extends DateValue> extends CalendarPropsBase {
  /**
   * When combined with `isDateUnavailable`, determines whether non-contiguous ranges,
   * i.e. ranges containing unavailable dates, may be selected.
   *
   * @default false
   */
  allowsNonContiguousRanges?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Callback that is called for each date of the calendar. If it returns true, then the date is
   * unavailable. The second argument provides the current selection anchor date, if any. This can
   * be used to adjust the available dates based on the user's first selected date.
   */
  isDateUnavailable?: (date: DateValue, anchorDate: CalendarDate | null) => boolean
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<RangeValue<T> | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<RangeValue<T> | null | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: RangeValue<MappedDateValue<T>> | null) => void
}

export interface RangeCalendarStateOptions<T extends DateValue = DateValue>
  extends RangeCalendarProps<T> {
  /** The locale to display and edit the value according to. */
  locale: MaybeRefOrGetter<string>
  /**
   * A function that creates a Calendar object for a given calendar identifier.
   * May be imported from `@internationalized/date`, or manually implemented.
   */
  createCalendar: MaybeRefOrGetter<(name: CalendarIdentifier) => Calendar>
  /**
   * The amount of days that will be displayed at once. This affects how pagination works.
   *
   * @default { months: 1 }
   */
  visibleDuration?: MaybeRefOrGetter<DateDuration | undefined>
  /**
   * Determines the alignment of the visible months on initial render based on
   * the current selection or current date if there is no selection.
   *
   * @default 'center'
   */
  selectionAlignment?: MaybeRefOrGetter<'start' | 'center' | 'end' | undefined>
}

/**
 * Provides state management for a range calendar component. A range calendar displays one or more
 * date grids and allows users to select a contiguous range of dates.
 */
export function useRangeCalendarState<T extends DateValue = DateValue>(
  props: RangeCalendarStateOptions<T>,
): RangeCalendarState<T> {
  const locale = computed(() => toValue(props.locale))
  const visibleDuration = computed<DateDuration>(
    () => toValue(props.visibleDuration) ?? {months: 1},
  )

  // Keep `null` distinct from `undefined`: an explicit null value means
  // controlled-empty, not uncontrolled.
  const valueProp = computed(() => toValue(props.value) as RangeValue<T> | null | undefined)
  const defaultValueProp = computed(() => toValue(props.defaultValue) ?? null)

  const [value, setControlledValue] = useControlledState<RangeValue<T> | null>(
    () => valueProp.value as RangeValue<T> | null | undefined,
    () => defaultValueProp.value as RangeValue<T> | null,
    (v) => props.onChange?.(v as any),
  )

  const anchorDate = shallowRef<CalendarDate | null>(null)

  const alignment = computed<'center' | 'start'>(() => {
    const v = value.value
    if (v && v.start && v.end) {
      let start = alignCenter(
        toCalendarDate(v.start as DateValue),
        visibleDuration.value,
        locale.value,
        toValue(props.minValue) ?? null,
        toValue(props.maxValue) ?? null,
      )
      const end = start.add({...visibleDuration.value}).subtract({days: 1})

      if ((v.end as DateValue).compare(end) > 0) {
        return 'start'
      }
    }
    return 'center'
  })

  // The callback and the anchor date must be read live on every call; never
  // capture them at setup time.
  const isDateUnavailableFn = props.isDateUnavailable
    ? (date: DateValue) => props.isDateUnavailable!(date, anchorDate.value)
    : undefined

  const getAvailableRange = (anchor: CalendarDate | null) => {
    if (anchor && isDateUnavailableFn && !toValue(props.allowsNonContiguousRanges)) {
      const duration = visibleDuration.value
      const nextAvailableStartDate = nextUnavailableDate(anchor, isDateUnavailableFn, duration, -1)
      const nextAvailableEndDate = nextUnavailableDate(anchor, isDateUnavailableFn, duration, 1)
      return {
        start: nextAvailableStartDate,
        end: nextAvailableEndDate,
      }
    }
    return null
  }

  const availableRange = computed(() => getAvailableRange(anchorDate.value))
  const min = computed(() => maxDate(toValue(props.minValue) ?? null, availableRange.value?.start))
  const max = computed(() => minDate(toValue(props.maxValue) ?? null, availableRange.value?.end))

  const calendar = useCalendarState({
    focusedValue: props.focusedValue,
    defaultFocusedValue: props.defaultFocusedValue,
    onFocusChange: props.onFocusChange,
    validationState: props.validationState,
    isInvalid: props.isInvalid,
    isDisabled: props.isDisabled,
    isReadOnly: props.isReadOnly,
    autoFocus: props.autoFocus,
    errorMessage: props.errorMessage,
    pageBehavior: props.pageBehavior,
    firstDayOfWeek: props.firstDayOfWeek,
    weeksInMonth: props.weeksInMonth,
    value: () => (value.value ? value.value.start : undefined) as any,
    createCalendar: props.createCalendar,
    locale: () => locale.value,
    visibleDuration: () => visibleDuration.value,
    minValue: () => min.value,
    maxValue: () => max.value,
    selectionAlignment: () => toValue(props.selectionAlignment) ?? alignment.value,
    isDateUnavailable: isDateUnavailableFn,
  } as any)

  const highlightedRange = computed<RangeValue<CalendarDate> | null>(() => {
    if (anchorDate.value) {
      return makeRange(anchorDate.value, calendar.focusedDate)
    }
    const v = value.value
    return v && makeRange(v.start as DateValue, v.end as DateValue)
  })

  const setValue = (next: RangeValue<T> | null) => {
    setControlledValue(next)
  }

  const selectDate = (date: CalendarDate) => {
    if (toValue(props.isReadOnly)) {
      return
    }

    const constrainedDate = constrainValue(date, min.value, max.value)
    const previousAvailableConstrainedDate = previousAvailableDate(
      constrainedDate,
      calendar.visibleRange.start,
      isDateUnavailableFn,
    )
    if (!previousAvailableConstrainedDate) {
      return
    }

    if (!anchorDate.value) {
      anchorDate.value = previousAvailableConstrainedDate
    } else {
      const range = makeRange(anchorDate.value, previousAvailableConstrainedDate)
      if (range) {
        setValue({
          start: convertValue(range.start, (value.value as any)?.start) as unknown as T,
          end: convertValue(range.end, (value.value as any)?.end) as unknown as T,
        })
      }
      anchorDate.value = null
    }
  }

  const isDragging = ref(false)
  const setDragging = (dragging: boolean) => {
    isDragging.value = dragging
  }

  const isInvalidSelection = computed(() => {
    const v = value.value
    if (!v || anchorDate.value) {
      return false
    }

    if (isDateUnavailableFn && (isDateUnavailableFn(v.start as DateValue) || isDateUnavailableFn(v.end as DateValue))) {
      return true
    }

    return (
      isInvalid(v.start as DateValue, toValue(props.minValue) ?? null, toValue(props.maxValue) ?? null) ||
      isInvalid(v.end as DateValue, toValue(props.minValue) ?? null, toValue(props.maxValue) ?? null)
    )
  })

  const isValueInvalid = computed(
    () =>
      Boolean(toValue(props.isInvalid)) ||
      toValue(props.validationState) === 'invalid' ||
      isInvalidSelection.value,
  )
  const validationState = computed<'valid' | 'invalid' | null>(() =>
    isValueInvalid.value ? 'invalid' : null,
  )

  const isRangeDateInvalid = (date: CalendarDate) =>
    calendar.isInvalid(date) ||
    isInvalid(date, availableRange.value?.start, availableRange.value?.end)

  // The single-value calendar object is used as the base; its getters stay
  // live through the prototype chain and the range state overrides the
  // range-specific members.
  const state = Object.create(calendar) as RangeCalendarState<T>
  Object.defineProperties(state, {
    value: {get: () => value.value as RangeValue<T> | null, enumerable: true},
    setValue: {
      value: setValue as RangeCalendarState<T>['setValue'],
      enumerable: true,
      writable: true,
      configurable: true,
    },
    anchorDate: {get: () => anchorDate.value, enumerable: true},
    setAnchorDate: {
      value: (date: CalendarDate | null) => {
        anchorDate.value = date
      },
      enumerable: true,
      writable: true,
      configurable: true,
    },
    highlightedRange: {get: () => highlightedRange.value, enumerable: true},
    validationState: {get: () => validationState.value, enumerable: true},
    isValueInvalid: {get: () => isValueInvalid.value, enumerable: true},
    selectFocusedDate: {
      value: () => {
        if (!calendar.isCellUnavailable(calendar.focusedDate)) {
          selectDate(calendar.focusedDate)
        }
      },
      enumerable: true,
      writable: true,
      configurable: true,
    },
    commitSelection: {
      value: () => {
        selectDate(calendar.focusedDate)
      },
      enumerable: true,
      writable: true,
      configurable: true,
    },
    selectDate: {
      value: selectDate,
      enumerable: true,
      writable: true,
      configurable: true,
    },
    highlightDate: {
      value: (date: CalendarDate) => {
        if (anchorDate.value) {
          calendar.setFocusedDate(date)
        }
      },
      enumerable: true,
      writable: true,
      configurable: true,
    },
    isSelected: {
      value: (date: CalendarDate) => {
        const hr = highlightedRange.value
        return Boolean(
          hr &&
            date.compare(hr.start) >= 0 &&
            date.compare(hr.end) <= 0 &&
            !calendar.isCellDisabled(date) &&
            !calendar.isCellUnavailable(date),
        )
      },
      enumerable: true,
      writable: true,
      configurable: true,
    },
    isInvalid: {
      value: isRangeDateInvalid,
      enumerable: true,
      writable: true,
      configurable: true,
    },
    isDragging: {get: () => isDragging.value, enumerable: true},
    setDragging: {
      value: setDragging,
      enumerable: true,
      writable: true,
      configurable: true,
    },
    clearSelection: {
      value: () => {
        anchorDate.value = null
        setValue(null)
      },
      enumerable: true,
      writable: true,
      configurable: true,
    },
    focusNearestAvailableDate: {
      value: (anchor: CalendarDate) => {
        const range = getAvailableRange(anchor)
        const isDateInvalid = (date: CalendarDate) =>
          isRangeDateInvalid(date) || isInvalid(date, range?.start, range?.end)
        let nextDay = anchor.add({days: 1})
        if (isDateInvalid(nextDay)) {
          nextDay = anchor.subtract({days: 1})
        }
        if (!isDateInvalid(nextDay)) {
          calendar.setFocusedDate(nextDay)
          calendar.setFocused(true)
        }
      },
      enumerable: true,
      writable: true,
      configurable: true,
    },
  })

  return state
}

function makeRange(start: DateValue, end: DateValue): RangeValue<CalendarDate> | null {
  if (!start || !end) {
    return null
  }

  if (end.compare(start) < 0) {
    const tmp = start
    start = end
    end = tmp
  }

  return {start: toCalendarDate(start), end: toCalendarDate(end)}
}

function convertValue(newValue: CalendarDate, oldValue?: DateValue): DateValue {
  // The display calendar should not have any effect on the emitted value.
  // Emit dates in the same calendar as the original value, if any, otherwise gregorian.
  newValue = toCalendar(newValue, oldValue?.calendar || new GregorianCalendar())

  // Preserve time if the input value had one.
  if (oldValue && 'hour' in oldValue) {
    return (oldValue as any).set(newValue) as unknown as DateValue
  }

  return newValue
}

function nextUnavailableDate(
  anchorDate: CalendarDate,
  isDateUnavailable: (date: DateValue) => boolean,
  visibleDuration: DateDuration,
  dir: number,
): CalendarDate | undefined {
  let nextDate = anchorDate.add({days: dir})
  const minDate = anchorDate.subtract({...visibleDuration})
  const maxDateValue = anchorDate.add({...visibleDuration})
  while (
    (dir < 0 ? nextDate.compare(minDate) >= 0 : nextDate.compare(maxDateValue) <= 0) &&
    !isDateUnavailable(nextDate)
  ) {
    nextDate = nextDate.add({days: dir})
  }

  if (isDateUnavailable(nextDate)) {
    return nextDate.add({days: -dir})
  }
  return undefined
}
