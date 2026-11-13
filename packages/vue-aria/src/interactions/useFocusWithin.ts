import {onBeforeUnmount, ref} from 'vue'

export interface FocusWithinProps {
  isDisabled?: boolean | (() => boolean)
  onFocusWithin?: (e: FocusEvent) => void
  onBlurWithin?: (e: FocusEvent) => void
  onFocusWithinChange?: (isFocusWithin: boolean) => void
}

export function useFocusWithin(props: FocusWithinProps = {}) {
  const isFocusWithin = ref(false)
  const isDisabled = () => (typeof props.isDisabled === 'function' ? props.isDisabled() : props.isDisabled)

  const onFocusIn = (e: FocusEvent) => {
    if (isDisabled()) return
    if (!isFocusWithin.value) {
      isFocusWithin.value = true
      props.onFocusWithin?.(e)
      props.onFocusWithinChange?.(true)
    }
  }

  const onFocusOut = (e: FocusEvent) => {
    if (isDisabled()) return
    const currentTarget = e.currentTarget as Node | null
    const related = e.relatedTarget as Node | null
    if (currentTarget && related && currentTarget.contains(related)) {
      return
    }
    if (isFocusWithin.value) {
      isFocusWithin.value = false
      props.onBlurWithin?.(e)
      props.onFocusWithinChange?.(false)
    }
  }

  onBeforeUnmount(() => {
    isFocusWithin.value = false
  })

  return {
    focusWithinProps: {
      onFocusin: onFocusIn,
      onFocusout: onFocusOut,
    },
  }
}
