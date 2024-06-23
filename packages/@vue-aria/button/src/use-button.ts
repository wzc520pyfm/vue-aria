import {computed, toValue} from 'vue'
import {dataAttr} from '@nev-ui/shared'
import {useAriaButton} from './use-aria-button'
import type {As} from '@nev-ui/types-shared'
import type {UseAriaButtonEmits, UseAriaButtonProps} from './use-aria-button'
import type {MaybeRefOrGetter} from 'vue'

export interface UseButtonProps extends UseAriaButtonProps {
  as?: As // should be weakened
}

export interface UseButtonEmits extends UseAriaButtonEmits {}

const BUTTON_DEFAULT = {
  as: 'button',
  type: 'button',
} as const

// TODO: move to type shared
type NonUndefined<T> = T extends undefined ? never : T
type Duplicate<T> = {[P in keyof T]: T[P]}
type OmitNever<T extends object> = Duplicate<T>[keyof T]
type FunctionKeys<T extends object> = OmitNever<
  Required<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: NonUndefined<T[K]> extends Function ? K : never
  }>
>
type ToMaybeRefOrGettersForNonFunction<T extends object> = {
  [P in keyof T]?: P extends FunctionKeys<T> ? T[P] : MaybeRefOrGetter<NonUndefined<T[P]>>
}

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
    buttonEvents: ariaButtonEvents,
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
  const getButtonEvents = () => ({
    ...toValue(ariaButtonEvents),
  })

  return {
    Component,
    isDisabled: computed(() => toValue(isDisabled)),
    getButtonProps,
    getButtonEvents,
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
