import {defineComponent, h, inject, type PropType} from 'vue'
import {LabelContextKey} from './context'

export interface LabelProps {
  elementType?: string
  slot?: string
}

export const Label = defineComponent({
  name: 'Label',
  inheritAttrs: false,
  props: {
    elementType: {type: String, default: undefined},
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject(LabelContextKey, undefined) as Record<string, any> | undefined
    return () => {
      const elementType = props.elementType ?? (ctx?.elementType as string | undefined) ?? 'label'
      const domProps = {
        class: ['react-aria-Label', (attrs as any).class].filter(Boolean),
        ...(ctx?.id ? {id: ctx.id} : {}),
        ...(ctx?.htmlFor && elementType === 'label' ? {for: ctx.htmlFor, htmlFor: ctx.htmlFor} : {}),
        ...(ctx?.onClick ? {onClick: ctx.onClick} : {}),
        ...(ctx?.ref ? {ref: ctx.ref} : {}),
        ...attrs,
      }
      // elementType from context/props wins over attrs? we already set.
      return h(elementType, domProps, slots.default?.())
    }
  },
})

export {LabelContextKey as LabelContext}
