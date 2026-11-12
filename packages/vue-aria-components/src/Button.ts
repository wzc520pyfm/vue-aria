import {computed, defineComponent, h, inject, type PropType} from 'vue'
import {mergeProps, useButton, type PressEvent} from 'vue-aria'
import {ButtonCloseKey, OverlayTriggerButtonKey} from './context'

export type ButtonType = 'button' | 'submit' | 'reset'

export const Button = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  props: {
    isDisabled: {type: Boolean, default: false},
    isPending: {type: Boolean, default: false},
    type: {type: String as PropType<ButtonType>, default: 'button'},
    elementType: {type: String, default: 'button'},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
    /**
     * Official RAC slot name. When set to `"close"` inside a Dialog, pressing
     * the button closes the overlay.
     */
    slot: {type: String, default: undefined},
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

    const dataSlot = computed(() => {
      const fromProps = props['data-slot'] ?? props.dataSlot
      const fromAttrs = (attrs['data-slot'] ?? attrs.dataSlot) as string | undefined
      return fromProps || fromAttrs || 'button'
    })

    const slotName = computed(() => props.slot ?? (attrs.slot as string | undefined))

    const {buttonProps} = useButton({
      isDisabled: () => props.isDisabled,
      isPending: () => props.isPending,
      type: () => props.type,
      elementType: () => props.elementType,
      'data-slot': () => dataSlot.value,
      'aria-expanded': () => trigger?.['aria-expanded'],
      'aria-haspopup': () => trigger?.['aria-haspopup'] as string | boolean | undefined,
      'aria-controls': () => trigger?.['aria-controls'],
      onPress: (event) => {
        emit('press', event)
        trigger?.onPress?.()
        if (slotName.value === 'close') {
          close?.()
        }
      },
      onPressStart: (event) => emit('pressstart', event),
      onPressEnd: (event) => emit('pressend', event),
      onPressUp: (event) => emit('pressup', event),
      onPressChange: (isPressed) => emit('presschange', isPressed),
      onClick: (event) => emit('click', event),
    })

    return () =>
      h(
        props.elementType || 'button',
        mergeProps(attrs, buttonProps.value, {'data-slot': dataSlot.value}),
        slots.default?.(),
      )
  },
})
