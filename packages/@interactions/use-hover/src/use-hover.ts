import {computed, onMounted, reactive, ref, watchEffect} from 'vue'
import type {ToRefs} from 'vue'
import type {DOMAttributes, FocusableElement, HoverEvents, PointerType} from '@nev-ui/types-shared'

export interface HoverProps extends HoverEvents {
  /** Whether the hover events should be disabled. */
  isDisabled?: boolean
}

export interface HoverResult {
  /** Props to spread on the target element. */
  hoverProps: DOMAttributes
  isHovered: boolean
}

interface HoverState {
  isHovered: boolean
  ignoreEmulatedMouseEvents: boolean
  pointerType: Omit<PointerType, 'touch'>
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
export function useHover(props: HoverProps): ToRefs<HoverResult> {
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
      isDisabled ||
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

    if (onHoverStart) {
      onHoverStart({
        type: 'hoverstart',
        target,
        pointerType,
      })
    }

    if (onHoverChange) {
      onHoverChange(true)
    }

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
    if (onHoverEnd) {
      onHoverEnd({
        type: 'hoverend',
        target,
        pointerType,
      })
    }

    if (onHoverChange) {
      onHoverChange(false)
    }

    isHovered.value = false
  }

  const hoverProps = computed(() => {
    const _hoverProps: DOMAttributes = {}
    if (typeof PointerEvent !== 'undefined') {
      _hoverProps.onPointerenter = (e) => {
        if (globalIgnoreEmulatedMouseEvents && e.pointerType === 'mouse') {
          return
        }

        triggerHoverStart(e, e.pointerType as PointerType)
      }

      _hoverProps.onPointerleave = (e) => {
        if (
          !isDisabled &&
          e.currentTarget instanceof Element &&
          e.currentTarget.contains(e.target as Element)
        ) {
          triggerHoverEnd(e, e.pointerType as PointerType)
        }
      }
    } else {
      _hoverProps.onTouchstart = () => {
        state.ignoreEmulatedMouseEvents = true
      }

      _hoverProps.onMouseenter = (e) => {
        if (!state.ignoreEmulatedMouseEvents && !globalIgnoreEmulatedMouseEvents) {
          triggerHoverStart(e, 'mouse')
        }

        state.ignoreEmulatedMouseEvents = false
      }

      _hoverProps.onMouseleave = (e) => {
        if (
          !isDisabled &&
          e.currentTarget instanceof Element &&
          e.currentTarget.contains(e.target as Element)
        ) {
          triggerHoverEnd(e, 'mouse')
        }
      }
    }
    return _hoverProps
  })

  watchEffect(() => {
    // Call the triggerHoverEnd as soon as isDisabled changes to true
    // Safe to call triggerHoverEnd, it will early return if we aren't currently hovering
    if (isDisabled) {
      triggerHoverEnd({currentTarget: state.target} as Event, state.pointerType as PointerType)
    }
  })

  return {
    hoverProps,
    isHovered,
  }
}
