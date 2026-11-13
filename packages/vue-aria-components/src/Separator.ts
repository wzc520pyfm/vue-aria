import {computed, defineComponent, h, inject, type PropType} from 'vue'
import {useSeparator} from 'vue-aria/useSeparator'
import {SeparatorContextKey} from './context'

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  elementType?: string
}

export const Separator = defineComponent({
  name: 'Separator',
  inheritAttrs: false,
  props: {
    orientation: {type: String as PropType<'horizontal' | 'vertical'>, default: undefined},
    elementType: {type: String, default: undefined},
  },
  setup(props, {attrs}) {
    const ctx = inject(SeparatorContextKey, undefined)
    const elementType = computed(() => props.elementType ?? ctx?.elementType ?? 'hr')
    const orientation = computed(() => props.orientation ?? 'horizontal')

    return () => {
      let Element: any = elementType.value
      if (Element === 'hr' && orientation.value === 'vertical') {
        Element = 'div'
      }
      const {separatorProps} = useSeparator({
        orientation: orientation.value,
        elementType: Element,
      })
      return h(Element, {
        ...attrs,
        ...separatorProps,
        class: ['react-aria-Separator', (attrs as any).class].filter(Boolean),
      })
    }
  },
})
