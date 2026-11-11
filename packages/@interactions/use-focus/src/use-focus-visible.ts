import {type MaybeRefOrGetter, type Ref, onBeforeUnmount, onMounted, ref, toValue} from 'vue'

export interface UseFocusVisibleOptions {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
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
export function useFocusVisible(options: UseFocusVisibleOptions = {}): {
  isFocused: Ref<boolean>
  isFocusVisible: Ref<boolean>
  focusProps: {
    onFocus: (event: FocusEvent) => void
    onBlur: (event: FocusEvent) => void
  }
} {
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
