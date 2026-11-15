/*
 * Port of `react-aria@3.53.1` `useCalendarCell`
 * (`packages/react-aria/src/calendar/useCalendarCell.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue.
 */

import {isSameDay, isToday, type CalendarDate} from '@internationalized/date'
import type {CalendarSelectionMode, CalendarState} from 'vue-stately/useCalendarState'
import {defineLiveProps, getEraFormat, hookData} from './utils'
import intlMessages from '../i18n/calendarStrings'
import {useDateFormatter} from '../i18n/useDateFormatter'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import {useDescription} from '../utils/useDescription'
import {usePress} from '../interactions/press'
import {mergeProps} from '../utils/mergeProps'
import {computed, ref as createRef, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'

export interface AriaCalendarCellProps {
  date: MaybeRefOrGetter<CalendarDate>
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isOutsideMonth?: MaybeRefOrGetter<boolean | undefined>
}

export interface CalendarCellAria {
  cellProps: Record<string, any>
  buttonProps: Record<string, any>
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

  // When a cell is focused and this is a range calendar, add a prompt to help
  // screenreader users know that they are in a range selection mode.
  const rangeSelectionPrompt = computed(() => {
    if ('anchorDate' in state && isFocused.value && !state.isReadOnly && isSelectable.value) {
      // If selection has started add "click to finish selecting range"
      if (state.anchorDate) {
        return stringFormatter.format('finishRangeSelectionPrompt')
      }
      // Otherwise, add "click to start selecting range" prompt
      return stringFormatter.format('startRangeSelectionPrompt')
    }
    return ''
  })
  const descriptionProps = useDescription(rangeSelectionPrompt)

  const isAnchorPressed = createRef(false)
  const isRangeBoundaryPressed = createRef(false)
  const touchDragTimerRef = createRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    // When dragging to select a range, we don't want dragging over the original anchor
    // again to trigger onPressStart. Cancel presses immediately when the pointer exits.
    // `usePress` supports a live getter via `toValue`.
    shouldCancelOnPointerExit: () => 'anchorDate' in state && !!state.anchorDate,
    preventFocusOnPress: true,
    isDisabled: () => !isSelectable.value || state.isReadOnly,
    onPressStart: (e: any) => {
      if (state.isReadOnly) {
        state.setFocusedDate(date.value)
        state.setFocused(true)
        return
      }

      if (
        'highlightedRange' in state &&
        !state.anchorDate &&
        (e.pointerType === 'mouse' || e.pointerType === 'touch')
      ) {
        // Allow dragging the start or end date of a range to modify it
        // rather than starting a new selection.
        // Don't allow dragging when invalid, or weird jumping behavior may occur as date ranges
        // are constrained to available dates. The user will need to select a new range in this case.
        if (state.highlightedRange && !isInvalid.value) {
          if (isSameDay(date.value, state.highlightedRange.start)) {
            state.setAnchorDate(state.highlightedRange.end)
            state.setFocusedDate(date.value)
            state.setFocused(true)
            state.setDragging(true)
            isRangeBoundaryPressed.value = true
            return
          } else if (isSameDay(date.value, state.highlightedRange.end)) {
            state.setAnchorDate(state.highlightedRange.start)
            state.setFocusedDate(date.value)
            state.setFocused(true)
            state.setDragging(true)
            isRangeBoundaryPressed.value = true
            return
          }
        }

        const startDragging = () => {
          state.setDragging(true)
          touchDragTimerRef.value = undefined

          state.selectDate(date.value)
          state.setFocusedDate(date.value)
          state.setFocused(true)
          isAnchorPressed.value = true
        }

        // Start selection on mouse/touch down so users can drag to select a range.
        // On touch, delay dragging to determine if the user really meant to scroll.
        if (e.pointerType === 'touch') {
          touchDragTimerRef.value = setTimeout(startDragging, 200) as any
        } else {
          startDragging()
        }
      }
    },
    onPressEnd: () => {
      isRangeBoundaryPressed.value = false
      isAnchorPressed.value = false
      clearTimeout(touchDragTimerRef.value)
      touchDragTimerRef.value = undefined
    },
    onPress: () => {
      // For non-range selection, always select on press up.
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
      if (state.isReadOnly) {
        return
      }

      // If the user tapped quickly, the date won't be selected yet and the
      // timer will still be in progress. In this case, select the date on touch up.
      // Timer is cleared in onPressEnd.
      if ('anchorDate' in state && touchDragTimerRef.value) {
        state.selectDate(date.value)
        state.setFocusedDate(date.value)
        state.setFocused(true)
      }

      if ('anchorDate' in state) {
        if (isRangeBoundaryPressed.value) {
          // When clicking on the start or end date of an already selected range,
          // start a new selection on press up to also allow dragging the date to
          // change the existing range.
          state.setAnchorDate(date.value)
        } else if (state.anchorDate && !isAnchorPressed.value) {
          // When releasing a drag or pressing the end date of a range, select it.
          state.selectDate(date.value)
          state.setFocusedDate(date.value)
          state.setFocused(true)
        } else if (e?.pointerType === 'keyboard' && !state.anchorDate) {
          // For range selection, auto-advance the focused date by one if using keyboard.
          // This gives an indication that you're selecting a range rather than a single date.
          // For mouse, this is unnecessary because users will see the indication on hover. For screen readers,
          // there will be an announcement to "click to finish selecting range" (above).
          state.selectDate(date.value)
          state.focusNearestAvailableDate(date.value)
        } else if (e?.pointerType === 'virtual') {
          // For screen readers, just select the date on click.
          state.selectDate(date.value)
          state.setFocusedDate(date.value)
          state.setFocused(true)
        }
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

  const cellProps = defineLiveProps(['role', 'aria-disabled', 'aria-selected', 'aria-invalid'], () => ({
    role: 'gridcell',
    'aria-disabled': !isSelectable.value || undefined,
    'aria-selected': isSelected.value || undefined,
    'aria-invalid': isInvalid.value || undefined,
  }))

  const buttonProps: Record<string, any> = mergeProps(pressProps as any, {
    // Plain value (not a getter): mergeProps chains focus handlers, and a getter
    // would be overwritten by the focus-ring handler instead of composed.
    onFocus: () => {
      if (!isCellDisabled.value) {
        state.setFocusedDate(date.value)
        state.setFocused(true)
      }
    },
    // Plain composable handlers (never getters): mergeProps chains them with
    // press's pointer handlers and the hover handler.
    onPointerenter: (e: PointerEvent) => {
      // Highlight the date on hover or drag over a date when selecting a range.
      if (
        'highlightDate' in state &&
        (e.pointerType !== 'touch' || state.isDragging) &&
        isSelectable.value
      ) {
        state.highlightDate(date.value)
      }
    },
    onPointerdown: (e: PointerEvent) => {
      // This is necessary on touch devices to allow dragging
      // outside the original pressed element.
      // (JSDOM does not support this)
      const target = e.target as any
      if (target instanceof HTMLElement && typeof target.releasePointerCapture === 'function') {
        try {
          const captured =
            typeof target.hasPointerCapture === 'function' ? target.hasPointerCapture(e.pointerId) : true
          if (captured) {
            target.releasePointerCapture(e.pointerId)
          }
        } catch {
          // jsdom / unsupported environments
        }
      }
    },
    onContextmenu: (e: Event) => {
      // Prevent context menu on long press.
      e.preventDefault()
    },
  })
  for (const key of [
    'tabIndex',
    'role',
    'aria-disabled',
    'aria-label',
    'aria-invalid',
    'aria-describedby',
  ]) {
    Object.defineProperty(buttonProps, key, {
      get: () => ({
        tabIndex: tabIndex.value,
        role: 'button',
        'aria-disabled': !isSelectable.value || undefined,
        'aria-label': label.value,
        'aria-invalid': isInvalid.value || undefined,
        'aria-describedby':
          [
            isInvalid.value ? errorMessageId.value : undefined,
            descriptionProps['aria-describedby'],
          ]
            .filter(Boolean)
            .join(' ') || undefined,
      })[key],
      enumerable: true,
      configurable: true,
    })
  }

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
