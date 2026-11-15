/*
 * Port of `react-aria@3.53.1` `useToggle`
 * (`packages/react-aria/src/toggle/useToggle.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Internal — not publicly exported. Validation
 * goes through the internal `useFormValidationState` / `useFormValidation` /
 * `useFormReset` machinery; press state on the label keeps the official
 * keyboard/virtual split so the hidden input stays the sole focus target.
 * Returned *Props are plain objects with live getters, not ComputedRefs.
 */

import {ref as vueRef, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import {filterDOMProps} from '../utils/filterDOMProps'
import {getEventTarget} from '../utils/dom'
import {mergeProps} from '../utils/mergeProps'
import {
  privateValidationStateProp,
  useFormValidationState,
  type FormValidationState,
} from '../../../vue-stately/src/form/useFormValidationState'
import type {ToggleState} from '../../../vue-stately/src/toggle/useToggleState'
import {useFocusable} from '../interactions/useFocusable'
import {useFormReset} from '../utils/useFormReset'
import {useFormValidation} from '../form/useFormValidation'
import {usePress, type PressEvent} from '../interactions/press'
import {useId, useSlotId} from '../utils/useId'

export interface AriaToggleProps {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /**
   * The value of the input element, used when submitting an HTML form.
   */
  value?: MaybeRefOrGetter<string | undefined>
  /** The name of the input element, used when submitting an HTML form. */
  name?: MaybeRefOrGetter<string | undefined>
  /** The HTML form element the input is associated with. */
  form?: MaybeRefOrGetter<string | undefined>
  /** The id of the input element. */
  id?: MaybeRefOrGetter<string | undefined>
  label?: MaybeRefOrGetter<unknown>
  description?: MaybeRefOrGetter<unknown>
  errorMessage?: MaybeRefOrGetter<unknown>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-details'?: MaybeRefOrGetter<string | undefined>
  /** Identifies the element (or elements) whose contents or presence are controlled by the current element. */
  'aria-controls'?: MaybeRefOrGetter<string | undefined>
  'aria-errormessage'?: MaybeRefOrGetter<string | undefined>
  /** Whether the value is invalid according to application logic. */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
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
  validate?: (value: boolean) => true | string | string[] | null | undefined
  /**
   * Whether to use native HTML form validation to prevent form submission when the value is
   * missing or invalid, or mark the field as invalid via ARIA instead.
   *
   * @default 'aria'
   */
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  onPress?: (e: PressEvent) => void
  onPressStart?: (e: PressEvent) => void
  onPressEnd?: (e: PressEvent) => void
  onPressChange?: (isPressed: boolean) => void
  onPressUp?: (e: PressEvent) => void
  onClick?: (e: MouseEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  /** Whether the element should receive focus on render. */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the element should be excluded from the tab order. */
  excludeFromTabOrder?: MaybeRefOrGetter<boolean | undefined>
  /** The children of the toggle (used for the a11y label check). */
  children?: unknown
}

export interface ToggleAria {
  /** Props to be spread on the label element. */
  labelProps: Record<string, any>
  /** Props to be spread on the input element. */
  inputProps: Record<string, any>
  /** Props for the toggle description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the toggle error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Whether the toggle is selected. */
  readonly isSelected: boolean
  /** Whether the toggle is in a pressed state. */
  readonly isPressed: boolean
  /** Whether the toggle is disabled. */
  readonly isDisabled: boolean
  /** Whether the toggle is read only. */
  readonly isReadOnly: boolean
  /** Whether the toggle is invalid. */
  readonly isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

const isKeyboardOrVirtual = (e: PressEvent) =>
  e.pointerType === 'keyboard' || e.pointerType === 'virtual'

/**
 * Handles interactions for toggle elements, e.g. Checkboxes and Switches.
 */
export function useToggle(
  props: AriaToggleProps,
  state: ToggleState,
  ref: Ref<HTMLInputElement | null>,
): ToggleAria {
  const isDisabled = () => Boolean(toValue(props.isDisabled))
  const isReadOnly = () => Boolean(toValue(props.isReadOnly))
  const isRequired = () => Boolean(toValue(props.isRequired))
  const validationBehavior = () =>
    (toValue(props.validationBehavior) ?? 'aria') as 'aria' | 'native'

  // Create validation state here because it doesn't make sense to add to general useToggleState.
  // The private parent-validation channel (from useCheckboxGroupItem) is forwarded live.
  const parentValidationState = (props as any)[privateValidationStateProp] as
    | FormValidationState
    | undefined
  const validationState = useFormValidationState<boolean>({
    ...(parentValidationState ? {[privateValidationStateProp]: parentValidationState} : {}),
    // The selected state drives native/custom validation.
    value: () => state.isSelected,
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: () => toValue(props.name),
    validate: props.validate as any,
    validationBehavior,
  })

  useFormValidation(
    {validationBehavior, focus: () => ref.value?.focus()} as any,
    validationState,
    ref,
  )

  const onChange = (e: Event) => {
    // Since we spread props on label, onChange will end up there as well as in here.
    // So we have to stop propagation at the lowest level that we care about.
    e.stopPropagation()
    state.setSelected((getEventTarget(e) as HTMLInputElement).checked)
  }

  // Handle press state for keyboard interactions and cases where labelProps is not used.
  const {pressProps, isPressed} = usePress({
    onPressStart: props.onPressStart,
    onPressEnd: props.onPressEnd,
    onPressChange: props.onPressChange,
    onPress: props.onPress,
    onPressUp: props.onPressUp,
    onClick: props.onClick,
    isDisabled,
  })

  // Handle press state on the label.
  const isLabelPressed = vueRef(false)
  const {pressProps: labelPressProps} = usePress({
    onPressStart(e) {
      // Keyboard interactions are handled directly on the input.
      if (isKeyboardOrVirtual(e)) {
        e.continuePropagation()
        return
      }

      props.onPressStart?.(e)
      props.onPressChange?.(true)
      isLabelPressed.value = true
    },
    onPressEnd(e) {
      // Keyboard interactions are handled directly on the input.
      if (isKeyboardOrVirtual(e)) {
        e.continuePropagation()
        return
      }

      props.onPressEnd?.(e)
      props.onPressChange?.(false)
      isLabelPressed.value = false
    },
    onPressUp(e) {
      if (isKeyboardOrVirtual(e)) {
        e.continuePropagation()
        return
      }

      props.onPressUp?.(e)
    },
    onClick: props.onClick,
    onPress(e) {
      if (isKeyboardOrVirtual(e)) {
        e.continuePropagation()
        return
      }

      props.onPress?.(e)
      state.toggle()
      ref.value?.focus()

      const groupValidationState = (props as any)[privateValidationStateProp] as
        | FormValidationState
        | undefined

      const {commitValidation} = groupValidationState ? groupValidationState : validationState

      commitValidation()
    },
    isDisabled: () => isDisabled() || isReadOnly(),
  })

  const {focusableProps} = useFocusable(props, ref as any)
  const interactions = mergeProps(pressProps, focusableProps)
  const domProps = filterDOMProps(props, {labelable: true})

  useFormReset(ref, () => state.defaultSelected, state.setSelected)

  // Copied from useField because we don't want the label behavior that it provides.
  const descriptionId = useId('vue-aria-description')
  const errorMessageId = useId('vue-aria-error')
  const resolvedDescriptionId = useSlotId(descriptionId)
  const resolvedErrorMessageId = useSlotId(errorMessageId)

  const descriptionProps: Record<string, any> = {}
  Object.defineProperties(descriptionProps, {
    id: {get: () => resolvedDescriptionId.value, enumerable: true, configurable: true},
  })
  const errorMessageProps: Record<string, any> = {}
  Object.defineProperties(errorMessageProps, {
    id: {get: () => resolvedErrorMessageId.value, enumerable: true, configurable: true},
  })

  const ariaDescribedby = () => toValue(props['aria-describedby'])

  const inputProps: Record<string, any> = mergeProps(domProps, {
    type: 'checkbox',
    onChange,
    ...interactions,
  })
  Object.defineProperties(inputProps, {
    checked: {get: () => state.isSelected, enumerable: true, configurable: true},
    'aria-required': {
      get: () => (isRequired() && validationBehavior() === 'aria') || undefined,
      enumerable: true,
      configurable: true,
    },
    required: {
      get: () => (isRequired() && validationBehavior() === 'native') || undefined,
      enumerable: true,
      configurable: true,
    },
    'aria-invalid': {
      get: () =>
        validationState.displayValidation.isInvalid ||
        toValue(props.validationState) === 'invalid' ||
        undefined,
      enumerable: true,
      configurable: true,
    },
    'aria-errormessage': {
      get: () => toValue(props['aria-errormessage']),
      enumerable: true,
      configurable: true,
    },
    'aria-controls': {
      get: () => toValue(props['aria-controls']),
      enumerable: true,
      configurable: true,
    },
    'aria-readonly': {
      get: () => isReadOnly() || undefined,
      enumerable: true,
      configurable: true,
    },
    'aria-describedby': {
      get: () =>
        [resolvedDescriptionId.value, resolvedErrorMessageId.value, ariaDescribedby()]
          .filter(Boolean)
          .join(' ') || undefined,
      enumerable: true,
      configurable: true,
    },
    disabled: {get: () => isDisabled() || undefined, enumerable: true, configurable: true},
    value: {get: () => toValue(props.value), enumerable: true, configurable: true},
    name: {get: () => toValue(props.name), enumerable: true, configurable: true},
    form: {get: () => toValue(props.form), enumerable: true, configurable: true},
  })
  // Keep the labelable props from `props` live (filterDOMProps snapshots
  // getter values into its result).
  for (const key of ['id', 'aria-label', 'aria-labelledby', 'aria-details'] as const) {
    Object.defineProperty(inputProps, key, {
      get: () => toValue((props as any)[key]),
      enumerable: true,
      configurable: true,
    })
  }

  const labelProps = mergeProps(labelPressProps, {onClick: (e: MouseEvent) => e.preventDefault()})

  const out = {
    labelProps,
    inputProps,
    descriptionProps,
    errorMessageProps,
  } as ToggleAria
  Object.defineProperties(out, {
    isSelected: {get: () => state.isSelected, enumerable: true, configurable: true},
    isPressed: {
      get: () => isPressed.value || isLabelPressed.value,
      enumerable: true,
      configurable: true,
    },
    isDisabled: {get: () => isDisabled(), enumerable: true, configurable: true},
    isReadOnly: {get: () => isReadOnly(), enumerable: true, configurable: true},
    isInvalid: {
      get: () =>
        validationState.displayValidation.isInvalid || toValue(props.validationState) === 'invalid',
      enumerable: true,
      configurable: true,
    },
    validationErrors: {
      get: () => validationState.displayValidation.validationErrors,
      enumerable: true,
      configurable: true,
    },
    validationDetails: {
      get: () => validationState.displayValidation.validationDetails as any,
      enumerable: true,
      configurable: true,
    },
  })
  return out
}
