/*
 * Port of `react-aria@3.53.1` `useCheckboxGroupItem`
 * (`packages/react-aria/src/checkbox/useCheckboxGroupItem.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. The per-item toggle state passes live getters
 * into `useToggleState` (`isSelected: () => state.isSelected(value)` and live
 * `isReadOnly` / `onChange`), and the WeakMap `name` / `form` /
 * `validationBehavior` are re-read live. Per-item invalid results are merged
 * into the group state through `setInvalid`.
 */

import {onScopeDispose, ref, toValue, watch, type Ref} from 'vue'
import {AriaCheckboxProps, useCheckbox, type CheckboxAria} from './useCheckbox'
import {checkboxGroupData} from './utils'
import type {CheckboxGroupState} from '../../../vue-stately/src/checkbox/useCheckboxGroupState'
import {
  DEFAULT_VALIDATION_RESULT,
  privateValidationStateProp,
  useFormValidationState,
  type ValidationResult,
} from '../../../vue-stately/src/form/useFormValidationState'
import {useToggleState} from '../../../vue-stately/src/toggle/useToggleState'

export interface AriaCheckboxGroupItemProps
  extends Omit<AriaCheckboxProps, 'isSelected' | 'defaultSelected'> {
  /** The value of the checkbox within the group. */
  value: string
  /** Handler that is called when the checkbox's selection changes. */
  onChange?: (isSelected: boolean) => void
}

/**
 * Live derivative of a props object: every base key stays a live getter, with
 * the given overrides taking precedence. Never spreads — spreading would
 * evaluate getter props and freeze them at setup time.
 */
function inheritProps(
  base: Record<string, any>,
  overrides: Record<string, any>,
): Record<string, any> {
  const out: Record<string, any> = {}
  for (const key of Object.keys(base)) {
    if (key in overrides) continue
    Object.defineProperty(out, key, {
      get: () => base[key],
      enumerable: true,
      configurable: true,
    })
  }
  for (const key of Object.keys(overrides)) {
    Object.defineProperty(out, key, {
      get: () => overrides[key],
      enumerable: true,
      configurable: true,
    })
  }
  return out
}

/**
 * Provides the behavior and accessibility implementation for a checkbox component contained within
 * a checkbox group. Checkbox groups allow users to select multiple items from a list of options.
 *
 * @param props - Props for the checkbox.
 * @param state - State for the checkbox, as returned by `useCheckboxGroupState`.
 * @param inputRef - A ref for the HTML input element.
 */
export function useCheckboxGroupItem(
  props: AriaCheckboxGroupItemProps,
  state: CheckboxGroupState,
  inputRef: Ref<HTMLInputElement | null>,
): CheckboxAria {
  const value = () => toValue(props.value)

  const toggleState = useToggleState({
    // Live getters only — never spread the reactive props or freeze values at setup.
    isReadOnly: () => toValue(props.isReadOnly) || state.isReadOnly,
    isSelected: () => state.isSelected(value()),
    defaultSelected: () => state.defaultValue.includes(value()),
    onChange(isSelected) {
      if (isSelected) {
        state.addValue(value())
      } else {
        state.removeValue(value())
      }

      props.onChange?.(isSelected)
    },
  })

  const groupData = () => checkboxGroupData.get(state)
  const validationBehavior = () =>
    (toValue(props.validationBehavior) ?? groupData()?.validationBehavior?.() ?? 'aria') as
      | 'aria'
      | 'native'

  // Local validation for this checkbox.
  const realtimeValidation = useFormValidationState<boolean>({
    // Live getters only — server validation is handled at the group level.
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: undefined,
    value: () => toggleState.isSelected,
    validate: props.validate as any,
    validationBehavior: 'aria',
  })

  // Update the checkbox group state when realtime validation changes.
  const nativeValidation = ref<ValidationResult>(DEFAULT_VALIDATION_RESULT)
  const updateValidation = () => {
    state.setInvalid(
      value(),
      realtimeValidation.realtimeValidation.isInvalid
        ? realtimeValidation.realtimeValidation
        : nativeValidation.value,
    )
  }

  // Official effect runs after every render; the watcher keeps the same
  // post-flush ordering, and unmounting removes the item's entry from the
  // group's merged validation.
  watch(
    () => [
      realtimeValidation.realtimeValidation.isInvalid,
      realtimeValidation.realtimeValidation.validationErrors.join('\u0000'),
    ],
    updateValidation,
    {immediate: true, flush: 'post'},
  )
  onScopeDispose(() => {
    state.setInvalid(value(), DEFAULT_VALIDATION_RESULT)
  })

  // Combine group and checkbox level validation.
  const combinedRealtimeValidation = () =>
    state.realtimeValidation.isInvalid ? state.realtimeValidation : realtimeValidation.realtimeValidation
  const displayValidation = () =>
    validationBehavior() === 'native' ? state.displayValidation : combinedRealtimeValidation()

  const res = useCheckbox(
    inheritProps(props as any, {
      isReadOnly: () => toValue(props.isReadOnly) || state.isReadOnly,
      isDisabled: () => toValue(props.isDisabled) || state.isDisabled,
      name: () => toValue(props.name) || groupData()?.name?.(),
      form: () => toValue(props.form) || groupData()?.form?.(),
      isRequired: () => toValue(props.isRequired) ?? state.isRequired,
      validationBehavior,
      [privateValidationStateProp]: {
        get realtimeValidation() {
          return combinedRealtimeValidation()
        },
        get displayValidation() {
          return displayValidation()
        },
        resetValidation: () => state.resetValidation(),
        commitValidation: () => state.commitValidation(),
        updateValidation(v: ValidationResult) {
          nativeValidation.value = v
          updateValidation()
        },
      },
    }),
    toggleState,
    inputRef,
  )

  // Extend aria-describedby on the toggle's input props with the group-level
  // description / error message ids. Capture the base getter first — defining
  // the property on the same object must not recurse through itself.
  const baseInputProps = res.inputProps
  const baseDescribedByDesc = Object.getOwnPropertyDescriptor(baseInputProps, 'aria-describedby')
  const baseDescribedBy = baseDescribedByDesc?.get
    ? () => baseDescribedByDesc.get!.call(baseInputProps)
    : () => baseDescribedByDesc?.value
  Object.defineProperty(baseInputProps, 'aria-describedby', {
    get: () =>
      [
        baseDescribedBy(),
        state.isInvalid ? groupData()?.errorMessageId?.() : null,
        groupData()?.descriptionId?.(),
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    enumerable: true,
    configurable: true,
  })
  const inputProps = baseInputProps

  const out = {
    labelProps: res.labelProps,
    inputProps,
    descriptionProps: res.descriptionProps,
    errorMessageProps: res.errorMessageProps,
  } as CheckboxAria
  Object.defineProperties(out, {
    isSelected: {get: () => res.isSelected, enumerable: true, configurable: true},
    isPressed: {get: () => res.isPressed, enumerable: true, configurable: true},
    isDisabled: {get: () => res.isDisabled, enumerable: true, configurable: true},
    isReadOnly: {get: () => res.isReadOnly, enumerable: true, configurable: true},
    isInvalid: {get: () => res.isInvalid, enumerable: true, configurable: true},
    validationErrors: {get: () => res.validationErrors, enumerable: true, configurable: true},
    validationDetails: {get: () => res.validationDetails, enumerable: true, configurable: true},
  })
  return out
}
