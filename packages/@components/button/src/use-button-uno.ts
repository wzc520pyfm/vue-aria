import {type MaybeRef, computed, reactive, toRefs} from 'vue'
import type {ButtonProps} from './button'

export interface UseButtonUno
  extends Pick<
    ButtonProps,
    'size' | 'color' | 'radius' | 'isDisabled' | 'fullWidth' | 'disableAnimation'
  > {}

type PropMaybeRef<T> =
  | {
      [P in keyof T]?: MaybeRef<T[P]>
    }
  | T

/**
 * Get the uno class of button
 * @param props - Component props or refs
 * @todo - support getter
 */
export function useButtonUno(props: PropMaybeRef<UseButtonUno>) {
  const {size, color, radius, isDisabled, fullWidth, disableAnimation} = toRefs(reactive(props))

  return {
    buttonCls: computed(() => [
      'btn', // base
      `btn-${size?.value}`, // size
      `btn-${color?.value}`, // color
      `btn-rounded-${radius?.value}`, // radius
      {'btn-full': fullWidth?.value}, // fullWidth
      {'btn-disabled': isDisabled?.value}, // disabled
      {'btn-animation': !disableAnimation?.value},
      {'non-animation': disableAnimation?.value},
    ]),
  }
}
