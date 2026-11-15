/*
 * Port of `react-aria@3.53.1` `useRangeCalendar`
 * (`packages/react-aria/src/calendar/useRangeCalendar.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Listeners are registered internally (there is no public
 * `useEvent` in this library); the returned `*Props` are plain objects with
 * live getters. The `onBlur` on `calendarProps` is a composable plain
 * handler, never a getter.
 */

import {
  type DateValue,
  type RangeCalendarState,
} from 'vue-stately/useRangeCalendarState'
import {onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import {useCalendarBase, type AriaCalendarBaseProps, type CalendarAria} from './useCalendarBase'
import type {RangeCalendarProps} from 'vue-stately/useRangeCalendarState'

export interface AriaRangeCalendarProps<T extends DateValue>
  extends RangeCalendarProps<T>, AriaCalendarBaseProps {
  /**
   * Controls the behavior when a pointer is released outside the calendar or a blur occurs mid
   * selection:
   *
   * - `clear`: clear the currently selected range of dates.
   * - `reset`: reset the selection to the previously selected range of dates.
   * - `select`: select the currently hovered range of dates.
   *
   * @default 'select'
   */
  commitBehavior?: MaybeRefOrGetter<'clear' | 'reset' | 'select' | undefined>
}

/**
 * Provides the behavior and accessibility implementation for a range calendar component. A range
 * calendar displays one or more date grids and allows users to select a contiguous range of
 * dates.
 */
export function useRangeCalendar<T extends DateValue>(
  props: AriaRangeCalendarProps<T>,
  state: RangeCalendarState<T> | any,
  refEl: Ref<Element | null>,
): CalendarAria {
  const commitBehavior = () => toValue(props.commitBehavior) ?? 'select'

  // Pass a live view of the shared base props rather than a snapshot.
  const baseProps = {
    get id() {
      return toValue(props.id)
    },
    get 'aria-label'() {
      return toValue(props['aria-label'])
    },
    get 'aria-labelledby'() {
      return toValue(props['aria-labelledby'])
    },
    get 'aria-describedby'() {
      return toValue(props['aria-describedby'])
    },
    get 'aria-details'() {
      return toValue(props['aria-details'])
    },
    get errorMessage() {
      return toValue(props.errorMessage)
    },
    get isDisabled() {
      return toValue(props.isDisabled)
    },
    get isInvalid() {
      return toValue(props.isInvalid)
    },
    get validationState() {
      return toValue(props.validationState)
    },
  }
  const res = useCalendarBase(baseProps as any, state)

  // We need to ignore virtual pointer events from VoiceOver due to these bugs.
  // https://bugs.webkit.org/show_bug.cgi?id=222627
  // https://bugs.webkit.org/show_bug.cgi?id=223202
  // usePress also does this and waits for the following click event before firing.
  // We need to match that here otherwise this will fire before the press event in
  // useCalendarCell, causing range selection to not work properly.
  const isVirtualClick = ref(false)

  const commitBehaviorMapping: Record<'clear' | 'reset' | 'select', () => void> = {
    clear: () => state.clearSelection(),
    reset: () => state.setAnchorDate(null),
    select: () => state.commitSelection(),
  }

  const runCommitBehavior = () => {
    commitBehaviorMapping[commitBehavior()]()
  }

  // Execute method corresponding to `commitBehavior` when pressing or releasing a pointer outside the calendar body,
  // except when pressing the next or previous buttons to switch months.
  const endDragging = (e: PointerEvent) => {
    if (isVirtualClick.value) {
      isVirtualClick.value = false
      return
    }

    state.setDragging(false)
    if (!state.anchorDate) {
      return
    }

    const target = getEventTarget(e) as Element | null
    const el = refEl.value
    if (
      el &&
      isFocusWithin(el) &&
      (!nodeContains(el, target) || !target?.closest('button, [role="button"]'))
    ) {
      runCommitBehavior()
    }
  }

  const onWindowPointerDown = (e: PointerEvent) => {
    isVirtualClick.value = e.width === 0 && e.height === 0
  }

  // Prevent touch scrolling while dragging
  const onTouchMove = (e: Event) => {
    if (state.isDragging) {
      e.preventDefault()
    }
  }

  const handlers = {
    pointerdown: onWindowPointerDown as EventListener,
    pointerup: endDragging as EventListener,
    touchmove: onTouchMove as EventListener,
  }

  onMounted(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.addEventListener('pointerdown', handlers.pointerdown)
    window.addEventListener('pointerup', handlers.pointerup)
    const el = refEl.value
    if (el) {
      el.addEventListener('touchmove', handlers.touchmove, {passive: false, capture: true})
    }
  })

  onBeforeUnmount(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.removeEventListener('pointerdown', handlers.pointerdown)
    window.removeEventListener('pointerup', handlers.pointerup)
    const el = refEl.value
    if (el) {
      el.removeEventListener('touchmove', handlers.touchmove, {capture: true} as any)
    }
  })

  // Also execute method corresponding to `commitBehavior` on blur,
  // e.g. tabbing away from the calendar. This is attached as a plain,
  // composable handler (Vue chains `onBlur` via mergeProps), never a getter.
  const onBlur = (e: FocusEvent) => {
    const el = refEl.value
    if (!el) {
      return
    }

    const relatedTarget = (e as FocusEvent).relatedTarget as Node | null
    if ((!relatedTarget || !nodeContains(el, relatedTarget)) && state.anchorDate) {
      runCommitBehavior()
    }
  }

  // Attach the composable blur handler; the other props keep their live
  // getters from useCalendarBase.
  ;(res.calendarProps as any).onBlur = onBlur

  return res
}

function getEventTarget(e: Event): EventTarget | null {
  return e.target
}

function nodeContains(container: Element | null | undefined, node: Node | null | undefined) {
  if (!container || !node) return false
  return container === node || container.contains(node)
}

function isFocusWithin(el: Element): boolean {
  const doc = el.ownerDocument
  const activeElement = doc?.activeElement
  return Boolean(activeElement && (el === activeElement || el.contains(activeElement)))
}
