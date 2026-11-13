/*
 * Public surface of `vue-aria` DateField, aligned with
 * `react-aria@3.53.1` (`packages/react-aria/exports/useDateField.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */

export {useDateField} from '../src/datepicker/useDateField'
export {useDateSegment} from '../src/datepicker/useDateSegment'
export type {
  AriaDateFieldProps,
  AriaDateFieldOptions,
  DateFieldAria,
} from '../src/datepicker/useDateField'
export type {DateSegmentAria} from '../src/datepicker/useDateSegment'
export type {DateValue, MappedDateValue} from 'vue-stately/useDateFieldState'
