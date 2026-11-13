/*
 * Port of `react-stately@3.51.0` `useFormValidationState`
 * (`packages/react-stately/src/form/useFormValidationState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — official does not export it publicly either.
 * This slice has no Form, so there is no FormValidationContext and no server
 * errors: those paths collapse away.
 */

import {computed, ref, toValue, type MaybeRefOrGetter} from 'vue'

export interface ValidationResult {
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: ValidityState
}

export const VALID_VALIDITY_STATE: ValidityState = {
  badInput: false,
  customError: false,
  patternMismatch: false,
  rangeOverflow: false,
  rangeUnderflow: false,
  stepMismatch: false,
  tooLong: false,
  tooShort: false,
  typeMismatch: false,
  valueMissing: false,
  valid: true,
}

const CUSTOM_VALIDITY_STATE: ValidityState = {
  ...VALID_VALIDITY_STATE,
  customError: true,
  valid: false,
}

export const DEFAULT_VALIDATION_RESULT: ValidationResult = {
  isInvalid: false,
  validationDetails: VALID_VALIDITY_STATE,
  validationErrors: [],
}

export type ValidationFunction<T> = (
  value: T,
) => true | string | string[] | null | undefined

export interface FormValidationProps<T> {
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  name?: MaybeRefOrGetter<string | string[] | undefined>
  value: MaybeRefOrGetter<T | null>
  validate?: (value: T) => true | string | string[] | null | undefined
  validationBehavior?: MaybeRefOrGetter<'native' | 'aria' | undefined>
  builtinValidation?: MaybeRefOrGetter<ValidationResult | null | undefined>
}

export interface FormValidationState {
  /** Realtime validation results, updated as the user edits the value. */
  readonly realtimeValidation: ValidationResult
  /** Currently displayed validation results, updated when the user commits their changes. */
  readonly displayValidation: ValidationResult
  /**
   * Updates the current validation result. Not displayed to the user until `commitValidation` is
   * called.
   */
  updateValidation(result: ValidationResult): void
  /** Resets the displayed validation state to valid when the user resets the form. */
  resetValidation(): void
  /** Commits the realtime validation so it is displayed to the user. */
  commitValidation(): void
}

export function useFormValidationState<T>(props: FormValidationProps<T>): FormValidationState {
  // If the isInvalid prop is controlled, update validation result in realtime.
  const controlledError = computed<ValidationResult | null>(() => {
    const isInvalid = toValue(props.isInvalid)
    if (isInvalid === undefined) {
      return null
    }
    let combined = isInvalid
    const validationState = toValue(props.validationState)
    if (validationState === 'invalid') {
      combined ||= true
    }
    return {
      isInvalid: combined,
      validationErrors: [],
      validationDetails: CUSTOM_VALIDITY_STATE,
    }
  })

  // Perform custom client side validation.
  const clientError = computed<ValidationResult | null>(() => {
    const value = toValue(props.value)
    const validate = props.validate
    if (!validate || value == null) {
      return null
    }
    const validateErrors = runValidate(validate, value)
    return getValidationResult(validateErrors)
  })

  const builtinValidation = computed<ValidationResult | null>(() => {
    const builtin = toValue(props.builtinValidation)
    if (builtin?.validationDetails.valid) {
      return null
    }
    return builtin ?? null
  })

  // Track the next validation state in a ref until commitValidation is called.
  const nextValidation = ref<ValidationResult>(DEFAULT_VALIDATION_RESULT)
  const currentValidity = ref<ValidationResult>(DEFAULT_VALIDATION_RESULT)

  const validationBehavior = computed<'native' | 'aria'>(
    () => toValue(props.validationBehavior) ?? 'aria',
  )

  const realtimeValidation = computed<ValidationResult>(
    () =>
      controlledError.value ||
      clientError.value ||
      builtinValidation.value ||
      DEFAULT_VALIDATION_RESULT,
  )

  const displayValidation = computed<ValidationResult>(
    () =>
      validationBehavior.value === 'native'
        ? controlledError.value || currentValidity.value
        : controlledError.value ||
          clientError.value ||
          builtinValidation.value ||
          currentValidity.value,
  )

  const isEqualCurrent = (error: ValidationResult) =>
    isEqualValidation(error, currentValidity.value)

  return {
    get realtimeValidation() {
      return realtimeValidation.value
    },
    get displayValidation() {
      return displayValidation.value
    },
    updateValidation(value: ValidationResult) {
      // If validationBehavior is 'aria', update in realtime. Otherwise, store in a ref until commit.
      if (validationBehavior.value === 'aria' && !isEqualCurrent(value)) {
        currentValidity.value = value
      } else {
        nextValidation.value = value
      }
    },
    resetValidation() {
      // Update the currently displayed validation state to valid on form reset,
      // even if the native validity says it isn't. It'll show again on the next form submit.
      const error = DEFAULT_VALIDATION_RESULT
      if (!isEqualCurrent(error)) {
        currentValidity.value = error
      }
    },
    commitValidation() {
      // Commit validation state so the user sees it on blur/change/submit.
      const error =
        clientError.value || builtinValidation.value || nextValidation.value
      if (!isEqualCurrent(error)) {
        currentValidity.value = error
      }
    },
  }
}

function runValidate<T>(
  validate: ValidationFunction<T>,
  value: T,
): string[] {
  let e = validate(value)
  if (e && typeof e !== 'boolean') {
    return asArray(e as string | string[])
  }
  return []
}

function getValidationResult(errors: string[]): ValidationResult | null {
  return errors.length
    ? {
        isInvalid: true,
        validationErrors: errors,
        validationDetails: CUSTOM_VALIDITY_STATE,
      }
    : null
}

function isEqualValidation(a: ValidationResult | null, b: ValidationResult | null): boolean {
  if (a === b) {
    return true
  }

  return (
    !!a &&
    !!b &&
    a.isInvalid === b.isInvalid &&
    a.validationErrors.length === b.validationErrors.length &&
    a.validationErrors.every((x, i) => x === b.validationErrors[i]) &&
    Object.entries(a.validationDetails).every(([k, v]) => (b.validationDetails as any)[k] === v)
  )
}

function asArray<T>(v: T | T[]): T[] {
  if (!v) {
    return []
  }

  return Array.isArray(v) ? v : [v]
}

export function mergeValidation(...results: ValidationResult[]): ValidationResult {
  const errors = new Set<string>()
  let isInvalid = false
  const validationDetails = {
    ...VALID_VALIDITY_STATE,
  }

  for (const v of results) {
    for (const e of v.validationErrors) {
      errors.add(e)
    }

    isInvalid ||= v.isInvalid
    for (const key in validationDetails) {
      validationDetails[key as keyof ValidityState] ||=
        v.validationDetails[key as keyof ValidityState]
    }
  }

  validationDetails.valid = !isInvalid
  return {
    isInvalid,
    validationErrors: [...errors],
    validationDetails,
  }
}
