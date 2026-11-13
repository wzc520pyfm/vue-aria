/*
 * Port of `react-stately@3.51.0` `useDateFieldState`
 * (`packages/react-stately/src/datepicker/useDateFieldState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters so
 * controlled values are never snapshotted at setup time. `processSegments`
 * matches the official segment pipeline, including the LRI/PDI bidi
 * isolation markers around time segments.
 */

import {
  Calendar,
  CalendarIdentifier,
  DateFormatter,
  GregorianCalendar,
  isEqualCalendar,
  toCalendar,
  type DateValue as IntlDateValue,
} from '@internationalized/date'
import {NumberFormatter} from '@internationalized/number'
import {computed, ref, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {
  convertValue,
  createPlaceholderDate,
  getFormatOptions,
  getValidationResult,
  useDefaultProps,
  type FieldOptions,
  type FormatterOptions,
} from './utils'
import {getPlaceholder} from './placeholders'
import {IncompleteDate} from './IncompleteDate'
import {
  useFormValidationState,
  type FormValidationState,
} from '../form/useFormValidationState'
import {useControlledState} from '../utils/useControlledState'
import type {
  DatePickerProps,
  DateValue,
  Granularity,
  MappedDateValue,
} from './types'

export type DateSegmentType =
  | 'era'
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'dayPeriod'
  | 'literal'
  | 'timeZoneName'

export interface DateSegment {
  /** The type of segment. */
  type: DateSegmentType
  /** The formatted text for the segment. */
  text: string
  /** The numeric value for the segment, if applicable. */
  value?: number | null
  /** The minimum numeric value for the segment, if applicable. */
  minValue?: number
  /** The maximum numeric value for the segment, if applicable. */
  maxValue?: number
  /** Whether the value is a placeholder. */
  isPlaceholder: boolean
  /** A placeholder string for the segment. */
  placeholder: string
  /** Whether the segment is editable. */
  isEditable: boolean
}

export interface DateFieldState extends FormValidationState {
  /** The current field value. */
  readonly value: DateValue | null
  /** The default field value. */
  readonly defaultValue: DateValue | null
  /** The current value, converted to a native JavaScript `Date` object. */
  readonly dateValue: Date
  /** The calendar system currently in use. */
  readonly calendar: Calendar
  /** Sets the field's value. */
  setValue(value: DateValue | IncompleteDate | null): void
  /** A list of segments for the current value. */
  readonly segments: DateSegment[]
  /** A date formatter configured for the current locale and format. */
  readonly dateFormatter: DateFormatter
  /**
   * The current validation state of the date field, based on the `validationState`, `minValue`, and
   * `maxValue` props.
   *
   * @deprecated Use `isInvalid` instead.
   */
  readonly validationState: 'valid' | 'invalid' | null
  /** Whether the date field is invalid, based on the `isInvalid`, `minValue`, and `maxValue` props. */
  readonly isInvalid: boolean
  /** The granularity for the field, based on the `granularity` prop and current value. */
  readonly granularity: Granularity
  /** The maximum date or time unit that is displayed in the field. */
  readonly maxGranularity: 'year' | 'month' | Granularity
  /** Whether the field is disabled. */
  readonly isDisabled: boolean
  /** Whether the field is read only. */
  readonly isReadOnly: boolean
  /** Whether the field is required. */
  readonly isRequired: boolean
  /**
   * Increments the given segment. Upon reaching the minimum or maximum value, the value wraps
   * around to the opposite limit.
   */
  increment(type: DateSegmentType): void
  /**
   * Decrements the given segment. Upon reaching the minimum or maximum value, the value wraps
   * around to the opposite limit.
   */
  decrement(type: DateSegmentType): void
  /**
   * Increments the given segment by a larger amount, rounding it to the nearest increment.
   * The amount to increment by depends on the field, for example 15 minutes, 7 days, and 5 years.
   * Upon reaching the minimum or maximum value, the value wraps around to the opposite limit.
   */
  incrementPage(type: DateSegmentType): void
  /**
   * Decrements the given segment by a larger amount, rounding it to the nearest increment.
   * The amount to decrement by depends on the field, for example 15 minutes, 7 days, and 5 years.
   * Upon reaching the minimum or maximum value, the value wraps around to the opposite limit.
   */
  decrementPage(type: DateSegmentType): void
  /** Increments the given segment to its maxiumum value. */
  incrementToMax(type: DateSegmentType): void
  /** Decrements the given segment to its minimum value. */
  decrementToMin(type: DateSegmentType): void
  /** Sets the value of the given segment. */
  setSegment(type: 'era', value: string): void
  setSegment(type: DateSegmentType, value: number): void
  /** Updates the remaining unfilled segments with the placeholder value. */
  confirmPlaceholder(): void
  /** Clears the value of the given segment, reverting it to the placeholder. */
  clearSegment(type: DateSegmentType): void
  /** Formats the current date value using the given options. */
  formatValue(fieldOptions: FieldOptions): string
  /** Gets a formatter based on state's props. */
  getDateFormatter(locale: string, formatOptions: FormatterOptions): DateFormatter
}

const EDITABLE_SEGMENTS: Partial<Record<DateSegmentType, boolean>> = {
  year: true,
  month: true,
  day: true,
  hour: true,
  minute: true,
  second: true,
  dayPeriod: true,
  era: true,
}

const PAGE_STEP: Partial<Record<DateSegmentType, number>> = {
  year: 5,
  month: 2,
  day: 7,
  hour: 2,
  minute: 15,
  second: 15,
}

const TYPE_MAPPING: Record<string, DateSegmentType> = {
  // Node seems to convert everything to lowercase...
  dayperiod: 'dayPeriod',
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts#named_years
  relatedYear: 'year',
  yearName: 'literal', // not editable
  unknown: 'literal',
}

export interface DateFieldStateOptions<T extends DateValue = DateValue>
  extends DatePickerProps<T> {
  /**
   * The maximum unit to display in the date field.
   *
   * @default 'year'
   */
  maxGranularity?: MaybeRefOrGetter<'year' | 'month' | Granularity | undefined>
  /** The locale to display and edit the value according to. */
  locale: MaybeRefOrGetter<string>
  /**
   * A function that creates a [Calendar](../internationalized/date/Calendar.html)
   * object for a given calendar identifier. Such a function may be imported from the
   * `@internationalized/date` package, or manually implemented to include support for
   * only certain calendars.
   */
  createCalendar: MaybeRefOrGetter<(name: CalendarIdentifier) => Calendar>
}

/**
 * Provides state management for a date field component.
 * A date field allows users to enter and edit date and time values using a keyboard.
 * Each part of a date value is displayed in an individually editable segment.
 */
export function useDateFieldState<T extends DateValue = DateValue>(
  props: DateFieldStateOptions<T>,
): DateFieldState {
  // Live getters over props — never snapshot controlled inputs in setup.
  const locale = computed(() => toValue(props.locale))
  const hourCycleProp = computed(() => toValue(props.hourCycle))
  const createCalendarFn = computed(() => {
    // Accept all of: a raw factory `(name) => Calendar` (official shape, arity
    // >= 1), a getter returning the factory (`() => createCalendar`), or a
    // getter returning a ready-made calendar (`() => new GregorianCalendar()`).
    // `toValue` alone cannot distinguish these — it would invoke a raw
    // factory with no arguments.
    const raw = props.createCalendar as any
    if (typeof raw === 'function' && raw.length > 0) {
      return raw as (name: CalendarIdentifier) => Calendar
    }
    const resolved = toValue(raw)
    return typeof resolved === 'function'
      ? (resolved as (name: CalendarIdentifier) => Calendar)
      : (() => resolved as Calendar)
  })
  const maxGranularity = computed(() => toValue(props.maxGranularity) ?? ('year' as const))
  const hideTimeZone = computed(() => toValue(props.hideTimeZone))
  const shouldForceLeadingZeros = computed(() => toValue(props.shouldForceLeadingZeros))
  const minValue = computed(() => toValue(props.minValue) ?? null)
  const maxValue = computed(() => toValue(props.maxValue) ?? null)
  const placeholderValue = computed(() => toValue(props.placeholderValue) ?? null)
  const isDateUnavailable = props.isDateUnavailable

  // Preserve the undefined (uncontrolled) / null (controlled empty) distinction.
  const valueProp = computed(() => toValue(props.value) as DateValue | null | undefined)
  const defaultValueProp = computed(() => toValue(props.defaultValue) ?? null)

  // The initial value used for the display calendar identity of emitted values.
  // Official reads `props.value || props.defaultValue || props.placeholderValue` on
  // every render; we expose it as a live computed.
  const v = computed<DateValue | null>(
    () =>
      (valueProp.value ||
        (defaultValueProp.value as T | null | undefined) ||
        (placeholderValue.value as T | null | undefined) ||
        null) as DateValue | null,
  )

  // Compute default granularity and time zone from the value, keeping the last
  // known values when the value becomes null (official useDefaultProps).
  const lastDefaults = ref<[Granularity, string | undefined]>(['day', undefined])
  const granularityAndTimeZone = computed<[Granularity, string | undefined]>(() =>
    useDefaultProps(v.value, toValue(props.granularity), lastDefaults),
  )
  const granularity = computed(() => granularityAndTimeZone.value[0])
  const defaultTimeZone = computed(() => granularityAndTimeZone.value[1])
  const timeZone = computed(() => defaultTimeZone.value || 'UTC')

  // Resolve default hour cycle and calendar system.
  const calendarHourCycle = computed<[Calendar, 'h11' | 'h12' | 'h23' | 'h24']>(() => {
    const formatter = new DateFormatter(locale.value, {
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: hourCycleProp.value != null ? hourCycleProp.value === 12 : undefined,
    })
    const opts = formatter.resolvedOptions()
    const calendar = createCalendarFn.value(opts.calendar as CalendarIdentifier)
    return [calendar, opts.hourCycle as 'h11' | 'h12' | 'h23' | 'h24']
  })
  const calendar = computed(() => calendarHourCycle.value[0])
  const hourCycle = computed(() => calendarHourCycle.value[1])

  const [value, setDate] = useControlledState<DateValue | null>(
    () => valueProp.value as DateValue | null | undefined,
    () => defaultValueProp.value as DateValue | null,
    (val) => (props.onChange as any)?.(val),
  )

  const initialValue = value.value
  const calendarValue = computed(() => convertValue(value.value, calendar.value) ?? null)

  const displayValue = ref<IncompleteDate>(
    new IncompleteDate(calendar.value, hourCycle.value, calendarValue.value ?? null),
  )

  // Official checks during render whether the value/calendar/hourCycle changed and
  // resets the display value. Vue performs the equivalent in a synchronous watcher so
  // dependent computeds observe the reset before they run.
  const lastValue = ref(calendarValue.value)
  const lastCalendar = ref<Calendar>(calendar.value)
  const lastHourCycle = ref(hourCycle.value)
  watch(
    [calendarValue, hourCycle, calendar],
    () => {
      if (
        calendarValue.value !== lastValue.value ||
        hourCycle.value !== lastHourCycle.value ||
        !isEqualCalendar(calendar.value, lastCalendar.value)
      ) {
        displayValue.value = new IncompleteDate(
          calendar.value,
          hourCycle.value,
          calendarValue.value,
        )
        lastValue.value = calendarValue.value
        lastCalendar.value = calendar.value
        lastHourCycle.value = hourCycle.value
      }
    },
    {flush: 'sync'},
  )

  const showEra = computed(
    () => calendar.value.identifier === 'gregory' && displayValue.value.era === 'BC',
  )
  const formatOpts = computed<FormatterOptions>(() => ({
    granularity: granularity.value,
    maxGranularity: maxGranularity.value,
    timeZone: defaultTimeZone.value,
    hideTimeZone: hideTimeZone.value,
    hourCycle: hourCycleProp.value,
    showEra: showEra.value,
    shouldForceLeadingZeros: shouldForceLeadingZeros.value,
  }))
  const opts = computed(() => getFormatOptions({}, formatOpts.value))

  const dateFormatter = computed(() => new DateFormatter(locale.value, opts.value))
  const resolvedOptions = computed(() => dateFormatter.value.resolvedOptions())
  const placeholder = computed(() =>
    createPlaceholderDate(
      placeholderValue.value,
      granularity.value,
      calendar.value,
      defaultTimeZone.value,
    ),
  )
  const displaySegments = computed<DateSegmentType[]>(() => {
    const is12HourClock = hourCycle.value === 'h11' || hourCycle.value === 'h12'
    const segments: DateSegmentType[] = [
      'era',
      'year',
      'month',
      'day',
      'hour',
      ...(is12HourClock ? (['dayPeriod'] as DateSegmentType[]) : []),
      'minute',
      'second',
    ]
    const minIndex = segments.indexOf((toValue(props.maxGranularity) || 'era') as DateSegmentType)
    const maxIndex = segments.indexOf(
      granularity.value === 'hour' && is12HourClock ? 'dayPeriod' : (granularity.value as DateSegmentType),
    )
    return segments.slice(minIndex, maxIndex + 1)
  })

  const setValue = (newValue: DateValue | IncompleteDate | null) => {
    if (toValue(props.isDisabled) || toValue(props.isReadOnly)) {
      return
    }

    if (
      newValue == null ||
      (newValue instanceof IncompleteDate && newValue.isCleared(displaySegments.value))
    ) {
      displayValue.value = new IncompleteDate(calendar.value, hourCycle.value, calendarValue.value)
      setDate(null)
    } else if (!(newValue instanceof IncompleteDate)) {
      // The display calendar should not have any effect on the emitted value.
      // Emit dates in the same calendar as the original value, if any, otherwise gregorian.
      const calendarId = v.value?.calendar || new GregorianCalendar()
      const converted = toCalendar(newValue, calendarId) as MappedDateValue<T>
      displayValue.value = new IncompleteDate(calendar.value, hourCycle.value, calendarValue.value)
      setDate(converted)
    } else {
      // If the new value is complete and valid, trigger onChange eagerly.
      // If it represents an incomplete or invalid value (e.g. February 30th),
      // wait until the field is blurred to trigger onChange.
      if (newValue.isComplete(displaySegments.value)) {
        const dateValue = newValue.toValue(calendarValue.value ?? placeholder.value)
        if (newValue.validate(dateValue, displaySegments.value)) {
          const newDateValue = toCalendar(
            dateValue,
            v.value?.calendar || new GregorianCalendar(),
          ) as MappedDateValue<T>
          if (!value.value || newDateValue.compare(value.value) !== 0) {
            // reset in case prop isn't updated
            displayValue.value = new IncompleteDate(calendar.value, hourCycle.value, calendarValue.value)
            setDate(newDateValue)
            return
          }
        }
      }

      // Incomplete/invalid value. Set temporary display override.
      displayValue.value = newValue
    }
  }

  const dateValue = computed<Date>(() => {
    const val = displayValue.value.toValue(calendarValue.value ?? placeholder.value)
    return val.toDate(timeZone.value)
  })

  const segments = computed<DateSegment[]>(() =>
    processSegments(
      dateValue.value,
      displayValue.value,
      dateFormatter.value as unknown as Intl.DateTimeFormat,
      resolvedOptions.value,
      calendar.value,
      locale.value,
      granularity.value,
    ),
  )

  const adjustSegment = (type: DateSegmentType, amount: number) => {
    setValue(displayValue.value.cycle(type, amount, placeholder.value, displaySegments.value))
  }

  const builtinValidation = computed(() =>
    getValidationResult(
      value.value,
      minValue.value,
      maxValue.value,
      isDateUnavailable,
      formatOpts.value,
    ),
  )

  const validation = useFormValidationState<MappedDateValue<T>>({
    value: () => value.value as MappedDateValue<T> | null,
    // Read the current prop on every validation call.
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: () => toValue(props.name),
    validate: (val) => props.validate?.(val as any) as any,
    validationBehavior: () => toValue(props.validationBehavior),
    builtinValidation: () => builtinValidation.value,
  })

  const isValueInvalid = computed(() => validation.displayValidation.isInvalid)
  const validationState = computed<'valid' | 'invalid' | null>(() =>
    toValue(props.validationState) || (isValueInvalid.value ? 'invalid' : null),
  )

  const state: DateFieldState = {
    ...validation,
    get value() {
      return calendarValue.value as DateValue | null
    },
    get defaultValue() {
      return (toValue(props.defaultValue) ?? initialValue) as DateValue | null
    },
    get dateValue() {
      return dateValue.value
    },
    get calendar() {
      return calendar.value
    },
    setValue,
    get segments() {
      return segments.value
    },
    get dateFormatter() {
      return dateFormatter.value
    },
    get validationState() {
      return validationState.value
    },
    get isInvalid() {
      return isValueInvalid.value
    },
    get granularity() {
      return granularity.value
    },
    get maxGranularity() {
      return maxGranularity.value
    },
    get isDisabled() {
      return Boolean(toValue(props.isDisabled))
    },
    get isReadOnly() {
      return Boolean(toValue(props.isReadOnly))
    },
    get isRequired() {
      return Boolean(toValue(props.isRequired))
    },
    increment(part) {
      adjustSegment(part, 1)
    },
    decrement(part) {
      adjustSegment(part, -1)
    },
    incrementPage(part) {
      adjustSegment(part, PAGE_STEP[part] || 1)
    },
    decrementPage(part) {
      adjustSegment(part, -(PAGE_STEP[part] || 1))
    },
    incrementToMax(part) {
      const max =
        part === 'hour' && hourCycle.value === 'h12'
          ? 11
          : displayValue.value.getSegmentLimits(part)!.maxValue
      setValue(displayValue.value.set(part, max, placeholder.value))
    },
    decrementToMin(part) {
      const min =
        part === 'hour' && hourCycle.value === 'h12'
          ? 12
          : displayValue.value.getSegmentLimits(part)!.minValue
      setValue(displayValue.value.set(part, min, placeholder.value))
    },
    setSegment(part, val: string | number) {
      setValue(displayValue.value.set(part, val, placeholder.value))
    },
    confirmPlaceholder() {
      if (toValue(props.isDisabled) || toValue(props.isReadOnly)) {
        return
      }

      // If the display value is complete but invalid, we need to constrain it and emit onChange on blur.
      if (displayValue.value.isComplete(displaySegments.value)) {
        const dateVal = displayValue.value.toValue(calendarValue.value ?? placeholder.value)
        const newDateValue = toCalendar(
          dateVal,
          v.value?.calendar || new GregorianCalendar(),
        ) as MappedDateValue<T>
        if (!value.value || newDateValue.compare(value.value) !== 0) {
          setDate(newDateValue)
        }
        displayValue.value = new IncompleteDate(calendar.value, hourCycle.value, calendarValue.value)
      }
    },
    clearSegment(part) {
      let val: IncompleteDate = displayValue.value

      if (part !== 'timeZoneName' && part !== 'literal') {
        val = displayValue.value.clear(part)
      }

      setValue(val)
    },
    formatValue(fieldOptions: FieldOptions) {
      if (!calendarValue.value) {
        return ''
      }

      const formatOptions = getFormatOptions(fieldOptions, formatOpts.value)
      const formatter = new DateFormatter(locale.value, formatOptions)
      return formatter.format(dateValue.value)
    },
    getDateFormatter(loc, formatOptions: FormatterOptions) {
      const newOptions = {...formatOpts.value, ...formatOptions}
      const newFormatOptions = getFormatOptions({}, newOptions)
      return new DateFormatter(loc, newFormatOptions)
    },
  }

  return state
}

function processSegments(
  dateValue: Date,
  displayValue: IncompleteDate,
  dateFormatter: Intl.DateTimeFormat,
  resolvedOptions: Intl.ResolvedDateTimeFormatOptions,
  calendar: Calendar,
  locale: string,
  granularity: Granularity,
): DateSegment[] {
  const timeValue = ['hour', 'minute', 'second']
  const segments = dateFormatter.formatToParts(dateValue)

  // In order to allow formatting temporarily invalid dates during editing (e.g. February 30th),
  // use a NumberFormatter to manually format segments directly from raw numbers.
  // When the user blurs the date field, the invalid segments will be constrained.
  const numberFormatter = new NumberFormatter(locale, {useGrouping: false})
  const twoDigitFormatter = new NumberFormatter(locale, {
    useGrouping: false,
    minimumIntegerDigits: 2,
  })
  for (const segment of segments) {
    if (
      segment.type === 'year' ||
      segment.type === 'month' ||
      segment.type === 'day' ||
      segment.type === 'hour'
    ) {
      const val = displayValue[segment.type] ?? 0
      if (resolvedOptions[segment.type] === '2-digit') {
        segment.value = twoDigitFormatter.format(val)
      } else {
        segment.value = numberFormatter.format(val)
      }
    }
  }

  const processedSegments: DateSegment[] = []
  for (const segment of segments) {
    const type = TYPE_MAPPING[segment.type] || (segment.type as DateSegmentType)
    let isEditable = Boolean(EDITABLE_SEGMENTS[type])
    if (type === 'era' && calendar.getEras().length === 1) {
      isEditable = false
    }

    const isPlaceholder =
      Boolean(EDITABLE_SEGMENTS[type]) && (displayValue as any)[segment.type] == null
    const segmentPlaceholder = EDITABLE_SEGMENTS[type]
      ? getPlaceholder(type, segment.value, locale)
      : null

    const dateSegment = {
      type,
      text: isPlaceholder ? segmentPlaceholder : segment.value,
      ...displayValue.getSegmentLimits(type),
      isPlaceholder,
      placeholder: segmentPlaceholder,
      isEditable,
    } as DateSegment

    // There is an issue in RTL languages where time fields render (minute:hour) instead of (hour:minute).
    // To force an LTR direction on the time field since, we wrap the time segments in LRI (left-to-right) isolate unicode. See https://www.w3.org/International/questions/qa-bidi-unicode-controls.
    // These unicode characters will be added to the array of processed segments as literals and will mark the start and end of the embedded direction change.
    if (type === 'hour') {
      // This marks the start of the embedded direction change.
      processedSegments.push({
        type: 'literal',
        text: '\u2066',
        isPlaceholder: false,
        placeholder: '',
        isEditable: false,
      })
      processedSegments.push(dateSegment)
      // This marks the end of the embedded direction change in the case that the granularity it set to "hour".
      if (type === granularity) {
        processedSegments.push({
          type: 'literal',
          text: '\u2069',
          isPlaceholder: false,
          placeholder: '',
          isEditable: false,
        })
      }
    } else if (timeValue.includes(type) && type === granularity) {
      processedSegments.push(dateSegment)
      // This marks the end of the embedded direction change.
      processedSegments.push({
        type: 'literal',
        text: '\u2069',
        isPlaceholder: false,
        placeholder: '',
        isEditable: false,
      })
    } else {
      // We only want to "wrap" the unicode around segments that are hour, minute, or second. If they aren't, just process as normal.
      processedSegments.push(dateSegment)
    }
  }

  return processedSegments
}

// Re-exported for internal consumers (useTimeFieldState).
export type {IntlDateValue as AnyIntlDateValue}
