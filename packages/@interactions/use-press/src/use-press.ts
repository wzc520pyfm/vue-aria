import {computed, ref, toValue} from 'vue'
import type {
  DOMAttributes,
  EventHandlers,
  PressEvent as IPressEvent,
  PointerType,
  PressEvents,
} from '@nev-ui/types-shared'
import type {Events, MaybeRefOrGetter, ToRefs} from 'vue'

export interface PressProps extends PressEvents {
  /** Whether the target is in a controlled press state (e.g. an overlay it triggers is open). */
  isPressed?: MaybeRefOrGetter<boolean>
  /** Whether the press events should be disabled. */
  isDisabled?: MaybeRefOrGetter<boolean>
}

export interface PressResult {
  /** Whether the target is currently pressed. */
  isPressed: boolean
  /** Props to spread on the target element. */
  pressProps: DOMAttributes
  /** Events to spread on the target element. */
  pressEvents: DOMAttributes
}

interface EventBase {
  currentTarget: EventTarget | null
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

class PressEvent implements IPressEvent {
  type: IPressEvent['type']
  pointerType: PointerType
  target: Element
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  #shouldStopPropagation = true

  constructor(type: IPressEvent['type'], pointerType: PointerType, originalEvent: EventBase) {
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

/**
 * Handles press interactions across mouse, touch, keyboard, and screen readers.
 * It normalizes behavior across browsers and platforms, and handles many nuances
 * of dealing with pointer and keyboard events.
 */
// TODO
export function usePress(props: PressProps = {}): ToRefs<PressResult> {
  const {
    onPress,
    onPressChange,
    onPressStart,
    onPressEnd,
    isPressed: isPressedProp,
    isDisabled,
  } = props
  const isPressed = ref(false)

  // TODO: remove pointerType default value
  const triggerPressStart = (originalEvent: EventBase, pointerType: PointerType = 'mouse') => {
    if (toValue(isDisabled)) {
      return false
    }
    if (onPressStart) {
      const event = new PressEvent('pressstart', pointerType, originalEvent)
      onPressStart(event)
    }

    onPressChange?.(true)

    isPressed.value = true
  }

  const triggerPressEnd = (
    originalEvent: EventBase,
    // TODO: remove pointerType default value
    pointerType: PointerType = 'mouse',
    wasPressed = true,
  ) => {
    if (onPressEnd) {
      const event = new PressEvent('pressend', pointerType, originalEvent)
      onPressEnd(event)
    }

    onPressChange?.(false)

    isPressed.value = false

    if (onPress && wasPressed && toValue(isDisabled)) {
      const event = new PressEvent('press', pointerType, originalEvent)
      onPress(event)
    }
  }

  const pressProps = computed<DOMAttributes>(() => ({}))

  const pressEvents = computed(() => {
    const _pressEvents: EventHandlers<Events> = {}
    if (typeof PointerEvent !== 'undefined') {
      _pressEvents.onPointerdown = (e) => {
        triggerPressStart(e)
      }

      _pressEvents.onPointerup = (e) => {
        triggerPressEnd(e)
      }
    } else {
      _pressEvents.onMousedown = (e) => {
        triggerPressStart(e)
      }

      _pressEvents.onMouseup = (e) => {
        triggerPressEnd(e)
      }
    }

    return _pressEvents
  })

  return {
    isPressed: computed(() => toValue(isPressedProp) || isPressed.value),
    pressProps,
    pressEvents,
  }
}
