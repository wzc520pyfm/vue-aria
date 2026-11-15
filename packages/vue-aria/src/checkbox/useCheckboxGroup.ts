/*
 * Port of `react-aria@3.53.1` `useCheckboxGroup`
 * (`packages/react-aria/src/checkbox/useCheckboxGroup.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. The `checkboxGroupData` WeakMap is populated
 * with live getters. Returned *Props are plain objects with live getters.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'
import {checkboxGroupData} from './utils'
import type {CheckboxGroupProps, CheckboxGroupState} from '../../../vue-stately/src/checkbox/useCheckboxGroupState'
import {filterDOMProps} from '../utils/filterDOMProps'
import {mergeProps} from '../utils/mergeProps'
import {useField} from '../label/useField'
import {useFocusWithin} from '../interactions/useFocusWithin'

export interface AriaCheckboxGroupProps extends CheckboxGroupProps {
  /** Handler that is called when the group receives focus. */
  onFocus?: (e: FocusEvent) => void
  /** Handler that is called when the group loses focus. */
  onBlur?: (e: FocusEvent) => void
  /** Handler that is called when the group's focus status changes. */
  onFocusChange?: (isFocused: boolean) => void
}

export interface CheckboxGroupAria {
  /** Props for the checkbox group wrapper element. */
  groupProps: Record<string, any>
  /** Props for the checkbox group's visible label (if any). */
  labelProps: Record<string, any>
  /** Props for the checkbox group description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the checkbox group error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Whether the checkbox group is invalid. */
  readonly isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

/**
 * Provides the behavior and accessibility implementation for a checkbox group component.
 * Checkbox groups allow users to select multiple items from a list of options.
 *
 * @param props - Props for the checkbox group.
 * @param state - State for the checkbox group, as returned by `useCheckboxGroupState`.
 */
export function useCheckboxGroup(
  props: AriaCheckboxGroupProps,
  state: CheckboxGroupState,
): CheckboxGroupAria {
  const isDisabled = () => Boolean(toValue(props.isDisabled))
  const validationBehavior = () =>
    (toValue(props.validationBehavior) ?? 'aria') as 'aria' | 'native'

  const isInvalid = () => state.displayValidation.isInvalid
  const validationErrors = () => state.displayValidation.validationErrors
  const validationDetails = () => state.displayValidation.validationDetails as any

  const {labelProps, fieldProps, descriptionProps, errorMessageProps} = useField({
    // Live getters only — never spread the reactive props object.
    id: () => toValue(props.id),
    label: () => toValue(props.label),
    'aria-labelledby': () => toValue(props['aria-labelledby']),
    'aria-label': () => toValue(props['aria-label']),
    // Checkbox group is not an HTML input element so it
    // shouldn't be labeled by a <label> element.
    labelElementType: 'span',
    description: () => toValue(props.description),
    errorMessage: () => toValue(props.errorMessage) ?? validationErrors(),
    isInvalid,
    'aria-describedby': () => toValue(props['aria-describedby']),
  } as any)

  checkboxGroupData.set(state, {
    name: () => toValue(props.name),
    form: () => toValue(props.form),
    descriptionId: () => (descriptionProps as any).id,
    errorMessageId: () => (errorMessageProps as any).id,
    validationBehavior,
  })

  const domProps = filterDOMProps(props, {labelable: true})

  const {focusWithinProps} = useFocusWithin({
    onBlurWithin: props.onBlur as any,
    onFocusWithin: props.onFocus as any,
    onFocusWithinChange: (props as any).onFocusChange,
  })

  const groupProps = mergeProps(domProps, {role: 'group'}, fieldProps, focusWithinProps)
  Object.defineProperties(groupProps, {
    'aria-disabled': {
      get: () => isDisabled() || undefined,
      enumerable: true,
      configurable: true,
    },
  })

  const out = {
    groupProps,
    labelProps,
    descriptionProps,
    errorMessageProps,
  } as CheckboxGroupAria
  Object.defineProperties(out, {
    isInvalid: {get: () => isInvalid(), enumerable: true, configurable: true},
    validationErrors: {get: () => validationErrors(), enumerable: true, configurable: true},
    validationDetails: {get: () => validationDetails(), enumerable: true, configurable: true},
  })
  return out
}
