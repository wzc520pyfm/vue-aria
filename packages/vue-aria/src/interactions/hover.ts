import {
  onBeforeUnmount,
  ref,
  toValue,
  watchEffect,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type {PointerType} from './press'

export interface HoverEvent {
  type: 'hoverstart' | 'hoverend'
  pointerType: PointerType
  target: Element
}

export interface HoverProps {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  onHoverStart?: (e: HoverEvent) => void
  onHoverEnd?: (e: HoverEvent) => void
  onHoverChange?: (isHovering: boolean) => void
}

export interface HoverPropsEl {
  onPointerenter?: (e: PointerEvent) => void
  onPointerleave?: (e: PointerEvent) => void
  onTouchstart?: (e: TouchEvent) => void
  onMouseenter?: (e: MouseEvent) => void
  onMouseleave?: (e: MouseEvent) => void
}

/**
 * Public return value of {@link useHover}.
 * `hoverProps` is a plain object (not a computed/ref) so script can use
 * `hoverProps.onPointerenter` directly. `isHovered` remains a ref/computed.
 */
export interface UseHoverReturn {
  isHovered: Ref<boolean>
  hoverProps: HoverPropsEl
}

interface HoverState {
  isHovered: boolean
  ignoreEmulatedMouseEvents: boolean
  pointerType: PointerType | ''
  target: Element | null
}

/**
 * Handles hover interactions, ignoring touch pointers and emulated mouse events.
 */
export function useHover(props: HoverProps = {}): UseHoverReturn {
  const {onHoverStart, onHoverChange, onHoverEnd, isDisabled} = props

  const isHovered = ref(false)
  const state: HoverState = {
    isHovered: false,
    ignoreEmulatedMouseEvents: false,
    pointerType: '',
    target: null,
  }

  const triggerHoverStart = (event: Event, pointerType: PointerType) => {
    state.pointerType = pointerType
    if (
      toValue(isDisabled) ||
      pointerType === 'touch' ||
      state.isHovered ||
      (event.currentTarget instanceof Element &&
        event.target instanceof Node &&
        !event.currentTarget.contains(event.target))
    ) {
      return
    }

    state.isHovered = true
    const target = event.currentTarget as Element
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
    const target = (event.currentTarget as Element | null) ?? null

    if (target) {
      onHoverEnd?.({
        type: 'hoverend',
        target,
        pointerType,
      })
    }

    onHoverChange?.(false)
    isHovered.value = false
  }

  const hoverProps: HoverPropsEl = {}

  if (typeof PointerEvent !== 'undefined') {
    hoverProps.onPointerenter = (e) => {
      triggerHoverStart(e, (e.pointerType as PointerType) || 'mouse')
    }
    hoverProps.onPointerleave = (e) => {
      if (
        !toValue(isDisabled) &&
        e.currentTarget instanceof Element &&
        e.target instanceof Node &&
        e.currentTarget.contains(e.target)
      ) {
        triggerHoverEnd(e, (e.pointerType as PointerType) || 'mouse')
      }
    }
  } else {
    hoverProps.onTouchstart = () => {
      state.ignoreEmulatedMouseEvents = true
    }
    hoverProps.onMouseenter = (e) => {
      if (!state.ignoreEmulatedMouseEvents) {
        triggerHoverStart(e, 'mouse')
      }
      state.ignoreEmulatedMouseEvents = false
    }
    hoverProps.onMouseleave = (e) => {
      if (
        !toValue(isDisabled) &&
        e.currentTarget instanceof Element &&
        e.target instanceof Node &&
        e.currentTarget.contains(e.target)
      ) {
        triggerHoverEnd(e, 'mouse')
      }
    }
  }

  watchEffect(() => {
    if (toValue(isDisabled) && state.isHovered) {
      triggerHoverEnd({currentTarget: state.target} as Event, (state.pointerType || 'mouse') as PointerType)
    }
  })

  onBeforeUnmount(() => {
    if (state.isHovered) {
      triggerHoverEnd({currentTarget: state.target} as Event, (state.pointerType || 'mouse') as PointerType)
    }
  })

  return {
    isHovered,
    hoverProps,
  }
}
