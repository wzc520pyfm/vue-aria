import {computed, toValue} from 'vue'
import type {As, ToMaybeRefOrGettersForNonFunction} from '@nev-ui/types-shared'

export interface UseIconProps {
  as?: As
}

const ICON_DEFAULT = {
  as: 'i',
} as const

/**
 * Hook for headless icon
 * @param props - Icon props
 * @param emits - Icon emits
 */
export function useIcon(props: ToMaybeRefOrGettersForNonFunction<UseIconProps> = {}) {
  const {as = ICON_DEFAULT.as} = props

  // The as prop maybe a ref<undefined>
  const Component = computed(() => toValue(as) ?? ICON_DEFAULT.as)

  return {
    Component,
  }
}
