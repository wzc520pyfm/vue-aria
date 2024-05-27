import {toValue} from 'vue'
import {useHover} from '@nev-ui/use-hover'
import {dataAttr, mergeProps} from '@nev-ui/shared'
import {withButtonDefault} from './with-button-default'
import type {AriaButtonProps} from '@nev-ui/types-aria-button'

export interface UseButtonProps extends AriaButtonProps {
  as?: string // should be weaken
  type?: string // should be provided as native attr
  isDisabled?: boolean
}

export interface UseButtonEmits {
  (e: 'click'): void
}

/**
 * Hook for headless button
 * @param props - Button props
 * @param emits - Button emits
 */
export function useButton(props: UseButtonProps, emits: UseButtonEmits) {
  const {Component, type, isDisabled} = withButtonDefault(props)

  const {isHovered, hoverProps} = useHover({isDisabled: isDisabled?.value})
  const additionalProps =
    Component.value === 'button'
      ? {
          type: type.value,
          disabled: isDisabled.value,
        }
      : {
          role: 'button',
          tabIndex: isDisabled ? undefined : 0,
          // href: Component.value === 'a' && isDisabled ? undefined : href,
          // target: Component.value === 'a' ? target : undefined,
          type: Component.value === 'input' ? type.value : undefined,
          disabled: Component.value === 'input' ? isDisabled.value : undefined,
          'aria-disabled':
            !isDisabled || Component.value === 'input' ? undefined : isDisabled.value,
          // rel: Component.value === 'a' ? rel : undefined,
        }
  const onClick = () => {
    emits('click')
  }
  const getButtonProps = () => ({
    'data-disabled': dataAttr(toValue(isDisabled)),
    'data-hover': dataAttr(toValue(isHovered)),
    ...mergeProps(additionalProps, toValue(hoverProps)),
  })
  const getButtonEvents = () => ({
    click: onClick,
  })

  return {
    Component,
    isDisabled,
    getButtonProps,
    getButtonEvents,
  }
}
