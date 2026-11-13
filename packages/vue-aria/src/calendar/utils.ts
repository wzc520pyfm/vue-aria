/*
 * Port of `react-aria@3.53.1` calendar utils
 * (`packages/react-aria/src/calendar/utils.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue.
 */

import {
  DateFormatter,
  endOfMonth,
  isSameDay,
  startOfMonth,
  type CalendarDate,
} from '@internationalized/date'
import type {CalendarSelectionMode, CalendarState} from 'vue-stately/useCalendarState'
import intlMessages from '../i18n/calendarStrings'
import type {LocalizedStringFormatter} from '@internationalized/string'
import {useLocale} from '../i18n/I18nProvider'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import {computed, toValue, type MaybeRefOrGetter} from 'vue'

interface HookData {
  ariaLabel?: MaybeRefOrGetter<string | undefined>
  ariaLabelledBy?: MaybeRefOrGetter<string | undefined>
  errorMessageId?: MaybeRefOrGetter<string | undefined>
  selectedDateDescription?: MaybeRefOrGetter<string>
}

export const hookData: WeakMap<CalendarState<CalendarSelectionMode> | any, HookData> = new WeakMap()

export function getEraFormat(date: CalendarDate | undefined): 'short' | undefined {
  return date?.calendar.identifier === 'gregory' && (date as any).era === 'BC' ? 'short' : undefined
}

export function useSelectedDateDescription(
  state: CalendarState<'single' | 'multiple'> | any,
): {value: string} {
  const stringFormatter = useLocalizedStringFormatter(intlMessages as any, '@react-aria/calendar')
  const {locale} = useLocale()

  const desc = computed(() => {
    let start: CalendarDate | undefined
    let end: CalendarDate | undefined
    if ('highlightedRange' in state) {
      const hr = state.highlightedRange
      start = hr?.start
      end = hr?.end
    } else {
      const value = state.value as any
      start = Array.isArray(value) ? value[0] : (value ?? undefined)
      end = Array.isArray(value) ? value.at(-1) : (value ?? undefined)
    }

    const anchorDate = 'anchorDate' in state ? state.anchorDate : null
    if (!anchorDate && start && end) {
      const dateFormatter = new DateFormatter(locale, {
        weekday: 'long',
        month: 'long',
        year: 'numeric',
        day: 'numeric',
        era: getEraFormat(start) || getEraFormat(end),
        timeZone: state.timeZone,
      } as any)

      if (isSameDay(start, end)) {
        const date = dateFormatter.format(start.toDate(state.timeZone))
        return stringFormatter.format('selectedDateDescription', {date})
      } else if ('highlightedRange' in state) {
        const dateRange = formatRange(dateFormatter as any, stringFormatter, start, end, state.timeZone)
        return stringFormatter.format('selectedRangeDescription', {dateRange})
      } else if (Array.isArray(state.value)) {
        const listFormatter = new Intl.ListFormat(locale)
        const dates = (state.value as CalendarDate[]).map(date => dateFormatter.format(date.toDate(state.timeZone)))
        const formatted = listFormatter.format(dates)
        return stringFormatter.format('selectedDateDescription', {date: formatted})
      }
    }
    return ''
  })

  return {
    get value() {
      return desc.value
    },
  }
}

export function useVisibleRangeDescription(
  startDate: MaybeRefOrGetter<CalendarDate>,
  endDate: MaybeRefOrGetter<CalendarDate>,
  timeZone: MaybeRefOrGetter<string>,
  isAria: MaybeRefOrGetter<boolean>,
): {value: string} {
  const stringFormatter = useLocalizedStringFormatter(intlMessages as any, '@react-aria/calendar')
  const localeState = useLocale()

  const desc = computed(() => {
    const start = toValue(startDate)
    const end = toValue(endDate)
    const tz = toValue(timeZone)
    const aria = toValue(isAria)
    const era: any = getEraFormat(start) || getEraFormat(end)
    const monthFormatter = new DateFormatter(localeState.locale, {
      month: 'long',
      year: 'numeric',
      era,
      calendar: start.calendar.identifier,
      timeZone: tz,
    } as any)
    const dateFormatter = new DateFormatter(localeState.locale, {
      month: 'long',
      year: 'numeric',
      day: 'numeric',
      era,
      calendar: start.calendar.identifier,
      timeZone: tz,
    } as any)

    if (isSameDay(start, startOfMonth(start))) {
      let startMonth = start
      let endMonth = end
      if ((start.calendar as any).getFormattableMonth) {
        startMonth = (start.calendar as any).getFormattableMonth(start)
      }
      if ((end.calendar as any).getFormattableMonth) {
        endMonth = (end.calendar as any).getFormattableMonth(end)
      }

      if (isSameDay(end, endOfMonth(start))) {
        return monthFormatter.format(startMonth.toDate(tz))
      } else if (isSameDay(end, endOfMonth(end))) {
        return aria
          ? formatRange(monthFormatter as any, stringFormatter, startMonth, endMonth, tz)
          : monthFormatter.formatRange(startMonth.toDate(tz), endMonth.toDate(tz))
      }
    }

    return aria
      ? formatRange(dateFormatter as any, stringFormatter, start, end, tz)
      : dateFormatter.formatRange(start.toDate(tz), end.toDate(tz))
  })

  return {
    get value() {
      return desc.value
    },
  }
}

function formatRange(
  dateFormatter: DateFormatter,
  stringFormatter: LocalizedStringFormatter<any, any>,
  start: CalendarDate,
  end: CalendarDate,
  timeZone: string,
) {
  const parts = (dateFormatter as any).formatRangeToParts(start.toDate(timeZone), end.toDate(timeZone)) as any[]

  let separatorIndex = -1
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.source === 'shared' && part.type === 'literal') {
      separatorIndex = i
    } else if (part.source === 'endRange') {
      break
    }
  }

  let startValue = ''
  let endValue = ''
  for (let i = 0; i < parts.length; i++) {
    if (i < separatorIndex) {
      startValue += parts[i].value
    } else if (i > separatorIndex) {
      endValue += parts[i].value
    }
  }

  return stringFormatter.format('dateRange', {startDate: startValue, endDate: endValue})
}

// Minimal internal live announcer (must-fix #10). Not exported.
let liveRegion: HTMLElement | null = null
let clearTimer: ReturnType<typeof setTimeout> | undefined

export function announce(message: string, _assertiveness: 'polite' | 'assertive' = 'polite', timeout = 4000) {
  if (typeof document === 'undefined' || !message) return
  if (!liveRegion) {
    liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('role', 'status')
    Object.assign(liveRegion.style, {
      border: '0',
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      height: '1px',
      margin: '-1px',
      overflow: 'hidden',
      padding: '0',
      position: 'absolute',
      width: '1px',
      whiteSpace: 'nowrap',
    })
    document.body.appendChild(liveRegion)
  }
  liveRegion.setAttribute('aria-live', _assertiveness)
  liveRegion.textContent = ''
  if (clearTimer) clearTimeout(clearTimer)
  setTimeout(() => {
    if (liveRegion) liveRegion.textContent = message
  }, 0)
  if (timeout > 0) {
    clearTimer = setTimeout(() => {
      if (liveRegion) liveRegion.textContent = ''
    }, timeout)
  }
}
