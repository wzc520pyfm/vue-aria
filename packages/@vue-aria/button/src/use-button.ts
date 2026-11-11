import {computed, h, toValue} from 'vue'
import {chain, mergeProps, toHeroDataAttrs} from '@nev-ui/shared'
import {useAriaButton} from './use-aria-button'
import type {Component} from 'vue'
import type {As, ToMaybeRefOrGettersForNonFunction} from '@nev-ui/types-shared'
import type {UseAriaButtonEmits, UseAriaButtonProps} from './use-aria-button'

export interface UseButtonProps extends UseAriaButtonProps {
  as?: As // should be weakened
  /**
   * The button start content.
   */
  startContent?: Component
  /**
   * The button end content.
   */
  endContent?: Component
  /**
   * Slot name for compound components and Hero UI `[data-slot]` selectors.
   * @default 'button'
   */
  'data-slot'?: string
  /** Camel-case alias of `data-slot` for Vue prop fallthrough. */
  dataSlot?: string
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
  const {
    as = BUTTON_DEFAULT.as,
    isDisabled = false,
    startContent: startContentProp,
    endContent: endContentProp,
    onPress,
    onClick,
    ...otherProps
  } = props

  // The as prop maybe a ref<undefined>
  const Component = computed(() => toValue(as) ?? BUTTON_DEFAULT.as)

  const handleClick = () => {
    // maybe need other logic
  }

  const {
    buttonProps: ariaButtonProps,
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    isPending,
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
  const getButtonProps = () =>
    mergeProps(
      toValue(ariaButtonProps),
      toHeroDataAttrs({
        disabled: toValue(isDisabled),
        hovered: toValue(isHovered),
        pressed: toValue(isPressed),
        focused: toValue(isFocused),
        focusVisible: toValue(isFocusVisible),
        pending: toValue(isPending),
        slot: toValue(props['data-slot']) ?? toValue(props.dataSlot) ?? 'button',
      }),
    )

  // should be handled at useAriaIcon
  const getIconClone = (icon?: Component) =>
    icon
      ? h(icon, {
          'aria-hidden': true,
          focusable: false,
          tabIndex: -1,
        })
      : null

  const startContent = getIconClone(toValue(startContentProp))
  const endContent = getIconClone(toValue(endContentProp))

  return {
    Component,
    startContent,
    endContent,
    isDisabled: computed(() => toValue(isDisabled)),
    getButtonProps,
  }
}
