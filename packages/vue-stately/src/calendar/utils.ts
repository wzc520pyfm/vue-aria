/*
 * Port of `react-stately@3.51.0` calendar utilities
 * (`packages/react-stately/src/calendar/utils.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */

import {
  maxDate,
  minDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toCalendarDate,
  type CalendarDate,
  type DateDuration,
} from '@internationalized/date'
import type {DateValue} from './types'

export function isInvalid(
  date: DateValue,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): boolean {
  return (
    (minValue != null && date.compare(minValue) < 0) ||
    (maxValue != null && date.compare(maxValue) > 0)
  )
}

export function alignCenter(
  date: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  const halfDuration: DateDuration = {}
  for (const key in duration) {
    const k = key as keyof DateDuration
    const v = duration[k] ?? 0
    ;(halfDuration as any)[k] = Math.floor(v / 2)
    if ((halfDuration as any)[k] > 0 && v % 2 === 0) {
      ;(halfDuration as any)[k]--
    }
  }

  const aligned = alignStart(date, duration, locale).subtract(halfDuration)
  return constrainStart(date, aligned, duration, locale, minValue, maxValue)
}

export function alignStart(
  date: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  // Align to the start of the largest unit.
  let aligned = date
  if (duration.years) {
    aligned = startOfYear(date)
  } else if (duration.months) {
    aligned = startOfMonth(date)
  } else if (duration.weeks || (duration.days && duration.days > 7)) {
    aligned = startOfWeek(date, locale)
  }

  return constrainStart(date, aligned, duration, locale, minValue, maxValue)
}

export function alignEnd(
  date: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  const d = {...duration}
  // Subtract 1 from the smallest unit.
  if (d.days) {
    d.days--
  } else if (d.weeks) {
    d.weeks--
  } else if (d.months) {
    d.months--
  } else if (d.years) {
    d.years--
  }

  const aligned = alignStart(date, duration, locale).subtract(d)
  return constrainStart(date, aligned, duration, locale, minValue, maxValue)
}

export function constrainStart(
  date: CalendarDate,
  aligned: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  if (minValue && date.compare(minValue) >= 0) {
    const newDate = maxDate(aligned, alignStart(toCalendarDate(minValue), duration, locale))
    if (newDate) {
      aligned = newDate
    }
  }

  if (maxValue && date.compare(maxValue) <= 0) {
    const newDate = minDate(aligned, alignEnd(toCalendarDate(maxValue), duration, locale))
    if (newDate) {
      aligned = newDate
    }
  }

  return aligned
}

export function constrainValue(
  date: CalendarDate,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  if (minValue) {
    const newDate = maxDate(date, toCalendarDate(minValue))
    if (newDate) {
      date = newDate
    }
  }

  if (maxValue) {
    const newDate = minDate(date, toCalendarDate(maxValue))
    if (newDate) {
      date = newDate
    }
  }

  return date
}

export function previousAvailableDate(
  date: CalendarDate,
  minValue: DateValue,
  isDateUnavailable?: (date: CalendarDate) => boolean,
): CalendarDate | null {
  if (!isDateUnavailable) {
    return date
  }

  while (date.compare(minValue) >= 0 && isDateUnavailable(date)) {
    date = date.subtract({days: 1})
  }

  if (date.compare(minValue) >= 0) {
    return date
  }
  return null
}

export function isEqualDuration(a: DateDuration, b: DateDuration): boolean {
  if (a === b) {
    return true
  }

  return a.days === b.days && a.weeks === b.weeks && a.months === b.months && a.years === b.years
}

export function unitDuration(duration: DateDuration): DateDuration {
  const unit = {...duration} as any
  for (const key in duration) {
    unit[key] = 1
  }
  return unit as DateDuration
}
