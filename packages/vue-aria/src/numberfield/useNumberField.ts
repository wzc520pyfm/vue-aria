/*
 * Port of `react-aria@3.53.1` `useNumberField`
 * (`packages/react-aria/src/numberfield/useNumberField.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. All returned `*Props` are plain objects with live getters
 * (never ComputedRefs), matching the established hook contract. Enter commits
 * via the keyboard shortcut and calls `commitValidation`; wheel steps only
 * when focus is within the field and the field is not disabled/read-only/
 * `isWheelDisabled`. The `name` prop is intentionally NOT placed on the visible
 * input — components render a separate hidden input (official RAC pattern).
 * Native min/max/step validation on `commitBehavior: 'validate'` is implemented
 * with a detached native `<input type="number">` (official `useNativeValidation`).
 */

import type {
  NumberFieldProps,
  NumberFieldState,
} from 'vue-stately/useNumberFieldState'
import {NumberFormatter} from '@internationalized/number'
import {computed, ref, toValue, watch, watchEffect, type MaybeRefOrGetter, type Ref} from 'vue'
import {announce} from '../live-announcer/LiveAnnouncer'
import {useFocus} from '../interactions/useFocus'
import {useFocusWithin} from '../interactions/useFocusWithin'
import {useFormattedTextField} from '../textfield/useFormattedTextField'
import {useFormReset} from '../utils/useFormReset'
import {useFormValidation} from '../form/useFormValidation'
import {useId} from '../utils/useId'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import {useNumberFormatter} from '../i18n/useNumberFormatter'
import {useScrollWheel} from '../interactions/useScrollWheel'
import {useSpinButton} from '../spinbutton/useSpinButton'
import {isAndroid, isIOS, isIPhone} from '../utils/platform'
import {mergeProps} from '../utils/mergeProps'
import numberfieldStrings from '../i18n/numberfieldStrings'

export interface AriaNumberFieldProps
  extends NumberFieldProps {
  /**
   * A custom aria-label for the decrement button. If not provided, the localized string "Decrement"
   * is used.
   */
  decrementAriaLabel?: MaybeRefOrGetter<string | undefined>
  /**
   * A custom aria-label for the increment button. If not provided, the localized string "Increment"
   * is used.
   */
  incrementAriaLabel?: MaybeRefOrGetter<string | undefined>
  /**
   * Enables or disables changing the value with scroll.
   */
  isWheelDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Handler for paste events on the input. */
  onPaste?: (e: ClipboardEvent) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
}

export interface NumberFieldAria {
  /** Props for the label element. Plain object with live getters. */
  labelProps: Record<string, any>
  /** Props for the group wrapper around the input and stepper buttons. Plain object with live getters. */
  groupProps: Record<string, any>
  /** Props for the input element. Plain object with live getters. */
  inputProps: Record<string, any>
  /** Props for the increment button, to be passed to `useButton`. Plain object with live getters. */
  incrementButtonProps: Record<string, any>
  /** Props for the decrement button, to be passed to `useButton`. Plain object with live getters. */
  decrementButtonProps: Record<string, any>
  /** Props for the number field's description element, if any. Plain object with live getters. */
  descriptionProps: Record<string, any>
  /** Props for the number field's error message element, if any. Plain object with live getters. */
  errorMessageProps: Record<string, any>
  /** Whether the number field is invalid. Live — see getter. */
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

/**
 * Provides the behavior and accessibility implementation for a number field component. Number
 * fields allow users to enter a number, and increment or decrement the value using stepper
 * buttons.
 */
export function useNumberField(
  props: AriaNumberFieldProps,
  state: NumberFieldState,
  inputRef: Ref<HTMLInputElement | null>,
): NumberFieldAria {
  const {
    increment,
    incrementToMax,
    decrement,
    decrementToMin,
    commit,
    commitValidation,
  } = state

  const isDisabled = () => Boolean(toValue(props.isDisabled))
  const isReadOnly = () => Boolean(toValue(props.isReadOnly))
  const isWheelDisabled = () => Boolean(toValue(props.isWheelDisabled))
  const validationBehavior = () => toValue(props.validationBehavior) ?? 'native'
  const stringFormatter = useLocalizedStringFormatter(
    numberfieldStrings as any,
    '@react-aria/numberfield',
  )

  const commitAndAnnounce = () => {
    const oldValue = inputRef.value?.value ?? ''
    // Set input value to normalized valid value. In Vue, state updates and the
    // announcer read below are synchronous with the setter; the DOM input
    // re-renders on the next tick with the formatted value.
    commit()

    const newValue = state.inputValue ?? ''
    if (newValue !== oldValue) {
      announce(newValue, 'assertive')
    }
  }

  const generatedId = useId()
  const inputId = computed(() => toValue(props.id) ?? generatedId.value)
  const {focusProps} = useFocus({
    onBlur() {
      commitAndAnnounce()
    },
  })

  const formatOptions = computed(() => toValue(props.formatOptions))
  const numberFormatter = useNumberFormatter(() => formatOptions.value)
  const intlOptions = computed(() => numberFormatter.resolvedOptions())

  // Replace negative textValue formatted using currencySign: 'accounting'
  // with a textValue that can be announced using a minus sign.
  const textValueFormatter = useNumberFormatter(
    () => ({...formatOptions.value, currencySign: undefined} as any),
  )
  const textValue = computed(() =>
    isNaN(state.numberValue) ? '' : textValueFormatter.format(state.numberValue),
  )

  const {
    spinButtonProps,
    incrementButtonProps: incButtonProps,
    decrementButtonProps: decButtonProps,
  } = useSpinButton({
    isDisabled: () => isDisabled(),
    isReadOnly: () => isReadOnly(),
    isRequired: () => Boolean(toValue(props.isRequired)),
    maxValue: () => toValue(props.maxValue),
    minValue: () => toValue(props.minValue),
    onIncrement: increment,
    onIncrementToMax: incrementToMax,
    onDecrement: decrement,
    onDecrementToMin: decrementToMin,
    value: () => state.numberValue,
    textValue: () => textValue.value,
  })

  const isFocusWithin = ref(false)
  const setFocusWithin = (value: boolean) => {
    isFocusWithin.value = value
  }
  const {focusWithinProps} = useFocusWithin({
    isDisabled: () => isDisabled(),
    onFocusWithinChange: setFocusWithin,
  })

  const onWheel = (e: {deltaX: number; deltaY: number}) => {
    // if on a trackpad, users can scroll in both X and Y at once, check the magnitude of the change
    // if it's mostly in the X direction, then just return, the user probably doesn't mean to inc/dec
    // this isn't perfect, events come in fast with small deltas and a part of the scroll may give a false indication
    // especially if the user is scrolling near 45deg
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
      return
    }
    if (e.deltaY > 0) {
      increment()
    } else if (e.deltaY < 0) {
      decrement()
    }
  }
  // If the input isn't supposed to receive input, disable scrolling.
  const scrollingDisabled = () =>
    isWheelDisabled() || isDisabled() || isReadOnly() || !isFocusWithin.value
  useScrollWheel({onScroll: onWheel, isDisabled: scrollingDisabled}, inputRef)

  // The inputMode attribute influences the software keyboard that is shown on touch devices.
  // Browsers and operating systems are quite inconsistent about what keys are available, however.
  // We choose between numeric and decimal based on whether we allow negative and fractional numbers,
  // and based on testing on various devices to determine what keys are available in each inputMode.
  const hasDecimals = computed(() => (intlOptions.value.maximumFractionDigits ?? 0) > 0)
  const hasNegative = computed(() => {
    const min = toValue(props.minValue)
    return min === undefined || isNaN(min) || min < 0
  })
  const inputMode = computed(() => {
    let mode: 'numeric' | 'decimal' | 'text' = 'numeric'
    if (isIPhone()) {
      // iPhone doesn't have a minus sign in either numeric or decimal.
      // Note this is only for iPhone, not iPad, which always has both
      // minus and decimal in numeric.
      if (hasNegative.value) {
        mode = 'text'
      } else if (hasDecimals.value) {
        mode = 'decimal'
      }
    } else if (isAndroid()) {
      // Android numeric has both a decimal point and minus key.
      // decimal does not have a minus key.
      if (hasNegative.value) {
        mode = 'numeric'
      } else if (hasDecimals.value) {
        mode = 'decimal'
      }
    }
    return mode
  })

  const onChange = (value: string) => {
    if (state.validate(value)) {
      state.setInputValue(value)
    }
  }

  const onPaste = (e: ClipboardEvent) => {
    props.onPaste?.(e)
    const inputElement = (e.target as HTMLInputElement | null) ?? null
    // we can only handle the case where the paste takes over the entire input, otherwise things get very complicated
    // trying to calculate the new string based on what the paste is replacing and where in the source string it is
    if (
      inputElement &&
      (inputElement.selectionEnd ?? -1) - (inputElement.selectionStart ?? 0) ===
        inputElement.value.length
    ) {
      e.preventDefault()
      // commit so that the user gets to see what it formats to immediately
      // paste happens before inputRef's value is updated, so have to prevent the default and do it ourselves
      // spin button will then handle announcing the new value, this should work with controlled state as well
      // because the announcement is done as a result of the new rendered input value if there is one
      commit(e.clipboardData?.getData?.('text/plain')?.trim() ?? '')
    }
  }

  const {keyboardProps} = useKeyboard({
    isDisabled: () => isDisabled() || isReadOnly(),
    shortcuts: {
      Enter: () => {
        commit()
        commitValidation()
        return {shouldPreventDefault: false}
      },
    },
    onKeyDown: (e) => props.onKeyDown?.(e),
    onKeyUp: (e) => props.onKeyUp?.(e),
  })

  const {
    labelProps,
    inputProps: textFieldPropsFromHook,
    descriptionProps,
    errorMessageProps,
  } = useFormattedTextField(
    {
      id: () => inputId.value,
      // These props are added to a hidden input rather than the formatted textfield.
      name: undefined,
      form: undefined,
      label: () => toValue(props.label),
      description: () => toValue(props.description),
      errorMessage: () => toValue(props.errorMessage),
      autoFocus: () => toValue(props.autoFocus),
      isDisabled: () => isDisabled(),
      isReadOnly: () => isReadOnly(),
      isRequired: () => Boolean(toValue(props.isRequired)),
      isInvalid: () => state.displayValidation.isInvalid,
      validationState: () => toValue(props.validationState),
      validationBehavior,
      'aria-label': () => toValue(props['aria-label']),
      'aria-labelledby': () => toValue(props['aria-labelledby']),
      'aria-describedby': () => toValue(props['aria-describedby']),
      value: () => state.inputValue,
      defaultValue: '!', // an invalid value so that form reset is ignored in onChange above
      autoComplete: 'off',
      type: 'text', // Can't use type="number" because then we can't have things like $ in the field.
      inputMode: () => inputMode.value,
      onChange,
      onBlur: (e: FocusEvent) => props.onBlur?.(e),
      onFocus: (e: FocusEvent) => props.onFocus?.(e),
      onFocusChange: (v: boolean) => props.onFocusChange?.(v),
      onPaste,
      maxLength: undefined,
      // Explicitly drop the number-typed `validate` — the text field needs the
      // string validator from state (see onChange above).
      validate: undefined,
    } as any,
    {
      validate: (value: string) => state.validate(value),
      // useFormValidationState is owned by the state hook; reuse it.
      setInputValue: (value: string) => state.setInputValue(value),
    } as any,
    inputRef,
  )

  // Merge outside useFormattedTextField so useKeyboard's createEventHandler is not nested inside
  // useTextField/useFocusable's createEventHandler (avoids redundant stopPropagation on RS events).
  // Shortcuts run first (mergeProps chains the second argument after the first).
  const textFieldProps = mergeProps(keyboardProps, textFieldPropsFromHook)

  useFormReset(
    inputRef,
    () => state.defaultNumberValue,
    (value) => state.setNumberValue(value as number),
  )
  useFormValidation(
    {
      validationBehavior,
      focus() {
        inputRef.value?.focus()
      },
    },
    state,
    inputRef,
  )
  useNativeValidation({
    state,
    validationBehavior,
    commitBehavior: () => toValue(props.commitBehavior) ?? 'snap',
    inputRef,
    minValue: () => toValue(props.minValue),
    maxValue: () => toValue(props.maxValue),
    step: () => toValue(props.step),
  })

  const inputProps: Record<string, any> = mergeProps(
    spinButtonProps,
    focusProps as any,
    textFieldProps as any,
    {
      // override the spinbutton role, we can't focus a spin button with VO
      role: null,
      // ignore aria-roledescription on iOS so that required state will announce when it is present
      'aria-roledescription': !isIOS() ? stringFormatter.format('numberField') : null,
      'aria-valuemax': null,
      'aria-valuemin': null,
      'aria-valuenow': null,
      'aria-valuetext': null,
      autoCorrect: 'off',
      spellCheck: 'false',
    },
  )

  if (validationBehavior() === 'native') {
    Object.defineProperty(inputProps, 'aria-required', {value: undefined, enumerable: true, configurable: true, writable: true})
  }

  const onButtonPressStart = (e: {pointerType: string; target: Element}) => {
    // If focus is already on the input, keep it there so we don't hide the
    // software keyboard when tapping the increment/decrement buttons.
    if (
      typeof document !== 'undefined' &&
      document.activeElement === inputRef.value
    ) {
      return
    }

    // Otherwise, when using a mouse, move focus to the input.
    // On touch, or with a screen reader, focus the button so that the software
    // keyboard does not appear and the screen reader cursor is not moved off the button.
    if (e.pointerType === 'mouse') {
      inputRef.value?.focus()
    } else if (e.target instanceof HTMLElement) {
      e.target.focus()
    }
  }

  // Determine the label for the increment and decrement buttons. There are 4 cases:
  //
  // 1. With a visible label that is a string: aria-label: `Increase ${props.label}`
  // 2. With a visible label that is JSX: aria-label: 'Increase', aria-labelledby: '${incrementId} ${labelId}'
  // 3. With an aria-label: aria-label: `Increase ${props['aria-label']}`
  // 4. With an aria-labelledby: aria-label: 'Increase', aria-labelledby: `${incrementId} ${props['aria-labelledby']}`
  //
  // (1) and (2) could possibly be combined and both use aria-labelledby. However, placing the label in
  // the aria-label string rather than using aria-labelledby gives more flexibility to translators to change
  // the order or add additional words around the label if needed.
  const labelProp = computed(() => toValue(props.label))
  const fieldLabel = computed(
    () => toValue(props['aria-label']) || (typeof labelProp.value === 'string' ? labelProp.value : ''),
  )
  const ariaLabelledby = computed(() => {
    if (fieldLabel.value) {
      return undefined
    }
    return labelProp.value != null
      ? labelProps.id
      : (toValue(props['aria-labelledby']) as string | undefined)
  })

  const incrementId = useId()
  const decrementId = useId()

  const incrementAriaLabelProp = computed(() => toValue(props.incrementAriaLabel))
  const decrementAriaLabelProp = computed(() => toValue(props.decrementAriaLabel))
  const incrementAriaLabel = computed(
    () =>
      incrementAriaLabelProp.value ||
      stringFormatter.format('increase', {fieldLabel: fieldLabel.value}).trim(),
  )
  const decrementAriaLabel = computed(
    () =>
      decrementAriaLabelProp.value ||
      stringFormatter.format('decrease', {fieldLabel: fieldLabel.value}).trim(),
  )

  const incrementButtonProps: Record<string, any> = mergeProps(incButtonProps, {
    get 'aria-label'() {
      return incrementAriaLabel.value
    },
    get id() {
      return ariaLabelledby.value && !incrementAriaLabelProp.value ? incrementId.value : null
    },
    get 'aria-labelledby'() {
      return ariaLabelledby.value && !incrementAriaLabelProp.value
        ? `${incrementId.value} ${ariaLabelledby.value}`
        : null
    },
    get 'aria-controls'() {
      return inputId.value
    },
    excludeFromTabOrder: true,
    preventFocusOnPress: true,
    allowFocusWhenDisabled: true,
    get isDisabled() {
      return !state.canIncrement
    },
    onPressStart: onButtonPressStart,
  })

  const decrementButtonProps: Record<string, any> = mergeProps(decButtonProps, {
    get 'aria-label'() {
      return decrementAriaLabel.value
    },
    get id() {
      return ariaLabelledby.value && !decrementAriaLabelProp.value ? decrementId.value : null
    },
    get 'aria-labelledby'() {
      return ariaLabelledby.value && !decrementAriaLabelProp.value
        ? `${decrementId.value} ${ariaLabelledby.value}`
        : null
    },
    get 'aria-controls'() {
      return inputId.value
    },
    excludeFromTabOrder: true,
    preventFocusOnPress: true,
    allowFocusWhenDisabled: true,
    get isDisabled() {
      return !state.canDecrement
    },
    onPressStart: onButtonPressStart,
  })

  const groupProps: Record<string, any> = mergeProps(focusWithinProps as any, {
    role: 'group',
    get 'aria-disabled'() {
      return isDisabled() || undefined
    },
    get 'aria-invalid'() {
      return state.displayValidation.isInvalid ? ('true' as const) : undefined
    },
  })

  const out: NumberFieldAria = {
    groupProps,
    labelProps,
    inputProps,
    incrementButtonProps,
    decrementButtonProps,
    errorMessageProps,
    descriptionProps,
    isInvalid: state.displayValidation.isInvalid,
    validationErrors: state.displayValidation.validationErrors,
    validationDetails: state.displayValidation.validationDetails,
  }
  // Keep validation fields live — expose getters rather than setup-time snapshots.
  Object.defineProperties(out, {
    isInvalid: {get: () => state.displayValidation.isInvalid, enumerable: true},
    validationErrors: {get: () => state.displayValidation.validationErrors, enumerable: true},
    validationDetails: {get: () => state.displayValidation.validationDetails, enumerable: true},
  })

  // Auto focus the input on mount if requested (official useTextField behavior).
  watch(
    inputRef,
    (el) => {
      if (el && toValue(props.autoFocus)) {
        el.focus()
      }
    },
    {immediate: true, flush: 'post'},
  )
  return out
}

let numberInput: HTMLInputElement | null = null

/**
 * Official `useNativeValidation` (react-aria@3.53.1 numberfield). Validates min/max/step via a
 * detached native `<input type="number">` so the browser supplies the validation message; only
 * applies when `commitBehavior === 'validate'`. In Vue this runs as a post-flush watchEffect so
 * it re-checks whenever the relevant state changes (official runs on every render).
 */
function useNativeValidation(options: {
  state: NumberFieldState
  validationBehavior: MaybeRefOrGetter<'native' | 'aria' | undefined>
  commitBehavior: MaybeRefOrGetter<'snap' | 'validate' | undefined>
  inputRef: Ref<HTMLInputElement | null>
  minValue: MaybeRefOrGetter<number | undefined>
  maxValue: MaybeRefOrGetter<number | undefined>
  step: MaybeRefOrGetter<number | undefined>
}): void {
  watchEffect(
    () => {
      const {state, inputRef} = options
      const input = inputRef.value
      const realtime = state.realtimeValidation
      if (
        toValue(options.commitBehavior) !== 'validate' ||
        realtime.isInvalid ||
        !input ||
        input.disabled
      ) {
        return
      }

      // Create a native number input and use it to implement validation of min/max/step.
      // This lets us get the native validation message provided by the browser instead of needing our own translations.
      if (!numberInput && typeof document !== 'undefined') {
        numberInput = document.createElement('input')
        numberInput.type = 'number'
      }

      if (!numberInput) {
        // For TypeScript.
        return
      }

      const min = toValue(options.minValue)
      const max = toValue(options.maxValue)
      const step = toValue(options.step)
      const value = state.numberValue

      numberInput.min = min != null && !isNaN(min) ? String(min) : ''
      numberInput.max = max != null && !isNaN(max) ? String(max) : ''
      numberInput.step = step != null && !isNaN(step) ? String(step) : ''
      numberInput.value = value != null && !isNaN(value) ? String(value) : ''

      // Merge validity with the visible text input (for other validations like required).
      const valid = input.validity.valid && numberInput.validity.valid
      const validationMessage = input.validationMessage || numberInput.validationMessage
      const validity = {
        isInvalid: !valid,
        validationErrors: validationMessage ? [validationMessage] : [],
        validationDetails: {
          badInput: input.validity.badInput,
          customError: input.validity.customError,
          patternMismatch: input.validity.patternMismatch,
          rangeOverflow: numberInput.validity.rangeOverflow,
          rangeUnderflow: numberInput.validity.rangeUnderflow,
          stepMismatch: numberInput.validity.stepMismatch,
          tooLong: input.validity.tooLong,
          tooShort: input.validity.tooShort,
          typeMismatch: input.validity.typeMismatch,
          valueMissing: input.validity.valueMissing,
          valid,
        },
      }

      state.updateValidation(validity as any)

      // Block form submission if validation behavior is native.
      // This won't overwrite any user-defined validation message because we checked realtimeValidation above.
      if (toValue(options.validationBehavior) === 'native' && !numberInput.validity.valid) {
        input.setCustomValidity(numberInput.validationMessage)
      }
    },
    {flush: 'post'},
  )
}
