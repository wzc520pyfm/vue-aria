import {computed} from 'vue'
import type {UseButtonProps} from './use-button'

const BUTTON_DEFAULT = {
  as: 'button',
  type: 'button',
  size: 'md',
  color: 'default',
  radius: 'md',
} as const

/**
 * Get the button props with default value
 * @param props - Button props
 */
export function withButtonDefault(props: UseButtonProps) {
  const as = computed(() => props.as ?? BUTTON_DEFAULT.as)
  const Component = computed(() => as.value)
  const type = computed(() => props.type ?? BUTTON_DEFAULT.type)
  const size = computed(() => props.size ?? BUTTON_DEFAULT.size)
  const color = computed(() => props.color ?? BUTTON_DEFAULT.color)
  const radius = computed(() => props.radius ?? BUTTON_DEFAULT.radius)
  const isDisabled = computed(() => props.isDisabled)

  return {
    as,
    Component,
    type,
    size,
    color,
    radius,
    isDisabled,
  }
}
