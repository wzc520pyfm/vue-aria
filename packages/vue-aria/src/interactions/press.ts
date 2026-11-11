import {computed, onBeforeUnmount, ref, toValue, type ComputedRef, type MaybeRefOrGetter} from 'vue'
import {containsEventTarget} from '../utils/dom'

export type PointerType = 'mouse' | 'pen' | 'touch' | 'keyboard' | 'virtual'

export interface PressEvent {
  type: 'pressstart' | 'pressend' | 'pressup' | 'press'
  pointerType: PointerType
  target: Element
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  continuePropagation(): void
  readonly shouldStopPropagation: boolean
}

export interface PressEvents {
  onPress?: (e: PressEvent) => void
  onPressStart?: (e: PressEvent) => void
  onPressEnd?: (e: PressEvent) => void
  onPressUp?: (e: PressEvent) => void
  onPressChange?: (isPressed: boolean) => void
}

/**
 * Stable public options for a future hero-ui-vue vue-aria adapter.
 * Extra fields on {@link PressProps} are additive and do not break this contract.
 */
export interface UsePressOptions extends PressEvents {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isPending?: MaybeRefOrGetter<boolean | undefined>
}

export interface PressProps extends UsePressOptions {
  /** Whether the target is in a controlled press state. */
  isPressed?: MaybeRefOrGetter<boolean>
  /**
   * Whether press events should be canceled when the pointer leaves the target while pressed.
   * By default this is `false`, so returning the pointer over the target fires `onPressStart` again.
   */
  shouldCancelOnPointerExit?: MaybeRefOrGetter<boolean>
  /**
   * The native click handler. Invoked for pointer, keyboard, and virtual activation.
   * Prefer `onPress` in user code.
   */
  onClick?: (e: MouseEvent) => void
}

export interface PressPropsEl {
  onPointerdown?: (e: PointerEvent) => void
  onPointerup?: (e: PointerEvent) => void
  onPointercancel?: (e: PointerEvent) => void
  onLostpointercapture?: (e: PointerEvent) => void
  onPointerenter?: (e: PointerEvent) => void
  onPointerleave?: (e: PointerEvent) => void
  onKeydown?: (e: KeyboardEvent) => void
  onKeyup?: (e: KeyboardEvent) => void
  onBlur?: (e: FocusEvent) => void
  onClick?: (e: MouseEvent) => void
  onMousedown?: (e: MouseEvent) => void
  onMouseup?: (e: MouseEvent) => void
  onDragstart?: (e: DragEvent) => void
}

/**
 * Public return value of {@link usePress}.
 * `pressProps` is a plain object (not a computed/ref) so script can use
 * `pressProps.onPointerdown` directly. `isPressed` remains a computed ref.
 */
export interface UsePressReturn {
  isPressed: ComputedRef<boolean>
  pressProps: PressPropsEl
}

interface EventBase {
  currentTarget: EventTarget | null
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  clientX?: number
  clientY?: number
  key?: string
}

class PressEventImpl implements PressEvent {
  type: PressEvent['type']
  pointerType: PointerType
  target: Element
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  #shouldStopPropagation = true

  constructor(type: PressEvent['type'], pointerType: PointerType, originalEvent: EventBase) {
    this.type = type
    this.pointerType = pointerType
    this.target = originalEvent.currentTarget as Element
    this.shiftKey = originalEvent.shiftKey
    this.metaKey = originalEvent.metaKey
    this.ctrlKey = originalEvent.ctrlKey
    this.altKey = originalEvent.altKey
  }

  continuePropagation() {
    this.#shouldStopPropagation = false
  }

  get shouldStopPropagation() {
    return this.#shouldStopPropagation
  }
}

interface PressState {
  isPressed: boolean
  didFirePressStart: boolean
  isTriggeringEvent: boolean
  ignoreEmulatedMouseEvents: boolean
  activePointerId: number | null
  target: Element | null
  isOverTarget: boolean
  pointerType: PointerType | null
  activeKey: string | null
}

function createPressState(): PressState {
  return {
    isPressed: false,
    didFirePressStart: false,
    isTriggeringEvent: false,
    ignoreEmulatedMouseEvents: false,
    activePointerId: null,
    target: null,
    isOverTarget: false,
    pointerType: null,
    activeKey: null,
  }
}

const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset',
])

function isHTMLAnchorLink(target: Element): target is HTMLAnchorElement {
  return target.tagName === 'A' && target.hasAttribute('href')
}

function isValidInputKey(target: HTMLInputElement, key: string) {
  return target.type === 'checkbox' || target.type === 'radio'
    ? key === ' '
    : NON_TEXT_INPUT_TYPES.has(target.type)
}

function isValidKeyboardEvent(event: KeyboardEvent, currentTarget: Element): boolean {
  const {key, code} = event
  const element = currentTarget as HTMLElement
  const role = element.getAttribute('role')

  return (
    (key === 'Enter' || key === ' ' || key === 'Spacebar' || code === 'Space') &&
    !(
      (element instanceof HTMLInputElement && !isValidInputKey(element, key)) ||
      element instanceof HTMLTextAreaElement ||
      element.isContentEditable
    ) &&
    !((role === 'link' || (!role && isHTMLAnchorLink(element))) && key !== 'Enter')
  )
}

function shouldPreventDefaultUp(target: Element) {
  if (target instanceof HTMLInputElement) return false
  if (target instanceof HTMLButtonElement) {
    return target.type !== 'submit' && target.type !== 'reset'
  }
  if (isHTMLAnchorLink(target)) return false
  return true
}

function shouldPreventDefaultKeyboard(target: EventTarget | null, key: string) {
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLInputElement) {
    if (key === 'Enter' && (target.type === 'checkbox' || target.type === 'radio')) {
      return false
    }
    return !isValidInputKey(target, key)
  }
  return shouldPreventDefaultUp(target)
}

function isVirtualClick(event: MouseEvent): boolean {
  const pointerEvent = event as PointerEvent
  if (pointerEvent.pointerType === '' && event.isTrusted) {
    return true
  }
  return event.detail === 0 && !pointerEvent.pointerType
}

function createEventBase(
  target: EventTarget | null,
  event: {
    shiftKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    clientX?: number
    clientY?: number
    key?: string
  },
): EventBase {
  return {
    currentTarget: target,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    clientX: event.clientX,
    clientY: event.clientY,
    key: event.key,
  }
}

/**
 * Handles press interactions across mouse, touch, keyboard, and screen readers.
 *
 * Public signature matches the hero-ui-vue behavior contract:
 * `usePress(options?) → { isPressed, pressProps }` with element-level
 * `onPointerdown` / `onPointerup` / `onPointercancel` / `onLostpointercapture` /
 * `onKeydown` / `onKeyup` / `onBlur`.
 */
export function usePress(props: PressProps = {}): UsePressReturn {
  const {
    onPress,
    onPressChange,
    onPressStart,
    onPressEnd,
    onPressUp,
    onClick,
    isPressed: isPressedProp,
    isDisabled,
    isPending,
    shouldCancelOnPointerExit,
  } = props

  const isPressed = ref(false)
  const state = createPressState()
  const isDisabledLike = () => Boolean(toValue(isDisabled) || toValue(isPending))

  const triggerPressStart = (originalEvent: EventBase, pointerType: PointerType) => {
    if (isDisabledLike() || state.didFirePressStart) {
      return false
    }

    let shouldStopPropagation = true
    state.isTriggeringEvent = true
    if (onPressStart) {
      const event = new PressEventImpl('pressstart', pointerType, originalEvent)
      onPressStart(event)
      shouldStopPropagation = event.shouldStopPropagation
    }

    onPressChange?.(true)
    state.isTriggeringEvent = false
    state.didFirePressStart = true
    isPressed.value = true
    return shouldStopPropagation
  }

  const triggerPressEnd = (
    originalEvent: EventBase,
    pointerType: PointerType,
    wasPressed = true,
  ) => {
    if (!state.didFirePressStart) {
      return false
    }

    state.didFirePressStart = false
    state.isTriggeringEvent = true

    let shouldStopPropagation = true
    if (onPressEnd) {
      const event = new PressEventImpl('pressend', pointerType, originalEvent)
      onPressEnd(event)
      shouldStopPropagation = event.shouldStopPropagation
    }

    onPressChange?.(false)
    isPressed.value = false

    if (onPress && wasPressed && !isDisabledLike()) {
      const event = new PressEventImpl('press', pointerType, originalEvent)
      onPress(event)
      shouldStopPropagation = shouldStopPropagation && event.shouldStopPropagation
    }

    state.isTriggeringEvent = false
    return shouldStopPropagation
  }

  const triggerPressUp = (originalEvent: EventBase, pointerType: PointerType) => {
    if (isDisabledLike()) {
      return false
    }

    if (onPressUp) {
      state.isTriggeringEvent = true
      const event = new PressEventImpl('pressup', pointerType, originalEvent)
      onPressUp(event)
      state.isTriggeringEvent = false
      return event.shouldStopPropagation
    }

    return true
  }

  const cleanupCapture = () => {
    if (state.target instanceof HTMLElement && state.activePointerId != null) {
      try {
        state.target.releasePointerCapture(state.activePointerId)
      } catch {
        // already released / unsupported (jsdom)
      }
    }
  }

  const resetPressTracking = () => {
    cleanupCapture()
    state.isPressed = false
    state.isOverTarget = false
    state.activePointerId = null
    state.pointerType = null
    state.target = null
    state.activeKey = null
  }

  const cancel = (event: EventBase) => {
    if (state.isPressed && state.target) {
      if (state.didFirePressStart && state.pointerType != null) {
        triggerPressEnd(createEventBase(state.target, event), state.pointerType, false)
      }
      resetPressTracking()
    }
  }

  const endActivePress = (event: EventBase, pointerType: PointerType, firePress: boolean) => {
    if (!state.isPressed) return
    const target = state.target ?? event.currentTarget
    triggerPressUp(createEventBase(target, event), pointerType)
    triggerPressEnd(createEventBase(target, event), pointerType, firePress)
    resetPressTracking()
  }

  const pressProps: PressPropsEl = {
    onPointerdown(e) {
      if (e.button !== 0 || !containsEventTarget(e.currentTarget, e.target) || isDisabledLike()) {
        return
      }

      state.pointerType = (e.pointerType as PointerType) || 'mouse'
      if (!state.isPressed) {
        state.isPressed = true
        state.isOverTarget = true
        state.activePointerId = e.pointerId
        state.target = e.currentTarget as Element
        const shouldStopPropagation = triggerPressStart(e, state.pointerType)
        if (state.target instanceof HTMLElement) {
          try {
            state.target.setPointerCapture(e.pointerId)
          } catch {
            // jsdom / happy-dom may not implement capture
          }
        }
        if (shouldStopPropagation) {
          e.stopPropagation()
        }
      }
    },
    onPointerup(e) {
      if (state.activePointerId != null && e.pointerId !== state.activePointerId) return
      if (!state.isPressed || isDisabledLike()) return
      const pointerType = state.pointerType || (e.pointerType as PointerType) || 'mouse'
      const firePress =
        state.isOverTarget && containsEventTarget(e.currentTarget, e.target)
          ? true
          : state.isOverTarget
      endActivePress(e, pointerType, firePress)
    },
    onPointercancel(e) {
      if (state.activePointerId != null && e.pointerId !== state.activePointerId) return
      cancel(e)
    },
    onLostpointercapture(e) {
      if (state.activePointerId != null && e.pointerId !== state.activePointerId) return
      if (!state.isPressed) return
      cancel(e)
    },
    onPointerenter(e) {
      if (
        e.pointerId === state.activePointerId &&
        state.target &&
        !state.isOverTarget &&
        state.pointerType != null
      ) {
        state.isOverTarget = true
        triggerPressStart(createEventBase(state.target, e), state.pointerType)
      }
    },
    onPointerleave(e) {
      if (
        e.pointerId === state.activePointerId &&
        state.target &&
        state.isOverTarget &&
        state.pointerType != null
      ) {
        state.isOverTarget = false
        triggerPressEnd(createEventBase(state.target, e), state.pointerType, false)
        if (toValue(shouldCancelOnPointerExit)) {
          resetPressTracking()
        }
      }
    },
    onKeydown(e) {
      if (
        isValidKeyboardEvent(e, e.currentTarget as Element) &&
        containsEventTarget(e.currentTarget, e.target)
      ) {
        if (
          shouldPreventDefaultKeyboard(e.target, e.key) ||
          e.key === ' ' ||
          e.key === 'Spacebar'
        ) {
          e.preventDefault()
        }

        let shouldStopPropagation = true
        if (!state.isPressed && !e.repeat) {
          if (isDisabledLike()) return
          state.target = e.currentTarget as Element
          state.isPressed = true
          state.pointerType = 'keyboard'
          state.activeKey = e.key
          shouldStopPropagation = triggerPressStart(e, 'keyboard')
        }

        if (shouldStopPropagation) {
          e.stopPropagation()
        }
      }
    },
    onKeyup(e) {
      if (state.activeKey == null || e.key !== state.activeKey) {
        if (
          !(
            state.isPressed &&
            state.pointerType === 'keyboard' &&
            isValidKeyboardEvent(e, (state.target ?? e.currentTarget) as Element)
          )
        ) {
          return
        }
      }
      if (!state.isPressed || state.pointerType !== 'keyboard') return
      const wasPressed =
        containsEventTarget(state.target ?? e.currentTarget, e.target) ||
        e.currentTarget === state.target
      const target = state.target ?? e.currentTarget
      endActivePress(
        createEventBase(target, e),
        'keyboard',
        Boolean(wasPressed) && !isDisabledLike(),
      )
    },
    onBlur(e) {
      if (!state.isPressed) return
      cancel(createEventBase(state.target ?? e.currentTarget, {
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
      }))
    },
    onClick(e) {
      if (!containsEventTarget(e.currentTarget, e.target)) {
        return
      }
      if (e.button !== 0 || state.isTriggeringEvent) {
        return
      }

      if (isDisabledLike()) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (!state.ignoreEmulatedMouseEvents && !state.isPressed && isVirtualClick(e)) {
        triggerPressStart(e, 'virtual')
        triggerPressUp(e, 'virtual')
        triggerPressEnd(e, 'virtual', true)
        onClick?.(e)
        e.stopPropagation()
        return
      }

      onClick?.(e)
    },
    onDragstart(e) {
      if (!containsEventTarget(e.currentTarget, e.target)) return
      cancel(e)
    },
  }

  // Mouse fallback when PointerEvent is unavailable (legacy environments, some test DOM).
  if (typeof PointerEvent === 'undefined') {
    pressProps.onMousedown = (e) => {
      if (e.button !== 0 || !containsEventTarget(e.currentTarget, e.target) || isDisabledLike()) {
        return
      }
      state.pointerType = 'mouse'
      state.isPressed = true
      state.isOverTarget = true
      state.target = e.currentTarget as Element
      state.activePointerId = 0
      if (triggerPressStart(e, 'mouse')) {
        e.stopPropagation()
      }
    }
    pressProps.onMouseup = (e) => {
      if (!state.isPressed) return
      endActivePress(e, state.pointerType || 'mouse', state.isOverTarget)
    }
  }

  onBeforeUnmount(() => {
    cancel({
      currentTarget: state.target,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  })

  return {
    isPressed: computed(() => Boolean(toValue(isPressedProp) || isPressed.value)),
    pressProps,
  }
}
