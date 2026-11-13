/*
 * Port of `react-aria@3.53.1` visually-hidden
 * (`packages/react-aria/src/visually-hidden/VisuallyHidden.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted to Vue.
 */

import {computed, defineComponent, h, mergeProps, ref, type CSSProperties} from 'vue'
import {useFocusWithin} from '../interactions/useFocusWithin'

const styles: CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  width: '1px',
  whiteSpace: 'nowrap',
}

export interface VisuallyHiddenProps {
  elementType?: string
  isFocusable?: boolean
  style?: CSSProperties | Record<string, any>
}

export interface VisuallyHiddenAria {
  visuallyHiddenProps: {value: Record<string, any>}
}

export function useVisuallyHidden(props: VisuallyHiddenProps = {}): VisuallyHiddenAria {
  const isFocused = ref(false)
  const {focusWithinProps} = useFocusWithin({
    isDisabled: () => !props.isFocusable,
    onFocusWithinChange: (val: boolean) => {
      isFocused.value = val
    },
  })

  const combinedStyles = computed(() => {
    if (isFocused.value) {
      return props.style
    }
    if (props.style) {
      return {...styles, ...props.style}
    }
    return styles
  })

  return {
    visuallyHiddenProps: computed(() => ({
      ...(focusWithinProps as any),
      style: combinedStyles.value,
    })),
  }
}

export const VisuallyHidden = defineComponent({
  name: 'VisuallyHidden',
  inheritAttrs: false,
  props: {
    elementType: {type: String, default: 'div'},
    isFocusable: {type: Boolean, default: false},
  },
  setup(props, {slots, attrs}) {
    const {visuallyHiddenProps} = useVisuallyHidden(props)
    return () =>
      h(
        props.elementType || 'div',
        mergeProps(attrs, visuallyHiddenProps.value),
        slots.default?.(),
      )
  },
})
