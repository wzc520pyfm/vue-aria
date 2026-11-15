/*
 * Port of `react-stately@3.51.0` `useCheckboxGroupState`
 * (`packages/react-stately/src/checkbox/useCheckboxGroupState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters; per-item
 * invalid results are merged through the internal `useFormValidationState` and
 * `mergeValidation` machinery. The returned state is a plain object with live
 * getters, not ComputedRefs.
 */

import {ref, toValue, type MaybeRefOrGetter} from 'vue'
import {
  mergeValidation,
  useFormValidationState,
  type FormValidationState,
  type ValidationFunction,
  type ValidationResult,
} from '../form/useFormValidationState'
import {useControlledState} from '../utils/useControlledState'

export interface CheckboxGroupProps {
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<string[] | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<string[] | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: string[]) => void
  /** Whether the checkbox group is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the checkbox group is read only. */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the checkbox group is required. */
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the checkbox group is invalid according to application logic. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The current validation state of the checkbox group.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /**
   * A function that returns an error message if the group value is invalid, or `true` if valid.
   */
  validate?: ValidationFunction<string[]>
  /**
   * Whether to use native HTML form validation to prevent form submission, or mark the
   * group as invalid via ARIA instead.
   *
   * @default 'aria'
   */
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  /** The name of the inputs, used when submitting an HTML form. */
  name?: MaybeRefOrGetter<string | undefined>
  /** The id of the group element. */
  id?: MaybeRefOrGetter<string | undefined>
  /** The HTML form element the inputs are associated with. */
  form?: MaybeRefOrGetter<string | undefined>
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

export interface CheckboxGroupState extends FormValidationState {
  /** Current selected values. */
  readonly value: readonly string[]
  /** Default selected values. */
  readonly defaultValue: readonly string[]

  /** Whether the checkbox group is disabled. */
  readonly isDisabled: boolean

  /** Whether the checkbox group is read only. */
  readonly isReadOnly: boolean

  /**
   * The current validation state of the checkbox group.
   *
   * @deprecated Use `isInvalid` instead.
   */
  readonly validationState: 'valid' | 'invalid' | null

  /** Whether the checkbox group is invalid. */
  readonly isInvalid: boolean

  /**
   * Whether the checkboxes in the group are required.
   * This changes to false once at least one item is selected.
   */
  readonly isRequired: boolean

  /** Returns whether the given value is selected. */
  isSelected(value: string): boolean

  /** Sets the selected values. */
  setValue(value: string[]): void

  /** Adds a value to the set of selected values. */
  addValue(value: string): void

  /** Removes a value from the set of selected values. */
  removeValue(value: string): void

  /** Toggles a value in the set of selected values. */
  toggleValue(value: string): void

  /** Sets whether one of the checkboxes is invalid. */
  setInvalid(value: string, validation: ValidationResult): void
}

/**
 * Provides state management for a checkbox group component. Provides a name for the group,
 * and manages selection and focus state.
 */
export function useCheckboxGroupState(props: CheckboxGroupProps = {}): CheckboxGroupState {
  const [selectedValues, setValue] = useControlledState<string[]>(
    props.value,
    () => toValue(props.defaultValue) || [],
    props.onChange,
  )
  // Capture the initial selected values once (official `useState(selectedValues)`).
  const initialValues = selectedValues.value

  const invalidValues = ref(new Map<string, ValidationResult>())
  const validation = useFormValidationState<string[]>({
    // Live delegation — never spread the reactive props object.
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: () => toValue(props.name),
    value: () => selectedValues.value as string[],
    validate: props.validate,
    validationBehavior: () => toValue(props.validationBehavior),
  })

  const isInvalid = () => validation.displayValidation.isInvalid
  const isReadOnly = () => Boolean(toValue(props.isReadOnly))
  const isDisabled = () => Boolean(toValue(props.isDisabled))

  const state: CheckboxGroupState = {
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
    get value() {
      return selectedValues.value
    },
    get defaultValue() {
      return toValue(props.defaultValue) ?? initialValues
    },
    setValue(value: string[]) {
      if (isReadOnly() || isDisabled()) {
        return
      }
      setValue(value)
    },
    get isDisabled() {
      return isDisabled()
    },
    get isReadOnly() {
      return isReadOnly()
    },
    isSelected(value: string) {
      return selectedValues.value.includes(value)
    },
    addValue(value: string) {
      if (isReadOnly() || isDisabled()) {
        return
      }
      setValue(selectedValues.value.includes(value) ? selectedValues.value : [...selectedValues.value, value])
    },
    removeValue(value: string) {
      if (isReadOnly() || isDisabled()) {
        return
      }
      if (selectedValues.value.includes(value)) {
        setValue(selectedValues.value.filter((existingValue) => existingValue !== value))
      }
    },
    toggleValue(value: string) {
      if (isReadOnly() || isDisabled()) {
        return
      }
      if (selectedValues.value.includes(value)) {
        setValue(selectedValues.value.filter((existingValue) => existingValue !== value))
      } else {
        setValue([...selectedValues.value, value])
      }
    },
    setInvalid(value: string, v: ValidationResult) {
      const s = new Map(invalidValues.value)
      if (v.isInvalid) {
        s.set(value, v)
      } else {
        s.delete(value)
      }

      invalidValues.value = s
      validation.updateValidation(mergeValidation(...s.values()))
    },
    get validationState() {
      return toValue(props.validationState) ?? (isInvalid() ? 'invalid' : null)
    },
    get isInvalid() {
      return isInvalid()
    },
    get isRequired() {
      return Boolean(toValue(props.isRequired)) && selectedValues.value.length === 0
    },
  }

  return state
}
