import {defineComponent, h, type PropType} from 'vue'

/**
 * Internal host element for a future vue-aria behavior adapter.
 * Renders a native element (default `div`). When `as` is `"button"`,
 * `type` defaults to `"button"`. Reka `asChild` / `data-state` are not
 * part of this public contract.
 */
export const BehaviorElement = defineComponent({
  name: 'BehaviorElement',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<string | object>,
      default: 'div',
    },
    type: {
      type: String,
      default: undefined,
    },
  },
  setup(props, {attrs, slots}) {
    return () => {
      const as = props.as ?? 'div'
      const type = as === 'button' ? (props.type ?? 'button') : props.type
      return h(as as string, {...attrs, ...(type ? {type} : {})}, slots)
    }
  },
})
