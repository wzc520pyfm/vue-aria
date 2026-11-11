import {computed, defineComponent, h, type PropType} from 'vue'
import {mergeProps, useButton, type PressEvent} from 'vue-aria'

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
    const dataSlot = computed(() => {
      const fromProps = props['data-slot'] ?? props.dataSlot
      const fromAttrs = (attrs['data-slot'] ?? attrs.dataSlot) as string | undefined
      return fromProps || fromAttrs || 'button'
    })

    const {buttonProps} = useButton({
      isDisabled: () => props.isDisabled,
      isPending: () => props.isPending,
      type: () => props.type,
      elementType: () => props.elementType,
      'data-slot': () => dataSlot.value,
      onPress: (event) => emit('press', event),
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
