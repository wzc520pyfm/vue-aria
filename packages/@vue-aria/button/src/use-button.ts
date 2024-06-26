import {computed, toValue} from 'vue'
import {dataAttr} from '@nev-ui/shared'
import {useAriaButton} from './use-aria-button'
import type {As, ToMaybeRefOrGettersForNonFunction} from '@nev-ui/types-shared'
import type {UseAriaButtonEmits, UseAriaButtonProps} from './use-aria-button'

export interface UseButtonProps extends UseAriaButtonProps {
  as?: As // should be weakened
}

export interface UseButtonEmits extends UseAriaButtonEmits {}

const BUTTON_DEFAULT = {
  as: 'button',
  type: 'button',
} as const

/**
 * Hook for headless button
 * @param props - Button props
 * @param emits - Button emits
 */
export function useButton(
  props: ToMaybeRefOrGettersForNonFunction<UseButtonProps> = {},
  emits: UseButtonEmits,
) {
  const {as = BUTTON_DEFAULT.as, isDisabled = false, onPress, onClick, ...otherProps} = props

  const Component = computed(() => toValue(as))

  const handleClick = () => {
    // maybe need other logic
  }

  const {
    buttonProps: ariaButtonProps,
    isHovered,
    isPressed,
  } = useAriaButton(
    {
      elementType: as,
      isDisabled,
      onPress,
      onClick: chain(onClick, handleClick),
      ...otherProps,
    },
    emits,
  )
  const getButtonProps = () => ({
    'data-disabled': dataAttr(toValue(isDisabled)),
    'data-hover': dataAttr(toValue(isHovered)),
    'data-pressed': dataAttr(toValue(isPressed)),
    ...toValue(ariaButtonProps),
  })

  return {
    Component,
    isDisabled: computed(() => toValue(isDisabled)),
    getButtonProps,
  }
}

// TODO: move to shared
/**
 * Calls all functions in the order they were chained with the same arguments.
 */
function chain<T extends undefined | ((...args: any[]) => any)>(...callbacks: T[]) {
  return (...args: Parameters<NonUndefined<T>>): ReturnType<NonUndefined<T>> | undefined => {
    return callbacks.reduce((lastRes, callback) => {
      if (typeof callback === 'function') {
        lastRes = callback(...args)
      }
      return lastRes
    }, undefined)
  }
}
