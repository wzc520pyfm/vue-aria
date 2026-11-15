/*
 * Port of `react-aria@3.53.1` `useCheckbox`
 * (`packages/react-aria/src/checkbox/useCheckbox.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Indeterminism is kept in sync with the native
 * input property via a live watcher. Returned *Props are plain objects with
 * live getters, not ComputedRefs.
 */

import {toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import {mergeProps} from '../utils/mergeProps'
import type {ToggleState} from '../../../vue-stately/src/toggle/useToggleState'
import {AriaToggleProps, useToggle, type ToggleAria} from '../toggle/useToggle'

export interface CheckboxProps extends AriaToggleProps {
  /**
   * Indeterminism is presentational only.
   * The indeterminate visual representation remains regardless of user interaction.
   */
  isIndeterminate?: boolean | MaybeRefOrGetter<boolean | undefined>
}

export interface AriaCheckboxProps extends CheckboxProps {}

export interface CheckboxAria extends ToggleAria {}

/**
 * Provides the behavior and accessibility implementation for a checkbox component.
 * Checkboxes allow users to select multiple items from a list of individual items, or
 * to mark one individual item as selected.
 *
 * @param props - Props for the checkbox.
 * @param state - State for the checkbox, as returned by `useToggleState`.
 * @param inputRef - A ref for the HTML input element.
 */
export function useCheckbox(
  props: AriaCheckboxProps,
  state: ToggleState,
  inputRef: Ref<HTMLInputElement | null>,
): CheckboxAria {
  // Keep the useToggle result alive — destructure only the plain *Props
  // objects so the live getters on the result are never snapshotted.
  const aria = useToggle(props, state, inputRef)
  const {labelProps, inputProps, descriptionProps, errorMessageProps} = aria

  const isIndeterminate = () => !!toValue(props.isIndeterminate)
  // Indeterminate is a property, but it can only be set via javascript.
  // https://css-tricks.com/indeterminate-checkboxes/
  // Live watcher (official effect runs after every render) — also applies after mount.
  watch(
    [() => inputRef.value, isIndeterminate],
    ([input, indeterminate]) => {
      if (input) {
        input.indeterminate = indeterminate
      }
    },
    {immediate: true, flush: 'post'},
  )

  const out = {
    labelProps: mergeProps(labelProps, {
      // Official camelCase name (for parity with React Aria) plus the
      // lowercase form Vue actually binds to the native `mousedown` event.
      onMouseDown: (e: MouseEvent) => e.preventDefault(),
      // Prevent label from being focused when mouse down on it.
      // Note, this does not prevent the input from being focused in the `click` event.
      onMousedown: (e: MouseEvent) => e.preventDefault(),
    }),
    inputProps,
    descriptionProps,
    errorMessageProps,
  } as CheckboxAria
  // Live delegation through the useToggle result — never snapshot.
  Object.defineProperties(out, {
    isSelected: {get: () => aria.isSelected, enumerable: true, configurable: true},
    isPressed: {get: () => aria.isPressed, enumerable: true, configurable: true},
    isDisabled: {get: () => aria.isDisabled, enumerable: true, configurable: true},
    isReadOnly: {get: () => aria.isReadOnly, enumerable: true, configurable: true},
    isInvalid: {get: () => aria.isInvalid, enumerable: true, configurable: true},
    validationErrors: {get: () => aria.validationErrors, enumerable: true, configurable: true},
    validationDetails: {get: () => aria.validationDetails, enumerable: true, configurable: true},
  })
  return out
}
