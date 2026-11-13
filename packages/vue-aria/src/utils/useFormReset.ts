/*
 * Port of `react-aria@3.53.1` `useFormReset`
 * (`packages/react-aria/src/utils/useFormReset.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported.
 */

import {onScopeDispose, toValue, watch, type MaybeRefOrGetter} from 'vue'

export function useFormReset<T>(
  ref: {value: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null} | undefined,
  initialValue: MaybeRefOrGetter<T>,
  onReset: (value: T) => void,
): void {
  let currentForm: HTMLFormElement | null = null
  const handleReset = (e: Event) => {
    if (onReset && !e.defaultPrevented) {
      onReset(toValue(initialValue))
    }
  }

  watch(
    () => ref?.value ?? null,
    (input) => {
      if (currentForm) {
        currentForm.removeEventListener('reset', handleReset)
        currentForm = null
      }
      const form = input?.form
      if (form) {
        form.addEventListener('reset', handleReset)
        currentForm = form
      }
    },
    {immediate: true, flush: 'post'},
  )

  onScopeDispose(() => {
    if (currentForm) {
      currentForm.removeEventListener('reset', handleReset)
      currentForm = null
    }
  })
}
