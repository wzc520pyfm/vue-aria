import {computed, defineComponent, h, inject, onMounted, ref, type PropType} from 'vue'
import {mergeProps, useButton, type PressEvent} from 'vue-aria'
import {ButtonCloseKey, ButtonContextKey, OverlayTriggerButtonKey} from './context'

export type ButtonType = 'button' | 'submit' | 'reset'

/**
 * Render-prop state for `Button`, aligned with official `ButtonRenderProps`
 * at the pinned react-aria-components revision. Fields match the interaction
 * state this component already exposes; the component implementation is unchanged.
 */
export interface ButtonRenderProps {
  /** Whether the button is currently hovered with a mouse. @selector [data-hovered] */
  isHovered: boolean
  /** Whether the button is currently in a pressed state. @selector [data-pressed] */
  isPressed: boolean
  /** Whether the button is focused, either via a mouse or keyboard. @selector [data-focused] */
  isFocused: boolean
  /** Whether the button is keyboard focused. @selector [data-focus-visible] */
  isFocusVisible: boolean
  /** Whether the button is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the button is currently in a pending state. @selector [data-pending] */
  isPending: boolean
}

/**
 * Props accepted by the Vue `Button`. Companion type for the Disclosure entry.
 * Does not add link (`href`) behavior this component does not implement.
 */
export interface ButtonProps {
  isDisabled?: boolean
  isPending?: boolean
  type?: ButtonType
  elementType?: string
  autoFocus?: boolean
  slot?: string | null
  'data-slot'?: string
  dataSlot?: string
  class?: any
  style?: any
  onPress?: (event: PressEvent) => void
  onPressStart?: (event: PressEvent) => void
  onPressEnd?: (event: PressEvent) => void
  onPressUp?: (event: PressEvent) => void
  onPressChange?: (isPressed: boolean) => void
  onClick?: (event: MouseEvent) => void
}

export const Button = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  props: {
    isDisabled: {type: Boolean, default: undefined},
    isPending: {type: Boolean, default: false},
    type: {type: String as PropType<ButtonType>, default: 'button'},
    elementType: {type: String, default: 'button'},
    autoFocus: {type: Boolean, default: undefined},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
    /** Official RAC slot name. When set to `"close"` inside a Dialog, pressing closes the overlay. */
    slot: {type: [String, null] as PropType<string | null | undefined>, default: undefined},
  },
  emits: {
    press: (_event: PressEvent) => true,
    pressstart: (_event: PressEvent) => true,
    pressend: (_event: PressEvent) => true,
    pressup: (_event: PressEvent) => true,
    presschange: (_isPressed: boolean) => true,
    click: (_event: MouseEvent) => true,
  },
  setup(props, {slots, emit, attrs}) {
    const close = inject(ButtonCloseKey, null)
    const trigger = inject(OverlayTriggerButtonKey, null)
    const buttonCtx = inject(ButtonContextKey, null) as any

    const internalRef = ref<HTMLElement | null>(null)

    const slotName = computed(() => {
      // Explicit null opts out (clear-button pattern).
      if (props.slot === null) return null
      if (props.slot !== undefined) return props.slot
      const a = (attrs as any).slot
      return a === null ? null : (a as string | undefined)
    })
    const optsOut = computed(() => slotName.value === null)

    // Descriptor-preserving copy of the flat (trigger + button) context: accessors
    // stay live getters instead of being snapshotted at setup time. Plain values
    // are copied as-is, so existing contexts behave exactly as before.
    const flatCtx = (): Record<string, any> => {
      if (optsOut.value) return {}
      const flat: Record<string, any> = {}
      for (const source of [trigger, buttonCtx]) {
        if (!source) continue
        for (const key of Object.keys(source)) {
          if (key === 'slots') continue
          Object.defineProperty(
            flat,
            key,
            Object.getOwnPropertyDescriptor(source, key) ?? {value: (source as any)[key], enumerable: true},
          )
        }
      }
      return flat
    }

    // Note: evaluated per read (not a cached computed) so accessor keys in a
    // flat context (e.g. a clear button's live `isDisabled`) stay reactive.
    const activeCtx = (): Record<string, any> => {
      if (optsOut.value) return {}
      const name = slotName.value
      if (name && buttonCtx?.slots && buttonCtx.slots[name]) {
        return buttonCtx.slots[name]
      }
      // Flat context (trigger + button ctx) for existing consumers.
      return flatCtx()
    }

    const isDisabled = computed(() => {
      if (props.isDisabled != null) return props.isDisabled
      if (!optsOut.value && activeCtx().isDisabled != null) return !!activeCtx().isDisabled
      return false
    })

    const dataSlot = computed(() => {
      const fromProps = props['data-slot'] ?? props.dataSlot
      const fromAttrs = (attrs['data-slot'] ?? attrs.dataSlot) as string | undefined
      return fromProps || fromAttrs || slotName.value || 'button'
    })

    const setRefs = (el: any) => {
      internalRef.value = el
      if (!optsOut.value) {
        const r = activeCtx().ref
        if (typeof r === 'function') r(el)
        else if (r && typeof r === 'object' && 'value' in r) r.value = el
      }
    }

    onMounted(() => {
      if (optsOut.value) return
      const autoFocus = props.autoFocus ?? activeCtx().autoFocus
      if (autoFocus && internalRef.value && typeof (internalRef.value as any).focus === 'function') {
        try { (internalRef.value as any).focus() } catch {}
      }
    })

    const {buttonProps} = useButton({
      isDisabled: () => isDisabled.value,
      isPending: () => props.isPending,
      type: () => props.type,
      elementType: () => props.elementType,
      'data-slot': () => dataSlot.value,
      'aria-expanded': () => optsOut.value ? undefined : activeCtx()['aria-expanded'],
      'aria-haspopup': () => optsOut.value ? undefined : activeCtx()['aria-haspopup'],
      'aria-controls': () => optsOut.value ? undefined : activeCtx()['aria-controls'],
      'aria-label': () => optsOut.value ? undefined : activeCtx()['aria-label'],
      'aria-labelledby': () => optsOut.value ? undefined : activeCtx()['aria-labelledby'],
      preventFocusOnPress: () => optsOut.value ? undefined : activeCtx().preventFocusOnPress,
      excludeFromTabOrder: () => optsOut.value ? undefined : activeCtx().excludeFromTabOrder,
      onPress: (event) => {
        emit('press', event)
        if (!optsOut.value) {
          activeCtx().onPress?.(event)
        }
        if (slotName.value === 'close') close?.()
      },
      onPressStart: (event) => { if (!optsOut.value) activeCtx().onPressStart?.(event); emit('pressstart', event) },
      onPressEnd: (event) => { if (!optsOut.value) activeCtx().onPressEnd?.(event); emit('pressend', event) },
      onPressUp: (event) => { if (!optsOut.value) activeCtx().onPressUp?.(event); emit('pressup', event) },
      onPressChange: (isPressed) => { if (!optsOut.value) activeCtx().onPressChange?.(isPressed); emit('presschange', isPressed) },
      onClick: (event) => { if (!optsOut.value) activeCtx().onClick?.(event); emit('click', event) },
    })

    return () => {
      const ctx = optsOut.value ? {} : activeCtx()
      // Event handlers from context run before press handlers (official order:
      // context/DOMProps first, then useButton press props), so handlers like
      // useMenuTrigger's onKeyDown see the event before press preventDefaults it.
      const domFirst: Record<string, any> = {
        onKeyDown: ctx.onKeyDown ?? ctx.onKeydown,
        onKeydown: ctx.onKeydown ?? ctx.onKeyDown,
        onKeyUp: ctx.onKeyUp ?? ctx.onKeyup,
        onKeyup: ctx.onKeyup ?? ctx.onKeyUp,
        onPointerDown: ctx.onPointerDown ?? ctx.onPointerdown,
        onPointerdown: ctx.onPointerdown ?? ctx.onPointerDown,
        onFocus: ctx.onFocus ?? (ctx.onFocusChange ? (e: any) => ctx.onFocusChange(true, e) : undefined),
        onBlur: ctx.onBlur ?? (ctx.onFocusChange ? (e: any) => ctx.onFocusChange(false, e) : undefined),
      }
      const dom: Record<string, any> = {
        id: ctx.id,
        ref: setRefs,
        'aria-labelledby': ctx['aria-labelledby'],
        'aria-describedby': ctx['aria-describedby'],
        'aria-expanded': ctx['aria-expanded'] ?? buttonProps.value['aria-expanded'],
        'aria-haspopup': ctx['aria-haspopup'] ?? buttonProps.value['aria-haspopup'],
        'aria-controls': ctx['aria-controls'] ?? buttonProps.value['aria-controls'],
      }
      const isOpenPressed = !optsOut.value && !!ctx.isPressed
      return h(
        props.elementType || 'button',
        mergeProps(attrs, domFirst, buttonProps.value, dom, {
          'data-slot': dataSlot.value,
          'data-pressed': (buttonProps.value['data-pressed'] || isOpenPressed) ? 'true' : undefined,
          ...(optsOut.value ? {slot: null} : {}),
        }),
        slots.default?.(),
      )
    }
  },
})
