import {type ComputedRef, type MaybeRefOrGetter, computed, toValue} from 'vue'
import {type HeroDataAttrs, toHeroDataAttrs} from '../dom/data-attr'

export type PresencePhase = 'idle' | 'entering' | 'exiting'

export interface UsePresenceStateOptions {
  present?: MaybeRefOrGetter<boolean | undefined>
}

/**
 * Entering / exiting flags for later overlay animation (Popover, Modal, etc.).
 * Not attached to Button in this batch.
 */
export function usePresenceState(options: UsePresenceStateOptions = {}): {
  present: ComputedRef<boolean>
  presenceAttrs: (phase?: PresencePhase) => HeroDataAttrs
} {
  const present = computed(() => Boolean(toValue(options.present)))

  function presenceAttrs(phase: PresencePhase = 'idle'): HeroDataAttrs {
    return toHeroDataAttrs({
      entering: phase === 'entering',
      exiting: phase === 'exiting',
    })
  }

  return {present, presenceAttrs}
}
