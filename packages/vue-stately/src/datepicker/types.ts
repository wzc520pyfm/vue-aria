/*
 * Port of `react-stately@3.51.0` datepicker types
 * (`packages/react-stately/src/datepicker/types.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue getter-based props. Component props stay with their
 * components; `DatePickerProps` here is the shared official props (the
 * single-value DatePicker lands in that slice), and `DateRangePickerProps`
 * carries the range picker's two-arg `isDateUnavailable`, non-contiguous
 * ranges, and start/end names.
 */

import type {
  CalendarDate,
  CalendarDateTime,
  Time,
  ZonedDateTime,
} from '@internationalized/date'
import type {MaybeRefOrGetter} from 'vue'
import type {OverlayTriggerProps} from '../overlays/useOverlayTriggerState'
import type {PageBehavior, RangeValue} from '../calendar/types'

export type DateValue = CalendarDate | CalendarDateTime | ZonedDateTime
export type MappedDateValue<T> = T extends ZonedDateTime
  ? ZonedDateTime
  : T extends CalendarDateTime
    ? CalendarDateTime
    : T extends CalendarDate
      ? CalendarDate
      : never

export type TimeValue = Time | CalendarDateTime | ZonedDateTime
export type MappedTimeValue<T> = T extends ZonedDateTime
  ? ZonedDateTime
  : T extends CalendarDateTime
    ? CalendarDateTime
    : T extends Time
      ? Time
      : never

export type DateRange = RangeValue<DateValue>

export type Granularity = 'day' | 'hour' | 'minute' | 'second'

/** Validation props shared by the date/time field state (official `Validation`). */
export interface ValidationProps<T> {
  /**
   * Whether to use native HTML form validation to prevent form submission when the value is
   * missing or invalid, or mark the field as invalid or required using ARIA instead.
   *
   * @default 'aria'
   */
  validationBehavior?: MaybeRefOrGetter<'native' | 'aria' | undefined>
  /**
   * A function that returns an error message if the value is invalid, or `true` if the value is
   * valid. Realtime validation is only performed when the value changes, and is not displayed
   * until the field is committed.
   */
  validate?: (value: MappedDateValue<T> | TimeValue | null) => true | string | string[] | null | undefined
  /** Whether the value is invalid according to application logic. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The current validation state of the field.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
}

/** Label/help text props (official `LabelableProps` + `HelpTextProps`, textual only). */
export interface FieldLabelProps {
  /** The label for the field. */
  label?: MaybeRefOrGetter<unknown>
  /** A description of the field. */
  description?: MaybeRefOrGetter<unknown>
  /** An error message to display when the value is invalid. */
  errorMessage?: MaybeRefOrGetter<unknown>
}

/** Input base props (official `InputBase`). */
export interface InputBaseProps {
  /** Describes the type of input, e.g. "date". */
  type?: MaybeRefOrGetter<string | undefined>
  /** The name of the input element, used when submitting an HTML form. */
  name?: MaybeRefOrGetter<string | undefined>
  /** Whether the input should be disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the input is required before form submission. */
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the input is read only. */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the element should receive focus on render. */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  /** The HTML form element the input is associated with. */
  form?: MaybeRefOrGetter<string | undefined>
}

export interface DateFieldBase<T extends DateValue> extends InputBaseProps, ValidationProps<T>, FieldLabelProps {
  /** The minimum allowed date that a user may select. */
  minValue?: MaybeRefOrGetter<DateValue | null | undefined>
  /** The maximum allowed date that a user may select. */
  maxValue?: MaybeRefOrGetter<DateValue | null | undefined>
  /**
   * Callback that is called for each date of the calendar. If it returns true, then the date is
   * unavailable.
   */
  isDateUnavailable?: (date: DateValue) => boolean
  /**
   * A placeholder date that influences the format of the placeholder shown when no value is
   * selected. Defaults to today's date at midnight.
   */
  placeholderValue?: MaybeRefOrGetter<T | null | undefined>
  /**
   * Whether to display the time in 12 or 24 hour format. By default, this is determined by the
   * user's locale.
   */
  hourCycle?: MaybeRefOrGetter<12 | 24 | undefined>
  /**
   * Determines the smallest unit that is displayed in the date picker. By default, this is `"day"`
   * for dates, and `"minute"` for times.
   */
  granularity?: MaybeRefOrGetter<Granularity | undefined>
  /**
   * Whether to hide the time zone abbreviation.
   *
   * @default false
   */
  hideTimeZone?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether to always show leading zeros in the month, day, and hour fields.
   * By default, this is determined by the user's locale.
   */
  shouldForceLeadingZeros?: MaybeRefOrGetter<boolean | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: MappedDateValue<T> | null) => void
}

export interface DateFieldProps<T extends DateValue> extends DateFieldBase<T> {
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<T | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<T | null | undefined>
}

/**
 * Props for `useDatePickerState` (official `DatePickerProps`): the field base
 * plus overlay trigger props and the calendar page behavior / first day of week.
 */
export interface DatePickerProps<T extends DateValue> extends DateFieldBase<T>, OverlayTriggerProps {
  /**
   * Controls the behavior of paging. Pagination either works by advancing the visible page by
   * visibleDuration (default) or one unit of visibleDuration.
   *
   * @default visible
   */
  pageBehavior?: MaybeRefOrGetter<PageBehavior | undefined>
  /**
   * The day that starts the week.
   */
  firstDayOfWeek?: MaybeRefOrGetter<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | undefined>
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<T | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<T | null | undefined>
}

/**
 * Props for `useDateRangePickerState` (official `DateRangePickerProps`): the
 * field base plus overlay trigger props, the calendar page behavior / first
 * day of week, and the two-arg `isDateUnavailable` / non-contiguous-range /
 * start/end name props. There is no single `name` prop — the start and end
 * fields carry their own hidden inputs.
 */
export interface DateRangePickerProps<T extends DateValue>
  extends Omit<
      DateFieldBase<T>,
      | 'validate'
      | 'isDateUnavailable'
      | 'name'
      | 'onChange'
      | 'validationBehavior'
      | 'isInvalid'
      | 'validationState'
    >,
    OverlayTriggerProps {
  /** Whether to use native HTML form validation to prevent form submission when the value is invalid, or mark the field as invalid or required using ARIA instead. */
  validationBehavior?: MaybeRefOrGetter<'native' | 'aria' | undefined>
  /**
   * A function that returns an error message if the value is invalid, or `true` if the value is
   * valid. Realtime validation is only performed when the value changes, and is not displayed
   * until the field is committed.
   */
  validate?: (
    value: RangeValue<MappedDateValue<T>> | null
  ) => true | string | string[] | null | undefined
  /** Whether the value is invalid according to application logic. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The current validation state of the field.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /**
   * Controls the behavior of paging. Pagination either works by advancing the visible page by
   * visibleDuration (default) or one unit of visibleDuration.
   *
   * @default visible
   */
  pageBehavior?: MaybeRefOrGetter<PageBehavior | undefined>
  /**
   * The day that starts the week.
   */
  firstDayOfWeek?: MaybeRefOrGetter<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | undefined>
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<RangeValue<T> | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<RangeValue<T> | null | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: RangeValue<MappedDateValue<T>> | null) => void
  /**
   * When combined with `isDateUnavailable`, determines whether non-contiguous ranges,
   * i.e. ranges containing unavailable dates, may be selected.
   */
  allowsNonContiguousRanges?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Callback that is called for each date of the calendar. If it returns true, then the date is
   * unavailable. Receives the anchor date of the current selection when set, otherwise null.
   */
  isDateUnavailable?: (date: DateValue, anchorDate: CalendarDate | null) => boolean
  /**
   * The name of the start date input element, used when submitting an HTML form.
   */
  startName?: MaybeRefOrGetter<string | undefined>
  /**
   * The name of the end date input element, used when submitting an HTML form.
   */
  endName?: MaybeRefOrGetter<string | undefined>
}

export interface TimePickerProps<T extends TimeValue> extends InputBaseProps, ValidationProps<T>, FieldLabelProps {
  /**
   * Whether to display the time in 12 or 24 hour format. By default, this is determined by the
   * user's locale.
   */
  hourCycle?: MaybeRefOrGetter<12 | 24 | undefined>
  /**
   * Determines the smallest unit that is displayed in the time picker.
   *
   * @default 'minute'
   */
  granularity?: MaybeRefOrGetter<'hour' | 'minute' | 'second' | undefined>
  /** Whether to hide the time zone abbreviation. */
  hideTimeZone?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether to always show leading zeros in the hour field.
   * By default, this is determined by the user's locale.
   */
  shouldForceLeadingZeros?: MaybeRefOrGetter<boolean | undefined>
  /**
   * A placeholder time that influences the format of the placeholder shown when no value is
   * selected. Defaults to 12:00 AM or 00:00 depending on the hour cycle.
   */
  placeholderValue?: MaybeRefOrGetter<T | null | undefined>
  /** The minimum allowed time that a user may select. */
  minValue?: MaybeRefOrGetter<TimeValue | null | undefined>
  /** The maximum allowed time that a user may select. */
  maxValue?: MaybeRefOrGetter<TimeValue | null | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: MappedTimeValue<T> | null) => void
}

export interface TimeFieldProps<T extends TimeValue> extends TimePickerProps<T> {
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<T | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<T | null | undefined>
}
