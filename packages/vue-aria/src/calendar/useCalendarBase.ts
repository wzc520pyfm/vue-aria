/*
 * Port of `react-aria@3.53.1` `useCalendarBase`
 * (`packages/react-aria/src/calendar/useCalendarBase.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue.
 */

import {announce, hookData, useSelectedDateDescription, useVisibleRangeDescription} from './utils'
import intlMessages from '../i18n/calendarStrings'
import {useLabels} from '../label/useLabel'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import {useSlotId} from '../utils/useId'
import type {CalendarPropsBase, CalendarSelectionMode, CalendarState} from 'vue-stately/useCalendarState'
import {computed, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter} from 'vue'

export interface CalendarAria {
  /** Props for the calendar grouping element. */
  calendarProps: ComputedRef<Record<string, any>>
  /** Props for the next button. */
  nextButtonProps: ComputedRef<Record<string, any>>
  /** Props for the previous button. */
  prevButtonProps: ComputedRef<Record<string, any>>
  /** Props for the error message element, if any. */
  errorMessageProps: ComputedRef<Record<string, any>>
  /** A description of the visible date range, for use in the calendar title. */
  title: ComputedRef<string>
}

export interface AriaCalendarBaseProps extends CalendarPropsBase {
  id?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-details'?: MaybeRefOrGetter<string | undefined>
  errorMessage?: MaybeRefOrGetter<unknown>
}

export function useCalendarBase(
  props: AriaCalendarBaseProps,
  state: CalendarState<CalendarSelectionMode> | any,
): CalendarAria {
  const stringFormatter = useLocalizedStringFormatter(intlMessages as any, '@react-aria/calendar')

  const title = useVisibleRangeDescription(
    () => state.visibleRange.start,
    () => state.visibleRange.end,
    () => state.timeZone,
    () => false,
  )
  const visibleRangeDescription = useVisibleRangeDescription(
    () => state.visibleRange.start,
    () => state.visibleRange.end,
    () => state.timeZone,
    () => true,
  )

  // Announce when the visible date range changes (only when focus is not inside calendar).
  let visibleMounted = false
  watch(
    () => visibleRangeDescription.value,
    (desc) => {
      if (!visibleMounted) {
        visibleMounted = true
        return
      }
      if (!state.isFocused) {
        announce(desc)
      }
    },
  )

  // Announce when the selected value changes.
  const selectedDateDescription = useSelectedDateDescription(state)
  let selectedMounted = false
  watch(
    () => selectedDateDescription.value,
    (desc) => {
      if (!selectedMounted) {
        selectedMounted = true
        return
      }
      if (desc) {
        announce(desc, 'polite', 4000)
      }
    },
  )

  const errorMessageId = useSlotId(ref('vue-aria-calendar-error'), [
    () => Boolean(toValue(props.errorMessage)),
    () => toValue(props.isInvalid),
    () => toValue(props.validationState),
  ])

  hookData.set(state, {
    ariaLabel: () => toValue(props['aria-label']),
    ariaLabelledBy: () => toValue(props['aria-labelledby']),
    errorMessageId: () => errorMessageId.value,
    selectedDateDescription: () => selectedDateDescription.value,
  })

  // If next/prev buttons become disabled while focused, move focus to calendar body.
  const nextFocused = ref(false)
  const previousFocused = ref(false)
  const setNextFocused = (focused: boolean) => {
    nextFocused.value = focused
  }
  const setPreviousFocused = (focused: boolean) => {
    previousFocused.value = focused
  }

  watch(
    () => (Boolean(toValue(props.isDisabled)) || state.isNextVisibleRangeInvalid()),
    (disabled) => {
      if (disabled && nextFocused.value) {
        nextFocused.value = false
        state.setFocused(true)
      }
    },
  )
  watch(
    () => (Boolean(toValue(props.isDisabled)) || state.isPreviousVisibleRangeInvalid()),
    (disabled) => {
      if (disabled && previousFocused.value) {
        previousFocused.value = false
        state.setFocused(true)
      }
    },
  )

  const calendarProps = computed(() => {
    const ariaLabel = [toValue(props['aria-label']), visibleRangeDescription.value].filter(Boolean).join(', ')
    const labels = useLabels({
      id: toValue(props.id),
      'aria-label': ariaLabel || undefined,
      'aria-labelledby': toValue(props['aria-labelledby']) || undefined,
    })
    return {
      ...labels,
      role: 'application',
      'aria-details': toValue(props['aria-details']) || undefined,
      'aria-describedby': toValue(props['aria-describedby']) || undefined,
    }
  })

  const nextButtonProps = computed(() => ({
    onPress: () => state.focusNextPage(),
    'aria-label': stringFormatter.format('next'),
    isDisabled: Boolean(toValue(props.isDisabled)) || state.isNextVisibleRangeInvalid(),
    onFocusChange: setNextFocused,
  }))

  const prevButtonProps = computed(() => ({
    onPress: () => state.focusPreviousPage(),
    'aria-label': stringFormatter.format('previous'),
    isDisabled: Boolean(toValue(props.isDisabled)) || state.isPreviousVisibleRangeInvalid(),
    onFocusChange: setPreviousFocused,
  }))

  const errorMessageProps = computed(() => ({id: errorMessageId.value}))

  return {
    calendarProps,
    nextButtonProps,
    prevButtonProps,
    errorMessageProps,
    title: computed(() => title.value),
  }
}
