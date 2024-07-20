import {computed, toValue} from 'vue'
import type {MaybeRefOrGetter} from 'vue'
import type {IconProps} from './icon'

export interface UseIconUno extends Pick<IconProps, 'size' | 'color'> {}

type PropMaybeRefOrGetter<T> = {
  [P in keyof T]?: MaybeRefOrGetter<T[P]>
}

/**
 * Get the uno class of button
 * @param props - Component props or refs
 */
export function useIconUno(props: PropMaybeRefOrGetter<UseIconUno> = {}) {
  const {size, color} = props

  return {
    iconCls: computed(() => [
      'icon', // base
      {[`icon-${toValue(size)}`]: toValue(size)}, // size
      {[`icon-${toValue(color)}`]: toValue(color)}, // color
    ]),
  }
}
