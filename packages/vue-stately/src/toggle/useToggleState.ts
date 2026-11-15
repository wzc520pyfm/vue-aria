/*
 * Port of `react-stately@3.51.0` `useToggleState`
 * (`packages/react-stately/src/toggle/useToggleState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters so a
 * controlled `isSelected` is never snapshotted at setup time. The returned
 * state is a plain object with live getters, not ComputedRefs.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'
import {useControlledState} from '../utils/useControlledState'

export interface ToggleStateOptions {
  /**
   * Whether the element should be selected (uncontrolled).
   */
  defaultSelected?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether the element should be selected (controlled).
   */
  isSelected?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Handler that is called when the element's selection state changes.
   */
  onChange?: (isSelected: boolean) => void
  /**
   * Whether the element can be selected but not changed by the user.
   */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
}

export interface ToggleProps extends ToggleStateOptions {
  /**
   * The value of the input element, used when submitting an HTML form. See
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#htmlattrdefvalue).
   */
  value?: MaybeRefOrGetter<string | undefined>
  /** Whether the element should receive focus on render. */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
}

export interface ToggleState {
  /** Whether the toggle is selected. */
  readonly isSelected: boolean

  /** Whether the toggle is selected by default. */
  readonly defaultSelected: boolean

  /** Updates selection state. */
  setSelected(isSelected: boolean): void

  /** Toggle the selection state. */
  toggle(): void
}

/**
 * Provides state management for toggle components like checkboxes and switches.
 */
export function useToggleState(props: ToggleStateOptions = {}): ToggleState {
  const isReadOnly = () => Boolean(toValue(props.isReadOnly))

  // Have to provide an empty function so useControlledState doesn't throw a fit.
  // Can't use useControlledState's prop calling because we need the change value.
  const [isSelected, setSelected] = useControlledState<boolean>(
    props.isSelected,
    () => toValue(props.defaultSelected) || false,
    props.onChange,
  )
  // Capture the initial selected value once (official `useState(isSelected)`).
  const initialValue = isSelected.value

  function updateSelected(value: boolean) {
    if (!isReadOnly()) {
      setSelected(value)
    }
  }

  function toggleState() {
    if (!isReadOnly()) {
      setSelected(!isSelected.value)
    }
  }

  const state: ToggleState = {
    get isSelected() {
      return isSelected.value
    },
    // Official: `props.defaultSelected ?? initialValue`.
    get defaultSelected() {
      return toValue(props.defaultSelected) ?? initialValue
    },
    setSelected: updateSelected,
    toggle: toggleState,
  }
  return state
}
