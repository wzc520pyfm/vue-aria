/*
 * Port of `react-stately@3.51.0` `useDateRangePickerState`
 * (`packages/react-stately/src/datepicker/useDateRangePickerState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters so
 * controlled values are never snapshotted at setup time, and
 * `shouldCloseOnSelect` is re-resolved on every select/close — it accepts a
 * boolean, a getter, a ref, or a callback (`() => boolean`). The overlay
 * open state keeps `OverlayTriggerState`'s `ComputedRef<boolean>` contract,
 * and every close/toggle goes through the picker's commit logic (pending
 * date + placeholder time are committed when closing a popover that only has
 * a partial selection). IncompleteDate / placeholder semantics are preserved:
 * partial input is never coerced into a complete date, and `setValue` only
 * commits a complete `{start, end}` range.
 */

import {
  toCalendarDate,
  toCalendarDateTime,
  DateFormatter,
  type DateValue as IntlDateValue,
} from '@internationalized/date'
import {computed, shallowRef, toValue, watch, type ComputedRef, type MaybeRefOrGetter} from 'vue'
import {
  getFormatOptions,
  getPlaceholderTime,
  getRangeValidationResult,
  useDefaultProps,
  type FieldOptions,
  type FormatterOptions,
} from './utils'
import {
  useFormValidationState,
  type FormValidationState,
} from '../form/useFormValidationState'
import {
  useOverlayTriggerState,
  type OverlayTriggerState,
} from '../overlays/useOverlayTriggerState'
import {useControlledState} from '../utils/useControlledState'
import type {
  DateRange,
  DateRangePickerProps,
  DateValue,
  Granularity,
  MappedDateValue,
  TimeValue,
} from './types'
import type {RangeValue} from '../calendar/types'

export interface DateRangePickerStateOptions<T extends DateValue> extends DateRangePickerProps<T> {
  /**
   * Determines whether the date range picker popover should close automatically when a date is selected.
   *
   * @default true
   */
  shouldCloseOnSelect?: MaybeRefOrGetter<boolean | (() => boolean) | undefined>
}

type TimeRange = RangeValue<TimeValue>

export interface DateRangePickerState extends Omit<OverlayTriggerState, 'isOpen' | 'setOpen' | 'open' | 'close' | 'toggle'>, FormValidationState {
  /** The currently selected date range. */
  readonly value: RangeValue<DateValue | null>
  /** The default selected date range. */
  readonly defaultValue: DateRange | null
  /** Sets the selected date range. */
  setValue(value: DateRange | null): void
  /**
   * The date portion of the selected range. This may be set prior to `value` if the user has
   * selected a date range but has not yet selected a time range.
   */
  readonly dateRange: RangeValue<DateValue | null> | null
  /** Sets the date portion of the selected range. */
  setDateRange(value: DateRange): void
  /**
   * The time portion of the selected range. This may be set prior to `value` if the user has
   * selected a time range but has not yet selected a date range.
   */
  readonly timeRange: RangeValue<TimeValue | null> | null
  /** Sets the time portion of the selected range. */
  setTimeRange(value: TimeRange): void
  /** Sets the date portion of either the start or end of the selected range. */
  setDate(part: 'start' | 'end', value: DateValue | null): void
  /** Sets the time portion of either the start or end of the selected range. */
  setTime(part: 'start' | 'end', value: TimeValue | null): void
  /** Sets the date and time of either the start or end of the selected range. */
  setDateTime(part: 'start' | 'end', value: DateValue | null): void
  /** The granularity for the field, based on the `granularity` prop and current value. */
  readonly granularity: Granularity
  /**
   * Whether the date range picker supports selecting times, according to the `granularity` prop and
   * current value.
   */
  readonly hasTime: boolean
  /** Whether the calendar popover is currently open. */
  readonly isOpen: ComputedRef<boolean>
  /** Sets whether the calendar popover is open. Commits any pending date range selection. */
  setOpen(isOpen: boolean): void
  /** Opens the popover. */
  open(): void
  /** Closes the popover. Commits any pending date range selection. */
  close(): void
  /** Toggles the popover. Commits any pending date range selection when closing. */
  toggle(): void
  /**
   * The current validation state of the date range picker, based on the `validationState`,
   * `minValue`, and `maxValue` props.
   *
   * @deprecated Use `isInvalid` instead.
   */
  readonly validationState: 'valid' | 'invalid' | null
  /**
   * Whether the date range picker is invalid, based on the `isInvalid`, `minValue`, and
   * `maxValue` props.
   */
  readonly isInvalid: boolean
  /** Formats the selected range using the given options. */
  formatValue(locale: string, fieldOptions: FieldOptions): {start: string; end: string} | null
  /** Gets a formatter based on state's props. */
  getDateFormatter(locale: string, formatOptions: FormatterOptions): DateFormatter
}

/**
 * Provides state management for a date range picker component.
 * A date range picker combines two DateFields and a RangeCalendar popover to allow
 * users to enter or select a date and time range.
 */
export function useDateRangePickerState<T extends DateValue = DateValue>(
  props: DateRangePickerStateOptions<T>,
): DateRangePickerState {
  const overlayState = useOverlayTriggerState({
    isOpen: () => toValue(props.isOpen),
    defaultOpen: () => toValue(props.defaultOpen),
    onOpenChange: (isOpen: boolean) => props.onOpenChange?.(isOpen),
  })
  const [value, setValue] = useControlledState<RangeValue<MappedDateValue<T>> | null>(
    () => toValue(props.value) as RangeValue<MappedDateValue<T>> | null | undefined,
    () => (toValue(props.defaultValue) ?? null) as RangeValue<MappedDateValue<T>> | null,
    (val) => props.onChange?.(val as RangeValue<MappedDateValue<T>> | null),
  )

  const initialValue = value.value
  // The pending placeholder range used while the popover is open but the user
  // has only dialed in part of the range. shallowRef: Vue's deep ref wrapping
  // mangles the @internationalized/date class instances (they carry #private).
  const placeholder = shallowRef<RangeValue<DateValue | null>>(
    (value.value ?? {start: null, end: null}) as RangeValue<DateValue | null>,
  )

  // Reset the placeholder if the value prop is set to null.
  watch(
    value,
    (v) => {
      if (v == null && placeholder.value.start && placeholder.value.end) {
        placeholder.value = {start: null, end: null}
      }
    },
    {flush: 'sync'},
  )

  const currentValue = computed<RangeValue<DateValue | null>>(
    () => (value.value ?? placeholder.value) as RangeValue<DateValue | null>,
  )

  const minValue = computed(() => toValue(props.minValue) ?? null)
  const maxValue = computed(() => toValue(props.maxValue) ?? null)

  const setValueInternal = (newValue: RangeValue<DateValue | null> | null) => {
    // `value` below is intentionally the freshly committed placeholder so this
    // call can be re-entrant (commitValue reads it through getters).
    const next = (newValue ?? {start: null, end: null}) as RangeValue<DateValue | null>
    placeholder.value = next
    if (isCompleteRange(next)) {
      setValue(next as RangeValue<MappedDateValue<T>>)
    } else {
      setValue(null)
    }
  }

  const v = computed<DateValue | null>(
    () => currentValue.value.start ?? currentValue.value.end ?? toValue(props.placeholderValue) ?? null,
  )

  // Compute default granularity and time zone from the value, keeping the last
  // known values when the value becomes null (official useDefaultProps).
  const lastDefaults = shallowRef<[Granularity, string | undefined]>(['day', undefined])
  const granularityAndTimeZone = computed<[Granularity, string | undefined]>(() =>
    useDefaultProps(v.value, toValue(props.granularity), lastDefaults),
  )
  const granularity = computed(() => granularityAndTimeZone.value[0])
  const defaultTimeZone = computed(() => granularityAndTimeZone.value[1])
  const hasTime = computed(
    () =>
      granularity.value === 'hour' ||
      granularity.value === 'minute' ||
      granularity.value === 'second',
  )

  // `shouldCloseOnSelect` is re-resolved on every select/close: a plain boolean,
  // a ref/computed, a getter, or a callback (`() => boolean`) are all accepted.
  const getShouldCloseOnSelect = (): boolean => {
    const raw = toValue(props.shouldCloseOnSelect as any) as boolean | (() => boolean) | undefined
    const resolved = typeof raw === 'function' ? (raw as () => boolean)() : raw
    return resolved ?? true
  }

  // Resolve placeholder time lazily and live — a getter-backed defaultValue /
  // placeholderValue may change between renders (official reads it per render).
  const getPlaceholder = () =>
    getPlaceholderTime(
      (toValue(props.defaultValue) ?? toValue(props.placeholderValue)) as
        | IntlDateValue
        | null
        | undefined,
    ) as unknown as TimeValue

  // Date portion selected but not yet committed (used when `hasTime` and the
  // user picked a date range but not a time range yet).
  const selectedDateRef = shallowRef<RangeValue<DateValue | null> | null>(null)
  const selectedTimeRef = shallowRef<RangeValue<TimeValue | null> | null>(null)

  const dateRange = computed<RangeValue<DateValue | null> | null>(() => {
    const v = currentValue.value
    if (isCompleteRange(v)) {
      return v
    }
    return selectedDateRef.value
  })

  const timeRange = computed<RangeValue<TimeValue | null> | null>(() => {
    const v = currentValue.value
    if (isCompleteRange(v) && 'hour' in v.start) {
      return v as unknown as TimeRange
    }
    return selectedTimeRef.value
  })

  const showEra = computed(
    () =>
      (currentValue.value.start?.calendar.identifier === 'gregory' &&
        (currentValue.value.start as any)?.era === 'BC') ||
      (currentValue.value.end?.calendar.identifier === 'gregory' &&
        (currentValue.value.end as any)?.era === 'BC'),
  )
  const formatOpts = computed<FormatterOptions>(() => ({
    granularity: granularity.value,
    timeZone: defaultTimeZone.value,
    hideTimeZone: toValue(props.hideTimeZone),
    hourCycle: toValue(props.hourCycle),
    shouldForceLeadingZeros: toValue(props.shouldForceLeadingZeros),
    showEra: showEra.value,
  }))

  const builtinValidation = computed(() =>
    getRangeValidationResult(
      currentValue.value,
      minValue.value,
      maxValue.value,
      // Read the current prop on every validation call — never snapshot the
      // setup-time function reference (mirrors `validate`).
      props.isDateUnavailable ? (date) => props.isDateUnavailable!(date, null) : undefined,
      formatOpts.value,
    ),
  )

  const validation = useFormValidationState<RangeValue<MappedDateValue<T>> | null>({
    value: () => value.value as RangeValue<MappedDateValue<T>> | null,
    // Read the current prop on every validation call.
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: () =>
      [toValue(props.startName), toValue(props.endName)].filter((n): n is string => n != null),
    validate: (val) => props.validate?.(val as any) as any,
    validationBehavior: () => toValue(props.validationBehavior),
    builtinValidation: () => builtinValidation.value,
  })

  const isValueInvalid = computed(() => validation.displayValidation.isInvalid)
  const validationState = computed<'valid' | 'invalid' | null>(() =>
    toValue(props.validationState) || (isValueInvalid.value ? 'invalid' : null),
  )

  const commitValue = (range: DateRange, time: TimeRange) => {
    setValueInternal({
      start:
        'timeZone' in time.start
          ? (time.start as any).set(toCalendarDate(range.start as any))
          : toCalendarDateTime(range.start as any, time.start as any),
      end:
        'timeZone' in time.end
          ? (time.end as any).set(toCalendarDate(range.end as any))
          : toCalendarDateTime(range.end as any, time.end as any),
    } as RangeValue<DateValue>)
    selectedDateRef.value = null
    selectedTimeRef.value = null
    validation.commitValidation()
  }

  // Intercept setValue to make sure the time section is not changed by date selection in the calendar.
  const setDateRangeImpl = (range: RangeValue<DateValue | null>) => {
    const shouldClose = getShouldCloseOnSelect()
    if (hasTime.value) {
      const pendingTime = timeRange.value

      // Set a placeholder time if the popover is closing so we don't leave the field in an incomplete state.
      if (
        isCompleteRange(range) &&
        (shouldClose || (pendingTime?.start && pendingTime?.end))
      ) {
        commitValue(range as DateRange, {
          start: (pendingTime?.start ?? getPlaceholder()) as TimeValue,
          end: (pendingTime?.end ?? getPlaceholder()) as TimeValue,
        })
      } else {
        selectedDateRef.value = range
      }
    } else if (isCompleteRange(range)) {
      setValueInternal(range)
      validation.commitValidation()
    } else {
      selectedDateRef.value = range
    }

    if (shouldClose) {
      overlayState.setOpen(false)
    }
  }

  const setTimeRangeImpl = (range: RangeValue<TimeValue | null>) => {
    if (dateRange.value && isCompleteRange(dateRange.value) && range && isCompleteRange(range)) {
      commitValue(dateRange.value as DateRange, range as TimeRange)
    } else {
      selectedTimeRef.value = range
    }
  }

  // Commit the pending date range when the popover is closed. Use a placeholder time
  // if one wasn't set. If only the time range was set and not the date range, don't commit.
  // The state will be preserved until the user opens the popover again.
  const setOpen = (isOpen: boolean) => {
    const current = currentValue.value
    if (
      !isOpen &&
      !(current?.start && current?.end) &&
      dateRange.value &&
      isCompleteRange(dateRange.value) &&
      hasTime.value
    ) {
      const pendingTime = timeRange.value
      commitValue(dateRange.value as DateRange, {
        start: (pendingTime?.start ?? getPlaceholder()) as TimeValue,
        end: (pendingTime?.end ?? getPlaceholder()) as TimeValue,
      })
    }

    overlayState.setOpen(isOpen)
  }

  const state: DateRangePickerState = {
    // Live delegation of the validation state — spreading `validation` would
    // flatten the getters and freeze display/realtime validation.
    get realtimeValidation() {
      return validation.realtimeValidation
    },
    get displayValidation() {
      return validation.displayValidation
    },
    updateValidation: (result) => validation.updateValidation(result),
    resetValidation: () => validation.resetValidation(),
    commitValidation: () => validation.commitValidation(),
    get value() {
      return currentValue.value
    },
    get defaultValue() {
      return (toValue(props.defaultValue) ?? initialValue) as DateRange | null
    },
    setValue: setValueInternal,
    get dateRange() {
      return dateRange.value
    },
    setDateRange: setDateRangeImpl,
    get timeRange() {
      return timeRange.value
    },
    setTimeRange: setTimeRangeImpl,
    get granularity() {
      return granularity.value
    },
    get hasTime() {
      return hasTime.value
    },
    setDate(part, date) {
      if (part === 'start') {
        setDateRangeImpl({start: date, end: dateRange.value?.end ?? null})
      } else {
        setDateRangeImpl({start: dateRange.value?.start ?? null, end: date})
      }
    },
    setTime(part, time) {
      if (part === 'start') {
        setTimeRangeImpl({start: time, end: timeRange.value?.end ?? null})
      } else {
        setTimeRangeImpl({start: timeRange.value?.start ?? null, end: time})
      }
    },
    setDateTime(part, dateTime) {
      if (part === 'start') {
        setValueInternal({start: dateTime, end: currentValue.value?.end ?? null})
      } else {
        setValueInternal({start: currentValue.value?.start ?? null, end: dateTime})
      }
    },
    isOpen: overlayState.isOpen,
    setOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!overlayState.isOpen.value),
    point: overlayState.point,
    setPoint: overlayState.setPoint,
    get validationState() {
      return validationState.value
    },
    get isInvalid() {
      return isValueInvalid.value
    },
    formatValue(locale, fieldOptions) {
      const v = currentValue.value
      if (!v || !v.start || !v.end) {
        return null
      }

      const startTimeZone = 'timeZone' in v.start ? v.start.timeZone : undefined
      const startGranularity =
        toValue(props.granularity) || (v.start && 'minute' in v.start ? 'minute' : 'day')
      const endTimeZone = 'timeZone' in v.end ? v.end.timeZone : undefined
      const endGranularity =
        toValue(props.granularity) || (v.end && 'minute' in v.end ? 'minute' : 'day')

      const startOptions = getFormatOptions(fieldOptions, {
        granularity: startGranularity,
        timeZone: startTimeZone,
        hideTimeZone: toValue(props.hideTimeZone),
        hourCycle: toValue(props.hourCycle),
        showEra:
          (v.start.calendar.identifier === 'gregory' && (v.start as any).era === 'BC') ||
          (v.end.calendar.identifier === 'gregory' && (v.end as any).era === 'BC'),
      })

      const startDate = v.start.toDate(startTimeZone || 'UTC')
      const endDate = v.end.toDate(endTimeZone || 'UTC')

      const startFormatter = new DateFormatter(locale, startOptions)
      let endFormatter: Intl.DateTimeFormat
      if (
        startTimeZone === endTimeZone &&
        startGranularity === endGranularity &&
        v.start.compare(v.end) !== 0
      ) {
        // Use formatRange, as it results in shorter output when some of the fields
        // are shared between the start and end dates (e.g. the same month).
        // Formatting will fail if the end date is before the start date. Fall back below when that happens.
        try {
          const parts = startFormatter.formatRangeToParts(startDate, endDate)

          // Find the separator between the start and end date. This is determined
          // by finding the last shared literal before the end range.
          let separatorIndex = -1
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (part.source === 'shared' && part.type === 'literal') {
              separatorIndex = i
            } else if (part.source === 'endRange') {
              break
            }
          }

          // Now we can combine the parts into start and end strings.
          let start = ''
          let end = ''
          for (let i = 0; i < parts.length; i++) {
            if (i < separatorIndex) {
              start += parts[i].value
            } else if (i > separatorIndex) {
              end += parts[i].value
            }
          }

          return {start, end}
        } catch {
          // ignore
        }

        endFormatter = startFormatter as unknown as Intl.DateTimeFormat
      } else {
        const endOptions = getFormatOptions(fieldOptions, {
          granularity: endGranularity,
          timeZone: endTimeZone,
          hideTimeZone: toValue(props.hideTimeZone),
          hourCycle: toValue(props.hourCycle),
        })

        endFormatter = new DateFormatter(locale, endOptions) as unknown as Intl.DateTimeFormat
      }

      return {
        start: startFormatter.format(startDate),
        end: (endFormatter as unknown as DateFormatter).format(endDate),
      }
    },
    getDateFormatter(locale, formatOptions: FormatterOptions) {
      const newOptions = {...formatOpts.value, ...formatOptions}
      const newFormatOptions = getFormatOptions({}, newOptions)
      return new DateFormatter(locale, newFormatOptions)
    },
  }

  return state
}

function isCompleteRange<T>(value: RangeValue<T | null> | null): value is RangeValue<T> {
  return value?.start != null && value.end != null
}
