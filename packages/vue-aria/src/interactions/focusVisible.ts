import {onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter, type Ref} from 'vue'

export interface UseFocusVisibleOptions {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
}

export interface FocusPropsEl {
  onFocus: (event: FocusEvent) => void
  onBlur: (event: FocusEvent) => void
}

/**
 * Public return value of {@link useFocusVisible}.
 * `focusProps` is a plain object (not a computed/ref) so script can use
 * `focusProps.onFocus` directly.
 */
export interface UseFocusVisibleReturn {
  isFocused: Ref<boolean>
  isFocusVisible: Ref<boolean>
  focusProps: FocusPropsEl
}

type Modality = 'pointer' | 'keyboard' | 'virtual'

let modality: Modality = 'virtual'
let listenerCount = 0

function onWindowPointerDown() {
  modality = 'pointer'
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (event.metaKey || event.altKey || event.ctrlKey) return
  modality = 'keyboard'
}

/**
 * Sets the current interaction modality. Compatibly added for the DateField
 * slice (official `setInteractionModality`); does not change the frozen
 * `useFocusVisible` behavior contract.
 */
export function setInteractionModality(next: Modality) {
  modality = next
}

function addGlobalModalityListeners() {
  if (typeof window === 'undefined') return
  listenerCount += 1
  if (listenerCount > 1) return
  window.addEventListener('pointerdown', onWindowPointerDown, true)
  window.addEventListener('keydown', onWindowKeyDown, true)
}

function removeGlobalModalityListeners() {
  if (typeof window === 'undefined') return
  listenerCount = Math.max(0, listenerCount - 1)
  if (listenerCount > 0) return
  window.removeEventListener('pointerdown', onWindowPointerDown, true)
  window.removeEventListener('keydown', onWindowKeyDown, true)
}

/**
 * Tracks focus and whether it was acquired via the keyboard (focus-visible).
 * Public signature matches the hero-ui-vue behavior contract.
 */
export function useFocusVisible(options: UseFocusVisibleOptions = {}): UseFocusVisibleReturn {
  const isFocused = ref(false)
  const isFocusVisible = ref(false)

  onMounted(() => {
    addGlobalModalityListeners()
  })

  onBeforeUnmount(() => {
    removeGlobalModalityListeners()
  })

  function onFocus() {
    if (toValue(options.isDisabled)) return
    isFocused.value = true
    isFocusVisible.value = modality !== 'pointer'
  }

  function onBlur() {
    isFocused.value = false
    isFocusVisible.value = false
  }

  return {
    isFocused,
    isFocusVisible,
    focusProps: {
      onFocus,
      onBlur,
    },
  }
}
