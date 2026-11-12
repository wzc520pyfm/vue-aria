import {computed, defineComponent, h, inject, onBeforeUnmount, watch, type PropType} from 'vue'
import {mergeProps, toHeroDataAttrs} from 'vue-aria'
import {DialogTitlePropsKey} from './context'

export const Heading = defineComponent({
  name: 'Heading',
  inheritAttrs: false,
  props: {
    level: {type: Number as PropType<1 | 2 | 3 | 4 | 5 | 6>, default: 3},
    /**
     * Official RAC slot name. When set to `"title"`, wires the heading id to
     * the parent Dialog's `aria-labelledby`.
     */
    slot: {type: String, default: undefined},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
    id: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const titleContext = inject(DialogTitlePropsKey, null)
    const isTitle = computed(() => (props.slot ?? (attrs.slot as string | undefined)) === 'title')
    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'heading',
    )

    // Prefer an explicit caller id (SHOULD-FIX: generated titleProps.id used to
    // overwrite it via mergeProps(attrs, title)). Keep Dialog labelledby in sync.
    const resolvedTitleId = computed(() => {
      if (!isTitle.value || !titleContext) return undefined
      return props.id ?? (attrs.id as string | undefined) ?? titleContext.id
    })

    let unregister: (() => void) | undefined
    watch(
      resolvedTitleId,
      (id) => {
        unregister?.()
        unregister = undefined
        if (id && titleContext) {
          unregister = titleContext.registerTitle(id)
        }
      },
      {immediate: true},
    )
    onBeforeUnmount(() => {
      unregister?.()
      unregister = undefined
    })

    return () => {
      const level = props.level ?? 3
      const tag = `h${level}`
      // Caller attrs (including id) win over the generated title id.
      const title = isTitle.value && resolvedTitleId.value ? {id: resolvedTitleId.value} : {}
      return h(
        tag,
        mergeProps(title, attrs, toHeroDataAttrs({slot: dataSlot.value})),
        slots.default?.(),
      )
    }
  },
})
