import {type ComputedRef, type MaybeRefOrGetter, computed, toValue} from 'vue'
import {type HeroDataAttrs, toHeroDataAttrs} from '../dom/data-attr'

export interface UseSelectableOptions {
  isSelected?: MaybeRefOrGetter<boolean | undefined>
}

/** Helper for later collection/toggle components. Not attached to Button in this batch. */
export function useSelectable(options: UseSelectableOptions = {}): {
  isSelected: ComputedRef<boolean>
  selectedAttrs: ComputedRef<HeroDataAttrs>
} {
  const isSelected = computed(() => Boolean(toValue(options.isSelected)))
  const selectedAttrs = computed(() => toHeroDataAttrs({selected: isSelected.value}))
  return {isSelected, selectedAttrs}
}
