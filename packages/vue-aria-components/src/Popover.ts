import {computed, defineComponent, getCurrentInstance, h, inject, provide, ref, watch, Teleport, type PropType, type Ref} from 'vue'
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

function resolveDirection(el: Element | null | undefined): 'ltr' | 'rtl' | undefined {
  if (!el) return undefined
  try {
    let node: Element | null = el
    while (node) {
      const dir = node.getAttribute?.('dir')
      if (dir === 'rtl' || dir === 'ltr') return dir
      node = node.parentElement
    }
    const docDir = el.ownerDocument?.documentElement?.getAttribute('dir') || el.ownerDocument?.documentElement?.dir
    if (docDir === 'rtl' || docDir === 'ltr') return docDir
    const computed = getComputedStyle(el as HTMLElement).direction
    if (computed === 'rtl' || computed === 'ltr') return computed
  } catch {}
  return undefined
}

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
    isNonModal: {type: Boolean, default: undefined},
    isKeyboardDismissDisabled: {type: Boolean, default: false},
    placement: {type: String as PropType<Placement>, default: undefined},
    offset: {type: Number, default: undefined},
    shouldFlip: {type: Boolean, default: true},
    shouldCloseOnInteractOutside: {type: Function as PropType<(el: Element) => boolean>, default: undefined},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
    triggerRef: {type: Object as PropType<{value: Element | null}>, default: undefined},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit, attrs}) {
    const contextState = inject(OverlayTriggerStateKey, null)
    const context = inject(PopoverContextKey, null) as any
    const triggerFromContext = inject(TriggerRefKey, null)
    const localState = useOverlayTriggerState({
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      onOpenChange: (isOpen) => emit('openchange', isOpen),
    })
    const state =
      props.isOpen != null || props.defaultOpen != null || !contextState ? localState : contextState

    provide(OverlayTriggerStateKey, state)

    const instance = getCurrentInstance()
    const vnodeProps = (instance?.vnode.props || {}) as Record<string, any>
    const placementExplicit = vnodeProps.placement != null || vnodeProps['placement'] != null
    const offsetExplicit = vnodeProps.offset != null || vnodeProps['offset'] != null
    const isNonModalExplicit = vnodeProps.isNonModal != null || vnodeProps['is-non-modal'] != null || vnodeProps['isNonModal'] != null
    const shouldCloseExplicit = vnodeProps.shouldCloseOnInteractOutside != null || vnodeProps['should-close-on-interact-outside'] != null

    const popoverRef = ref<HTMLElement | null>(null)
    const fallbackTriggerRef = ref<Element | null>(null)
    const triggerRef: Ref<Element | null | undefined> =
      (props.triggerRef as Ref<Element | null | undefined> | undefined) ??
      (context?.triggerRef as any) ??
      triggerFromContext ??
      fallbackTriggerRef

    const isSubmenu = computed(() => context?.trigger === 'SubmenuTrigger')
    const effectivePlacement = computed(() => {
      if (placementExplicit && props.placement != null) return props.placement
      if (context?.placement) return context.placement as Placement
      return 'bottom' as Placement
    })
    const effectiveOffset = computed(() => {
      if (offsetExplicit && props.offset != null) return props.offset
      if (context?.offset != null) return context.offset
      return props.offset ?? 8
    })
    const effectiveIsNonModal = computed(() => {
      if (isNonModalExplicit && props.isNonModal != null) return props.isNonModal
      if (context?.isNonModal != null) return !!context.isNonModal
      return !!props.isNonModal
    })
    const effectiveShouldCloseOnInteractOutside = computed(() => {
      if (shouldCloseExplicit && props.shouldCloseOnInteractOutside) return props.shouldCloseOnInteractOutside
      if (context?.shouldCloseOnInteractOutside) return context.shouldCloseOnInteractOutside
      return props.shouldCloseOnInteractOutside
    })
    const effectiveAriaLabelledby = computed(() => context?.['aria-labelledby'])
    const effectiveId = computed(() => context?.id)
    const dataTrigger = computed(() => context?.trigger)

    const {popoverProps, placement: resolved} = usePopover(
      {
        triggerRef,
        popoverRef,
        isNonModal: () => effectiveIsNonModal.value,
        isKeyboardDismissDisabled: () => props.isKeyboardDismissDisabled,
        placement: () => effectivePlacement.value,
        offset: () => effectiveOffset.value,
        shouldFlip: () => props.shouldFlip,
        shouldCloseOnInteractOutside: effectiveShouldCloseOnInteractOutside.value as any,
        trigger: dataTrigger.value as any,
        isSubmenu: isSubmenu.value as any,
      } as any,
      state,
    )

    const {shouldMount, presenceAttrs, elRef} = useOverlayPresence(state.isOpen)
    const {placementAttrs} = usePlacement({placement: () => resolved.value})

    // For SubmenuTrigger: non-modal, dialog when no nested dialog, do not auto-focus on pointer/hover open,
    // do auto-focus first item on keyboard/virtual open (handled by Menu autoFocus/focusStrategy).
    const isStandaloneDialog = ref(false)
    const shouldContainFocus = computed(() => !effectiveIsNonModal.value && !isSubmenu.value)
    const shouldAutoFocusPopover = computed(() => {
      if (!shouldMount.value) return false
      if (isSubmenu.value) return false
      return !effectiveIsNonModal.value
    })

    useFocusScope({
      ref: popoverRef,
      contain: () => shouldContainFocus.value,
      autoFocus: () => shouldAutoFocusPopover.value,
      restoreFocus: () => shouldContainFocus.value,
      isActive: () => shouldMount.value,
    })

    watch(
      () => [popoverRef.value, shouldMount.value, effectiveIsNonModal.value, isSubmenu.value] as const,
      ([el], _prev, onCleanup) => {
        if (!el || !shouldMount.value) {
          isStandaloneDialog.value = false
          return
        }
        const standalone = (!effectiveIsNonModal.value || isSubmenu.value) && !el.querySelector('[role="dialog"]')
        // For submenus official Popover still sets dialog in many cases; keep role=dialog if standalone.
        // But for submenu trigger we must not steal focus on pointer open.
        isStandaloneDialog.value = standalone
        if (!standalone) return
        if (isSubmenu.value) {
          // No pointer autofocus for submenu popover.
          return
        }
        if (effectiveIsNonModal.value) return
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
      const standaloneDialog = isStandaloneDialog.value
      const resolvedDir = resolveDirection(triggerRef.value as Element | null)
      return h(Teleport, {to: 'body'}, [
        h(
          'div',
          mergeProps(
            attrs,
            popoverProps,
            presenceAttrs.value,
            placementAttrs.value,
            toHeroDataAttrs({slot: dataSlot.value}),
            dataTrigger.value ? {'data-trigger': dataTrigger.value} : {},
            resolvedDir && !(attrs as any).dir ? {dir: resolvedDir} : {},
            effectiveAriaLabelledby.value && !(attrs as any)['aria-labelledby'] && !(attrs as any).ariaLabelledby ? {'aria-labelledby': effectiveAriaLabelledby.value} : {},
            effectiveId.value && !(attrs as any).id ? {id: effectiveId.value} : {},
            standaloneDialog ? {role: 'dialog', tabIndex: -1} : {},
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
