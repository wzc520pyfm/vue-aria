import {computed, defineComponent, h, inject, provide, ref, watch, Teleport, type PropType} from 'vue'
import {mergeProps, toHeroDataAttrs, useFocusScope, useModalOverlay} from 'vue-aria'
import {useOverlayTriggerState, type OverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import {
  InModalKey,
  OverlayTriggerStateKey,
} from './context'
import {useOverlayPresence} from './useOverlayPresence'

const InternalModalContextKey = Symbol('InternalModal') as symbol

interface InternalModalContext {
  modalProps: Record<string, unknown>
  modalRef: {value: HTMLElement | null}
  isExiting: () => boolean
  state: OverlayTriggerState
}

function resolveState(
  props: {isOpen?: boolean; defaultOpen?: boolean; onOpenChange?: (isOpen: boolean) => void},
  emit: (event: 'openchange', isOpen: boolean) => void,
): OverlayTriggerState {
  const contextState = inject(OverlayTriggerStateKey, null)
  const localState = useOverlayTriggerState({
    isOpen: () => props.isOpen,
    defaultOpen: () => props.defaultOpen,
    onOpenChange: (isOpen) => {
      emit('openchange', isOpen)
      props.onOpenChange?.(isOpen)
    },
  })
  if (props.isOpen != null || props.defaultOpen != null || !contextState) {
    return localState
  }
  return contextState
}

/**
 * A ModalOverlay is a wrapper for a Modal which allows customizing the backdrop element.
 *
 * Official RAC 1.22.1 (`Modal.tsx`): `isDismissable` defaults to false (outside
 * click does not close). Escape still closes unless `isKeyboardDismissDisabled`.
 */
export const ModalOverlay = defineComponent({
  name: 'ModalOverlay',
  inheritAttrs: false,
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    isDismissable: {type: Boolean, default: false},
    isKeyboardDismissDisabled: {type: Boolean, default: false},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit, attrs}) {
    const state = resolveState(props, emit)
    const overlayRef = ref<HTMLElement | null>(null)
    const modalRef = ref<HTMLElement | null>(null)
    const dismissRef = ref<HTMLElement | null>(null)
    const {shouldMount, presenceAttrs, elRef} = useOverlayPresence(state.isOpen)

    // Official useModalOverlay's ref is the modal content, so a backdrop click
    // is "outside" and dismisses only when isDismissable is true.
    const {modalProps, underlayProps} = useModalOverlay(
      {
        isDismissable: () => props.isDismissable,
        isKeyboardDismissDisabled: () => props.isKeyboardDismissDisabled,
      },
      state,
      dismissRef,
    )

    useFocusScope({
      ref: overlayRef,
      contain: true,
      autoFocus: true,
      restoreFocus: true,
    })

    watch(
      () => modalRef.value ?? overlayRef.value,
      (el) => {
        dismissRef.value = el ?? null
      },
      {immediate: true},
    )

    provide(OverlayTriggerStateKey, state)
    provide(InModalKey, true)

    const internal: InternalModalContext = {
      modalProps,
      modalRef,
      isExiting: () => false,
      state,
    }
    provide(InternalModalContextKey, internal)

    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'modal-overlay',
    )

    return () => {
      if (!shouldMount.value) return null
      const close = () => state.close()
      return h(Teleport, {to: 'body'}, [
        h(
          'div',
          mergeProps(
            attrs,
            underlayProps,
            modalProps,
            presenceAttrs.value,
            toHeroDataAttrs({slot: dataSlot.value}),
            {
              ref: (el: HTMLElement | null) => {
                overlayRef.value = el
                elRef.value = el
                if (!modalRef.value) dismissRef.value = el
              },
            },
          ),
          slots.default?.({close, isOpen: state.isOpen.value, isEntering: presenceAttrs.value['data-entering'] === 'true', isExiting: presenceAttrs.value['data-exiting'] === 'true'}),
        ),
      ])
    }
  },
})

/**
 * A modal is an overlay element which blocks interaction with elements outside it.
 * When not already wrapped in a ModalOverlay, Modal renders one automatically.
 */
export const Modal = defineComponent({
  name: 'Modal',
  inheritAttrs: false,
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    isDismissable: {type: Boolean, default: false},
    isKeyboardDismissDisabled: {type: Boolean, default: false},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit, attrs}) {
    const ctx = inject<InternalModalContext | null>(InternalModalContextKey, null)
    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'modal',
    )

    if (ctx) {
      const {presenceAttrs, elRef, shouldMount} = useOverlayPresence(ctx.state.isOpen)
      return () => {
        if (!shouldMount.value && !ctx.state.isOpen.value) return null
        return h(
          'div',
          mergeProps(
            attrs,
            ctx.modalProps,
            presenceAttrs.value,
            toHeroDataAttrs({slot: dataSlot.value}),
            {
              ref: (el: HTMLElement | null) => {
                ctx.modalRef.value = el
                elRef.value = el
              },
            },
          ),
          slots.default?.({close: () => ctx.state.close(), isOpen: ctx.state.isOpen.value}),
        )
      }
    }

    return () =>
      h(
        ModalOverlay,
        {
          isOpen: props.isOpen,
          defaultOpen: props.defaultOpen,
          isDismissable: props.isDismissable,
          isKeyboardDismissDisabled: props.isKeyboardDismissDisabled,
          onOpenchange: (isOpen: boolean) => emit('openchange', isOpen),
        },
        {
          default: (slotProps: Record<string, unknown>) =>
            h(ModalContent, {dataSlot: dataSlot.value, ...attrsToProps(attrs)}, {
              default: () => slots.default?.(slotProps),
            }),
        },
      )
  },
})

function attrsToProps(attrs: Record<string, unknown>) {
  const rest = {...attrs}
  return rest
}

/** Inner content when Modal is used without a user-provided overlay wrapper via the auto-wrap path. */
const ModalContent = defineComponent({
  name: 'ModalContent',
  inheritAttrs: false,
  props: {
    dataSlot: {type: String, default: 'modal'},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject<InternalModalContext>(InternalModalContextKey)!
    const {presenceAttrs, elRef} = useOverlayPresence(ctx.state.isOpen)
    return () =>
      h(
        'div',
        mergeProps(
          attrs,
          ctx.modalProps,
          presenceAttrs.value,
          toHeroDataAttrs({slot: props.dataSlot}),
          {
            ref: (el: HTMLElement | null) => {
              ctx.modalRef.value = el
              elRef.value = el
            },
          },
        ),
        slots.default?.(),
      )
  },
})
