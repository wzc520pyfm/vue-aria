/*
 * Port of `react-stately@3.51.0` calendar types
 * (`packages/react-stately/src/calendar/types.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue getter-based props.
 */

import type {
  CalendarDate,
  CalendarDateTime,
  DateDuration,
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

export type PageBehavior = 'single' | 'visible'

export interface CalendarPropsBase {
  /** The minimum allowed date that a user may select. */
  minValue?: MaybeRefOrGetter<DateValue | null | undefined>
  /** The maximum allowed date that a user may select. */
  maxValue?: MaybeRefOrGetter<DateValue | null | undefined>
  /**
   * Whether the calendar is disabled.
   *
   * @default false
   */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether the calendar value is immutable.
   *
   * @default false
   */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether to automatically focus the calendar when it mounts.
   *
   * @default false
   */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  /** Controls the currently focused date within the calendar. */
  focusedValue?: MaybeRefOrGetter<DateValue | null | undefined>
  /** The date that is focused when the calendar first mounts (uncontrolled). */
  defaultFocusedValue?: MaybeRefOrGetter<DateValue | null | undefined>
  /** Handler that is called when the focused date changes. */
  onFocusChange?: (date: CalendarDate) => void
  /**
   * Whether the current selection is valid or invalid according to application logic.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /** Whether the current selection is invalid according to application logic. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /** An error message to display when the selected value is invalid. */
  errorMessage?: unknown
  /**
   * Controls the behavior of paging. Pagination either works by advancing the
   * visible page by visibleDuration (default) or one unit of visibleDuration.
   *
   * @default 'visible'
   */
  pageBehavior?: MaybeRefOrGetter<PageBehavior | undefined>
  /** The day that starts the week. */
  firstDayOfWeek?: MaybeRefOrGetter<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | undefined>
  /**
   * Determines the alignment of the visible months on initial render based on
   * the current selection or current date if there is no selection.
   *
   * @default 'center'
   */
  selectionAlignment?: MaybeRefOrGetter<'start' | 'center' | 'end' | undefined>
  /** The number of weeks in a month. This overrides the default set by the locale. */
  weeksInMonth?: MaybeRefOrGetter<number | undefined>
}

interface CalendarStateBase {
  /** Whether the calendar is disabled. */
  readonly isDisabled: boolean
  /** Whether the calendar is in a read only state. */
  readonly isReadOnly: boolean
  /** The visible duration in the calendar. */
  readonly visibleDuration: DateDuration
  /** The date range that is currently visible in the calendar. */
  readonly visibleRange: {start: CalendarDate; end: CalendarDate}
  /** The minimum allowed date that a user may select. */
  readonly minValue?: DateValue | null
  /** The maximum allowed date that a user may select. */
  readonly maxValue?: DateValue | null
  /** The time zone of the dates currently being displayed. */
  readonly timeZone: string
  /**
   * The current validation state of the selected value.
   *
   * @deprecated Use `isValueInvalid` instead.
   */
  readonly validationState: 'valid' | 'invalid' | null
  /** Whether the calendar is invalid. */
  readonly isValueInvalid: boolean
  /** The currently focused date. */
  readonly focusedDate: CalendarDate
  /** Sets the focused date. */
  setFocusedDate(value: CalendarDate): void
  /** Moves focus to the next calendar date. */
  focusNextDay(): void
  /** Moves focus to the previous calendar date. */
  focusPreviousDay(): void
  /** Moves focus to the next row of dates, e.g. the next week. */
  focusNextRow(): void
  /** Moves focus to the previous row of dates, e.g. the previous week. */
  focusPreviousRow(): void
  /** Moves focus to the next page of dates, e.g. the next month if one month is visible. */
  focusNextPage(): void
  /** Moves focus to the previous page of dates, e.g. the previous month if one month is visible. */
  focusPreviousPage(): void
  /** Moves focus to the start of the current section of dates, e.g. the start of the current month. */
  focusSectionStart(): void
  /** Moves focus to the end of the current section of dates, e.g. the end of the current month. */
  focusSectionEnd(): void
  /**
   * Moves focus to the next section of dates based on what is currently displayed.
   * By default, focus is moved by one of the currently displayed unit.
   */
  focusNextSection(larger?: boolean): void
  /**
   * Moves focus to the previous section of dates based on what is currently displayed.
   * By default, focus is moved backward by one of the currently displayed unit.
   */
  focusPreviousSection(larger?: boolean): void
  /** Selects the currently focused date. */
  selectFocusedDate(): void
  /** Selects the given date. */
  selectDate(date: CalendarDate): void
  /** Whether focus is currently within the calendar. */
  readonly isFocused: boolean
  /** Sets whether focus is currently within the calendar. */
  setFocused(value: boolean): void
  /** Returns whether the given date is invalid according to the `minValue` and `maxValue` props. */
  isInvalid(date: CalendarDate): boolean
  /** Returns whether the given date is currently selected. */
  isSelected(date: CalendarDate): boolean
  /** Returns whether the given date is currently focused. */
  isCellFocused(date: CalendarDate): boolean
  /**
   * Returns whether the given date is disabled according to the `minValue`,
   * `maxValue`, and `isDisabled` props.
   */
  isCellDisabled(date: CalendarDate): boolean
  /** Returns whether the given date is unavailable according to the `isDateUnavailable` prop. */
  isCellUnavailable(date: CalendarDate): boolean
  /**
   * Returns whether the previous visible date range is allowed to be selected
   * according to the `minValue` prop.
   */
  isPreviousVisibleRangeInvalid(): boolean
  /**
   * Returns whether the next visible date range is allowed to be selected
   * according to the `maxValue` prop.
   */
  isNextVisibleRangeInvalid(): boolean
  /**
   * Returns an array of dates in the week index counted from the provided start
   * date, or the first visible date if not given. The returned array always has
   * 7 elements, but may include null if the date does not exist according to the
   * calendar system.
   */
  getDatesInWeek(weekIndex: number, startDate?: CalendarDate): Array<CalendarDate | null>
  /** Returns the number of weeks in a month. */
  getWeeksInMonth(startDate?: CalendarDate): number
}

export type CalendarSelectionMode = 'single' | 'multiple'
export type CalendarValueType<T, M extends CalendarSelectionMode> = M extends 'single'
  ? T
  : readonly T[]

export interface CalendarState<M extends CalendarSelectionMode = 'single'>
  extends CalendarStateBase {
  /** Whether single or multiple selection is enabled. */
  readonly selectionMode: M
  /** The currently selected date. */
  readonly value: CalendarValueType<CalendarDate | null, M>
  /** Sets the currently selected date. */
  setValue(value: CalendarValueType<CalendarDate | null, M>): void
}
