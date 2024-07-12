import {computed, toValue} from 'vue'
import type {HTMLAttributes, ToRefs} from 'vue'
import type {ToMaybeRefOrGettersForNonFunction} from '@nev-ui/types-shared'

export interface UseAriaSpinnerProps {
  /**
   * Spinner label, in case you passed it will be used as `aria-label`.
   */
  label?: string
  'aria-label'?: string
}

export interface SpinnerAria<T> {
  /** Props for the spinner element. */
  spinnerProps: T
}

export function useAriaSpinner(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaSpinnerProps>,
): ToRefs<SpinnerAria<HTMLAttributes>> {
  const {label, ...otherProps} = props

  const ariaLabel = computed(() => {
    const _label = toValue(label)
    if (_label && typeof _label === 'string') {
      return _label
    }
    return !toValue(otherProps['aria-label']) ? 'Loading' : ''
  })

  const spinnerProps = computed(() => ({
    'aria-label': toValue(ariaLabel),
  }))

  return {
    spinnerProps,
  }
}
