import {computed, toValue} from 'vue'
import {mergeProps} from '@nev-ui/shared'
import {type UseAriaSpinnerProps, useAriaSpinner} from './use-aria-spinner'
import type {As, ToMaybeRefOrGettersForNonFunction, VueClass} from '@nev-ui/types-shared'

interface SpinnerClassName {
  spinner?: VueClass
  wrapper?: VueClass
  circleWrapper?: VueClass
  circle1?: VueClass
  circle2?: VueClass
  label?: VueClass
}

export interface UseSpinnerProps extends UseAriaSpinnerProps {
  as?: As
  classNames?: SpinnerClassName
}

const SPINNER_DEFAULT = {
  as: 'div',
} as const

export function useSpinner(props: ToMaybeRefOrGettersForNonFunction<UseSpinnerProps> = {}) {
  const {as = SPINNER_DEFAULT.as, label, classNames = {}, ...otherProps} = props

  const Component = computed(() => toValue(as) ?? SPINNER_DEFAULT.as)

  const {spinnerProps: ariaSpinnerProps} = useAriaSpinner({
    label,
    ...otherProps,
  })

  const getSpinnerProps = () => mergeProps(toValue(ariaSpinnerProps), {})

  return {
    Component,
    label: computed(() => toValue(label)),
    classNames: computed(() => toValue(classNames)),
    getSpinnerProps,
  }
}
