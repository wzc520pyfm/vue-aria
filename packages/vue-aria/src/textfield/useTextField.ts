/*
 * Port of `react-aria@3.53.1` `useTextField`
 * (`packages/react-aria/src/textfield/useTextField.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue and trimmed to the subset `useComboBox` needs:
 * value/onChange, label, description, errorMessage, disabled/readOnly/required/invalid,
 * autoComplete, focus/blur, and native `required`.
 *
 * No I18nProvider / form-validation machinery here: validation state is read from props
 * (`isInvalid`), which is all the ComboBox slice needs. New hook *Props are plain objects
 * with live getters, not ComputedRefs.
 */

import {computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import {mergeProps} from '../utils/mergeProps'
import {useField} from '../label/useField'

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
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
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

export interface AriaTextFieldOptions<T extends TextFieldIntrinsicElements = 'input'> extends AriaTextFieldProps {}

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
  _ref?: Ref<any | null>,
): TextFieldAria<T> {
  const isDisabled = computed(() => !!toValue(props.isDisabled as any))
  const isRequired = computed(() => !!toValue(props.isRequired as any))
  const isReadOnly = computed(() => !!toValue(props.isReadOnly as any))
  const validationBehavior = computed<'aria' | 'native'>(() => (toValue(props.validationBehavior as any) ?? 'aria') as 'aria' | 'native')
  const isInvalid = computed(() => !!toValue(props.isInvalid as any))

  const {labelProps, fieldProps, descriptionProps, errorMessageProps} = useField({
    id: props.id,
    label: props.label as any,
    'aria-labelledby': props['aria-labelledby'] as any,
    'aria-label': props['aria-label'] as any,
    labelElementType: 'label',
    isInvalid: () => isInvalid.value,
    description: props.description as any,
    errorMessage: props.errorMessage as any,
    'aria-describedby': props['aria-describedby'] as any,
  })

  const onInput = (e: InputEvent) => {
    const value = (e.target as HTMLInputElement | HTMLTextAreaElement)?.value ?? ''
    props.onChange?.(value)
    props.onInput?.(e)
  }

  const inputOnlyProps: Record<string, any> = {}
  // `type` only applies to <input>; pattern only to <input> as well.
  Object.defineProperty(inputOnlyProps, 'type', {get: () => (toValue(props.type as any) ?? 'text'), enumerable: true, configurable: true})
  if (props.pattern !== undefined) {
    Object.defineProperty(inputOnlyProps, 'pattern', {get: () => toValue(props.pattern as any), enumerable: true, configurable: true})
  }

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
    value: {get: () => toValue(props.value as any) ?? toValue(props.defaultValue as any) ?? '', enumerable: true, configurable: true},
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

  const validationErrors = computed<string[]>(() => [])
  const validationDetails = computed<Record<string, any>>(() => ({}))

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
  return out
}
