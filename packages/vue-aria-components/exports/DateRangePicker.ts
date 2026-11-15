/*
 * Public surface of `vue-aria-components` DateRangePicker, aligned with
 * `react-aria-components@1.22.1` (`packages/react-aria-components/exports/DateRangePicker.ts`
 * at adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc). Form and
 * FieldError are deferred and are not re-exported here.
 */

export {DateRangePicker, DateRangePickerContext, DateRangePickerStateContext} from '../src/DatePicker'
export type {DateRangePickerProps, DateRangePickerRenderProps} from '../src/DatePicker'
export type {DateValue, DateRange, DateRangePickerState} from 'vue-stately/useDateRangePickerState'
export type {RangeValue} from 'vue-stately/useRangeCalendarState'

export {DateInput, DateSegment} from '../src/DateField'
export type {
  DateInputProps,
  DateInputRenderProps,
  DateSegmentProps,
  DateSegmentRenderProps,
} from '../src/DateField'

export {Group, GroupContext} from '../src/Group'
export type {GroupProps, GroupRenderProps} from '../src/Group'

export {Label, LabelContext} from '../src/Label'
export type {LabelProps} from '../src/Label'

export {Text} from '../src/Text'
export type {TextProps} from '../src/Text'

export {
  CalendarGrid,
  CalendarGridHeader,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarCell,
  RangeCalendar,
} from '../src/Calendar'
export type {
  CalendarCellProps,
  CalendarGridProps,
  RangeCalendarProps,
  RangeCalendarRenderProps,
} from '../src/Calendar'

export {Button} from '../src/Button'
export type {ButtonType} from '../src/Button'

export {Popover} from '../src/Popover'
