/*
 * Port of `react-aria@3.53.1` `useCalendar`
 * (`packages/react-aria/src/calendar/useCalendar.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue.
 */

import {useCalendarBase, type AriaCalendarBaseProps, type CalendarAria} from './useCalendarBase'
import type {CalendarProps, CalendarSelectionMode, CalendarState, DateValue} from 'vue-stately/useCalendarState'

export interface AriaCalendarProps<T extends DateValue, M extends CalendarSelectionMode = 'single'>
  extends CalendarProps<T, M>, AriaCalendarBaseProps {}

export function useCalendar<T extends DateValue, M extends CalendarSelectionMode = 'single'>(
  props: AriaCalendarProps<T, M>,
  state: CalendarState<M>,
): CalendarAria {
  return useCalendarBase(props as any, state)
}

export type {CalendarAria}
