import {computed, onMounted, reactive, ref, toValue, watchEffect} from 'vue'
import type {Events, MaybeRefOrGetter, ToRefs} from 'vue'
import type {
  PointerType as BasePointerType,
  DOMAttributes,
  EventHandlers,
  FocusableElement,
  HoverEvents,
} from '@nev-ui/types-shared'

type PointerType = Extract<BasePointerType, 'touch' | 'mouse' | 'pen'>

export interface HoverProps extends HoverEvents {
  /** Whether the hover events should be disabled. */
  isDisabled?: MaybeRefOrGetter<boolean>
}

export interface HoverResult {
  /** Props to spread on the target element. */
  hoverProps: DOMAttributes
  /** Events to spread on the target element. */
  hoverEvents: EventHandlers<Events>
  isHovered: boolean
}

interface HoverState {
  isHovered: boolean
  ignoreEmulatedMouseEvents: boolean
  pointerType: PointerType | ''
  target: FocusableElement | null
}

// iOS fires onPointerEnter twice: once with pointerType="touch" and again with pointerType="mouse".
// We want to ignore these emulated events so they do not trigger hover behavior.
// See https://bugs.webkit.org/show_bug.cgi?id=214609.
let globalIgnoreEmulatedMouseEvents = false
let hoverCount = 0

function setGlobalIgnoreEmulatedMouseEvents() {
  globalIgnoreEmulatedMouseEvents = true

  // Clear globalIgnoreEmulatedMouseEvents after a short timeout. iOS fires onPointerEnter
  // with pointerType="mouse" immediately after onPointerUp and before onFocus. On other
  // devices that don't have this quirk, we don't want to ignore a mouse hover sometime in
  // the distant future because a user previously touched the element.
  setTimeout(() => {
    globalIgnoreEmulatedMouseEvents = false
  }, 50)
}

function handleGlobalPointerEvent(e: PointerEvent) {
  if (e.pointerType === 'touch') {
    setGlobalIgnoreEmulatedMouseEvents()
  }
}

function setupGlobalTouchEvents() {
  if (typeof document === 'undefined') {
    return
  }

  if (typeof PointerEvent !== 'undefined') {
    document.addEventListener('pointerup', handleGlobalPointerEvent)
  } else {
    document.addEventListener('touchend', setGlobalIgnoreEmulatedMouseEvents)
  }

  hoverCount++
  return () => {
    hoverCount--
    if (hoverCount > 0) {
      return
    }

    if (typeof PointerEvent !== 'undefined') {
      document.removeEventListener('pointerup', handleGlobalPointerEvent)
    } else {
      document.removeEventListener('touchend', setGlobalIgnoreEmulatedMouseEvents)
    }
  }
}

/**
 * Handles pointer hover interactions for an element. Normalizes behavior
 * across browsers and platforms, and ignores emulated mouse events on touch devices.
 */
export function useHover(props: HoverProps = {}): ToRefs<HoverResult> {
  const {onHoverStart, onHoverChange, onHoverEnd, isDisabled} = props

  const isHovered = ref(false)
  const state: HoverState = reactive({
    isHovered: false,
    ignoreEmulatedMouseEvents: false,
    pointerType: '',
    target: null,
  })

  onMounted(() => {
    setupGlobalTouchEvents()
  })

  const triggerHoverStart = (event: Event, pointerType: PointerType) => {
    state.pointerType = pointerType
    if (
      toValue(isDisabled) ||
      pointerType === 'touch' ||
      state.isHovered ||
      (event.currentTarget instanceof Element &&
        !event.currentTarget.contains(event.target as Element))
    ) {
      return
    }

    state.isHovered = true
    const target = event.currentTarget as FocusableElement
    state.target = target

    onHoverStart?.({
      type: 'hoverstart',
      target,
      pointerType,
    })

    onHoverChange?.(true)

    isHovered.value = true
  }

  const triggerHoverEnd = (event: Event, pointerType: PointerType) => {
    state.pointerType = ''
    state.target = null

    if (pointerType === 'touch' || !state.isHovered) {
      return
    }

    state.isHovered = false
    const target = event.currentTarget as FocusableElement

    onHoverEnd?.({
      type: 'hoverend',
      target,
      pointerType,
    })

    onHoverChange?.(false)

    isHovered.value = false
  }

  const hoverProps = computed<DOMAttributes>(() => ({}))

  const hoverEvents = computed(() => {
    const _hoverEvents: EventHandlers<Events> = {}
    if (typeof PointerEvent !== 'undefined') {
      _hoverEvents.onPointerenter = (e) => {
        if (globalIgnoreEmulatedMouseEvents && e.pointerType === 'mouse') {
          return
        }

        triggerHoverStart(e, e.pointerType as PointerType)
      }

      _hoverEvents.onPointerleave = (e) => {
        if (
          !toValue(isDisabled) &&
          e.currentTarget instanceof Element &&
          e.currentTarget.contains(e.target as Element)
        ) {
          triggerHoverEnd(e, e.pointerType as PointerType)
        }
      }
    } else {
      _hoverEvents.onTouchstart = () => {
        state.ignoreEmulatedMouseEvents = true
      }

      _hoverEvents.onMouseenter = (e) => {
        if (!state.ignoreEmulatedMouseEvents && !globalIgnoreEmulatedMouseEvents) {
          triggerHoverStart(e, 'mouse')
        }

        state.ignoreEmulatedMouseEvents = false
      }

      _hoverEvents.onMouseleave = (e) => {
        if (
          !toValue(isDisabled) &&
          e.currentTarget instanceof Element &&
          e.currentTarget.contains(e.target as Element)
        ) {
          triggerHoverEnd(e, 'mouse')
        }
      }
    }
    return _hoverEvents
  })

  watchEffect(() => {
    // Call the triggerHoverEnd as soon as isDisabled changes to true
    // Safe to call triggerHoverEnd, it will early return if we aren't currently hovering
    if (toValue(isDisabled)) {
      triggerHoverEnd({currentTarget: state.target} as Event, state.pointerType as PointerType)
    }
  })

  return {
    hoverProps,
    hoverEvents,
    isHovered,
  }
}
