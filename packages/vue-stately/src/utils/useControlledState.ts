import {computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter} from 'vue'

/**
 * Controlled or uncontrolled state, following react-stately's useControlledState.
 * `value` being `undefined` means uncontrolled.
 */
export function useControlledState<T>(
  value: MaybeRefOrGetter<T | undefined> | undefined,
  defaultValue: MaybeRefOrGetter<T>,
  onChange?: (value: T) => void,
): [ComputedRef<T>, (value: T) => void] {
  const internal = ref(toValue(defaultValue)) as {value: T}
  const isControlled = computed(() => toValue(value) !== undefined)
  const state = computed(() => (isControlled.value ? (toValue(value) as T) : internal.value))

  function setState(next: T) {
    const prev = state.value
    if (!isControlled.value) {
      internal.value = next
    }
    if (next !== prev) {
      onChange?.(next)
    }
  }

  return [state, setState]
}
