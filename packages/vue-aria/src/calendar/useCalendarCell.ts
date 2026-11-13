/*
 * Port of `react-aria@3.53.1` `useCalendarCell`
 * (`packages/react-aria/src/calendar/useCalendarCell.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue.
 */

import {isSameDay, isToday, type CalendarDate} from '@internationalized/date'
import type {CalendarSelectionMode, CalendarState} from 'vue-stately/useCalendarState'
import {getEraFormat, hookData} from './utils'
import intlMessages from '../i18n/calendarStrings'
import {useDateFormatter} from '../i18n/useDateFormatter'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import {usePress} from '../interactions/press'
import {computed, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'

export interface AriaCalendarCellProps {
  date: MaybeRefOrGetter<CalendarDate>
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isOutsideMonth?: MaybeRefOrGetter<boolean | undefined>
}

export interface CalendarCellAria {
  cellProps: ComputedRef<Record<string, any>>
  buttonProps: ComputedRef<Record<string, any>>
  isPressed: Ref<boolean>
  isSelected: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  isDisabled: ComputedRef<boolean>
  isUnavailable: ComputedRef<boolean>
  isOutsideVisibleRange: ComputedRef<boolean>
  isInvalid: ComputedRef<boolean>
  formattedDate: ComputedRef<string>
}

export function useCalendarCell(
  props: AriaCalendarCellProps,
  state: CalendarState<CalendarSelectionMode> | any,
  ref: Ref<HTMLElement | null>,
): CalendarCellAria {
  const stringFormatter = useLocalizedStringFormatter(intlMessages as any, '@react-aria/calendar')

  const date = computed(() => toValue(props.date))
  const isOutsideMonth = computed(() => Boolean(toValue(props.isOutsideMonth)))

  const isUnavailable = computed(() => state.isCellUnavailable(date.value))
  const isCellDisabled = computed(() => Boolean(toValue(props.isDisabled)) || state.isCellDisabled(date.value) || isOutsideMonth.value)
  const isSelectable = computed(() => !isCellDisabled.value && !isUnavailable.value)
  const isFocused = computed(() => state.isCellFocused(date.value) && !isOutsideMonth.value)

  const isInvalid = computed(() => {
    if (!state.isValueInvalid) return false
    if ('highlightedRange' in state) {
      const hr = state.highlightedRange
      return !state.anchorDate && hr != null && date.value.compare(hr.start) >= 0 && date.value.compare(hr.end) <= 0
    } else if (Array.isArray(state.value)) {
      return state.value.some((value: CalendarDate) => isSameDay(value, date.value))
    } else if (state.value) {
      return isSameDay(state.value as CalendarDate, date.value)
    }
    return false
  })

  const isSelected = computed(() => {
    if (isInvalid.value && !isCellDisabled.value) return true
    return state.isSelected(date.value) && isSelectable.value
  })

  const data = hookData.get(state)
  const errorMessageId = computed(() => toValue(data?.errorMessageId))
  const selectedDateDescription = computed(() => toValue(data?.selectedDateDescription) || '')

  const nativeDate = computed(() => date.value.toDate(state.timeZone))
  const dateFormatter = useDateFormatter({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    era: getEraFormat(date.value),
    timeZone: state.timeZone,
  } as any)

  const isDateToday = computed(() => isToday(date.value, state.timeZone))

  const label = computed(() => {
    let l = ''
    if (
      'highlightedRange' in state &&
      state.value &&
      !state.anchorDate &&
      (isSameDay(date.value, state.value.start) || isSameDay(date.value, state.value.end))
    ) {
      l = selectedDateDescription.value + ', '
    }

    l += dateFormatter.format(nativeDate.value)
    if (isDateToday.value) {
      l = stringFormatter.format(isSelected.value ? 'todayDateSelected' : 'todayDate', {date: l})
    } else if (isSelected.value) {
      l = stringFormatter.format('dateSelected', {date: l})
    }

    if (state.minValue && isSameDay(date.value, state.minValue)) {
      l += ', ' + stringFormatter.format('minimumDate')
    } else if (state.maxValue && isSameDay(date.value, state.maxValue)) {
      l += ', ' + stringFormatter.format('maximumDate')
    }
    return l
  })

  const {pressProps, isPressed} = usePress({
    preventFocusOnPress: true,
    isDisabled: () => !isSelectable.value || state.isReadOnly,
    onPress: () => {
      if (state.isReadOnly) {
        state.setFocusedDate(date.value)
        state.setFocused(true)
        return
      }
      if (!('anchorDate' in state)) {
        state.selectDate(date.value)
        state.setFocusedDate(date.value)
        state.setFocused(true)
      }
    },
    onPressUp: (e: any) => {
      if (state.isReadOnly) return
      if ('anchorDate' in state) {
        if (e?.pointerType === 'keyboard' && !state.anchorDate) {
          state.selectDate(date.value)
          if (typeof state.focusNearestAvailableDate === 'function') {
            state.focusNearestAvailableDate(date.value)
          } else {
            state.setFocusedDate(date.value)
          }
        } else {
          state.selectDate(date.value)
          state.setFocusedDate(date.value)
        }
        state.setFocused(true)
      }
    },
  } as any)

  const tabIndex = computed(() => {
    if (isCellDisabled.value) return undefined
    return isSameDay(date.value, state.focusedDate) ? 0 : -1
  })

  watch(isFocused, (focused) => {
    if (focused && ref.value) {
      try {
        ref.value.focus({preventScroll: true})
      } catch {
        ref.value.focus()
      }
    }
  })

  const formattedDate = computed(() => {
    if (!date.value) return ''
    try {
      const fmt = useDateFormatter({
        day: 'numeric',
        timeZone: state.timeZone,
        calendar: date.value?.calendar?.identifier || 'gregory',
      } as any) as any
      const parts = fmt.formatToParts(nativeDate.value)
      return parts.find((part: any) => part.type === 'day')?.value || String(date.value.day ?? '')
    } catch {
      return String(date.value.day ?? '')
    }
  })

  const isOutsideVisibleRange = computed(
    () => date.value?.compare(state.visibleRange.start) < 0 || date.value?.compare(state.visibleRange.end) > 0,
  )

  const cellProps = computed(() => ({
    role: 'gridcell',
    'aria-disabled': !isSelectable.value || undefined,
    'aria-selected': isSelected.value || undefined,
    'aria-invalid': isInvalid.value || undefined,
  }))

  const buttonProps = computed(() => ({
    ...(pressProps as any),
    onFocus: () => {
      if (!isCellDisabled.value) {
        state.setFocusedDate(date.value)
        state.setFocused(true)
      }
    },
    tabIndex: tabIndex.value,
    role: 'button',
    'aria-disabled': !isSelectable.value || undefined,
    'aria-label': label.value,
    'aria-invalid': isInvalid.value || undefined,
    'aria-describedby': [isInvalid.value ? errorMessageId.value : undefined].filter(Boolean).join(' ') || undefined,
  }))

  return {
    cellProps,
    buttonProps,
    isPressed,
    isSelected,
    isFocused,
    isDisabled: isCellDisabled,
    isUnavailable,
    isOutsideVisibleRange,
    isInvalid,
    formattedDate,
  }
}
