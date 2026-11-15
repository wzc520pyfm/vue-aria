/*
 * Port of `react-aria@3.53.1` `useSwitch`
 * (`packages/react-aria/src/switch/useSwitch.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Wraps the internal `useToggle` and adds the
 * `switch` role on the input. Returned *Props are plain objects with live
 * getters, not ComputedRefs.
 */

import type {Ref} from 'vue'
import type {ToggleState} from '../../../vue-stately/src/toggle/useToggleState'
import {AriaToggleProps, useToggle, type ToggleAria} from '../toggle/useToggle'

export interface SwitchProps extends AriaToggleProps {}

export interface AriaSwitchProps extends SwitchProps {}

export interface SwitchAria extends ToggleAria {}

/**
 * Provides the behavior and accessibility implementation for a switch component.
 * A switch is similar to a checkbox, but represents on/off values as opposed to selection.
 *
 * @param props - Props for the switch.
 * @param state - State for the switch, as returned by `useToggleState`.
 * @param ref - Ref to the HTML input element.
 */
export function useSwitch(
  props: AriaSwitchProps,
  state: ToggleState,
  ref: Ref<HTMLInputElement | null>,
): SwitchAria {
  const aria = useToggle(props, state, ref)
  const {labelProps, inputProps, descriptionProps, errorMessageProps} = aria

  // Define the role directly on the toggle's input props — a setup-time
  // `mergeProps(inputProps, {})` copy would drop keys that read `undefined`
  // right now and never let them come back.
  Object.defineProperty(inputProps, 'role', {
    get: () => 'switch',
    enumerable: true,
    configurable: true,
  })
  const out = {
    labelProps,
    inputProps,
    descriptionProps,
    errorMessageProps,
  } as SwitchAria
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
