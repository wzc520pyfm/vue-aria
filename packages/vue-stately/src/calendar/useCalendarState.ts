/*
 * Port of `react-stately@3.51.0` `useCalendarState`
 * (`packages/react-stately/src/calendar/useCalendarState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. State fields are reactive getters over
 * computed refs, matching the official plain-object surface.
 */

import {
  constrainStart,
  constrainValue,
  alignCenter,
  alignEnd,
  alignStart,
  isEqualDuration,
  isInvalid,
  previousAvailableDate,
  unitDuration,
} from './utils'
import {
  DateFormatter,
  GregorianCalendar,
  endOfMonth,
  endOfWeek,
  getDayOfWeek,
  getWeeksInMonth,
  isEqualCalendar,
  isSameDay,
  startOfMonth,
  startOfWeek,
  toCalendar,
  toCalendarDate,
  today,
  type Calendar,
  type CalendarDate,
  type CalendarIdentifier,
  type DateDuration,
} from '@internationalized/date'
import type {
  CalendarPropsBase,
  CalendarSelectionMode,
  CalendarState,
  CalendarValueType,
  DateValue,
  MappedDateValue,
} from './types'
import {computed, ref, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {useControlledState} from '../utils/useControlledState'

export interface CalendarProps<
  T extends DateValue,
  M extends CalendarSelectionMode = 'single'
> extends CalendarPropsBase {
  /**
   * Whether single or multiple selection is enabled.
   *
   * @default 'single'
   */
  selectionMode?: MaybeRefOrGetter<M | undefined>
  /**
   * Callback that is called for each date of the calendar. If it returns true,
   * then the date is unavailable.
   */
  isDateUnavailable?: (date: DateValue) => boolean
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<CalendarValueType<T | null, M> | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<CalendarValueType<T | null, M> | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: CalendarValueType<MappedDateValue<T>, M>) => void
}

export interface CalendarStateOptions<
  T extends DateValue = DateValue,
  M extends CalendarSelectionMode = 'single'
> extends CalendarProps<T, M> {
  /** The locale to display and edit the value according to. */
  locale: MaybeRefOrGetter<string>
  /**
   * A function that creates a Calendar object for a given calendar identifier.
   * May be imported from `@internationalized/date`, or manually implemented.
   */
  createCalendar: MaybeRefOrGetter<(name: CalendarIdentifier) => Calendar>
  /**
   * The amount of days that will be displayed at once. This affects how
   * pagination works.
   *
   * @default { months: 1 }
   */
  visibleDuration?: MaybeRefOrGetter<DateDuration | undefined>
  /**
   * Determines the alignment of the visible months on initial render based on
   * the current selection or current date if there is no selection.
   *
   * @default 'center'
   */
  selectionAlignment?: MaybeRefOrGetter<'start' | 'center' | 'end' | undefined>
}

/**
 * Provides state management for a calendar component.
 * A calendar displays one or more date grids and allows users to select a single date.
 */
export function useCalendarState<
  T extends DateValue = DateValue,
  M extends CalendarSelectionMode = 'single'
>(props: CalendarStateOptions<T, M>): CalendarState<M> {
  const locale = computed(() => toValue(props.locale))
  const createCalendarFn = computed(() => toValue(props.createCalendar))
  const visibleDuration = computed<DateDuration>(() => toValue(props.visibleDuration) ?? {months: 1})
  const minValue = computed(() => toValue(props.minValue) ?? null)
  const maxValue = computed(() => toValue(props.maxValue) ?? null)
  const selectionAlignment = computed(() => toValue(props.selectionAlignment) ?? 'center')
  const pageBehavior = computed(() => toValue(props.pageBehavior) ?? 'visible')
  const firstDayOfWeek = computed(() => toValue(props.firstDayOfWeek))
  const weeksInMonth = computed(() => toValue(props.weeksInMonth))
  const selectionMode = computed(() => (toValue(props.selectionMode) ?? 'single') as M)
  const isDateUnavailable = props.isDateUnavailable

  const defaultFormatter = computed(() => new DateFormatter(locale.value))
  const resolvedOptions = computed(() => defaultFormatter.value.resolvedOptions())
  const calendar = computed(() =>
    createCalendarFn.value(resolvedOptions.value.calendar as CalendarIdentifier),
  )

  const valueProp = computed(
    () => toValue(props.value) as T | T[] | null | undefined,
  )
  const defaultValueProp = computed(
    () => (toValue(props.defaultValue) as T | T[] | null | undefined) ?? null,
  )

  const [value, setControlledValue] = useControlledState<T | T[] | null>(
    () => valueProp.value,
    () => defaultValueProp.value,
    (v) => props.onChange?.(v as any),
  )

  const calendarDateValue = computed<CalendarDate | CalendarDate[] | null>(() => {
    const current = value.value
    if (Array.isArray(current)) {
      return current.map((item) => toCalendar(toCalendarDate(item), calendar.value))
    }
    return current ? toCalendar(toCalendarDate(current), calendar.value) : null
  })

  const timeZone = computed(() => {
    const val = Array.isArray(value.value) ? value.value[0] : value.value
    return val && 'timeZone' in val ? val.timeZone : resolvedOptions.value.timeZone
  })

  const focusedCalendarDate = computed(() => {
    const focused = toValue(props.focusedValue)
    return focused
      ? constrainValue(
          toCalendar(toCalendarDate(focused), calendar.value),
          minValue.value,
          maxValue.value,
        )
      : undefined
  })

  const defaultFocusedCalendarDate = computed(() => {
    const defaultFocused = toValue(props.defaultFocusedValue)
    if (defaultFocused) {
      return constrainValue(
        toCalendar(toCalendarDate(defaultFocused), calendar.value),
        minValue.value,
        maxValue.value,
      )
    }

    if (calendarDateValue.value) {
      return constrainValue(
        Array.isArray(calendarDateValue.value)
          ? calendarDateValue.value[0]
          : calendarDateValue.value,
        minValue.value,
        maxValue.value,
      )
    }

    return constrainValue(
      toCalendar(today(timeZone.value), calendar.value),
      minValue.value,
      maxValue.value,
    )
  })

  const [focusedDate, setFocusedDateState] = useControlledState<CalendarDate>(
    () => focusedCalendarDate.value,
    () => defaultFocusedCalendarDate.value,
    (date) => props.onFocusChange?.(date),
  )

  const getStartDate = () => {
    switch (selectionAlignment.value) {
      case 'start':
        return alignStart(
          focusedDate.value,
          visibleDuration.value,
          locale.value,
          minValue.value,
          maxValue.value,
        )
      case 'end':
        return alignEnd(
          focusedDate.value,
          visibleDuration.value,
          locale.value,
          minValue.value,
          maxValue.value,
        )
      case 'center':
      default:
        return alignCenter(
          focusedDate.value,
          visibleDuration.value,
          locale.value,
          minValue.value,
          maxValue.value,
        )
    }
  }

  const startDate = ref<CalendarDate>(getStartDate() as CalendarDate)
  const setStartDate = (date: CalendarDate) => {
    startDate.value = date
  }
  const isFocused = ref(Boolean(toValue(props.autoFocus)))
  const setFocused = (focused: boolean) => {
    isFocused.value = focused
  }

  const lastVisibleDuration = ref<DateDuration>(visibleDuration.value)
  watch(
    visibleDuration,
    (duration) => {
      if (!isEqualDuration(duration, lastVisibleDuration.value)) {
        lastVisibleDuration.value = duration
        setStartDate(getStartDate())
      }
    },
    {deep: true},
  )

  const endDate = computed<CalendarDate>(() => {
    const duration = {...visibleDuration.value}
    if (duration.days) {
      duration.days--
    } else {
      duration.days = -1
    }
    return startDate.value.add(duration) as CalendarDate
  })

  // Reset focused date and visible range when the calendar changes.
  const lastCalendar = ref<Calendar>(calendar.value)
  watch(calendar, (nextCalendar) => {
    if (!isEqualCalendar(nextCalendar, lastCalendar.value)) {
      const newFocusedDate = toCalendar(focusedDate.value, nextCalendar)
      setStartDate(
        alignCenter(
          newFocusedDate,
          visibleDuration.value,
          locale.value,
          minValue.value,
          maxValue.value,
        ),
      )
      setFocusedDateState(newFocusedDate)
      lastCalendar.value = nextCalendar
    }
  })

  // Keep the focused date and visible range constrained. Official does this
  // during render; Vue performs the equivalent in a synchronous watcher.
  watch(
    [focusedDate, startDate, endDate],
    () => {
      if (isInvalid(focusedDate.value, minValue.value, maxValue.value)) {
        // If the focused date was moved to an invalid value, it can't be
        // focused, so constrain it.
        setFocusedDateState(constrainValue(focusedDate.value, minValue.value, maxValue.value) as CalendarDate)
      } else if (focusedDate.value.compare(startDate.value) < 0) {
        setStartDate(
          alignEnd(
            focusedDate.value,
            visibleDuration.value,
            locale.value,
            minValue.value,
            maxValue.value,
          ) as CalendarDate,
        )
      } else if (focusedDate.value.compare(endDate.value) > 0) {
        setStartDate(
          alignStart(
            focusedDate.value,
            visibleDuration.value,
            locale.value,
            minValue.value,
            maxValue.value,
          ) as CalendarDate,
        )
      }
    },
    {flush: 'sync'},
  )

  // Sets focus to a specific cell date.
  const focusCell = (date: CalendarDate) => {
    setFocusedDateState(constrainValue(date, minValue.value, maxValue.value))
  }

  const normalizeValue = (newValue: CalendarDate): T | null => {
    const constrained = constrainValue(newValue, minValue.value, maxValue.value)
    const lowerBound = minValue.value ?? startDate.value
    const prev = previousAvailableDate(constrained, lowerBound as any, isDateUnavailable)
    if (!prev) {
      return null as any
    }

    // The display calendar should not have any effect on the emitted value.
    // Emit dates in the same calendar as the original value, if any, otherwise Gregorian.
    const baseValue = Array.isArray(value.value) ? value.value[0] : value.value
    const calendarValue = toCalendar(prev as any, baseValue?.calendar || new GregorianCalendar())

    // Preserve time if the input value had one.
    if (baseValue && 'hour' in baseValue) {
      return (baseValue as any).set(calendarValue) as unknown as T
    }

    return calendarValue as unknown as T
  }

  const setValue = (newValue: CalendarDate | CalendarDate[] | null) => {
    if (!toValue(props.isDisabled) && !toValue(props.isReadOnly)) {
      if (newValue === null) {
        setControlledValue(selectionMode.value === 'multiple' ? [] : null)
        return
      }

      if (Array.isArray(newValue)) {
        setControlledValue(newValue.map(normalizeValue).filter(Boolean) as any)
      } else {
        const localValue = normalizeValue(newValue)
        if (localValue) {
          setControlledValue(localValue as any)
        }
      }
    }
  }

  const isUnavailable = computed(() => {
    if (!calendarDateValue.value) {
      return false
    }

    if (Array.isArray(calendarDateValue.value)) {
      return calendarDateValue.value.some(
        (date) => isDateUnavailable?.(date) || isInvalid(date, minValue.value, maxValue.value),
      )
    }

    return (
      isDateUnavailable?.(calendarDateValue.value) ||
      isInvalid(calendarDateValue.value, minValue.value, maxValue.value)
    )
  })

  const isValueInvalid = computed(
    () =>
      Boolean(toValue(props.isInvalid)) ||
      toValue(props.validationState) === 'invalid' ||
      isUnavailable.value,
  )
  const validationState = computed<'valid' | 'invalid' | null>(() =>
    isValueInvalid.value ? 'invalid' : null,
  )

  const pageDuration = computed<DateDuration>(() => {
    if (pageBehavior.value === 'visible') {
      return visibleDuration.value
    }

    return unitDuration(visibleDuration.value)
  })

  const focusNextPage = () => {
    const start = startDate.value.add(pageDuration.value)
    setFocusedDateState(
      constrainValue(focusedDate.value.add(pageDuration.value), minValue.value, maxValue.value),
    )
    setStartDate(
      alignStart(
        constrainStart(
          focusedDate.value,
          start,
          pageDuration.value,
          locale.value,
          minValue.value,
          maxValue.value,
        ),
        pageDuration.value,
        locale.value,
      ),
    )
  }

  const focusPreviousPage = () => {
    const start = startDate.value.subtract(pageDuration.value)
    setFocusedDateState(
      constrainValue(
        focusedDate.value.subtract(pageDuration.value),
        minValue.value,
        maxValue.value,
      ),
    )
    setStartDate(
      alignStart(
        constrainStart(
          focusedDate.value,
          start,
          pageDuration.value,
          locale.value,
          minValue.value,
          maxValue.value,
        ),
        pageDuration.value,
        locale.value,
      ),
    )
  }

  const focusNextRow = () => {
    if (visibleDuration.value.days) {
      focusNextPage()
    } else if (visibleDuration.value.weeks || visibleDuration.value.months || visibleDuration.value.years) {
      focusCell(focusedDate.value.add({weeks: 1}) as CalendarDate)
    }
  }

  const focusPreviousRow = () => {
    if (visibleDuration.value.days) {
      focusPreviousPage()
    } else if (visibleDuration.value.weeks || visibleDuration.value.months || visibleDuration.value.years) {
      focusCell(focusedDate.value.subtract({weeks: 1}) as CalendarDate)
    }
  }

  const focusSectionStart = () => {
    if (visibleDuration.value.days) {
      focusCell(startDate.value as any)
    } else if (visibleDuration.value.weeks) {
      focusCell(startOfWeek(focusedDate.value, locale.value, firstDayOfWeek.value as any) as any)
    } else if (visibleDuration.value.months || visibleDuration.value.years) {
      focusCell(startOfMonth(focusedDate.value) as any)
    }
  }

  const focusSectionEnd = () => {
    if (visibleDuration.value.days) {
      focusCell(endDate.value)
    } else if (visibleDuration.value.weeks) {
      focusCell(endOfWeek(focusedDate.value, locale.value, firstDayOfWeek.value as any) as any)
    } else if (visibleDuration.value.months || visibleDuration.value.years) {
      focusCell(endOfMonth(focusedDate.value) as any)
    }
  }

  const focusNextSection = (larger?: boolean) => {
    if (!larger && !visibleDuration.value.days) {
      focusCell(focusedDate.value.add(unitDuration(visibleDuration.value)))
      return
    }

    if (visibleDuration.value.days) {
      focusNextPage()
    } else if (visibleDuration.value.weeks) {
      focusCell(focusedDate.value.add({months: 1}) as CalendarDate)
    } else if (visibleDuration.value.months || visibleDuration.value.years) {
      focusCell(focusedDate.value.add({years: 1}) as CalendarDate)
    }
  }

  const focusPreviousSection = (larger?: boolean) => {
    if (!larger && !visibleDuration.value.days) {
      focusCell(focusedDate.value.subtract(unitDuration(visibleDuration.value)))
      return
    }

    if (visibleDuration.value.days) {
      focusPreviousPage()
    } else if (visibleDuration.value.weeks) {
      focusCell(focusedDate.value.subtract({months: 1}) as CalendarDate)
    } else if (visibleDuration.value.months || visibleDuration.value.years) {
      focusCell(focusedDate.value.subtract({years: 1}) as CalendarDate)
    }
  }

  const selectDate = (date: CalendarDate) => {
    if (toValue(props.isDisabled) || toValue(props.isReadOnly)) {
      return
    }

    if (selectionMode.value === 'multiple' && date != null) {
      const newDate = normalizeValue(date)
      if (!newDate) {
        return
      }

      let baseValue: T[] = []
      if (Array.isArray(value.value)) {
        baseValue = value.value
      } else if (value.value != null) {
        baseValue = [value.value]
      }

      const index = baseValue.findIndex((item) => isSameDay(item, newDate))
      const newValue =
        index >= 0
          ? baseValue.slice(0, index).concat(baseValue.slice(index + 1))
          : [...baseValue, newDate]
      setControlledValue(newValue)
    } else {
      setValue(date)
    }
  }

  const selectFocusedDate = () => {
    if (!(isDateUnavailable && isDateUnavailable(focusedDate.value))) {
      selectDate(focusedDate.value)
    }
  }

  const state: CalendarState<M> = {
    get isDisabled() {
      return Boolean(toValue(props.isDisabled))
    },
    get isReadOnly() {
      return Boolean(toValue(props.isReadOnly))
    },
    get value() {
      return calendarDateValue.value as CalendarValueType<CalendarDate | null, M>
    },
    setValue: setValue as CalendarState<M>['setValue'],
    get selectionMode() {
      return selectionMode.value as M
    },
    get visibleDuration() {
      return visibleDuration.value
    },
    get visibleRange() {
      return {start: startDate.value as CalendarDate, end: endDate.value as CalendarDate}
    },
    get minValue() {
      return minValue.value
    },
    get maxValue() {
      return maxValue.value
    },
    get focusedDate() {
      return focusedDate.value
    },
    get timeZone() {
      return timeZone.value
    },
    get validationState() {
      return validationState.value
    },
    get isValueInvalid() {
      return isValueInvalid.value
    },
    setFocusedDate(date: CalendarDate) {
      focusCell(date)
    },
    focusNextDay() {
      focusCell(focusedDate.value.add({days: 1}) as CalendarDate)
    },
    focusPreviousDay() {
      focusCell(focusedDate.value.subtract({days: 1}) as CalendarDate)
    },
    focusNextRow,
    focusPreviousRow,
    focusNextPage,
    focusPreviousPage,
    focusSectionStart,
    focusSectionEnd,
    focusNextSection,
    focusPreviousSection,
    selectFocusedDate,
    selectDate,
    get isFocused() {
      return isFocused.value
    },
    setFocused,
    isInvalid(date: CalendarDate) {
      return isInvalid(date, minValue.value, maxValue.value)
    },
    isSelected(date: CalendarDate) {
      if (!calendarDateValue.value || this.isCellDisabled(date) || this.isCellUnavailable(date)) {
        return false
      }
      return Array.isArray(calendarDateValue.value)
        ? calendarDateValue.value.some((item) => isSameDay(item, date))
        : isSameDay(date, calendarDateValue.value)
    },
    isCellFocused(date: CalendarDate) {
      return Boolean(isFocused.value && focusedDate.value && isSameDay(date, focusedDate.value))
    },
    isCellDisabled(date: CalendarDate) {
      return (
        Boolean(toValue(props.isDisabled)) ||
        date.compare(startDate.value) < 0 ||
        date.compare(endDate.value) > 0 ||
        isInvalid(date, minValue.value, maxValue.value)
      )
    },
    isCellUnavailable(date: CalendarDate) {
      return isDateUnavailable ? isDateUnavailable(date) : false
    },
    isPreviousVisibleRangeInvalid() {
      const prev = startDate.value.subtract({days: 1}) as any
      return isSameDay(prev as any, startDate.value as any) || isInvalid(prev, minValue.value, maxValue.value)
    },
    isNextVisibleRangeInvalid() {
      // Adding may return the same date if we reached the end of time
      // according to the calendar system (e.g. 9999-12-31).
      const next = endDate.value.add({days: 1}) as any
      return isSameDay(next as any, endDate.value as any) || isInvalid(next, minValue.value, maxValue.value)
    },
    getDatesInWeek(weekIndex: number, from: CalendarDate = startDate.value as any) {
      let date = from.add({weeks: weekIndex}) as any as CalendarDate
      const dates: Array<CalendarDate | null> = []

      const days =
        visibleDuration.value.days && visibleDuration.value.days < 7
          ? visibleDuration.value.days
          : 7
      if (days === 7) {
        date = startOfWeek(date, locale.value, firstDayOfWeek.value as any) as CalendarDate

        // startOfWeek will clamp dates within the calendar system's valid
        // range, which may start in the middle of a week. In this case, add
        // null placeholders.
        const dayOfWeek = getDayOfWeek(date, locale.value, firstDayOfWeek.value as any)
        for (let i = 0; i < dayOfWeek; i++) {
          dates.push(null)
        }
      }

      while (dates.length < days) {
        dates.push(date)
        const nextDate = date.add({days: 1}) as unknown as CalendarDate
        if (isSameDay(date, nextDate)) {
          // If the next day is the same, we have hit the end of the calendar system.
          break
        }
        date = nextDate
      }

      // Add null placeholders if at the end of the calendar system.
      while (dates.length < days) {
        dates.push(null)
      }

      return dates
    },
    getWeeksInMonth(date: CalendarDate = startDate.value as CalendarDate) {
      let weeks =
        weeksInMonth.value || getWeeksInMonth(date as any, locale.value, firstDayOfWeek.value as any)
      if (visibleDuration.value.weeks || visibleDuration.value.days) {
        weeks = visibleDuration.value.weeks ?? 0
        if (visibleDuration.value.days) {
          weeks += Math.ceil(visibleDuration.value.days / 7)
        }
      }
      return weeks
    },
  }

  return state
}
