import {computed, toValue, type ComputedRef, type MaybeRefOrGetter} from 'vue'
import {type HeroDataAttrs, toHeroDataAttrs} from '../utils/toHeroDataAttrs'

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
