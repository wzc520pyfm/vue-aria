import {computed, defineComponent, h, provide, inject, type PropType} from 'vue'
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
    const parentContext = inject(CollectionContextKey, null)
    const items = computed(() => (props.items ?? parentContext?.items.value) as unknown[] | undefined)
    const dependencies = computed(() => [...(parentContext?.dependencies.value ?? []), ...(props.dependencies ?? [])])
    provide(CollectionContextKey, {items, dependencies})
    return () => {
      // Read dependencies so a dependencies-only change re-invokes the scoped slot
      // even when `items` identity is unchanged.
      dependencies.value
      const slot = slots.default as any
      if (!Array.isArray(props.items)) {
        // static children: render the default slot as-is
        return slot?.() ?? []
      }
      const out: any[] = []
      for (const item of props.items) {
        const result = slot?.({item})
        if (result == null) continue
        if (Array.isArray(result)) out.push(...result)
        else out.push(result)
      }
      return out
    }
  },
})
