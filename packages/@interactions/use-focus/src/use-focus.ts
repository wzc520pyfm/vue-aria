import {type MaybeRefOrGetter, type ToRefs, computed, toValue} from 'vue'
import {getOwnerDocument} from '@nev-ui/shared'
import {useSyntheticBlurEvent} from './util'
import type {DOMAttributes, FocusEvents} from '@nev-ui/types-shared'

export interface FocusProps extends FocusEvents {
  /** Whether the focus events should be disabled. */
  isDisabled?: MaybeRefOrGetter<boolean>
}

export interface FocusResult {
  /** Props to spread onto the target element. */
  focusProps: DOMAttributes
}

/**
 * Handles focus events for the immediate target.
 * Focus events on child elements will be ignored.
 */
export function useFocus(props: FocusProps = {}): ToRefs<FocusResult> {
  const {isDisabled, onFocus: onFocusProp, onBlur: onBlurProp, onFocusChange} = props

  const onBlur: FocusProps['onBlur'] = (e: FocusEvent) => {
    if (e.target === e.currentTarget) {
      onBlurProp?.(e)

      onFocusChange?.(false)

      return true
    }
  }

  const onSyntheticFocus = useSyntheticBlurEvent(onBlur)

  const onFocus: FocusProps['onFocus'] = (e: FocusEvent) => {
    // Double check that document.activeElement actually matches e.target in case a previously chained
    // focus handler already moved focus somewhere else.

    const ownerDocument = getOwnerDocument(e.target as Element)

    if (e.target === e.currentTarget && ownerDocument.activeElement === e.target) {
      onFocusProp?.(e)

      onFocusChange?.(true)

      onSyntheticFocus(e)
    }
  }

  const focusProps = computed(() => {
    const _focusProps: DOMAttributes = {}
    if (!toValue(isDisabled) && (onFocusProp || onFocusChange || onBlurProp)) {
      _focusProps.onFocus = onFocus
    }
    if (!toValue(isDisabled) && (onBlurProp || onFocusChange)) {
      _focusProps.onBlur = onBlur
    }

    return _focusProps
  })

  return {
    focusProps,
  }
}
