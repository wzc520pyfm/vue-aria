/*
 * Port of `react-aria@3.53.1` `useSearchField`
 * (`packages/react-aria/src/searchfield/useSearchField.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. `Enter` submits only when `onSubmit` is provided (and then
 * prevents the default submit; otherwise the native form submit proceeds), and
 * `Escape` clears a non-empty value and calls `onClear`. The clear button is
 * wired for the components' `ButtonContext` (`excludeFromTabOrder` +
 * `preventFocusOnPress`, live `isDisabled`).
 *
 * All returned *Props are plain objects with live getters, not ComputedRefs.
 */

import {toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {UseButtonProps} from '../button/useButton'
import {AriaTextFieldProps, useTextField} from '../textfield/useTextField'
import {chain} from '../utils/chain'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import searchfieldStrings from '../i18n/searchfieldStrings'
import type {SearchFieldProps, SearchFieldState} from 'vue-stately/useSearchFieldState'

export interface AriaSearchFieldProps extends SearchFieldProps, Omit<AriaTextFieldProps, 'type'> {
  /**
   * An enumerated attribute that defines what action label or icon to preset for the enter key on
   * virtual keyboards. See
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/enterkeyhint).
   */
  enterKeyHint?: MaybeRefOrGetter<
    'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | undefined
  >
  /**
   * The type of input to render. See
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#htmlattrdeftype).
   *
   * @default 'search'
   */
  type?: MaybeRefOrGetter<string | undefined>
}

export interface SearchFieldAria {
  /** Props for the text field's visible label element (if any). */
  labelProps: Record<string, any>
  /** Props for the input element. */
  inputProps: Record<string, any>
  /** Props for the clear button. */
  clearButtonProps: UseButtonProps
  /** Props for the searchfield's description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the searchfield's error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Whether the search field is invalid. Live: see getter. */
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

/**
 * Provides the behavior and accessibility implementation for a search field.
 *
 * @param props - Props for the search field.
 * @param state - State for the search field, as returned by `useSearchFieldState`.
 * @param inputRef - A ref to the input element.
 */
export function useSearchField(
  props: AriaSearchFieldProps,
  state: SearchFieldState,
  inputRef: Ref<HTMLInputElement | null>,
): SearchFieldAria {
  const stringFormatter = useLocalizedStringFormatter(searchfieldStrings as any, '@react-aria/searchfield')
  const isDisabled = () => Boolean(toValue(props.isDisabled as any))
  const isReadOnly = () => Boolean(toValue(props.isReadOnly as any))
  const onSubmit = props.onSubmit
  const onClear = props.onClear
  const type = () => toValue(props.type as any) ?? 'search'

  const {keyboardProps} = useKeyboard({
    isDisabled: () => isDisabled() || isReadOnly(),
    shortcuts: {
      Enter: () => {
        if (onSubmit) {
          // for backward compatibility;
          // otherwise, "Enter" on an input would trigger a form submit, the default browser behavior
          onSubmit(state.value)
          return
        }
        // No `onSubmit` provided: do not preventDefault so the native form
        // submit proceeds.
        return false
      },
      Escape: () => {
        // Also check the inputRef value for the case where the value was set directly on the input element instead of going through
        // the hook
        if (state.value === '' && (!inputRef.value || inputRef.value.value === '')) {
          return false
        }
        state.setValue('')
        onClear?.()
      },
    },
  })

  const onClearButtonClick = () => {
    state.setValue('')

    if (onClear) {
      onClear()
    }
  }

  const onPressStart = () => {
    // this is in PressStart for mobile so that touching the clear button doesn't remove focus from
    // the input and close the keyboard
    inputRef.value?.focus()
  }

  const textField = useTextField(
    {
      ...props,
      value: () => state.value,
      onChange: state.setValue,
      onKeyDown: props.onKeyDown,
      onKeyUp: props.onKeyUp,
      type,
    },
    inputRef,
  )
  const {labelProps, inputProps, descriptionProps, errorMessageProps} = textField

  // Official `clearButtonProps` is rebuilt on every render with plain values.
  // Ours is one long-lived object, so the computed keys are defined as
  // accessors — readers get the live value, never a snapshot.
  const clearButtonProps: UseButtonProps = {
    excludeFromTabOrder: true,
    preventFocusOnPress: true,
    onPress: onClearButtonClick,
    onPressStart,
  } as UseButtonProps
  Object.defineProperties(clearButtonProps, {
    isDisabled: {get: () => isDisabled() || isReadOnly(), enumerable: true},
    'aria-label': {
      get: () => stringFormatter.format('Clear search'),
      enumerable: true,
    },
  })

  const out: SearchFieldAria = {
    labelProps,
    // An edge case, in Autocomplete, if the keyboard handlers are not in this order, then
    // Escape runs autocomplete/listbox first, then the search-field shortcut returns false and
    // continues propagation, leaking Escape to a parent Dialog.
    // The hook never emits `defaultValue` (controlled via `state.value`), so there
    // is nothing to strip.
    inputProps: mergeSearchFieldInputProps(keyboardProps, inputProps),
    clearButtonProps,
    descriptionProps,
    errorMessageProps,
    // Placeholders replaced below with live accessors (object literals and
    // spread snapshot setup-time values).
    isInvalid: textField.isInvalid,
    validationErrors: textField.validationErrors,
    validationDetails: textField.validationDetails,
  }
  Object.defineProperties(out, {
    isInvalid: {get: () => textField.isInvalid, enumerable: true},
    validationErrors: {get: () => textField.validationErrors, enumerable: true},
    validationDetails: {get: () => textField.validationDetails, enumerable: true},
  })
  return out
}

/**
 * Merge `keyboardProps` over `inputProps` (official order) without dropping
 * accessors whose current value is `undefined` — e.g. `aria-invalid` that only
 * becomes `true` after native form validation commits. Event handlers chain
 * in official order (keyboard shortcuts run before user handlers); plain
 * accessors are re-exposed live.
 */
function mergeSearchFieldInputProps(
  keyboardProps: Record<string, any>,
  inputProps: Record<string, any>,
): Record<string, any> {
  const out: Record<string, any> = {}
  for (const key of Object.keys(inputProps)) {
    const desc = Object.getOwnPropertyDescriptor(inputProps, key)
    if (desc) {
      Object.defineProperty(out, key, {...desc, enumerable: true, configurable: true})
    } else {
      out[key] = inputProps[key]
    }
  }
  for (const key of Object.keys(keyboardProps)) {
    const kb = keyboardProps[key]
    const desc = Object.getOwnPropertyDescriptor(out, key)
    const cur = desc && 'value' in desc ? desc.value : desc && 'get' in desc ? out[key] : undefined
    if (typeof kb === 'function' && typeof cur === 'function' && cur !== kb) {
      out[key] = chain(kb, cur)
    } else {
      out[key] = kb
    }
  }
  return out
}
