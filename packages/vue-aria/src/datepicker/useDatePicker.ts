/*
 * Port of `react-aria@3.53.1` `useDatePicker`
 * (`packages/react-aria/src/datepicker/useDatePicker.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. All returned `*Props` are plain objects backed by live
 * getters (never ComputedRefs, never spread snapshots), matching the
 * established hook contract. The DatePicker owns the validation state for the
 * inner date field: the field's `DateFieldContext` carries
 * `privateValidationStateProp` and `roleSymbol=presentation` so the outer
 * group owns the group semantics and the validation display.
 */

import {
  type DatePickerState,
  type DateValue,
} from 'vue-stately/useDatePickerState'
import {createFocusManager} from '../focus/useFocusScope'
import {useField} from '../label/useField'
import {useFocusWithin} from '../interactions/useFocusWithin'
import {useDescription} from '../utils/useDescription'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import datepickerStrings from '../i18n/datepickerStrings'
import {useDatePickerGroup} from './useDatePickerGroup'
import {roleSymbol} from './useDateField'
// Internal channel key shared with `vue-stately` (`privateValidationStateProp`
// in `useFormValidationState`). Not part of the public surface of either
// package — kept as a literal so the two packages agree on the string without
// a public export.
const privateValidationStateProp = '__vueAriaFormValidationState'
import {mergeProps} from '../utils/mergeProps'
import {useLocale} from '../i18n/I18nProvider'
import {useId} from '../utils/useId'
import {toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {DatePickerProps as StateDatePickerProps} from 'vue-stately/useDatePickerState'
import type {CalendarProps} from 'vue-stately/useCalendarState'
import type {Granularity} from 'vue-stately/useDateFieldState'
import type {AriaDialogProps} from '../dialog/useDialog'

export interface AriaDatePickerProps<T extends DateValue = DateValue>
  extends StateDatePickerProps<T> {
  /** The id of the picker's group element. */
  id?: MaybeRefOrGetter<string | undefined>
  /** The label for the picker. */
  label?: MaybeRefOrGetter<unknown>
  /** A description of the picker. */
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
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  /**
   * Describes the type of autocomplete functionality the input should provide if any. See
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#htmlattrdefautocomplete).
   */
  autoComplete?: MaybeRefOrGetter<string | undefined>
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  /** Handler that is called when focus moves within the picker. */
  onFocusChange?: (isFocused: boolean) => void
}

export interface DatePickerAria {
  /** Props for the picker's visible label element, if any. */
  labelProps: Record<string, any>
  /** Props for the grouping element containing the date field and button. */
  groupProps: Record<string, any>
  /** Props for the date field. */
  fieldProps: StateDatePickerProps<DateValue> & Record<string, any>
  /** Props for the popover trigger button. */
  buttonProps: Record<string, any>
  /** Props for the description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Props for the popover dialog. */
  dialogProps: AriaDialogProps & {id?: Ref<string>}
  /** Props for the calendar within the popover dialog. */
  calendarProps: CalendarProps<DateValue> | Record<string, any>
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: ValidityState
}

function nodeContains(container: Element | null | undefined, node: Node | null | undefined) {
  if (!container || !node) return false
  return container === node || container.contains(node)
}

/**
 * Provides the behavior and accessibility implementation for a date picker component. A date picker
 * combines a DateField and a Calendar popover to allow users to enter or select a date and time
 * value.
 */
export function useDatePicker<T extends DateValue = DateValue>(
  props: AriaDatePickerProps<T>,
  state: DatePickerState,
  ref: Ref<Element | null>,
): DatePickerAria {
  const buttonId = useId('vue-aria-button')
  const dialogId = useId('vue-aria-dialog')
  const fieldId = useId('vue-aria-field')
  const stringFormatter = useLocalizedStringFormatter(
    datepickerStrings as any,
    '@react-aria/datepicker',
  )
  const locale = useLocale()

  // Read validation live — never snapshot at setup time.
  const isInvalid = () => state.displayValidation.isInvalid
  const validationErrors = () => state.displayValidation.validationErrors
  const validationDetails = () => state.displayValidation.validationDetails

  const {labelProps, fieldProps, descriptionProps, errorMessageProps} = useField({
    label: () => toValue(props.label),
    'aria-labelledby': () => toValue(props['aria-labelledby']),
    'aria-label': () => toValue(props['aria-label']),
    labelElementType: 'span',
    description: () => toValue(props.description),
    errorMessage: () => toValue(props.errorMessage) || validationErrors(),
    isInvalid,
    'aria-describedby': () => toValue(props['aria-describedby']),
  })

  const groupProps = useDatePickerGroup(
    {
      // Gate the popover-opening shortcuts on disabled/readOnly — the trigger
      // button is disabled by ARIA as well, but the keyboard path has to be
      // blocked too (brief: disabled/readOnly cannot open the picker).
      setOpen(isOpen: boolean) {
        if (isOpen && (toValue(props.isDisabled) || toValue(props.isReadOnly))) {
          return
        }
        state.setOpen(isOpen)
      },
    } as any,
    ref as any,
  )

  const labelledBy = () =>
    toValue((fieldProps as any)['aria-labelledby']) || toValue((fieldProps as any).id) as any

  const date = () =>
    state.value ? state.formatValue(locale.locale, {month: 'long'}) : ''
  const description = () => {
    const value = date()
    return value ? stringFormatter.format('selectedDateDescription', {date: value}) : ''
  }
  const descProps = useDescription(description)
  const ariaDescribedBy = () =>
    [descProps['aria-describedby'], fieldProps['aria-describedby']].filter(Boolean).join(' ') ||
    undefined

  const focusManager = createFocusManager(ref)

  const isFocused = {current: false}
  const {focusWithinProps} = useFocusWithin({
    isDisabled: () => state.isOpen.value,
    onBlurWithin: (e) => {
      // Ignore when focus moves into the popover.
      const dialog =
        typeof document !== 'undefined' ? document.getElementById(dialogId.value) : null
      if (!nodeContains(dialog as any, (e as FocusEvent).relatedTarget as any)) {
        isFocused.current = false
        props.onBlur?.(e as FocusEvent)
        props.onFocusChange?.(false)
      }
    },
    onFocusWithin: (e) => {
      if (!isFocused.current) {
        isFocused.current = true
        props.onFocus?.(e as FocusEvent)
        props.onFocusChange?.(true)
      }
    },
  })

  const onKeyDown = props.onKeyDown
  const onKeyUp = props.onKeyUp
  const fieldIdValue = fieldId.value

  const groupAriaProps: Record<string, any> = {}
  Object.defineProperties(groupAriaProps, {
    role: {get: () => 'group' as const, enumerable: true, configurable: true},
    'aria-disabled': {
      get: () => (toValue(props.isDisabled) ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-labelledby': {
      get: () => labelledBy(),
      enumerable: true,
      configurable: true,
    },
    'aria-describedby': {
      get: () => ariaDescribedBy(),
      enumerable: true,
      configurable: true,
    },
  })

  const mergedGroupProps = mergeProps(
    groupProps,
    fieldProps,
    descProps as any,
    focusWithinProps as any,
    groupAriaProps,
    {
      onKeyDown(e: KeyboardEvent) {
        if (state.isOpen.value) {
          return
        }
        if (onKeyDown) {
          onKeyDown(e)
        }
      },
      onKeyUp(e: KeyboardEvent) {
        if (state.isOpen.value) {
          return
        }
        if (onKeyUp) {
          onKeyUp(e)
        }
      },
    } as any,
  )

  // `mergeProps` skips accessor entries whose current value is still undefined,
  // which would drop the picker's live ARIA accessors from the merged result even
  // though they are defined on the source. Re-attach the live accessors so the
  // merged group props stay live for every resolved value.
  const groupAriaDescriptorKeys = ['aria-disabled', 'aria-labelledby', 'aria-describedby'] as const
  for (const key of groupAriaDescriptorKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(groupAriaProps, key)
    if (descriptor && !Object.getOwnPropertyDescriptor(mergedGroupProps, key)) {
      Object.defineProperty(mergedGroupProps, key, {...descriptor, enumerable: true, configurable: true})
    }
  }

  const fieldPropsOverride: Record<string, any> = {
    id: fieldIdValue,
    [roleSymbol]: 'presentation' as const,
    onChange: state.setValue,
    [privateValidationStateProp]: state,
  }
  Object.defineProperties(fieldPropsOverride, {
    'aria-describedby': {
      get: () => ariaDescribedBy(),
      enumerable: true,
      configurable: true,
    },
    value: {
      get: () => state.value,
      enumerable: true,
      configurable: true,
    },
    defaultValue: {
      get: () => state.defaultValue,
      enumerable: true,
      configurable: true,
    },
    placeholderValue: {
      get: () => toValue(props.placeholderValue),
      enumerable: true,
      configurable: true,
    },
    hideTimeZone: {
      get: () => toValue(props.hideTimeZone),
      enumerable: true,
      configurable: true,
    },
    hourCycle: {
      get: () => toValue(props.hourCycle),
      enumerable: true,
      configurable: true,
    },
    shouldForceLeadingZeros: {
      get: () => toValue(props.shouldForceLeadingZeros),
      enumerable: true,
      configurable: true,
    },
    granularity: {
      get: () => toValue(props.granularity) as Granularity | undefined,
      enumerable: true,
      configurable: true,
    },
    isDisabled: {
      get: () => toValue(props.isDisabled),
      enumerable: true,
      configurable: true,
    },
    isReadOnly: {
      get: () => toValue(props.isReadOnly),
      enumerable: true,
      configurable: true,
    },
    isRequired: {
      get: () => toValue(props.isRequired),
      enumerable: true,
      configurable: true,
    },
    validationBehavior: {
      get: () => toValue(props.validationBehavior),
      enumerable: true,
      configurable: true,
    },
    autoFocus: {
      get: () => toValue(props.autoFocus),
      enumerable: true,
      configurable: true,
    },
    name: {
      get: () => toValue(props.name),
      enumerable: true,
      configurable: true,
    },
    form: {
      get: () => toValue(props.form),
      enumerable: true,
      configurable: true,
    },
  })
  const fieldPropsOut: StateDatePickerProps<DateValue> & Record<string, any> = mergeProps(
    fieldProps,
    fieldPropsOverride,
  ) as any

  const labelPropsOut: Record<string, any> = mergeProps(labelProps as any, {
    onClick: () => {
      focusManager.focusFirst()
    },
  })

  // `errorMessage` may be a plain value, a zero-arg getter (the components wrap
  // the prop), or an official `(validation) => string` function. Unwrap
  // zero-arg getters, then an official function if present.
  const errorMessageProp = () => {
    let em: any = props.errorMessage
    while (typeof em === 'function') {
      if (em.length >= 1) return em(state.displayValidation)
      em = em()
    }
    return em ?? state.displayValidation.validationErrors.join(' ')
  }

  const calendarProps: CalendarProps<DateValue> | Record<string, any> = {
    autoFocus: true,
    get value() {
      return state.dateValue
    },
    onChange: state.setDateValue,
    get minValue() {
      return toValue(props.minValue)
    },
    get maxValue() {
      return toValue(props.maxValue)
    },
    get isDisabled() {
      return toValue(props.isDisabled)
    },
    get isReadOnly() {
      return toValue(props.isReadOnly)
    },
    isDateUnavailable: (date: DateValue) => props.isDateUnavailable?.(date) ?? false,
    get defaultFocusedValue() {
      return state.dateValue ? undefined : toValue(props.placeholderValue)
    },
    get isInvalid() {
      return state.isInvalid
    },
    get errorMessage() {
      return errorMessageProp()
    },
    get firstDayOfWeek() {
      return toValue(props.firstDayOfWeek)
    },
    get pageBehavior() {
      return toValue(props.pageBehavior)
    },
  } as any

  const buttonAriaProps: Record<string, any> = {
    id: buttonId.value,
    'aria-haspopup': 'dialog',
    'aria-label': stringFormatter.format('calendar'),
    onPress: () => state.setOpen(true),
  }
  Object.defineProperties(buttonAriaProps, {
    'aria-labelledby': {
      get: () => `${buttonId.value} ${labelledBy()}`,
      enumerable: true,
      configurable: true,
    },
    'aria-describedby': {
      get: () => ariaDescribedBy(),
      enumerable: true,
      configurable: true,
    },
    'aria-expanded': {
      get: () => state.isOpen.value,
      enumerable: true,
      configurable: true,
    },
    isDisabled: {
      get: () => Boolean(toValue(props.isDisabled)) || Boolean(toValue(props.isReadOnly)),
      enumerable: true,
      configurable: true,
    },
  })

  const buttonProps: Record<string, any> = mergeProps(
    descProps as any,
    buttonAriaProps,
  )

  return {
    labelProps: labelPropsOut,
    groupProps: mergedGroupProps,
    fieldProps: fieldPropsOut,
    buttonProps,
    descriptionProps,
    errorMessageProps,
    dialogProps: {
      id: dialogId.value,
      'aria-labelledby': {
        get() {
          return `${buttonId.value} ${labelledBy()}`
        },
        enumerable: true,
        configurable: true,
      },
    } as any,
    calendarProps,
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
