import {type ComputedRef, type MaybeRefOrGetter, computed, toValue} from 'vue'
import {type HeroDataAttrs, toHeroDataAttrs} from '../dom/data-attr'

export interface UsePlacementOptions {
  placement?: MaybeRefOrGetter<string | undefined | null>
}

/** Helper for later overlays (Popover / Tooltip / Select). Not attached to Button in this batch. */
export function usePlacement(options: UsePlacementOptions = {}): {
  placement: ComputedRef<string | undefined>
  placementAttrs: ComputedRef<HeroDataAttrs>
} {
  const placement = computed(() => toValue(options.placement) ?? undefined)
  const placementAttrs = computed(() => toHeroDataAttrs({placement: placement.value}))
  return {placement, placementAttrs}
}
