import {computed, defineComponent, h, inject, mergeProps as vueMergeProps, onMounted, ref, toRef, type PropType} from 'vue'
import {mergeProps, useButton, type PressEvent} from 'vue-aria'
import {ButtonCloseKey, ButtonContextKey, OverlayTriggerButtonKey} from './context'

export type ButtonType = 'button' | 'submit' | 'reset'

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

    const mergedCtx = computed<Record<string, any>>(() => {
      if (optsOut.value) return {}
      return {...(trigger || {}), ...(buttonCtx || {})}
    })

    const isDisabled = computed(() => {
      if (props.isDisabled != null) return props.isDisabled
      if (!optsOut.value && mergedCtx.value.isDisabled != null) return !!mergedCtx.value.isDisabled
      return false
    })

    const dataSlot = computed(() => {
      const fromProps = props['data-slot'] ?? props.dataSlot
      const fromAttrs = (attrs['data-slot'] ?? attrs.dataSlot) as string | undefined
      return fromProps || fromAttrs || 'button'
    })

    const setRefs = (el: any) => {
      internalRef.value = el
      if (!optsOut.value) {
        const r = mergedCtx.value.ref
        if (typeof r === 'function') r(el)
        else if (r && typeof r === 'object' && 'value' in r) r.value = el
      }
    }

    onMounted(() => {
      if (optsOut.value) return
      const autoFocus = props.autoFocus ?? mergedCtx.value.autoFocus
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
      'aria-expanded': () => optsOut.value ? undefined : (mergedCtx.value['aria-expanded'] ?? trigger?.['aria-expanded']),
      'aria-haspopup': () => optsOut.value ? undefined : (mergedCtx.value['aria-haspopup'] ?? trigger?.['aria-haspopup'] as any),
      'aria-controls': () => optsOut.value ? undefined : (mergedCtx.value['aria-controls'] ?? trigger?.['aria-controls']),
      'aria-label': () => optsOut.value ? undefined : mergedCtx.value['aria-label'],
      'aria-labelledby': () => optsOut.value ? undefined : mergedCtx.value['aria-labelledby'],
      preventFocusOnPress: () => optsOut.value ? undefined : mergedCtx.value.preventFocusOnPress,
      excludeFromTabOrder: () => optsOut.value ? undefined : mergedCtx.value.excludeFromTabOrder,
      onPress: (event) => {
        emit('press', event)
        if (!optsOut.value) {
          const onPress = mergedCtx.value.onPress ?? trigger?.onPress
          onPress?.(event)
        }
        if (slotName.value === 'close') close?.()
      },
      onPressStart: (event) => { if (!optsOut.value) mergedCtx.value.onPressStart?.(event); emit('pressstart', event) },
      onPressEnd: (event) => { if (!optsOut.value) mergedCtx.value.onPressEnd?.(event); emit('pressend', event) },
      onPressUp: (event) => { if (!optsOut.value) mergedCtx.value.onPressUp?.(event); emit('pressup', event) },
      onPressChange: (isPressed) => { if (!optsOut.value) mergedCtx.value.onPressChange?.(isPressed); emit('presschange', isPressed) },
      onClick: (event) => { if (!optsOut.value) mergedCtx.value.onClick?.(event); emit('click', event) },
    })

    return () => {
      const ctx = optsOut.value ? {} : mergedCtx.value
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
        onFocus: ctx.onFocus,
        onBlur: ctx.onBlur,
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
