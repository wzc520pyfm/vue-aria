/*
 * Public surface of `vue-aria-components` RangeCalendar, aligned with
 * `react-aria-components@1.22.1` (`packages/react-aria-components/exports/RangeCalendar.ts`,
 * re-exported from `Calendar.ts`, at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Month/year pickers and CalendarHeading remain deferred.
 */

export {
  RangeCalendar,
  RangeCalendarContext,
  RangeCalendarStateContext,
  CalendarGrid,
  CalendarGridHeader,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarCell,
  CalendarContext,
  CalendarStateContext,
} from '../src/Calendar'
export type {RangeCalendarProps, RangeCalendarRenderProps, CalendarGridProps, CalendarCellProps} from '../src/Calendar'
export {Button} from './Button'
export {Heading} from './Heading'
export {Text} from './Text'
export type {DateValue, RangeCalendarState} from 'vue-stately/useRangeCalendarState'
