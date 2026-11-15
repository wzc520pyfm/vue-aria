/*
 * Port of `react-aria@3.53.1` `useDateRangePicker`
 * (`packages/react-aria/src/datepicker/useDateRangePicker.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. All returned `*Props` are plain objects backed by live
 * getters (never ComputedRefs, never spread snapshots), matching the
 * established hook contract. The DateRangePicker owns the validation state
 * for the two inner fields: each field's `DateFieldContext` carries
 * `privateValidationStateProp` and `roleSymbol=presentation` so the outer
 * group owns the group semantics and the validation display. A shared focus
 * manager (excluding the trigger button) is handed to both fields through
 * `focusManagerSymbol`.
 */

import {
  type DateRangePickerState,
  type DateValue,
  type DateRange,
} from 'vue-stately/useDateRangePickerState'
import {createFocusManager} from '../focus/useFocusScope'
import {useField} from '../label/useField'
import {useFocusWithin} from '../interactions/useFocusWithin'
import {useDescription} from '../utils/useDescription'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import datepickerStrings from '../i18n/datepickerStrings'
import {useDatePickerGroup} from './useDatePickerGroup'
import {focusManagerSymbol, roleSymbol} from './useDateField'
// Internal channel key shared with `vue-stately` (`privateValidationStateProp`
// in `useFormValidationState`). Not part of the public surface of either
// package — kept as a literal so the two packages agree on the string without
// a public export.
const privateValidationStateProp = '__vueAriaFormValidationState'
import {mergeProps} from '../utils/mergeProps'
import {useLocale} from '../i18n/I18nProvider'
import {useId} from '../utils/useId'
import {toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {CalendarDate} from '@internationalized/date'
import type {DateRangePickerProps as StateDateRangePickerProps} from 'vue-stately/useDateRangePickerState'
import type {DatePickerProps as StateDatePickerProps} from 'vue-stately/useDatePickerState'
import type {RangeCalendarProps} from 'vue-stately/useRangeCalendarState'
import type {Granularity} from 'vue-stately/useDateFieldState'
import type {AriaDialogProps} from '../dialog/useDialog'

export interface AriaDateRangePickerProps<T extends DateValue = DateValue>
  extends StateDateRangePickerProps<T> {
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

export interface DateRangePickerAria {
  /** Props for the picker's visible label element, if any. */
  labelProps: Record<string, any>
  /** Props for the grouping element containing the date fields and button. */
  groupProps: Record<string, any>
  /** Props for the start date field. */
  startFieldProps: StateDatePickerProps<DateValue> & Record<string, any>
  /** Props for the end date field. */
  endFieldProps: StateDatePickerProps<DateValue> & Record<string, any>
  /** Props for the popover trigger button. */
  buttonProps: Record<string, any>
  /** Props for the description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Props for the popover dialog. */
  dialogProps: AriaDialogProps & {id?: Ref<string> | string}
  /** Props for the range calendar within the popover dialog. */
  calendarProps: RangeCalendarProps<DateValue> | Record<string, any>
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: ValidityState
}

function nodeContains(container: Element | null | undefined, node: Node | null | undefined) {
  if (!container || !node) return false
  return container === node || container.contains(node)
}

/*
 * Local mirror of `vue-stately`'s internal `mergeValidation` / `DEFAULT_VALIDATION_RESULT`
 * (`packages/vue-stately/src/form/useFormValidationState.ts`). Re-implemented here
 * because vue-aria cannot deep-import the internal helper and this slice adds no
 * new public API to either package.
 */
interface ValidationResult {
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: ValidityState
}

const VALID_VALIDITY_STATE: ValidityState = {
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

const DEFAULT_VALIDATION_RESULT: ValidationResult = {
  isInvalid: false,
  validationErrors: [],
  validationDetails: {...VALID_VALIDITY_STATE},
}

function mergeValidation(...results: ValidationResult[]): ValidationResult {
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

/**
 * Provides the behavior and accessibility implementation for a date range picker component. A date
 * range picker combines two DateFields and a RangeCalendar popover to allow users to enter or select
 * a date and time range.
 */
export function useDateRangePicker<T extends DateValue = DateValue>(
  props: AriaDateRangePickerProps<T>,
  state: DateRangePickerState,
  ref: Ref<Element | null>,
): DateRangePickerAria {
  const buttonId = useId('vue-aria-button')
  const dialogId = useId('vue-aria-dialog')
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

  const range = () =>
    state.value?.start && state.value?.end
      ? state.formatValue(locale.locale, {month: 'long'})
      : null
  const description = () => {
    const r = range()
    return r
      ? stringFormatter.format('selectedRangeDescription', {
          startDate: r.start,
          endDate: r.end,
        })
      : ''
  }
  const descProps = useDescription(() => description())
  const ariaDescribedBy = () =>
    [descProps['aria-describedby'], fieldProps['aria-describedby']].filter(Boolean).join(' ') ||
    undefined

  // Shared focus manager for both fields — excludes the trigger button, so
  // arrow-key navigation crosses from the start field's last segment into the
  // end field's first segment (and never re-enters the popover button).
  const focusManager = createFocusManager(ref, {
    // Exclude the button from the focus manager.
    accept: (el: HTMLElement) => el.id !== buttonId.value,
  })

  const isFocused = {current: false}
  const onKeyDown = props.onKeyDown
  const onKeyUp = props.onKeyUp
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

  const startFieldValidation = {current: DEFAULT_VALIDATION_RESULT}
  const endFieldValidation = {current: DEFAULT_VALIDATION_RESULT}

  // The shared per-field props (live string getters / the shared focus manager /
  // the presentation role marker). Installed on each field object via
  // `Object.defineProperties` inside `createFieldProps` so the getters stay
  // live per field.
  const commonFieldDescriptors: PropertyDescriptorMap = {
    [focusManagerSymbol]: {
      value: focusManager,
      enumerable: true,
      configurable: true,
    },
    [roleSymbol]: {
      value: 'presentation' as const,
      enumerable: true,
      configurable: true,
    },
    'aria-describedby': {
      get: () => ariaDescribedBy(),
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
  }

  const createFieldProps = (
    part: 'start' | 'end',
  ): StateDatePickerProps<DateValue> & Record<string, any> => {
    const fieldProps: Record<string, any> = {}
    Object.defineProperties(fieldProps, {
      'aria-label': {
        get: () => stringFormatter.format(part === 'start' ? 'startDate' : 'endDate'),
        enumerable: true,
        configurable: true,
      },
      'aria-labelledby': {
        get: () => labelledBy(),
        enumerable: true,
        configurable: true,
      },
      value: {
        get: () => (part === 'start' ? state.value?.start : state.value?.end) ?? null,
        enumerable: true,
        configurable: true,
      },
      defaultValue: {
        get: () => (part === 'start' ? state.defaultValue?.start : state.defaultValue?.end) ?? null,
        enumerable: true,
        configurable: true,
      },
      name: {
        get: () => toValue(part === 'start' ? props.startName : props.endName),
        enumerable: true,
        configurable: true,
      },
      form: {
        get: () => toValue(props.form),
        enumerable: true,
        configurable: true,
      },
      ...(part === 'start'
        ? {
            autoFocus: {
              get: () => toValue(props.autoFocus),
              enumerable: true,
              configurable: true,
            },
          }
        : {}),
    })
    Object.defineProperties(fieldProps, commonFieldDescriptors)
    fieldProps.onChange = (value: DateValue | null) => state.setDateTime(part, value)
    // `updateValidation` merges this field's result with the sibling field's
    // result into the picker's single display validation. `realtimeValidation`
    // / `displayValidation` stay live getters onto the shared state.
    fieldProps[privateValidationStateProp] = {
      get realtimeValidation() {
        return state.realtimeValidation
      },
      get displayValidation() {
        return state.displayValidation
      },
      updateValidation: (e: ValidationResult) => {
        if (part === 'start') {
          startFieldValidation.current = e
          state.updateValidation(mergeValidation(e, endFieldValidation.current))
        } else {
          endFieldValidation.current = e
          state.updateValidation(mergeValidation(startFieldValidation.current, e))
        }
      },
      resetValidation: () => state.resetValidation(),
      commitValidation: () => state.commitValidation(),
    }
    return fieldProps as StateDatePickerProps<DateValue> & Record<string, any>
  }

  const startFieldProps = createFieldProps('start')
  const endFieldProps = createFieldProps('end')

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

  const calendarProps: RangeCalendarProps<DateValue> | Record<string, any> = {
    autoFocus: true,
    onChange: state.setDateRange,
    isDateUnavailable: (date: DateValue, anchorDate: CalendarDate | null) =>
      props.isDateUnavailable?.(date, anchorDate) ?? false,
    get value() {
      return state.dateRange?.start && state.dateRange.end
        ? (state.dateRange as DateRange)
        : null
    },
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
    get allowsNonContiguousRanges() {
      return toValue(props.allowsNonContiguousRanges)
    },
    get defaultFocusedValue() {
      return state.dateRange ? undefined : toValue(props.placeholderValue)
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
    startFieldProps,
    endFieldProps,
    buttonProps,
    descriptionProps,
    errorMessageProps,
    dialogProps: {
      // Live getter-backed props (never a property-descriptor object used as a
      // value, which would render as `[object Object]` in the DOM), consistent
      // with the group/button/field props above. `id` stays live too — it is
      // read through the getter, never snapshotted at setup time.
      get id() {
        return dialogId.value
      },
      get 'aria-labelledby'() {
        return `${buttonId.value} ${labelledBy()}`
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
