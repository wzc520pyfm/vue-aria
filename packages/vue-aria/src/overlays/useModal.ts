import {reactive, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import {ariaHideOutside} from './ariaHideOutside'

export interface UseModalOptions {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** The modal element. When provided, content outside it is hidden from AT while active. */
  ref?: Ref<HTMLElement | null | undefined>
}

export interface ModalPropsEl {
  'data-ismodal'?: boolean
}

export interface ModalAria {
  /** Props for the modal content element. Plain object, not a ComputedRef. */
  modalProps: ModalPropsEl
}

/**
 * Hides content outside the modal from assistive technologies while active.
 *
 * Simplified port of official `useModal`
 * (`packages/react-aria/src/overlays/useModal.tsx`). Official requires a
 * `ModalProvider` / `OverlayProvider` tree; this Vue port applies
 * `ariaHideOutside` directly to `options.ref` so it works without a provider.
 * Nested modal stacking is therefore shallower than official.
 */
export function useModal(options: UseModalOptions = {}): ModalAria {
  const modalProps = reactive<ModalPropsEl>({
    'data-ismodal': true,
  }) as ModalPropsEl

  watch(
    () => [options.ref?.value, Boolean(toValue(options.isDisabled))] as const,
    ([element, isDisabled], _prev, onCleanup) => {
      modalProps['data-ismodal'] = !isDisabled
      if (!element || isDisabled) return
      const restore = ariaHideOutside([element])
      onCleanup(() => restore())
    },
    {immediate: true, flush: 'post'},
  )

  return {modalProps}
}
