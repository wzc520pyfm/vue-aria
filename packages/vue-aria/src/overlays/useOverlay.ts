import {reactive, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import {useInteractOutside} from '../interactions/useInteractOutside'

export interface AriaOverlayProps {
  /** Whether the overlay is currently open. */
  isOpen?: MaybeRefOrGetter<boolean | undefined>
  /** Handler that is called when the overlay should close. */
  onClose?: () => void
  /**
   * Whether to close the overlay when the user interacts outside it.
   *
   * @default false
   */
  isDismissable?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether pressing the escape key to close the overlay should be disabled.
   *
   * @default false
   */
  isKeyboardDismissDisabled?: MaybeRefOrGetter<boolean | undefined>
  /**
   * When the user interacts with an element outside the overlay, return true if
   * onClose should be called. By default, onClose is always called.
   */
  shouldCloseOnInteractOutside?: (element: Element) => boolean
}

export interface OverlayPropsEl {
  onKeydown: (event: KeyboardEvent) => void
}

export interface OverlayAria {
  /** Props to apply to the overlay container element. Plain object, not a ComputedRef. */
  overlayProps: OverlayPropsEl
  /** Props to apply to the underlay element, if any. */
  underlayProps: Record<string, unknown>
}

/**
 * Dismiss behavior shared by Modal and Popover: Escape closes unless
 * `isKeyboardDismissDisabled`, and outside click closes only when
 * `isDismissable` is true.
 *
 * Port of official `useOverlay` defaults
 * (`packages/react-aria/src/overlays/useOverlay.ts`):
 * `isDismissable` defaults to **false**; `isKeyboardDismissDisabled` defaults
 * to **false** (Escape still closes).
 */
export function useOverlay(props: AriaOverlayProps, ref: Ref<Element | null | undefined>): OverlayAria {
  function shouldClose(target: EventTarget | null) {
    if (!props.shouldCloseOnInteractOutside) return true
    if (target instanceof Element) return props.shouldCloseOnInteractOutside(target)
    return true
  }

  function onHide() {
    if (toValue(props.isOpen) === false) return
    props.onClose?.()
  }

  const overlayProps: OverlayPropsEl = {
    onKeydown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (toValue(props.isKeyboardDismissDisabled)) return
      event.stopPropagation()
      event.preventDefault()
      onHide()
    },
  }

  const underlayProps = reactive<Record<string, unknown>>({})

  useInteractOutside({
    ref,
    isDisabled: () => !toValue(props.isOpen) || !toValue(props.isDismissable),
    onInteractOutsideStart(event) {
      if (shouldClose(event.target)) {
        event.stopPropagation()
      }
    },
    onInteractOutside(event) {
      if (shouldClose(event.target)) {
        event.stopPropagation()
        onHide()
      }
    },
  })

  return {overlayProps, underlayProps}
}
