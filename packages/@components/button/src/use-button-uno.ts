import {computed, toValue} from 'vue'
import type {MaybeRefOrGetter} from 'vue'
import type {ButtonProps} from './button'

export interface UseButtonUno
  extends Pick<
    ButtonProps,
    'size' | 'color' | 'radius' | 'isDisabled' | 'fullWidth' | 'disableAnimation'
  > {}

type PropMaybeRefOrGetter<T> = {
  [P in keyof T]?: MaybeRefOrGetter<T[P]>
}

/**
 * Get the uno class of button
 * @param props - Component props or refs
 * @todo - support getter
 */
export function useButtonUno(props: PropMaybeRefOrGetter<UseButtonUno> = {}) {
  const {size, color, radius, isDisabled, fullWidth, disableAnimation} = props

  return {
    buttonCls: computed(() => [
      'btn', // base
      `btn-${toValue(size)}`, // size
      `btn-${toValue(color)}`, // color
      `btn-rounded-${toValue(radius)}`, // radius
      {'btn-full': toValue(fullWidth)}, // fullWidth
      {'btn-disabled': toValue(isDisabled)}, // disabled
      {'btn-animation': !toValue(disableAnimation)},
      {'non-animation': toValue(disableAnimation)},
    ]),
  }
}
