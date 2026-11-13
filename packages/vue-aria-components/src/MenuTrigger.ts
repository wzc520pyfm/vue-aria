import {defineComponent, h, inject, provide, ref, watch, watchEffect, type PropType} from 'vue'
import {useMenuTrigger} from 'vue-aria/useMenu'
import {useMenuTriggerState} from 'vue-stately/useMenuTriggerState'
import {useId} from 'vue-aria/useId'
import {
  MenuContextKey,
  OverlayTriggerButtonKey,
  OverlayTriggerStateKey,
  PopoverContextKey,
  RootMenuTriggerStateContextKey,
  TriggerRefKey,
  OVERLAY_COMPONENT_NAMES,
} from './context'

function flatten(nodes: any[] | undefined): any[] {
  if (!nodes) return []
  const out: any[] = []
  for (const node of nodes) {
    if (!node) continue
    if (Array.isArray(node.children) && (node.type as any) === Symbol.for('v-fgt')) {
      out.push(...flatten(node.children as any[]))
    } else {
      out.push(node)
    }
  }
  return out
}

function isOverlayVNode(node: any) {
  const name = typeof node.type === 'object' && node.type && 'name' in node.type ? (node.type as {name?: string}).name : undefined
  return Boolean(name && OVERLAY_COMPONENT_NAMES.has(name))
}

function assignElRef(target: {value: Element | null}, el: unknown) {
  const node = (el as { $el?: Element } | Element | null | undefined)
  target.value = (node && typeof node === 'object' && '$el' in node ? node.$el : node) as Element | null
}

const TriggerBinder = defineComponent({
  name: 'MenuTriggerBinder',
  inheritAttrs: false,
  props: {
    triggerProps: {type: Object, required: true},
    triggerRef: {type: Object, required: true},
    triggerId: {type: String, default: undefined},
  },
  setup(props, {slots}) {
    provide(OverlayTriggerButtonKey, props.triggerProps as any)
    return () => {
      const child = slots.default?.()?.[0]
      if (!child) return null
      const extra: Record<string, any> = {
        id: props.triggerId,
        'aria-expanded': (props.triggerProps as any)['aria-expanded'],
        'aria-haspopup': (props.triggerProps as any)['aria-haspopup'],
        'aria-controls': (props.triggerProps as any)['aria-controls'],
        ref: (el: unknown) => assignElRef(props.triggerRef as {value: Element | null}, el),
        onKeydown: (props.triggerProps as any).onKeyDown,
        onKeyDown: (props.triggerProps as any).onKeyDown,
        onPointerdown: (props.triggerProps as any).onPointerDown,
        onPointerDown: (props.triggerProps as any).onPointerDown,
      }
      // for native elements, ensure click/press path
      if (typeof child.type === 'string') {
        extra.onClick = (e: any) => {
          ;(props.triggerProps as any).onPress?.(e)
        }
      }
      for (const key of Object.keys(extra)) {
        if (extra[key] === undefined) delete extra[key]
      }
      return h(child, extra)
    }
  },
})

export interface MenuTriggerProps {
  isOpen?: boolean
  defaultOpen?: boolean
  isDisabled?: boolean
  trigger?: 'press' | 'longPress' | 'contextMenu'
}

export const MenuTrigger = defineComponent({
  name: 'MenuTrigger',
  inheritAttrs: false,
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    isDisabled: {type: Boolean, default: false},
    trigger: {type: String as PropType<'press' | 'longPress' | 'contextMenu'>, default: 'press'},
  },
  emits: {
    openchange: (_isOpen: boolean) => true,
  },
  setup(props, {slots, emit}) {
    const state = useMenuTriggerState({
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      onOpenChange: (isOpen) => emit('openchange', isOpen),
    })
    const triggerRef = ref<Element | null>(null)
    const {menuTriggerProps, menuProps} = useMenuTrigger(
      {type: 'menu', isDisabled: props.isDisabled, trigger: props.trigger},
      state,
      triggerRef,
    )
    const triggerId = (menuTriggerProps as any).id

    provide(MenuContextKey, menuProps)
    provide(OverlayTriggerStateKey, state)
    provide(RootMenuTriggerStateContextKey, state)
    provide(TriggerRefKey, triggerRef)
    provide(PopoverContextKey, {
      triggerRef,
      trigger: 'MenuTrigger',
      placement: 'bottom start',
      id: menuProps.id,
      'aria-labelledby': menuProps['aria-labelledby'],
    })

    watchEffect(() => {
      const el = triggerRef.value as HTMLElement | null
      if (!el) return
      const isOpen = state.isOpen.value
      const haspopup = (menuTriggerProps as any)['aria-haspopup'] ?? true
      const controls = isOpen ? ((menuTriggerProps as any)['aria-controls'] ?? (menuProps as any).id) : null
      if (triggerId) el.id = triggerId
      el.setAttribute('aria-expanded', String(isOpen))
      if (haspopup != null) el.setAttribute('aria-haspopup', String(haspopup))
      if (controls) el.setAttribute('aria-controls', String(controls))
      else el.removeAttribute('aria-controls')
    })

    return () => {
      const children = flatten(slots.default?.({isOpen: state.isOpen.value, close: state.close}) as any[] | undefined)
      let assigned = false
      return children.map((node) => {
        if (assigned || isOverlayVNode(node) || typeof node.type === 'symbol') {
          return node
        }
        assigned = true
        ;(menuTriggerProps as any).id = triggerId.value
        return h(TriggerBinder, {
          triggerProps: menuTriggerProps,
          triggerRef,
          triggerId: triggerId.value,
        }, {default: () => node})
      })
    }
  },
})
