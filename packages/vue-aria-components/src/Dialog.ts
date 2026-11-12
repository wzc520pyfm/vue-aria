import {
  cloneVNode,
  computed,
  defineComponent,
  h,
  inject,
  provide,
  ref,
  type PropType,
  type VNode,
} from 'vue'
import {mergeProps, useDialog, useOverlayTrigger, useId} from 'vue-aria'
import {useOverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import {toHeroDataAttrs} from 'vue-aria'
import {
  ButtonCloseKey,
  DialogOverlayPropsKey,
  DialogTitlePropsKey,
  InModalKey,
  OVERLAY_COMPONENT_NAMES,
  OverlayTriggerButtonKey,
  OverlayTriggerStateKey,
  PopoverContextKey,
  TriggerRefKey,
} from './context'

function isOverlayVNode(node: VNode) {
  const name = typeof node.type === 'object' && node.type && 'name' in node.type ? (node.type as {name?: string}).name : undefined
  return Boolean(name && OVERLAY_COMPONENT_NAMES.has(name))
}

function flatten(nodes: VNode[] | undefined): VNode[] {
  if (!nodes) return []
  const out: VNode[] = []
  for (const node of nodes) {
    if (Array.isArray(node.children) && (node.type as symbol | string | undefined) === Symbol.for('v-fgt')) {
      out.push(...flatten(node.children as VNode[]))
    } else if (node) {
      out.push(node)
    }
  }
  return out
}

function assignElRef(target: {value: Element | null}, el: unknown) {
  const node = (el as { $el?: Element } | Element | null | undefined)
  target.value = (node && typeof node === 'object' && '$el' in node ? node.$el : node) as Element | null
}

/**
 * A DialogTrigger opens a dialog when a trigger element is pressed.
 *
 * Official composition (RAC 1.22.1 `Dialog.tsx`): trigger + Modal or Popover
 * wrapping a Dialog. Close is available as a scoped slot `{ close }` and via
 * `<Button slot="close">`.
 */
export const DialogTrigger = defineComponent({
  name: 'DialogTrigger',
  inheritAttrs: false,
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit}) {
    const state = useOverlayTriggerState({
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      onOpenChange: (isOpen) => emit('openchange', isOpen),
    })
    const triggerRef = ref<Element | null>(null)
    const triggerId = useId('vue-aria-trigger')
    const {triggerProps, overlayProps} = useOverlayTrigger({type: 'dialog'}, state)

    provide(OverlayTriggerStateKey, state)
    provide(TriggerRefKey, triggerRef)
    provide(DialogOverlayPropsKey, overlayProps)
    provide(PopoverContextKey, {
      triggerRef,
      id: overlayProps.id,
      get 'aria-labelledby'() {
        return triggerId.value
      },
    })

    return () => {
      const children = flatten(slots.default?.({isOpen: state.isOpen.value, close: state.close}) as VNode[] | undefined)
      let assigned = false
      return children.map((node) => {
        if (assigned || isOverlayVNode(node) || typeof node.type === 'symbol') {
          return node
        }
        assigned = true
        return h(TriggerBinder, {
          triggerProps,
          triggerRef,
          triggerId: triggerId.value,
        }, {default: () => node})
      })
    }
  },
})

const TriggerBinder = defineComponent({
  name: 'TriggerBinder',
  inheritAttrs: false,
  props: {
    triggerProps: {type: Object, required: true},
    triggerRef: {type: Object, required: true},
    triggerId: {type: String, required: true},
  },
  setup(props, {slots}) {
    provide(OverlayTriggerButtonKey, props.triggerProps as {
      onPress?: () => void
      'aria-expanded'?: boolean
      'aria-haspopup'?: boolean | string
      'aria-controls'?: string
    })

    return () => {
      const child = slots.default?.()?.[0]
      if (!child) return null
      const extra: Record<string, unknown> = {
        id: props.triggerId,
        'aria-expanded': (props.triggerProps as {['aria-expanded']?: boolean})['aria-expanded'],
        'aria-haspopup': (props.triggerProps as {['aria-haspopup']?: unknown})['aria-haspopup'],
        'aria-controls': (props.triggerProps as {['aria-controls']?: string})['aria-controls'],
        ref: (el: unknown) => assignElRef(props.triggerRef as {value: Element | null}, el),
      }
      if (typeof child.type === 'string') {
        extra.onClick = () => (props.triggerProps as {onPress?: () => void}).onPress?.()
      }
      // Drop undefined so they are not set as string "undefined"
      for (const key of Object.keys(extra)) {
        if (extra[key] === undefined) delete extra[key]
      }
      return cloneVNode(child, extra)
    }
  },
})

export const Dialog = defineComponent({
  name: 'Dialog',
  inheritAttrs: false,
  props: {
    role: {type: String as PropType<'dialog' | 'alertdialog'>, default: 'dialog'},
    'aria-label': {type: String, default: undefined},
    ariaLabel: {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    ariaLabelledby: {type: String, default: undefined},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const overlayFromTrigger = inject(DialogOverlayPropsKey, null)
    const state = inject(OverlayTriggerStateKey, null)
    const inModal = inject(InModalKey, false)
    const dialogRef = ref<HTMLElement | null>(null)

    const {dialogProps, titleProps} = useDialog(
      {
        role: () => props.role,
        'aria-label': () =>
          props.ariaLabel ??
          props['aria-label'] ??
          (attrs['aria-label'] as string | undefined) ??
          (attrs.ariaLabel as string | undefined),
        'aria-labelledby': () => props.ariaLabelledby ?? props['aria-labelledby'],
      },
      dialogRef,
    )

    provide(DialogTitlePropsKey, titleProps)
    provide(ButtonCloseKey, () => state?.close())

    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'dialog',
    )
    const ariaLabel = computed(
      () =>
        props.ariaLabel ??
        props['aria-label'] ??
        (attrs['aria-label'] as string | undefined) ??
        (attrs.ariaLabel as string | undefined),
    )

    return () => {
      const labelledby = ariaLabel.value
        ? dialogProps['aria-labelledby']
        : (dialogProps['aria-labelledby'] || overlayFromTrigger?.['aria-labelledby'])
      const close = () => state?.close()
      const children = [
        slots.default?.({close}),
        slots.title?.({close}),
        slots.close?.({close}),
      ]
      return h(
        'section',
        mergeProps(
          attrs,
          overlayFromTrigger ? {id: overlayFromTrigger.id} : {},
          dialogProps,
          ariaLabel.value ? {'aria-label': ariaLabel.value} : {},
          labelledby && !ariaLabel.value ? {'aria-labelledby': labelledby} : {},
          inModal ? {'aria-modal': 'true'} : {},
          toHeroDataAttrs({slot: dataSlot.value}),
          {ref: dialogRef},
        ),
        children,
      )
    }
  },
})
