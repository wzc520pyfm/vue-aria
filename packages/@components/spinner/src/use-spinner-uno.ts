import {computed, toValue} from 'vue'
import {toClassName} from '@nev-ui/utilities-vue'
import type {MaybeRefOrGetter} from 'vue'
import type {SpinnerProps} from './spinner'

export interface UseSpinnerUno
  extends Pick<SpinnerProps, 'size' | 'color' | 'labelColor' | 'classNames'> {}

type PropMaybeRefOrGetter<T> = {
  [P in keyof T]?: MaybeRefOrGetter<T[P]>
}

/**
 * Get the uno class of spinner
 * @param props - Component props or refs
 */
export function useSpinnerUno(props: PropMaybeRefOrGetter<UseSpinnerUno> = {}) {
  const {size, color, labelColor, classNames: classNamesProps} = props

  return {
    spinnerCls: computed(() => [
      'spinner', // base
    ]),
    // allow user override
    classNames: computed(() => ({
      spinner: [...toClassName(toValue(classNamesProps)?.spinner)],
      wrapper: ['spinner-wrapper', ...toClassName(toValue(classNamesProps)?.wrapper)],
      circleWrapper: [
        'spinner-circle-wrapper',
        `spinner-circle-wrapper-${toValue(size)}`,
        ...toClassName(toValue(classNamesProps)?.circleWrapper),
      ],
      circle1: [
        'spinner-circle1',
        `spinner-circle1-${toValue(size)}`,
        `spinner-circle1-${toValue(color)}`,
        ...toClassName(toValue(classNamesProps)?.circle1),
      ],
      circle2: [
        'spinner-circle2',
        `spinner-circle2-${toValue(size)}`,
        `spinner-circle2-${toValue(color)}`,
        ...toClassName(toValue(classNamesProps)?.circle2),
      ],
      label: [
        'spinner-label',
        `spinner-label-${toValue(size)}`,
        `spinner-label-${toValue(labelColor)}`,
        ...toClassName(toValue(classNamesProps)?.label),
      ],
    })),
  }
}
