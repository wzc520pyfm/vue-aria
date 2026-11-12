import {computed, defineComponent, h, inject, provide, ref, watch, Teleport, type PropType, type Ref} from 'vue'
import {
  mergeProps,
  toHeroDataAttrs,
  useFocusScope,
  usePlacement,
  usePopover,
  type Placement,
} from 'vue-aria'
import {useOverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import {
  OverlayArrowContextKey,
  OverlayTriggerStateKey,
  PopoverContextKey,
  TriggerRefKey,
} from './context'
import {useOverlayPresence} from './useOverlayPresence'

/**
 * A popover is an overlay element positioned relative to a trigger.
 *
 * Official RAC 1.22.1 / `usePopover`: outside click and Escape close by
 * default (`isDismissable: !isNonModal`). Default placement is `'bottom'`,
 * default offset at the component layer is 8 (official Popover).
 */
export const Popover = defineComponent({
  name: 'Popover',
  inheritAttrs: false,
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    isNonModal: {type: Boolean, default: false},
    isKeyboardDismissDisabled: {type: Boolean, default: false},
    placement: {type: String as PropType<Placement>, default: 'bottom'},
    offset: {type: Number, default: 8},
    shouldFlip: {type: Boolean, default: true},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
    triggerRef: {type: Object as PropType<{value: Element | null}>, default: undefined},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit, attrs}) {
    const contextState = inject(OverlayTriggerStateKey, null)
    const context = inject(PopoverContextKey, null)
    const triggerFromContext = inject(TriggerRefKey, null)
    const localState = useOverlayTriggerState({
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      onOpenChange: (isOpen) => emit('openchange', isOpen),
    })
    const state =
      props.isOpen != null || props.defaultOpen != null || !contextState ? localState : contextState

    provide(OverlayTriggerStateKey, state)

    const popoverRef = ref<HTMLElement | null>(null)
    const fallbackTriggerRef = ref<Element | null>(null)
    const triggerRef: Ref<Element | null | undefined> =
      (props.triggerRef as Ref<Element | null | undefined> | undefined) ??
      context?.triggerRef ??
      triggerFromContext ??
      fallbackTriggerRef

    const {popoverProps, placement: resolved} = usePopover(
      {
        triggerRef,
        popoverRef,
        isNonModal: () => props.isNonModal,
        isKeyboardDismissDisabled: () => props.isKeyboardDismissDisabled,
        placement: () => props.placement,
        offset: () => props.offset,
        shouldFlip: () => props.shouldFlip,
      },
      state,
    )

    // triggerRef.value is a Ref object; usePopover reads .value each time in a
    // watch, so passing the inner ref is correct as long as it is the same object.
    const {shouldMount, presenceAttrs, elRef} = useOverlayPresence(state.isOpen)
    const {placementAttrs} = usePlacement({placement: () => resolved.value})

    // Official RAC Popover: when the popover is modal (default) and has no
    // child [role=dialog], it is itself a dialog (tabIndex=-1) and is focused.
    // A child Dialog focuses itself via useDialog. Restore the trigger on close
    // in either case (Modal already restores via its own useFocusScope).
    const isStandaloneDialog = ref(false)
    useFocusScope({
      ref: popoverRef,
      contain: () => !props.isNonModal,
      autoFocus: true,
      restoreFocus: true,
      isActive: () => shouldMount.value,
    })
    watch(
      () => [popoverRef.value, shouldMount.value, props.isNonModal] as const,
      ([el], _prev, onCleanup) => {
        if (!el || !shouldMount.value) {
          isStandaloneDialog.value = false
          return
        }
        const standalone = !props.isNonModal && !el.querySelector('[role="dialog"]')
        isStandaloneDialog.value = standalone
        if (!standalone) return
        let cancelled = false
        const tryFocus = () => {
          if (cancelled || !el.isConnected) return true
          if (el.getAttribute('data-entering') === 'true') return false
          if (!el.contains(el.ownerDocument.activeElement)) {
            if (el.tabIndex < 0) el.tabIndex = -1
            try {
              el.focus({preventScroll: true})
            } catch {
              el.focus()
            }
          }
          return true
        }
        if (tryFocus()) return
        let timer: ReturnType<typeof setTimeout> | undefined
        const schedule = () => {
          if (cancelled) return
          timer = window.setTimeout(() => {
            if (!tryFocus()) schedule()
          }, 0)
        }
        const onEnd = () => {
          if (!tryFocus()) schedule()
        }
        el.addEventListener('animationend', onEnd)
        el.addEventListener('transitionend', onEnd)
        schedule()
        onCleanup(() => {
          cancelled = true
          el.removeEventListener('animationend', onEnd)
          el.removeEventListener('transitionend', onEnd)
          if (timer) clearTimeout(timer)
        })
      },
      {flush: 'post'},
    )

    provide(OverlayArrowContextKey, {
      placement: computed(() => resolved.value),
    })

    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'popover',
    )

    return () => {
      if (!shouldMount.value) return null
      const close = () => state.close()
      return h(Teleport, {to: 'body'}, [
        h(
          'div',
          mergeProps(
            attrs,
            popoverProps,
            presenceAttrs.value,
            placementAttrs.value,
            toHeroDataAttrs({slot: dataSlot.value}),
            isStandaloneDialog.value ? {role: 'dialog', tabIndex: -1} : {},
            {
              ref: (el: HTMLElement | null) => {
                popoverRef.value = el
                elRef.value = el
              },
            },
          ),
          slots.default?.({close, isOpen: state.isOpen.value, placement: resolved.value}),
        ),
      ])
    }
  },
})
