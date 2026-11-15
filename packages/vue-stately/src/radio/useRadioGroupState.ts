/*
 * Port of `react-stately@3.51.0` `useRadioGroupState`
 * (`packages/react-stately/src/radio/useRadioGroupState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters; validation
 * goes through the internal `useFormValidationState` machinery. The returned
 * state is a plain object with live getters, not ComputedRefs.
 */

import {ref, toValue, type MaybeRefOrGetter} from 'vue'
import {useFormValidationState, type ValidationFunction} from '../form/useFormValidationState'
import {useControlledState} from '../utils/useControlledState'

export interface RadioGroupProps {
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<string | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<string | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: string) => void
  /** Whether the radio group is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the radio group is read only. */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the radio group is required. */
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the radio group is invalid according to application logic. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The current validation state of the radio group.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /**
   * A function that returns an error message if the value is invalid, or `true` if valid.
   */
  validate?: ValidationFunction<string>
  /**
   * Whether to use native HTML form validation to prevent form submission, or mark the
   * group as invalid via ARIA instead.
   *
   * @default 'aria'
   */
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  /**
   * The name of the group, used for native form submission.
   */
  name?: MaybeRefOrGetter<string | undefined>
  /** The id of the group element. */
  id?: MaybeRefOrGetter<string | undefined>
  /** The HTML form element the inputs are associated with. */
  form?: MaybeRefOrGetter<string | undefined>
  /**
   * The axis the Radio Button(s) should align with.
   *
   * @default 'vertical'
   */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical' | undefined>
  /** The label for the group. */
  label?: MaybeRefOrGetter<unknown>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-errormessage'?: MaybeRefOrGetter<string | undefined>
  /** A description of the group. */
  description?: MaybeRefOrGetter<unknown>
  /** An error message to display when the group is invalid. */
  errorMessage?: MaybeRefOrGetter<unknown>
}

export interface RadioGroupState {
  /**
   * The name for the group, used for native form submission.
   *
   * @private
   * @deprecated
   */
  readonly name: string

  /** Whether the radio group is disabled. */
  readonly isDisabled: boolean

  /** Whether the radio group is read only. */
  readonly isReadOnly: boolean

  /** Whether the radio group is required. */
  readonly isRequired: boolean

  /**
   * The current validation state of the radio group.
   *
   * @deprecated Use `isInvalid` instead.
   */
  readonly validationState: 'valid' | 'invalid' | null

  /** Whether the radio group is invalid. */
  readonly isInvalid: boolean

  /** The currently selected value. */
  readonly selectedValue: string | null

  /** The default selected value. */
  readonly defaultSelectedValue: string | null

  /** Sets the selected value. */
  setSelectedValue(value: string | null): void

  /** The value of the last focused radio. */
  readonly lastFocusedValue: string | null

  /** Sets the last focused value. */
  setLastFocusedValue(value: string | null): void

  /** Realtime validation results, updated as the user edits the value. */
  readonly realtimeValidation: {isInvalid: boolean; validationErrors: string[]; validationDetails: any}
  /** Currently displayed validation results, updated when the user commits their changes. */
  readonly displayValidation: {isInvalid: boolean; validationErrors: string[]; validationDetails: any}
  updateValidation(result: any): void
  resetValidation(): void
  commitValidation(): void
}

let instance = Math.round(Math.random() * 10000000000)
let i = 0

/**
 * Provides state management for a radio group component. Provides a name for the group,
 * and manages selection and focus state.
 */
export function useRadioGroupState(props: RadioGroupProps = {}): RadioGroupState {
  // Preserved here for backward compatibility. React Aria now generates the name instead of stately.
  const name = toValue(props.name) || `radio-group-${instance}-${++i}`
  const [selectedValue, setSelected] = useControlledState<string | null | undefined>(
    props.value,
    () => toValue(props.defaultValue) ?? null,
    props.onChange as any,
  )
  // Capture the initial selected value once (official `useState(selectedValue)`).
  const initialValue = selectedValue.value
  const lastFocusedValue = ref<string | null>(null)

  const validation = useFormValidationState<string>({
    // Live delegation — never spread the reactive props object.
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: () => toValue(props.name),
    value: () => selectedValue.value ?? null,
    validate: props.validate,
    validationBehavior: () => toValue(props.validationBehavior),
  })

  const setSelectedValue = (value: string | null) => {
    if (!toValue(props.isReadOnly) && !toValue(props.isDisabled)) {
      setSelected(value)
      validation.commitValidation()
    }
  }

  const isInvalid = () => validation.displayValidation.isInvalid

  const state: RadioGroupState = {
    // Live delegation — spreading `validation` would flatten the getters and
    // freeze realtime/display validation at setup time.
    get realtimeValidation() {
      return validation.realtimeValidation
    },
    get displayValidation() {
      return validation.displayValidation
    },
    updateValidation: (result) => validation.updateValidation(result),
    resetValidation: () => validation.resetValidation(),
    commitValidation: () => validation.commitValidation(),
    get name() {
      return toValue(props.name) || name
    },
    get selectedValue() {
      return selectedValue.value ?? null
    },
    // Official: `props.value !== undefined ? initialValue : (props.defaultValue ?? null)`.
    get defaultSelectedValue() {
      return toValue(props.value) !== undefined
        ? (initialValue ?? null)
        : (toValue(props.defaultValue) ?? null)
    },
    setSelectedValue,
    get lastFocusedValue() {
      return lastFocusedValue.value
    },
    setLastFocusedValue(value: string | null) {
      lastFocusedValue.value = value
    },
    get isDisabled() {
      return Boolean(toValue(props.isDisabled))
    },
    get isReadOnly() {
      return Boolean(toValue(props.isReadOnly))
    },
    get isRequired() {
      return Boolean(toValue(props.isRequired))
    },
    get validationState() {
      return toValue(props.validationState) || (isInvalid() ? 'invalid' : null)
    },
    get isInvalid() {
      return isInvalid()
    },
  }

  return state
}
