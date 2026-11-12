import {computed, defineComponent, h, inject} from 'vue'
import {mergeProps, toHeroDataAttrs, usePlacement} from 'vue-aria'
import {OverlayArrowContextKey} from './context'

export const OverlayArrow = defineComponent({
  name: 'OverlayArrow',
  inheritAttrs: false,
  props: {
    placement: {type: String, default: undefined},
    'data-slot': {type: String, default: undefined},
    dataSlot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject(OverlayArrowContextKey, null)
    const placement = computed(
      () => props.placement ?? ctx?.placement.value ?? undefined,
    )
    const {placementAttrs} = usePlacement({placement: () => placement.value})
    const dataSlot = computed(
      () => props['data-slot'] ?? props.dataSlot ?? (attrs['data-slot'] as string | undefined) ?? 'overlay-arrow',
    )

    return () =>
      h(
        'div',
        mergeProps(
          attrs,
          placementAttrs.value,
          toHeroDataAttrs({slot: dataSlot.value}),
        ),
        slots.default?.({placement: placement.value}),
      )
  },
})
