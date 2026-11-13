/*
 * Port of `react-aria@3.53.1` `useCalendarGrid`
 * (`packages/react-aria/src/calendar/useCalendarGrid.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue.
 */

import {CalendarDate, startOfWeek, today} from '@internationalized/date'
import type {CalendarSelectionMode, CalendarState} from 'vue-stately/useCalendarState'
import {defineLiveProps, hookData, useVisibleRangeDescription} from './utils'
import {useDateFormatter} from '../i18n/useDateFormatter'
// no useKeyboard shortcuts API in this codebase; handle keys directly
import {useLabels} from '../label/useLabel'
import {useLocale} from '../i18n/I18nProvider'
import {computed, toValue, type MaybeRefOrGetter} from 'vue'

export interface AriaCalendarGridProps {
  startDate?: MaybeRefOrGetter<CalendarDate | undefined>
  endDate?: MaybeRefOrGetter<CalendarDate | undefined>
  weekdayStyle?: MaybeRefOrGetter<'narrow' | 'short' | 'long' | undefined>
  firstDayOfWeek?: MaybeRefOrGetter<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | undefined>
}

export interface CalendarGridAria {
  gridProps: Record<string, any>
  headerProps: Record<string, any>
  weekDays: string[]
  weeksInMonth: number
}

export function useCalendarGrid(
  props: AriaCalendarGridProps,
  state: CalendarState<CalendarSelectionMode> | any,
): CalendarGridAria {
  const localeState = useLocale()

  const startDate = computed(() => toValue(props.startDate) ?? state.visibleRange.start)
  const endDate = computed(() => toValue(props.endDate) ?? state.visibleRange.end)
  const firstDayOfWeek = computed(() => toValue(props.firstDayOfWeek))

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        state.selectFocusedDate()
        break
      case 'PageUp':
        e.preventDefault()
        state.focusPreviousSection(e.shiftKey)
        break
      case 'PageDown':
        e.preventDefault()
        state.focusNextSection(e.shiftKey)
        break
      case 'End':
        e.preventDefault()
        state.focusSectionEnd()
        break
      case 'Home':
        e.preventDefault()
        state.focusSectionStart()
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (localeState.direction === 'rtl') state.focusNextDay()
        else state.focusPreviousDay()
        break
      case 'ArrowUp':
        e.preventDefault()
        state.focusPreviousRow()
        break
      case 'ArrowRight':
        e.preventDefault()
        if (localeState.direction === 'rtl') state.focusPreviousDay()
        else state.focusNextDay()
        break
      case 'ArrowDown':
        e.preventDefault()
        state.focusNextRow()
        break
      case 'Escape':
        if ('setAnchorDate' in state) {
          state.setAnchorDate(null)
        }
        break
    }
  }

  const visibleRangeDescription = useVisibleRangeDescription(
    () => startDate.value,
    () => endDate.value,
    () => state.timeZone,
    () => true,
  )

  const gridProps = defineLiveProps(
    [
      'id',
      'aria-label',
      'aria-labelledby',
      'role',
      'aria-readonly',
      'aria-disabled',
      'aria-multiselectable',
      'onFocus',
      'onBlur',
      'onKeydown',
      'onKeyDown',
    ],
    () => {
      const data = hookData.get(state)
      const ariaLabel = toValue(data?.ariaLabel)
      const ariaLabelledBy = toValue(data?.ariaLabelledBy)
      const labels = useLabels({
        'aria-label': [ariaLabel, visibleRangeDescription.value].filter(Boolean).join(', ') || undefined,
        'aria-labelledby': ariaLabelledBy || undefined,
      })
      return {
        ...labels,
        role: 'grid',
        'aria-readonly': state.isReadOnly || undefined,
        'aria-disabled': state.isDisabled || undefined,
        'aria-multiselectable':
          ('highlightedRange' in state || state.selectionMode === 'multiple') || undefined,
        onFocus: () => state.setFocused(true),
        onBlur: () => state.setFocused(false),
        onKeydown: onKeyDown,
        onKeyDown,
      }
    },
  )

  const headerProps = defineLiveProps(['aria-hidden'], () => ({
    'aria-hidden': true,
  }))

  const dayFormatter = useDateFormatter({
    weekday: (toValue(props.weekdayStyle) || 'narrow') as any,
    timeZone: state.timeZone,
  } as any)

  const weekDays = computed(() => {
    const isDayView = state.visibleDuration.days && state.visibleDuration.days < 7
    const weekStart = isDayView
      ? startDate.value
      : startOfWeek(today(state.timeZone), localeState.locale, firstDayOfWeek.value as any)
    const days = isDayView ? state.visibleDuration.days! : 7
    return [...new Array(days).keys()].map(index => {
      const date = weekStart.add({days: index})
      const dateDay = date.toDate(state.timeZone)
      return dayFormatter.format(dateDay)
    })
  })

  const weeksInMonth = computed(() => state.getWeeksInMonth(startDate.value))

  const out: CalendarGridAria = {
    gridProps,
    headerProps,
    weekDays: [],
    weeksInMonth: 0,
  }
  Object.defineProperties(out, {
    weekDays: {get: () => weekDays.value, enumerable: true, configurable: true},
    weeksInMonth: {get: () => weeksInMonth.value, enumerable: true, configurable: true},
  })
  return out
}
