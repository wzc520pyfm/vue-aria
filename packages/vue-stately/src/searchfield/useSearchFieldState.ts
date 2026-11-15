/*
 * Port of `react-stately@3.51.0` `useSearchFieldState`
 * (`packages/react-stately/src/searchfield/useSearchFieldState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters so
 * controlled values are never snapshotted at setup time, and `value` /
 * `defaultValue` go through `toString` (null/undefined pass through),
 * matching the official numeric/array coercion. Hook *Props are MaybeRefOrGetter.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'
import {useControlledState} from '../utils/useControlledState'

// Copied here to avoid depending on @react-aria/textfield (vue-aria) from stately.
export interface TextFieldProps<T = HTMLInputElement> {
  /** Whether the field is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the field can be selected but not changed by the user. */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the input value is required. */
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the input value is invalid. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The current validation state of the field.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /**
   * Whether to use native HTML form validation to prevent form submission when the value is
   * missing or invalid, or mark the field as invalid via ARIA instead.
   *
   * @default 'aria'
   */
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  /**
   * A function that returns an error message if a given value is invalid, or `true` if the value is
   * valid.
   */
  validate?: (value: string) => true | string | string[] | null | undefined
  /** Temporary text that occupies the text input when it is empty. */
  placeholder?: MaybeRefOrGetter<string | undefined>
  /** A description for the field. Provides a hint such as specific requirements for what to choose. */
  description?: unknown
  /** An error message for the field. */
  errorMessage?: unknown
  /** Whether the element should receive focus on render. */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<string | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<string | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: string) => void
  /** The visible label for the element. */
  label?: unknown
  /** The name of the element, used when submitting an HTML form. */
  name?: MaybeRefOrGetter<string | undefined>
  /** The id of the form that the element belongs to. */
  form?: MaybeRefOrGetter<string | undefined>
}

export interface SearchFieldProps extends TextFieldProps {
  /** Handler that is called when the SearchField is submitted. */
  onSubmit?: (value: string) => void

  /** Handler that is called when the clear button is pressed. */
  onClear?: () => void
}

export interface SearchFieldState {
  /** The current value of the search field. */
  readonly value: string

  /** Sets the value of the search field. */
  setValue(value: string): void
}

/**
 * Provides state management for a search field.
 */
export function useSearchFieldState(props: SearchFieldProps): SearchFieldState {
  const [value, setValue] = useControlledState<string>(
    () => toStringVal(toValue(props.value)),
    () => toStringVal(toValue(props.defaultValue)) || '',
    props.onChange,
  )

  return {
    get value() {
      return value.value
    },
    setValue,
  }
}

function toStringVal(val: unknown): string | undefined {
  if (val == null) {
    return undefined
  }

  return val.toString()
}
