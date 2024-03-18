import {toValue} from 'vue'
import {useHover} from '@nev-ui/use-hover'
import {dataAttr, mergeProps} from '@nev-ui/shared'
import {withButtonDefault} from './with-button-default'
import type {AriaButtonProps} from '@nev-ui/types-aria-button'

export interface UseButtonProps extends AriaButtonProps {
  as?: string // should be weaken
  type?: string // should be provided as native attr
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
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
  const {Component, type, size, color, radius, isDisabled} = withButtonDefault(props)

  const {isHovered, hoverProps} = useHover({isDisabled: isDisabled?.value})
  const additionalProps = {
    type: type?.value,
  }
  const onClick = () => {
    emits('click')
  }
  const getButtonProps = () => ({
    'data-hover': dataAttr(toValue(isHovered)),
    ...mergeProps(additionalProps, toValue(hoverProps)),
  })
  const getButtonEvents = () => ({
    click: onClick,
  })

  return {
    Component,
    size,
    color,
    radius,
    getButtonProps,
    getButtonEvents,
  }
}
