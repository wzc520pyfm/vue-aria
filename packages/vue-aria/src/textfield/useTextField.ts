/*
 * Port of `react-aria@3.53.1` `useTextField`
 * (`packages/react-aria/src/textfield/useTextField.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Controlled/uncontrolled value state goes through
 * `useControlledState`, validation through the internal
 * `useFormValidationState` / `useFormValidation` / `useFormReset` machinery, and
 * the rendered element type is a live `inputElementType` prop (`'input'` or
 * `'textarea'`); a textarea receives no `type` / `pattern`.
 *
 * No I18nProvider / public form-validation machinery here beyond the internal
 * hooks: validation state is derived from `isInvalid` / `validationState` /
 * `validate` props and native validity. New hook *Props are plain objects with
 * live getters, not ComputedRefs.
 */

import {computed, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import {mergeProps} from '../utils/mergeProps'
import {useControlledState} from '../../../vue-stately/src/utils/useControlledState'
import {useField} from '../label/useField'
import {useFormReset} from '../utils/useFormReset'
import {useFormValidation} from '../form/useFormValidation'
// vue-stately keeps `useFormValidationState` internal (no public subpath;
// official reaches it via `react-stately/private/form/useFormValidationState`).
// The workspace sources are part of the typecheck program and tests alias, so
// import the internal module directly. tsup inlines it at build time.
import {useFormValidationState} from '../../../vue-stately/src/form/useFormValidationState'

export interface TextFieldProps<T = HTMLInputElement> {
  id?: MaybeRefOrGetter<string | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  type?: MaybeRefOrGetter<string | undefined>
  placeholder?: MaybeRefOrGetter<string | undefined>
  value?: MaybeRefOrGetter<string | undefined>
  defaultValue?: MaybeRefOrGetter<string | undefined>
  /** Handler that is called when the value changes. Receives the new value. */
  onChange?: (value: string) => void
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether to use native HTML form validation to prevent form submission when the value is
   * missing or invalid, or mark the field as invalid via ARIA instead.
   *
   * @default 'aria'
   */
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  /**
   * The current validation state of the field.
   *
   * @deprecated Use `isInvalid` instead.
   */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /**
   * A function that returns an error message if a given value is invalid, or `true` if the value is
   * valid. Realtime validation is only performed when the value changes.
   */
  validate?: (value: string) => true | string | string[] | null | undefined
  autoComplete?: MaybeRefOrGetter<string | undefined>
  autoCapitalize?: MaybeRefOrGetter<string | undefined>
  maxLength?: MaybeRefOrGetter<number | undefined>
  minLength?: MaybeRefOrGetter<number | undefined>
  pattern?: MaybeRefOrGetter<string | undefined>
  inputMode?: MaybeRefOrGetter<string | undefined>
  autoCorrect?: MaybeRefOrGetter<string | undefined>
  spellCheck?: MaybeRefOrGetter<string | boolean | undefined>
  enterKeyHint?: MaybeRefOrGetter<string | undefined>
  label?: unknown
  description?: unknown
  errorMessage?: unknown
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  /** Used for aria-describedby passthrough. */
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-activedescendant'?: MaybeRefOrGetter<string | undefined>
  'aria-autocomplete'?: MaybeRefOrGetter<string | undefined>
  'aria-haspopup'?: MaybeRefOrGetter<boolean | string | undefined>
  'aria-controls'?: MaybeRefOrGetter<string | undefined>
  'aria-errormessage'?: MaybeRefOrGetter<string | undefined>
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  onInput?: (e: InputEvent) => void
  onCopy?: (e: ClipboardEvent) => void
  onCut?: (e: ClipboardEvent) => void
  onPaste?: (e: ClipboardEvent) => void
  onSelect?: (e: Event) => void
  onBeforeInput?: (e: InputEvent) => void
  onCompositionEnd?: (e: CompositionEvent) => void
  onCompositionStart?: (e: CompositionEvent) => void
  onCompositionUpdate?: (e: CompositionEvent) => void
}

export interface AriaTextFieldProps<T = HTMLInputElement> extends TextFieldProps<T> {}

type TextFieldIntrinsicElements = 'input' | 'textarea'

export interface AriaTextFieldOptions<T extends TextFieldIntrinsicElements = 'input'>
  extends AriaTextFieldProps {
  /**
   * The HTML element used to render the input, e.g. 'input', or 'textarea'. It determines whether
   * certain HTML attributes will be included in `inputProps`. For example,
   * [`type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-type).
   *
   * @default 'input'
   */
  inputElementType?: MaybeRefOrGetter<T | undefined>
}

export interface TextFieldAria<T extends TextFieldIntrinsicElements = 'input'> {
  /** Props for the input element. */
  inputProps: Record<string, any>
  /** Props for the text field's visible label element, if any. */
  labelProps: Record<string, any>
  /** Props for the text field's description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the text field's error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Whether the text field is invalid. Live: see getter. */
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

/**
 * Provides the behavior and accessibility implementation for a text field.
 *
 * @param props - Props for the text field.
 * @param ref - Ref to the HTML input or textarea element.
 */
export function useTextField<T extends TextFieldIntrinsicElements = 'input'>(
  props: AriaTextFieldOptions<T>,
  ref?: Ref<any | null>,
): TextFieldAria<T> {
  const inputElementType = computed<T>(
    () => (toValue(props.inputElementType as any) ?? 'input') as T,
  )
  const isDisabled = computed(() => !!toValue(props.isDisabled as any))
  const isRequired = computed(() => !!toValue(props.isRequired as any))
  const isReadOnly = computed(() => !!toValue(props.isReadOnly as any))
  const validationBehavior = computed<'aria' | 'native'>(
    () => (toValue(props.validationBehavior as any) ?? 'aria') as 'aria' | 'native',
  )

  const [value, setValue] = useControlledState<string>(
    props.value as any,
    () => toValue(props.defaultValue as any) || '',
    props.onChange,
  )

  const validationState = useFormValidationState({
    isInvalid: () => toValue(props.isInvalid as any),
    validationState: () => toValue(props.validationState as any),
    name: () => toValue(props.name as any),
    value,
    validate: props.validate as any,
    validationBehavior,
    builtinValidation: () => toValue((props as any).builtinValidation),
  })
  const displayValidation = computed(() => validationState.displayValidation)
  const isInvalid = computed(() => !!displayValidation.value.isInvalid)
  const validationErrors = computed<string[]>(() => displayValidation.value.validationErrors)
  const validationDetails = computed<Record<string, any>>(
    () => displayValidation.value.validationDetails as any,
  )

  const {labelProps, fieldProps, descriptionProps, errorMessageProps} = useField({
    id: props.id,
    label: props.label as any,
    'aria-labelledby': props['aria-labelledby'] as any,
    'aria-label': props['aria-label'] as any,
    labelElementType: 'label',
    isInvalid,
    description: props.description as any,
    errorMessage: (() => toValue(props.errorMessage as any) ?? validationErrors.value) as any,
    'aria-describedby': props['aria-describedby'] as any,
  })

  const initialValue = value.value
  useFormReset(ref, () => toValue(props.defaultValue as any) ?? initialValue, setValue)
  useFormValidation(props as any, validationState, ref as any)

  const onInput = (e: InputEvent) => {
    const newValue = (e.target as HTMLInputElement | HTMLTextAreaElement)?.value ?? ''
    setValue(newValue)
    props.onInput?.(e)
  }

  const inputOnlyProps: Record<string, any> = {}
  // `type` only applies to <input>; pattern only to <input> as well. A textarea
  // renders neither (the props are `undefined`, which `mergeProps` drops).
  Object.defineProperty(inputOnlyProps, 'type', {
    get: () =>
      inputElementType.value === 'input' ? (toValue(props.type as any) ?? 'text') : undefined,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(inputOnlyProps, 'pattern', {
    get: () =>
      inputElementType.value === 'input' ? toValue(props.pattern as any) : undefined,
    enumerable: true,
    configurable: true,
  })

  const inputProps = mergeProps(inputOnlyProps, {
    onInput,
    onFocus: (e: FocusEvent) => props.onFocus?.(e),
    onBlur: (e: FocusEvent) => props.onBlur?.(e),
    ...(props.onKeyDown ? {onKeyDown: props.onKeyDown} : {}),
    ...(props.onKeyUp ? {onKeyUp: props.onKeyUp} : {}),
    ...(props.onCopy ? {onCopy: props.onCopy} : {}),
    ...(props.onCut ? {onCut: props.onCut} : {}),
    ...(props.onPaste ? {onPaste: props.onPaste} : {}),
    ...(props.onSelect ? {onSelect: props.onSelect} : {}),
    ...(props.onBeforeInput ? {onBeforeInput: props.onBeforeInput} : {}),
    ...(props.onCompositionEnd ? {onCompositionEnd: props.onCompositionEnd} : {}),
    ...(props.onCompositionStart ? {onCompositionStart: props.onCompositionStart} : {}),
    ...(props.onCompositionUpdate ? {onCompositionUpdate: props.onCompositionUpdate} : {}),
    ...fieldProps,
  })

  Object.defineProperties(inputProps, {
    disabled: {get: () => (isDisabled.value ? true : undefined), enumerable: true, configurable: true},
    readOnly: {get: () => (isReadOnly.value ? true : undefined), enumerable: true, configurable: true},
    required: {
      get: () => (isRequired.value && validationBehavior.value === 'native' ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-required': {
      get: () => (isRequired.value && validationBehavior.value === 'aria' ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-invalid': {get: () => (isInvalid.value ? true : undefined), enumerable: true, configurable: true},
    'aria-errormessage': {get: () => toValue(props['aria-errormessage'] as any), enumerable: true, configurable: true},
    'aria-activedescendant': {get: () => toValue(props['aria-activedescendant'] as any), enumerable: true, configurable: true},
    'aria-autocomplete': {get: () => toValue(props['aria-autocomplete'] as any), enumerable: true, configurable: true},
    'aria-haspopup': {get: () => toValue(props['aria-haspopup'] as any), enumerable: true, configurable: true},
    'aria-controls': {get: () => toValue(props['aria-controls'] as any), enumerable: true, configurable: true},
    value: {get: () => value.value, enumerable: true, configurable: true},
    autoComplete: {get: () => toValue(props.autoComplete as any), enumerable: true, configurable: true},
    autoCapitalize: {get: () => toValue(props.autoCapitalize as any), enumerable: true, configurable: true},
    maxLength: {get: () => toValue(props.maxLength as any), enumerable: true, configurable: true},
    minLength: {get: () => toValue(props.minLength as any), enumerable: true, configurable: true},
    name: {get: () => toValue(props.name as any), enumerable: true, configurable: true},
    form: {get: () => toValue(props.form as any), enumerable: true, configurable: true},
    placeholder: {get: () => toValue(props.placeholder as any), enumerable: true, configurable: true},
    inputMode: {get: () => toValue(props.inputMode as any), enumerable: true, configurable: true},
    autoCorrect: {get: () => toValue(props.autoCorrect as any), enumerable: true, configurable: true},
    spellCheck: {get: () => toValue(props.spellCheck as any), enumerable: true, configurable: true},
    enterKeyHint: {get: () => toValue(props.enterKeyHint as any), enumerable: true, configurable: true},
  })

  const out: TextFieldAria<T> = {
    inputProps,
    labelProps,
    descriptionProps,
    errorMessageProps,
    // Keep isInvalid live: expose a getter rather than a setup-time snapshot.
    isInvalid: isInvalid.value,
    validationErrors: validationErrors.value,
    validationDetails: validationDetails.value,
  }
  Object.defineProperty(out, 'isInvalid', {get: () => isInvalid.value, enumerable: true})
  Object.defineProperty(out, 'validationErrors', {get: () => validationErrors.value, enumerable: true})
  Object.defineProperty(out, 'validationDetails', {get: () => validationDetails.value, enumerable: true})
  return out
}
