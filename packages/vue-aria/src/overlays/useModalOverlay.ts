import {mergeProps} from '../utils/mergeProps'
import {toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {OverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import {useModal} from './useModal'
import {useOverlay, type AriaOverlayProps, type OverlayPropsEl} from './useOverlay'
import {usePreventScroll} from './usePreventScroll'

export interface AriaModalOverlayProps extends Pick<AriaOverlayProps, 'shouldCloseOnInteractOutside'> {
  /**
   * Whether to close the modal when the user interacts outside it.
   *
   * @default false
   */
  isDismissable?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether pressing the escape key to close the modal should be disabled.
   *
   * @default false
   */
  isKeyboardDismissDisabled?: MaybeRefOrGetter<boolean | undefined>
}

export interface ModalOverlayAria {
  /** Props for the modal element. Plain object, not a ComputedRef. */
  modalProps: OverlayPropsEl & Record<string, unknown>
  /** Props for the underlay element. */
  underlayProps: Record<string, unknown>
}

/**
 * Behavior and accessibility for a modal overlay: scroll lock, `aria-hidden`
 * on the rest of the page, Escape (unless disabled), and outside-click only
 * when `isDismissable` is true.
 *
 * Port of official `useModalOverlay`
 * (`packages/react-aria/src/overlays/useModalOverlay.ts`):
 * `isDismissable` defaults to **false**.
 */
export function useModalOverlay(
  props: AriaModalOverlayProps,
  state: OverlayTriggerState,
  ref: Ref<HTMLElement | null | undefined>,
): ModalOverlayAria {
  const {overlayProps, underlayProps} = useOverlay(
    {
      isOpen: () => state.isOpen.value,
      onClose: () => state.close(),
      isDismissable: () => Boolean(toValue(props.isDismissable)),
      isKeyboardDismissDisabled: () => Boolean(toValue(props.isKeyboardDismissDisabled)),
      shouldCloseOnInteractOutside: props.shouldCloseOnInteractOutside,
    },
    ref,
  )

  usePreventScroll({
    isDisabled: () => !state.isOpen.value,
  })

  const {modalProps: hideProps} = useModal({
    ref,
    isDisabled: () => !state.isOpen.value,
  })

  return {
    modalProps: mergeProps(overlayProps, hideProps) as OverlayPropsEl & Record<string, unknown>,
    underlayProps,
  }
}
