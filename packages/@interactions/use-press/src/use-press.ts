import {computed, ref, toValue} from 'vue'
import type {DOMAttributes, PressEvents} from '@nev-ui/types-shared'
import type {MaybeRefOrGetter, ToRefs} from 'vue'

export interface PressProps extends PressEvents {
  /** Whether the target is in a controlled press state (e.g. an overlay it triggers is open). */
  isPressed?: MaybeRefOrGetter<boolean>
  /** Whether the press events should be disabled. */
  isDisabled?: boolean
}

export interface PressResult {
  /** Whether the target is currently pressed. */
  isPressed: boolean
  /** Props to spread on the target element. */
  pressProps: DOMAttributes
}

/**
 * Handles press interactions across mouse, touch, keyboard, and screen readers.
 * It normalizes behavior across browsers and platforms, and handles many nuances
 * of dealing with pointer and keyboard events.
 */
// TODO
export function usePress(props: PressProps = {}): ToRefs<PressResult> {
  const {isPressed: isPressedProp, isDisabled} = props
  const isPressed = ref(false)

  const triggerPressStart = () => {
    if (toValue(isDisabled)) {
      return false
    }
    isPressed.value = true
  }

  const triggerPressEnd = () => {
    isPressed.value = false
  }

  const pressProps = computed(() => {
    const _pressProps: DOMAttributes = {}
    if (typeof PointerEvent !== 'undefined') {
      _pressProps.onPointerdown = () => {
        triggerPressStart()
      }

      _pressProps.onPointerup = () => {
        triggerPressEnd()
      }
    } else {
      _pressProps.onMousedown = () => {
        triggerPressStart()
      }

      _pressProps.onMouseup = () => {
        triggerPressEnd()
      }
    }

    return _pressProps
  })

  return {
    isPressed: computed(() => toValue(isPressedProp) || isPressed.value),
    pressProps,
  }
}
