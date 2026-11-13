import {onMounted, ref, watch, type Ref} from 'vue'

let increment = 0

/**
 * Stable unique id for a11y associations (aria-labelledby, aria-controls, …).
 * Minimal stand-in for official `useId` — no SSR prefixing in this batch.
 */
export function useId(prefix = 'vue-aria'): Ref<string> {
  return ref(`${prefix}-${++increment}`)
}

/**
 * Used to generate an id, and after render, check if that id is rendered so we know
 * if we can use it in places such as labelledby.
 *
 * Vue port of official `useSlotId` (react-aria@3.53.1). The resolved id is the
 * generated id on first paint, then re-resolved after layout: if no element with
 * that id exists in the DOM, the resolved id becomes `undefined`.
 */
export function useSlotId(initialId: Ref<string>, deps: ReadonlyArray<any> = []): Ref<string | undefined> {
  const resolved = ref<string | undefined>(initialId.value)
  const update = () => {
    resolved.value = document.getElementById(initialId.value) ? initialId.value : undefined
  }
  onMounted(update)
  watch([initialId, ...deps], update, {flush: 'post'})
  return resolved
}
