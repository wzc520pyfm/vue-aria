import {defineComponent, h, inject} from 'vue'
import {ListBoxItemContextKey} from './context'

export interface TextProps {
  elementType?: string
  slot?: string
  id?: string
  'data-slot'?: string
}

export const Text = defineComponent({
  name: 'Text',
  inheritAttrs: false,
  props: {
    elementType: {type: String, default: 'span'},
    slot: {type: String, default: undefined},
    id: {type: String, default: undefined},
    'data-slot': {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const itemCtx = inject(ListBoxItemContextKey, null)
    return () => {
      const slotName = (props.slot ?? (props as any)['data-slot'] ?? (attrs as any)['data-slot'] ?? (attrs as any).slot) as string | undefined
      let id = props.id
      if (!id && slotName === 'label') id = itemCtx?.labelProps?.id
      if (!id && slotName === 'description') id = itemCtx?.descriptionProps?.id
      return h(
        props.elementType || 'span',
        {
          ...attrs,
          class: ['react-aria-Text', (attrs as any).class].filter(Boolean),
          ...(id ? {id} : {}),
          ...(slotName ? {'data-slot': slotName, slot: slotName} : {}),
        },
        slots.default?.(),
      )
    }
  },
})
