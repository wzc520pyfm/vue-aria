/*
 * Port of `react-stately@3.51.0` datepicker types
 * (`packages/react-stately/src/datepicker/types.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue getter-based props. DatePicker/DateRangePicker props
 * (DateRangePickerProps) remain deferred with their components; only the
 * DateField / TimeField surface is public in this slice.
 */

import type {
  CalendarDate,
  CalendarDateTime,
  Time,
  ZonedDateTime,
} from '@internationalized/date'
import type {MaybeRefOrGetter} from 'vue'

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
 * Props used internally by `useDateFieldState` (official `DatePickerProps` minus the
 * overlay/page props that belong to the deferred DatePicker components).
 */
export interface DatePickerProps<T extends DateValue> extends DateFieldBase<T> {
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<T | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<T | null | undefined>
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
