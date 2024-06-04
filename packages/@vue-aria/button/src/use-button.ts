import {computed, toValue} from 'vue'
import {useHover} from '@nev-ui/use-hover'
import {usePress} from '@nev-ui/use-press'
import {dataAttr, mergeProps} from '@nev-ui/shared'
import type {MaybeRefOrGetter} from 'vue'
import type {AriaButtonProps} from '@nev-ui/types-aria-button'

export interface UseButtonProps extends AriaButtonProps {
  as?: string // should be weaken
  type?: string // should be provided as native attr
  isDisabled?: boolean
}

export interface UseButtonEmits {
  (e: 'click'): void
}

const BUTTON_DEFAULT = {
  as: 'button',
  type: 'button',
} as const

// TODO: move to type shared
type PropMaybeRefOrGetter<T> = {
  [P in keyof T]?: MaybeRefOrGetter<T[P]>
}

/**
 * Hook for headless button
 * @param props - Button props
 * @param emits - Button emits
 */
export function useButton(props: PropMaybeRefOrGetter<UseButtonProps> = {}, emits: UseButtonEmits) {
  const {as = BUTTON_DEFAULT.as, type = BUTTON_DEFAULT.type, isDisabled = false} = props

  const Component = computed(() => toValue(as))

  const {isHovered, hoverProps} = useHover({isDisabled: toValue(isDisabled)})
  const {isPressed, pressProps} = usePress({isDisabled: toValue(isDisabled)})
  const additionalProps = computed(() =>
    Component.value === 'button'
      ? {
          type: toValue(type),
          disabled: toValue(isDisabled),
        }
      : {
          role: 'button',
          tabIndex: toValue(isDisabled) ? undefined : 0,
          // href: Component.value === 'a' && toValue(isDisabled) ? undefined : href,
          // target: Component.value === 'a' ? target : undefined,
          type: Component.value === 'input' ? toValue(type) : undefined,
          disabled: Component.value === 'input' ? toValue(isDisabled) : undefined,
          'aria-disabled':
            !toValue(isDisabled) || Component.value === 'input' ? undefined : toValue(isDisabled),
          // rel: Component.value === 'a' ? rel : undefined,
        },
  )

  const onClick = () => {
    emits('click')
  }
  const getButtonProps = () => ({
    'data-disabled': dataAttr(toValue(isDisabled)),
    'data-hover': dataAttr(toValue(isHovered)),
    'data-pressed': dataAttr(toValue(isPressed)),
    ...mergeProps(toValue(additionalProps), toValue(hoverProps), toValue(pressProps)),
  })
  const getButtonEvents = () => ({
    click: onClick,
  })

  return {
    Component,
    isDisabled: computed(() => toValue(isDisabled)),
    getButtonProps,
    getButtonEvents,
  }
}
