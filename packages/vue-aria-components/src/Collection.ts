import {defineComponent, h, provide, type PropType} from 'vue'
import {CollectionContextKey} from './context'

export interface CollectionProps {
  items?: unknown[]
  dependencies?: unknown[]
}

export const Collection = defineComponent({
  name: 'Collection',
  props: {
    items: {type: Array as PropType<unknown[]>, default: undefined},
    dependencies: {type: Array as PropType<unknown[]>, default: undefined},
  },
  setup(props, {slots}) {
    provide(CollectionContextKey, {items: props.items as any, dependencies: props.dependencies as any})
    return () => slots.default?.()
  },
})
