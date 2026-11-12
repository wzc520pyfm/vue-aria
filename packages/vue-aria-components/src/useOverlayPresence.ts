import {computed, nextTick, onBeforeUnmount, ref, watch, type Ref} from 'vue'
import {usePresenceState, type PresencePhase} from 'vue-aria/usePresenceState'

/**
 * Fallback when the element has no running CSS animation / transition.
 * Official `useEnterAnimation` / `useExitAnimation` call `onEnd` synchronously
 * in JSDOM (no `getAnimations`). We wait one macrotask so tests can observe
 * `data-entering` / `data-exiting` before the phase advances and before
 * unmount. In browsers, `animationend` / finished Web Animations resolve
 * sooner or later than this fallback (capped at 2000ms).
 */
export const PRESENCE_FALLBACK_MS = 0
const PRESENCE_ANIMATION_CAP_MS = 2000

export function useOverlayPresence(isOpen: Ref<boolean> | (() => boolean)) {
  const openOf = typeof isOpen === 'function' ? isOpen : () => isOpen.value
  const elRef = ref<HTMLElement | null>(null)
  const phase = ref<PresencePhase>(openOf() ? 'entering' : 'idle')
  const shouldMount = ref(openOf())
  const {presenceAttrs} = usePresenceState({present: shouldMount})
  let cancelWait: (() => void) | null = null

  function startWait(onDone: () => void) {
    cancelWait?.()
    cancelWait = waitForPresence(elRef, onDone)
  }

  watch(
    () => openOf(),
    (open) => {
      if (open) {
        shouldMount.value = true
        phase.value = 'entering'
        nextTick(() => {
          startWait(() => {
            if (openOf()) phase.value = 'idle'
          })
        })
      } else if (shouldMount.value) {
        phase.value = 'exiting'
        nextTick(() => {
          startWait(() => {
            if (!openOf()) {
              phase.value = 'idle'
              shouldMount.value = false
            }
          })
        })
      }
    },
    {immediate: true},
  )

  onBeforeUnmount(() => {
    cancelWait?.()
    cancelWait = null
  })

  const attrs = computed(() => presenceAttrs(phase.value))

  return {elRef, phase, shouldMount, presenceAttrs: attrs}
}

function waitForPresence(elRef: Ref<HTMLElement | null>, done: () => void) {
  const el = elRef.value
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    done()
  }

  if (!el) {
    const timer = setTimeout(finish, PRESENCE_FALLBACK_MS)
    return () => clearTimeout(timer)
  }

  const animations =
    typeof el.getAnimations === 'function'
      ? el.getAnimations().filter((animation) => animation.playState === 'running')
      : []

  const cap = setTimeout(finish, animations.length ? PRESENCE_ANIMATION_CAP_MS : PRESENCE_FALLBACK_MS)

  const onEnd = () => finish()
  el.addEventListener('animationend', onEnd)
  el.addEventListener('transitionend', onEnd)

  if (animations.length) {
    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() =>
      finish(),
    )
  }

  return () => {
    clearTimeout(cap)
    el.removeEventListener('animationend', onEnd)
    el.removeEventListener('transitionend', onEnd)
  }
}
