/*
 * Minimal internal port of `react-aria@3.53.1` `useFocusable`
 * (`packages/react-aria/src/interactions/useFocusable.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: `useFocus` + `useKeyboard` + `tabIndex` + `autoFocus`.
 * Internal — not publicly exported (official does not export it from the
 * react-aria barrel either).
 */

import {toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import {mergeProps} from '../utils/mergeProps'
import {useFocus} from './useFocus'
import {useKeyboard} from './useKeyboard'
import {focusSafely} from '../utils/focusSafely'

export interface FocusableProps {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the element should be excluded from the tab order. */
  excludeFromTabOrder?: MaybeRefOrGetter<boolean | undefined>
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
}

export interface FocusableAria {
  /** Props for the focusable element. */
  focusableProps: Record<string, any>
}

/**
 * Used to make an element focusable and capable of auto focus.
 */
export function useFocusable(
  props: FocusableProps,
  domRef: Ref<HTMLElement | null> | undefined,
): FocusableAria {
  const {focusProps} = useFocus(props)
  const {keyboardProps} = useKeyboard({
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
  })
  const interactions = mergeProps(focusProps, keyboardProps)

  const autoFocus = () => Boolean(toValue(props.autoFocus))
  let autoFocusApplied = autoFocus()
  if (domRef) {
    watch(
      domRef,
      (el) => {
        if (autoFocusApplied && el) {
          focusSafely(el)
        }
        autoFocusApplied = false
      },
      {immediate: true, flush: 'post'},
    )
  }

  const focusableProps = mergeProps({
    ...interactions,
  })
  // Read focus-order props live so runtime changes (e.g. isDisabled) are
  // reflected without re-running setup.
  Object.defineProperty(focusableProps, 'tabIndex', {
    get: () => {
      if (toValue(props.isDisabled)) {
        return undefined
      }
      // Always set a tabIndex so that Safari allows focusing native buttons and inputs.
      return toValue(props.excludeFromTabOrder) ? -1 : 0
    },
    enumerable: true,
    configurable: true,
  })

  return {focusableProps}
}
