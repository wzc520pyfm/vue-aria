import {unref} from 'vue'
import {useHover} from '@nev-ui/use-hover'
import {dataAttr, mergeProps} from '@nev-ui/shared'
import type {AriaButtonProps} from '@nev-ui/types-aria-button'

export interface UseButtonProps extends AriaButtonProps {
  // there props's type need to weaken
  as?: string
  type?: string // should be provided as native attr
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  isDisabled?: boolean
}

export interface UseButtonEmits {
  (e: 'click'): void
}

export function useButton(props: UseButtonProps, emits: UseButtonEmits) {
  const {as, type = 'button', size = 'md', color = 'default', radius, isDisabled} = props

  const Component = as || 'button'

  const {isHovered, hoverProps} = useHover({isDisabled})
  const additionalProps = {
    type,
  }
  const onClick = () => {
    emits('click')
  }
  const getButtonProps = () => ({
    'data-hover': dataAttr(unref(isHovered)),
    ...mergeProps(additionalProps, unref(hoverProps)),
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
