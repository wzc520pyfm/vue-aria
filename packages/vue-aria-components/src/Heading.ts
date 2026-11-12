import {computed, defineComponent, h, inject, type PropType} from 'vue'
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
  },
  setup(props, {slots, attrs}) {
    const titleProps = inject(DialogTitlePropsKey, null)
    const isTitle = computed(() => (props.slot ?? (attrs.slot as string | undefined)) === 'title')
    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'heading',
    )

    return () => {
      const level = props.level ?? 3
      const tag = `h${level}`
      const title = isTitle.value && titleProps ? {...titleProps} : {}
      return h(
        tag,
        mergeProps(attrs, title, toHeroDataAttrs({slot: dataSlot.value})),
        slots.default?.(),
      )
    }
  },
})
