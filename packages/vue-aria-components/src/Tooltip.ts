import {
  cloneVNode,
  computed,
  defineComponent,
  h,
  inject,
  provide,
  ref,
  watch,
  Teleport,
  type PropType,
  type VNode,
} from 'vue'
import {
  mergeProps,
  toHeroDataAttrs,
  usePlacement,
  useTooltip,
  useTooltipTrigger,
  computePosition,
  type Placement,
} from 'vue-aria'
import {useTooltipTriggerState} from 'vue-stately/useTooltipTriggerState'
import {
  OVERLAY_COMPONENT_NAMES,
  OverlayArrowContextKey,
  TooltipContextKey,
  TooltipTriggerStateKey,
} from './context'
import {useOverlayPresence} from './useOverlayPresence'

function isOverlayVNode(node: VNode) {
  const name =
    typeof node.type === 'object' && node.type && 'name' in node.type
      ? (node.type as {name?: string}).name
      : undefined
  return Boolean(name && OVERLAY_COMPONENT_NAMES.has(name))
}

function assignElRef(target: {value: Element | null}, el: unknown) {
  const node = el as {$el?: Element} | Element | null | undefined
  target.value = (node && typeof node === 'object' && '$el' in node ? node.$el : node) as Element | null
}

/** Join space-separated id lists, preserving existing tokens (SHOULD-FIX). */
function mergeIdLists(...lists: Array<string | undefined | null>): string | undefined {
  const tokens: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    if (!list) continue
    for (const token of String(list).split(/\s+/)) {
      if (!token || seen.has(token)) continue
      seen.add(token)
      tokens.push(token)
    }
  }
  return tokens.length ? tokens.join(' ') : undefined
}

/**
 * TooltipTrigger wraps a trigger element and a Tooltip. Opens on hover/focus,
 * closes on leave/Escape. Official delays are 1500ms / 500ms unless overridden.
 */
export const TooltipTrigger = defineComponent({
  name: 'TooltipTrigger',
  inheritAttrs: false,
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    isDisabled: {type: Boolean, default: false},
    delay: {type: Number, default: undefined},
    closeDelay: {type: Number, default: undefined},
    trigger: {type: String as PropType<'hover' | 'focus'>, default: 'hover'},
    shouldCloseOnPress: {type: Boolean, default: true},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit}) {
    const state = useTooltipTriggerState({
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      isDisabled: () => props.isDisabled,
      delay: () => props.delay,
      closeDelay: () => props.closeDelay,
      trigger: () => props.trigger,
      shouldCloseOnPress: () => props.shouldCloseOnPress,
      onOpenChange: (isOpen) => emit('openchange', isOpen),
    })
    const triggerRef = ref<Element | null>(null)
    const {triggerProps, tooltipProps} = useTooltipTrigger(props, state, triggerRef)

    provide(TooltipTriggerStateKey, state)
    provide(TooltipContextKey, {id: tooltipProps.id, triggerRef})

    return () => {
      const children = (slots.default?.() as VNode[] | undefined) ?? []
      let assigned = false
      return children.map((node) => {
        if (assigned || isOverlayVNode(node) || typeof node.type === 'symbol') {
          return node
        }
        assigned = true
        // Vue mergeProps / cloneVNode overwrite aria-describedby; concatenate
        // with any existing id list so opening a tooltip does not drop it.
        const existingDescribedby =
          (node.props?.['aria-describedby'] as string | undefined) ??
          (node.props?.ariaDescribedby as string | undefined)
        const describedby = mergeIdLists(existingDescribedby, triggerProps['aria-describedby'] as string | undefined)
        const extra: Record<string, unknown> = {
          ...triggerProps,
          ref: (el: unknown) => assignElRef(triggerRef, el),
        }
        if (describedby) {
          extra['aria-describedby'] = describedby
        }
        if (typeof node.type === 'string') {
          const prevClick = extra.onClick as ((e: MouseEvent) => void) | undefined
          extra.onClick = (e: MouseEvent) => {
            prevClick?.(e)
          }
          // Native elements use onPointerenter / onFocus from triggerProps (Vue listeners).
        }
        return cloneVNode(node, extra)
      })
    }
  },
})

/**
 * A tooltip displays a description of an element on hover or focus.
 * Default placement is official `'top'`. No focus trap.
 */
export const Tooltip = defineComponent({
  name: 'Tooltip',
  inheritAttrs: false,
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    placement: {type: String as PropType<Placement>, default: 'top'},
    offset: {type: Number, default: 0},
    shouldFlip: {type: Boolean, default: true},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
    triggerRef: {type: Object as PropType<{value: Element | null}>, default: undefined},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit, attrs}) {
    const contextState = inject(TooltipTriggerStateKey, null)
    const context = inject(TooltipContextKey, null)
    const localState = useTooltipTriggerState({
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      onOpenChange: (isOpen) => emit('openchange', isOpen),
    })
    const state =
      props.isOpen != null || props.defaultOpen != null || !contextState ? localState : contextState

    provide(TooltipTriggerStateKey, state)

    const tooltipRef = ref<HTMLElement | null>(null)
    const triggerRef = (props.triggerRef ?? context?.triggerRef ?? ref<Element | null>(null)) as {
      value: Element | null
    }
    const {tooltipProps} = useTooltip({}, state)
    if (context?.id) {
      ;(tooltipProps as {id?: string}).id = context.id
    }

    const resolvedPlacement = ref<'top' | 'bottom' | 'left' | 'right' | 'center' | undefined>(
      (String(props.placement || 'top').split(/[\s-]/)[0] || 'top') as 'top' | 'bottom' | 'left' | 'right',
    )
    const {shouldMount, presenceAttrs, elRef} = useOverlayPresence(state.isOpen)
    const {placementAttrs} = usePlacement({placement: () => resolvedPlacement.value})

    provide(OverlayArrowContextKey, {
      placement: resolvedPlacement,
    })

    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'tooltip',
    )

    const positionStyle = ref<Record<string, string> | undefined>(undefined)

    watch(
      () => [state.isOpen.value, triggerRef.value, tooltipRef.value, props.placement, props.offset, props.shouldFlip] as const,
      ([isOpen, trigger, overlay]) => {
        if (!isOpen || !trigger || !overlay) return
        const result = computePosition({
          trigger,
          overlay,
          placement: props.placement || 'top',
          offset: props.offset,
          shouldFlip: props.shouldFlip,
        })
        resolvedPlacement.value = result.placement
        positionStyle.value = result.style
      },
      {flush: 'post'},
    )

    return () => {
      if (!shouldMount.value) return null
      return h(Teleport, {to: 'body'}, [
        h(
          'div',
          mergeProps(
            attrs,
            tooltipProps,
            presenceAttrs.value,
            placementAttrs.value,
            toHeroDataAttrs({slot: dataSlot.value}),
            {
              style: positionStyle.value,
              ref: (el: HTMLElement | null) => {
                tooltipRef.value = el
                elRef.value = el
              },
            },
          ),
          slots.default?.({
            close: () => state.close(true),
            isOpen: state.isOpen.value,
            placement: resolvedPlacement.value,
          }),
        ),
      ])
    }
  },
})
