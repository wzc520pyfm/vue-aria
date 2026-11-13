/*
 * Port of `react-aria@3.53.1` `useDateField` (including `useTimeField`)
 * (`packages/react-aria/src/datepicker/useDateField.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. All returned `*Props` are plain objects backed by live
 * getters (never ComputedRefs), matching the established hook contract.
 * The `roleSymbol` / `focusManagerSymbol` private props belong to the deferred
 * DatePicker/DateRangePicker and are intentionally not ported.
 */

import type {
  DateFieldState,
  DateValue,
} from 'vue-stately/useDateFieldState'
import type {TimeFieldState, TimeValue} from 'vue-stately/useTimeFieldState'
import {createFocusManager, type FocusManager} from '../focus/useFocusScope'
import {useField} from '../label/useField'
import {useFocusWithin} from '../interactions/useFocusWithin'
import {useDescription} from '../utils/useDescription'
import {useFormReset} from '../utils/useFormReset'
import {useFormValidation} from '../form/useFormValidation'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import datepickerStrings from '../i18n/datepickerStrings'
import {useDatePickerGroup} from './useDatePickerGroup'
import {mergeProps} from '../utils/mergeProps'
import {toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'

export interface AriaDateFieldProps<T extends DateValue = DateValue> {
  /** The label for the field. */
  label?: MaybeRefOrGetter<unknown>
  /** A description of the field. */
  description?: MaybeRefOrGetter<unknown>
  /** An error message to display when the value is invalid. */
  errorMessage?: MaybeRefOrGetter<unknown>
  /** Whether the field is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the field is read only. */
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the field is required. */
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the field is invalid. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /** Whether to use native HTML form validation or ARIA validation. */
  validationBehavior?: MaybeRefOrGetter<'native' | 'aria' | undefined>
  /** The name of the hidden input element, used when submitting an HTML form. */
  name?: MaybeRefOrGetter<string | undefined>
  /** The HTML form element the input is associated with. */
  form?: MaybeRefOrGetter<string | undefined>
  /** Whether the element should receive focus on render. */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  /** Handler that is called when focus moves within the field. */
  onFocusChange?: (isFocused: boolean) => void
}

// Allows this hook to also be used with TimeField
export interface AriaDateFieldOptions<T extends DateValue = DateValue>
  extends AriaDateFieldProps<T> {
  /** The id of the field element. */
  id?: MaybeRefOrGetter<string | undefined>
  /** A ref for the hidden input element for HTML form submission. */
  inputRef?: Ref<HTMLInputElement | null>
}

export interface DateFieldAria {
  /** Props for the field's visible label element, if any. */
  labelProps: Record<string, any>
  /** Props for the field grouping element. */
  fieldProps: Record<string, any>
  /** Props for the hidden input element for HTML form submission. */
  inputProps: Record<string, any>
  /** Props for the description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the error message element, if any. */
  errorMessageProps: Record<string, any>
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: ValidityState
}

// Data that is passed between useDateField and useDateSegment.
interface HookData {
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  focusManager: FocusManager
}

export const hookData: WeakMap<DateFieldState, HookData> = new WeakMap<DateFieldState, HookData>()

/**
 * Provides the behavior and accessibility implementation for a date field component.
 * A date field allows users to enter and edit date and time values using a keyboard.
 * Each part of a date value is displayed in an individually editable segment.
 */
export function useDateField<T extends DateValue = DateValue>(
  props: AriaDateFieldOptions<T>,
  state: DateFieldState,
  ref: Ref<Element | null>,
): DateFieldAria {
  const isInvalid = state.displayValidation.isInvalid
  const validationErrors = state.displayValidation.validationErrors
  const validationDetails = state.displayValidation.validationDetails

  const {labelProps, fieldProps, descriptionProps, errorMessageProps} = useField({
    id: () => toValue(props.id),
    label: () => toValue(props.label),
    'aria-labelledby': () => toValue(props['aria-labelledby']),
    'aria-label': () => toValue(props['aria-label']),
    labelElementType: 'span',
    description: () => toValue(props.description),
    errorMessage: () => toValue(props.errorMessage) || validationErrors,
    isInvalid: () => isInvalid,
    'aria-describedby': () => toValue(props['aria-describedby']),
  })

  const valueOnFocus = {current: null as DateValue | null}
  const {focusWithinProps} = useFocusWithin({
    onFocusWithin(e) {
      valueOnFocus.current = state.value
      props.onFocus?.(e)
    },
    onBlurWithin(e) {
      state.confirmPlaceholder()
      if (state.value !== valueOnFocus.current) {
        state.commitValidation()
      }
      props.onBlur?.(e)
    },
    onFocusWithinChange: props.onFocusChange,
  })

  const stringFormatter = useLocalizedStringFormatter(
    datepickerStrings as any,
    '@react-aria/datepicker',
  )
  const message = state.maxGranularity === 'hour' ? 'selectedTimeDescription' : 'selectedDateDescription'
  const field = state.maxGranularity === 'hour' ? 'time' : 'date'
  const description = {
    get value() {
      return state.value
        ? stringFormatter.format(message, {[field]: state.formatValue({month: 'long'})})
        : ''
    },
  }
  const descProps = useDescription(() => description.value)

  // Add the field's value description.
  const describedBy = () =>
    [descProps['aria-describedby'], fieldProps['aria-describedby']].filter(Boolean).join(' ') ||
    undefined

  const focusManager = createFocusManager(ref)
  const groupProps = useDatePickerGroup(state, ref as any)

  // Pass labels and other information to segments.
  hookData.set(state, {
    get ariaLabel() {
      return toValue(props['aria-label'])
    },
    get ariaLabelledBy() {
      return (
        [labelProps.id, toValue(props['aria-labelledby'])].filter(Boolean).join(' ') || undefined
      )
    },
    get ariaDescribedBy() {
      return describedBy()
    },
    focusManager,
  })

  // Auto focus the first segment on mount if requested (official useEffect).
  if (toValue(props.autoFocus)) {
    watch(
      ref,
      (el) => {
        if (el) {
          focusManager.focusFirst()
        }
      },
      {immediate: true, flush: 'post'},
    )
  }

  useFormReset(
    props.inputRef as any,
    () => state.defaultValue,
    (val) => state.setValue(val as any),
  )
  useFormValidation(
    {
      validationBehavior: () => toValue(props.validationBehavior),
      focus() {
        focusManager.focusFirst()
      },
    },
    state,
    props.inputRef as any,
  )

  const validationBehavior = () => toValue(props.validationBehavior)
  const inputProps: Record<string, any> = {}
  Object.defineProperties(inputProps, {
    type: {
      get: () => (validationBehavior() === 'native' ? 'text' : 'hidden'),
      enumerable: true,
      configurable: true,
    },
    hidden: {
      get: () => (validationBehavior() === 'native' ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    name: {get: () => toValue(props.name), enumerable: true, configurable: true},
    form: {get: () => toValue(props.form), enumerable: true, configurable: true},
    value: {
      get: () => state.value?.toString() || '',
      enumerable: true,
      configurable: true,
    },
    disabled: {get: () => toValue(props.isDisabled), enumerable: true, configurable: true},
    required: {
      get: () => (validationBehavior() === 'native' ? toValue(props.isRequired) : undefined),
      enumerable: true,
      configurable: true,
    },
    // Ignore framework warning for controlled input without handler.
    onChange: {value: () => {}, enumerable: true, writable: true},
  })

  const domProps: Record<string, any> = {}
  if (toValue(props.id) != null) {
    Object.defineProperty(domProps, 'id', {
      get: () => toValue(props.id),
      enumerable: true,
      configurable: true,
    })
  }

  const fieldAriaProps: Record<string, any> = {
    role: 'group',
  }
  Object.defineProperties(fieldAriaProps, {
    'aria-disabled': {
      get: () => (toValue(props.isDisabled) ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-describedby': {
      get: describedBy,
      enumerable: true,
      configurable: true,
    },
  })

  const mergedFieldProps = mergeProps(
    domProps,
    fieldProps,
    fieldAriaProps as any,
    groupProps,
    focusWithinProps as any,
    {
      onKeyDown: props.onKeyDown,
      onKeyUp: props.onKeyUp,
      style: {unicodeBidi: 'isolate'},
    },
  )

  const labelPropsOut: Record<string, any> = mergeProps(labelProps as any, {
    onClick: () => {
      focusManager.focusFirst()
    },
  })

  return {
    labelProps: labelPropsOut,
    fieldProps: mergedFieldProps,
    inputProps,
    descriptionProps,
    errorMessageProps,
    get isInvalid() {
      return state.displayValidation.isInvalid
    },
    get validationErrors() {
      return state.displayValidation.validationErrors
    },
    get validationDetails() {
      return state.displayValidation.validationDetails
    },
  }
}

export interface AriaTimeFieldProps<T extends TimeValue = TimeValue>
  extends AriaDateFieldProps<any> {}

export interface AriaTimeFieldOptions<T extends TimeValue = TimeValue>
  extends AriaTimeFieldProps<T> {
  /** A ref for the hidden input element for HTML form submission. */
  inputRef?: Ref<HTMLInputElement | null>
}

/**
 * Provides the behavior and accessibility implementation for a time field component.
 * A time field allows users to enter and edit time values using a keyboard.
 * Each part of a time value is displayed in an individually editable segment.
 */
export function useTimeField<T extends TimeValue = TimeValue>(
  props: AriaTimeFieldOptions<T>,
  state: TimeFieldState,
  ref: Ref<Element | null>,
): DateFieldAria {
  const res = useDateField(props as any, state as any, ref)
  const inputProps = res.inputProps
  Object.defineProperties(inputProps, {
    value: {
      get: () => state.timeValue?.toString() || '',
      enumerable: true,
      configurable: true,
    },
  })
  return res
}
