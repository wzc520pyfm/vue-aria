/*
 * Port of `react-stately@3.51.0` `useNumberFieldState`
 * (`packages/react-stately/src/numberfield/useNumberFieldState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters so
 * controlled values are never snapshotted at setup time. Derived state is
 * exposed as plain object getters (not ComputedRefs), matching the established
 * hook contract. `locale` is a live prop; `commitBehavior` defaults to `'snap'`.
 */

import {NumberFormatter, NumberParser} from '@internationalized/number'
import {computed, ref, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {
  useFormValidationState,
  privateValidationStateProp,
  type FormValidationState,
} from '../form/useFormValidationState'
import {useControlledState} from '../utils/useControlledState'
import {clamp, snapValueToStep} from '../utils/number'

/** Validation props shared by the number field state (official `Validation<number>`). */
export interface NumberFieldValidationProps {
  /**
   * Whether to use native HTML form validation to prevent form submission when the value is
   * missing or invalid, or mark the field as invalid via ARIA instead.
   *
   * @default 'aria'
   */
  validationBehavior?: MaybeRefOrGetter<'native' | 'aria' | undefined>
  /**
   * A function that returns an error message if the value is invalid, or `true` if the value is
   * valid. Realtime validation is only performed when the value changes, and is not displayed
   * until the field is committed.
   */
  validate?: (value: number | null) => true | string | string[] | null | undefined
  /** Whether the value is invalid according to application logic. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The current validation state of the field.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
}

/** Input base props (official `InputBase`). */
export interface NumberFieldInputBaseProps {
  /** Whether the field is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the field can be selected but not changed by the user. */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
}

/** Range input props (official `RangeInputBase<number>`). */
export interface NumberFieldRangeInputBaseProps {
  /** The smallest value to allow. */
  minValue?: MaybeRefOrGetter<number | undefined>
  /** The largest value to allow. */
  maxValue?: MaybeRefOrGetter<number | undefined>
  /**
   * The amount to increment or decrement the value by.
   *
   * @default 1
   */
  step?: MaybeRefOrGetter<number | undefined>
}

/** Value base props (official `ValueBase<number>`). */
export interface NumberFieldValueBaseProps {
  /** The current value (controlled). */
  value?: MaybeRefOrGetter<number | null | undefined>
  /** The default value (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<number | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: number) => void
}

/** Focusable props (official `FocusableProps`). */
export interface NumberFieldFocusableProps {
  /** Whether the element should receive focus on render. */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  /** Handler that is called when the element's focus status changes. */
  onFocusChange?: (isFocused: boolean) => void
}

/** Text input props (official `TextInputBase`). */
export interface NumberFieldTextInputBaseProps {
  /** Temporary text that occupies the text input when it is empty. */
  placeholder?: MaybeRefOrGetter<string | undefined>
}

/** Labelable props (official `LabelableProps`, textual only). */
export interface NumberFieldLabelableProps {
  /** The label for the field. */
  label?: MaybeRefOrGetter<unknown>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  /** The id of the field element. */
  id?: MaybeRefOrGetter<string | undefined>
  /** The name of the hidden input element, used when submitting an HTML form. */
  name?: MaybeRefOrGetter<string | undefined>
  /** The HTML form element the input is associated with. */
  form?: MaybeRefOrGetter<string | undefined>
  /** The id of the element that describes this field. */
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
}

/** Help text props (official `HelpTextProps`, textual only). */
export interface NumberFieldHelpTextProps {
  /** A description of the field. */
  description?: MaybeRefOrGetter<unknown>
  /** An error message to display when the value is invalid. */
  errorMessage?: MaybeRefOrGetter<unknown>
}

export interface NumberFieldProps
  extends
    NumberFieldInputBaseProps,
    NumberFieldValidationProps,
    NumberFieldFocusableProps,
    NumberFieldTextInputBaseProps,
    NumberFieldValueBaseProps,
    NumberFieldRangeInputBaseProps,
    NumberFieldLabelableProps,
    NumberFieldHelpTextProps {
  /** Whether the input is required on the input before form submission. */
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Formatting options for the value displayed in the number field.
   * This also affects what characters are allowed to be typed by the user.
   */
  formatOptions?: MaybeRefOrGetter<Intl.NumberFormatOptions | undefined>
  /**
   * Controls the behavior of the number field when the user blurs the field after editing. 'snap'
   * will clamp the value to the min/max values, and snap to the nearest step value. 'validate' will
   * not clamp the value, and will validate that the value is within the min/max range and on a
   * valid step.
   *
   * @default 'snap'
   */
  commitBehavior?: MaybeRefOrGetter<'snap' | 'validate' | undefined>
}

export interface NumberFieldState extends FormValidationState {
  /**
   * The current text value of the input. Updated as the user types,
   * and formatted according to `formatOptions` on blur.
   */
  readonly inputValue: string
  /**
   * The currently parsed number value, or NaN if a valid number could not be parsed.
   * Updated based on the `inputValue` as the user types.
   */
  readonly numberValue: number
  /** The default value of the input. */
  readonly defaultNumberValue: number
  /** The minimum value of the number field. */
  readonly minValue: number | undefined
  /** The maximum value of the number field. */
  readonly maxValue: number | undefined
  /** Whether the current value can be incremented according to the maximum value and step. */
  readonly canIncrement: boolean
  /** Whether the current value can be decremented according to the minimum value and step. */
  readonly canDecrement: boolean
  /**
   * Validates a user input string according to the current locale and format options. Values can be
   * partially entered, and may be valid even if they cannot currently be parsed to a number. Can be
   * used to implement validation as a user types.
   */
  validate(value: string): boolean
  /** Sets the current text value of the input. */
  setInputValue(val: string): void
  /** Sets the number value. */
  setNumberValue(val: number): void
  /**
   * Commits the current input value. The value is parsed to a number, clamped according to the
   * minimum and maximum values of the field, and snapped to the nearest step value. This will fire
   * the `onChange` prop with the new value, and if uncontrolled, update the `numberValue`.
   * Typically this is called when the field is blurred.
   *
   * @param value - The value to commit. If not provided, the current input value is used.
   */
  commit(value?: string): void
  /** Increments the current input value to the next step boundary, and fires `onChange`. */
  increment(): void
  /** Decrements the current input value to the next step boundary, and fires `onChange`. */
  decrement(): void
  /** Sets the current value to the `maxValue` if any, and fires `onChange`. */
  incrementToMax(): void
  /** Sets the current value to the `minValue` if any, and fires `onChange`. */
  decrementToMin(): void
}

export interface NumberFieldStateOptions extends NumberFieldProps {
  /**
   * The locale that should be used for parsing.
   *
   * @default 'en-US'
   */
  locale: MaybeRefOrGetter<string>
}

/**
 * Provides state management for a number field component. Number fields allow users to enter a
 * number, and increment or decrement the value using stepper buttons.
 */
export function useNumberFieldState(props: NumberFieldStateOptions): NumberFieldState {
  const locale = computed(() => toValue(props.locale) ?? 'en-US')
  const minValue = computed(() => toValue(props.minValue))
  const maxValue = computed(() => toValue(props.maxValue))
  const step = computed(() => toValue(props.step))
  const formatOptions = computed(() => toValue(props.formatOptions))
  const commitBehavior = computed(() => toValue(props.commitBehavior) ?? 'snap')

  const snapValue = (value: number): number => {
    const s = step.value
    return s === undefined || isNaN(s)
      ? clamp(value, minValue.value, maxValue.value)
      : snapValueToStep(value, minValue.value, maxValue.value, s)
  }

  // `null` controlled values are treated as NaN (empty), mirroring the official `value === null` check.
  const valueProp = computed<number | undefined>(() => {
    const v = toValue(props.value)
    return v === null ? NaN : (v as number | undefined)
  })
  const snappedValueProp = computed<number | undefined>(() => {
    const v = valueProp.value
    if (v !== undefined && !isNaN(v) && commitBehavior.value === 'snap') {
      return snapValue(v)
    }
    return v
  })
  const defaultValueRaw = computed(() => toValue(props.defaultValue) ?? NaN)
  const snappedDefaultValue = computed(() => {
    const d = defaultValueRaw.value
    if (!isNaN(d) && commitBehavior.value === 'snap') {
      return snapValue(d)
    }
    return d
  })

  const [numberValue, setNumberValue] = useControlledState<number>(
    () => snappedValueProp.value as number | undefined,
    () => (isNaN(snappedDefaultValue.value) ? NaN : snappedDefaultValue.value),
    (val) => (props.onChange as any)?.(val),
  )

  // Capture the initial committed value once (official `useState(numberValue)`).
  const initialValue = numberValue.value

  const inputValue = ref<string>(
    isNaN(numberValue.value)
      ? ''
      : new NumberFormatter(locale.value, formatOptions.value).format(numberValue.value),
  )

  const numberParser = computed(
    () => new NumberParser(locale.value, formatOptions.value as any),
  )
  const numberingSystem = computed(() =>
    numberParser.value.getNumberingSystem(inputValue.value),
  )
  const formatter = computed(
    () =>
      new NumberFormatter(locale.value, {
        ...formatOptions.value,
        numberingSystem: numberingSystem.value,
      } as any),
  )
  const intlOptions = computed(() => formatter.value.resolvedOptions())
  const format = (value: number): string =>
    isNaN(value) || value === null ? '' : formatter.value.format(value)

  // Live delegation for the private parent-validation takeover (e.g. NumberField composed inside a Form).
  const parentValidationState = (props as any)[privateValidationStateProp] as
    | FormValidationState
    | undefined
  const validation = useFormValidationState<number>({
    ...(parentValidationState
      ? {[privateValidationStateProp]: parentValidationState}
      : {}),
    // The committed number value drives native/custom validation. NaN is passed through as-is —
    // custom validators receive null for an empty value, matching official `value: null` semantics.
    value: () => (isNaN(numberValue.value) ? null : numberValue.value),
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: () => toValue(props.name),
    validate: (val) => props.validate?.(val) as any,
    validationBehavior: () => toValue(props.validationBehavior),
  })

  const clampStep = computed(() => {
    const s = step.value
    let clamped = s !== undefined && !isNaN(s) ? s : 1
    if (intlOptions.value.style === 'percent' && (s === undefined || isNaN(s))) {
      clamped = 0.01
    }
    return clamped
  })

  const isDisabled = computed(() => Boolean(toValue(props.isDisabled)))
  const isReadOnly = computed(() => Boolean(toValue(props.isReadOnly)))

  // Update the input value when the committed number value or format options change. This mirrors
  // the official render-time prev-value comparison, expressed as a synchronous watcher so dependent
  // computeds observe the reset before they run. Format options are compared by shallow equality
  // (official `isEqualFormatOptions`) so a parent passing a fresh-but-identical options object
  // doesn't wipe in-progress typing.
  const prev = ref({
    numberValue: numberValue.value,
    locale: locale.value,
    formatOptions: formatOptions.value,
  })
  watch(
    [numberValue, locale, formatOptions],
    ([val, loc, opts]) => {
      const optionsChanged = !isEqualFormatOptions(opts, prev.value.formatOptions)
      if (!Object.is(val, prev.value.numberValue) || loc !== prev.value.locale || optionsChanged) {
        inputValue.value = format(val)
      }
      prev.value = {numberValue: val, locale: loc, formatOptions: opts}
    },
    {flush: 'sync'},
  )

  const parsedValue = computed(() => numberParser.value.parse(inputValue.value))

  const setInputValueRaw = (val: string) => {
    inputValue.value = val
  }

  const commit = (overrideValue?: string) => {
    const newInputValue = overrideValue === undefined ? inputValue.value : overrideValue
    let newParsedValue = parsedValue.value
    if (overrideValue !== undefined) {
      newParsedValue = numberParser.value.parse(newInputValue)
    }
    // Set to empty state if input value is empty
    if (!newInputValue.length) {
      setNumberValue(NaN)
      setInputValueRaw(
        toValue(props.value) === undefined ? '' : format(numberValue.value),
      )
      return
    }

    // if it failed to parse, then reset input to formatted version of current number
    if (isNaN(newParsedValue)) {
      setInputValueRaw(format(numberValue.value))
      return
    }

    // Clamp to min and max, round to the nearest step, and round to specified number of digits
    let clampedValue =
      commitBehavior.value === 'snap' ? snapValue(newParsedValue) : newParsedValue
    clampedValue = numberParser.value.parse(format(clampedValue))
    const shouldValidate = clampedValue !== numberValue.value
    setNumberValue(clampedValue)

    // in a controlled state, the numberValue won't change, so we won't go back to our old input without help
    setInputValueRaw(format(toValue(props.value) === undefined ? clampedValue : numberValue.value))
    if (shouldValidate) {
      validation.commitValidation()
    }
  }

  const safeNextStep = (operation: '+' | '-', minMax?: number) => {
    const prev = parsedValue.value

    if (isNaN(prev)) {
      // if the input is empty, start from the min/max value when incrementing/decrementing,
      // or zero if there is no min/max value defined.
      const newValue = minMax === undefined || isNaN(minMax) ? 0 : minMax
      return snapValueToStep(newValue, minValue.value, maxValue.value, clampStep.value)
    } else {
      // otherwise, first snap the current value to the nearest step. if it moves in the direction
      // we're going, use that value, otherwise add the step and snap that value.
      const newValue = snapValueToStep(prev, minValue.value, maxValue.value, clampStep.value)
      if ((operation === '+' && newValue > prev) || (operation === '-' && newValue < prev)) {
        return newValue
      }

      return snapValueToStep(
        handleDecimalOperation(operation, prev, clampStep.value),
        minValue.value,
        maxValue.value,
        clampStep.value,
      )
    }
  }

  const increment = () => {
    const newValue = safeNextStep('+', minValue.value)

    // if we've arrived at the same value that was previously in the state, the
    // input value should be updated to match
    // ex type 4, press increment, highlight the number in the input, type 4 again, press increment
    // you'd be at 5, then incrementing to 5 again, so no re-render would happen and 4 would be left in the input
    if (newValue === numberValue.value) {
      inputValue.value = format(newValue)
    }

    setNumberValue(newValue)
    validation.commitValidation()
  }

  const decrement = () => {
    const newValue = safeNextStep('-', maxValue.value)

    if (newValue === numberValue.value) {
      inputValue.value = format(newValue)
    }

    setNumberValue(newValue)
    validation.commitValidation()
  }

  const incrementToMax = () => {
    const max = maxValue.value
    if (max != null) {
      setNumberValue(snapValueToStep(max, minValue.value, maxValue.value, clampStep.value))
      validation.commitValidation()
    }
  }

  const decrementToMin = () => {
    const min = minValue.value
    if (min != null) {
      setNumberValue(min)
      validation.commitValidation()
    }
  }

  const canIncrement = computed(() => {
    const clampStepValue = clampStep.value
    const parsed = parsedValue.value
    return (
      !isDisabled.value &&
      !isReadOnly.value &&
      (isNaN(parsed) ||
        maxValue.value === undefined ||
        isNaN(maxValue.value) ||
        snapValueToStep(parsed, minValue.value, maxValue.value, clampStepValue) > parsed ||
        handleDecimalOperation('+', parsed, clampStepValue) <= maxValue.value)
    )
  })

  const canDecrement = computed(() => {
    const clampStepValue = clampStep.value
    const parsed = parsedValue.value
    return (
      !isDisabled.value &&
      !isReadOnly.value &&
      (isNaN(parsed) ||
        minValue.value === undefined ||
        isNaN(minValue.value) ||
        snapValueToStep(parsed, minValue.value, maxValue.value, clampStepValue) < parsed ||
        handleDecimalOperation('-', parsed, clampStepValue) >= minValue.value)
    )
  })

  const validate = (value: string) =>
    numberParser.value.isValidPartialNumber(value, minValue.value, maxValue.value)

  const state: NumberFieldState = {
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
    validate,
    increment,
    incrementToMax,
    decrement,
    decrementToMin,
    get canIncrement() {
      return canIncrement.value
    },
    get canDecrement() {
      return canDecrement.value
    },
    get minValue() {
      return minValue.value
    },
    get maxValue() {
      return maxValue.value
    },
    get numberValue() {
      return parsedValue.value
    },
    get defaultNumberValue() {
      return isNaN(snappedDefaultValue.value) ? initialValue : snappedDefaultValue.value
    },
    setNumberValue,
    setInputValue: setInputValueRaw,
    get inputValue() {
      return inputValue.value
    },
    commit,
  }

  return state
}

// Shallow equality is sufficient here because all values in Intl.NumberFormatOptions are primitives.
function isEqualFormatOptions(
  a: Intl.NumberFormatOptions | undefined,
  b: Intl.NumberFormatOptions | undefined,
) {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  for (const key of aKeys) {
    if ((b as any)[key] !== (a as any)[key]) {
      return false
    }
  }
  return true
}

function handleDecimalOperation(
  operator: '-' | '+',
  value1: number,
  value2: number,
): number {
  let result = operator === '+' ? value1 + value2 : value1 - value2

  // Check if we have decimals
  if (value1 % 1 !== 0 || value2 % 1 !== 0) {
    const value1Decimal = value1.toString().split('.')
    const value2Decimal = value2.toString().split('.')
    const value1DecimalLength = (value1Decimal[1] && value1Decimal[1].length) || 0
    const value2DecimalLength = (value2Decimal[1] && value2Decimal[1].length) || 0
    const multiplier = Math.pow(10, Math.max(value1DecimalLength, value2DecimalLength))

    // Transform the decimals to integers based on the precision
    value1 = Math.round(value1 * multiplier)
    value2 = Math.round(value2 * multiplier)

    // Perform the operation on integers values to make sure we don't get a fancy decimal value
    result = operator === '+' ? value1 + value2 : value1 - value2

    // Transform the integer result back to decimal
    result /= multiplier
  }

  return result
}
