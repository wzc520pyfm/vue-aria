import {computed, toValue, type ComputedRef, type MaybeRefOrGetter} from 'vue'
import {type HeroDataAttrs, toHeroDataAttrs} from '../utils/toHeroDataAttrs'

export interface UseInvalidOptions {
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
}

/** Helper for later form controls. Not attached to Button in this batch. */
export function useInvalid(options: UseInvalidOptions = {}): {
  isInvalid: ComputedRef<boolean>
  invalidAttrs: ComputedRef<HeroDataAttrs>
} {
  const isInvalid = computed(() => Boolean(toValue(options.isInvalid)))
  const invalidAttrs = computed(() => toHeroDataAttrs({invalid: isInvalid.value}))
  return {isInvalid, invalidAttrs}
}
