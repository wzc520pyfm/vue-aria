/*
 * Port of `react-stately@3.51.0` `useDatePickerState`
 * (`packages/react-stately/src/datepicker/useDatePickerState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Props are read through live getters so
 * controlled values are never snapshotted at setup time, and
 * `shouldCloseOnSelect` is re-resolved on every select/close — it accepts a
 * boolean, a getter, a ref, or a callback (`() => boolean`). The overlay
 * open state keeps `OverlayTriggerState`'s `ComputedRef<boolean>` contract,
 * and every close/toggle goes through the picker's commit logic (pending
 * date + placeholder time are committed when closing a popover that only has
 * a partial selection). IncompleteDate / placeholder semantics are preserved:
 * partial input is never coerced into a complete date.
 */

import {
  toCalendarDate,
  toCalendarDateTime,
  DateFormatter,
  type DateValue as IntlDateValue,
} from '@internationalized/date'
import {computed, shallowRef, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import {
  getFormatOptions,
  getPlaceholderTime,
  getValidationResult,
  useDefaultProps,
  type FieldOptions,
  type FormatterOptions,
} from './utils'
import {
  useFormValidationState,
  type FormValidationState,
} from '../form/useFormValidationState'
import {
  useOverlayTriggerState,
  type OverlayTriggerState,
  type Point,
} from '../overlays/useOverlayTriggerState'
import {useControlledState} from '../utils/useControlledState'
import type {
  DatePickerProps,
  DateValue,
  Granularity,
  MappedDateValue,
  TimeValue,
} from './types'

export interface DatePickerStateOptions<T extends DateValue> extends DatePickerProps<T> {
  /**
   * Determines whether the date picker popover should close automatically when a date is selected.
   *
   * @default true
   */
  shouldCloseOnSelect?: MaybeRefOrGetter<boolean | (() => boolean) | undefined>
}

export interface DatePickerState extends Omit<OverlayTriggerState, 'isOpen' | 'setOpen' | 'open' | 'close' | 'toggle'>, FormValidationState {
  /** The currently selected date. */
  readonly value: DateValue | null
  /** The default date. */
  readonly defaultValue: DateValue | null
  /** Sets the selected date. */
  setValue(value: DateValue | null): void
  /**
   * The date portion of the value. This may be set prior to `value` if the user has
   * selected a date but has not yet selected a time.
   */
  readonly dateValue: DateValue | null
  /** Sets the date portion of the value. */
  setDateValue(value: DateValue): void
  /**
   * The time portion of the value. This may be set prior to `value` if the user has
   * selected a time but has not yet selected a date.
   */
  readonly timeValue: TimeValue | null
  /** Sets the time portion of the value. */
  setTimeValue(value: TimeValue): void
  /** The granularity for the field, based on the `granularity` prop and current value. */
  readonly granularity: Granularity
  /**
   * Whether the date picker supports selecting a time, according to the `granularity` prop and
   * current value.
   */
  readonly hasTime: boolean
  /** Whether the calendar popover is currently open. */
  readonly isOpen: ComputedRef<boolean>
  /** Sets whether the calendar popover is open. Commits any pending date selection. */
  setOpen(isOpen: boolean): void
  /** Opens the popover. */
  open(): void
  /** Closes the popover. Commits any pending date selection. */
  close(): void
  /** Toggles the popover. Commits any pending date selection when closing. */
  toggle(): void
  /**
   * The current validation state of the date picker, based on the `validationState`, `minValue`,
   * and `maxValue` props.
   *
   * @deprecated Use `isInvalid` instead.
   */
  readonly validationState: 'valid' | 'invalid' | null
  /** Whether the date picker is invalid, based on the `isInvalid`, `minValue`, and `maxValue` props. */
  readonly isInvalid: boolean
  /** Formats the selected value using the given options. */
  formatValue(locale: string, fieldOptions: FieldOptions): string
  /** Gets a formatter based on state's props. */
  getDateFormatter(locale: string, formatOptions: FormatterOptions): DateFormatter
}

/**
 * Provides state management for a date picker component. A date picker combines a DateField and a
 * Calendar popover to allow users to enter or select a date and time value.
 */
export function useDatePickerState<T extends DateValue = DateValue>(
  props: DatePickerStateOptions<T>,
): DatePickerState {
  const overlayState = useOverlayTriggerState({
    isOpen: () => toValue(props.isOpen),
    defaultOpen: () => toValue(props.defaultOpen),
    onOpenChange: (isOpen: boolean) => props.onOpenChange?.(isOpen),
  })
  const [value, setValue] = useControlledState<DateValue | null>(
    () => toValue(props.value) as DateValue | null | undefined,
    () => (toValue(props.defaultValue) ?? null) as DateValue | null,
    (val) => props.onChange?.(val as MappedDateValue<T> | null),
  )

  const initialValue = value.value
  const v = computed<DateValue | null>(
    () => value.value || toValue(props.placeholderValue) || null,
  )

  // Compute default granularity and time zone from the value, keeping the last
  // known values when the value becomes null (official useDefaultProps).
  const lastDefaults = shallowRef<[Granularity, string | undefined]>(['day', undefined])
  const granularityAndTimeZone = computed<[Granularity, string | undefined]>(() =>
    useDefaultProps(v.value, toValue(props.granularity), lastDefaults),
  )
  const granularity = computed(() => granularityAndTimeZone.value[0])
  const defaultTimeZone = computed(() => granularityAndTimeZone.value[1])
  const hasTime = computed(
    () => granularity.value === 'hour' || granularity.value === 'minute' || granularity.value === 'second',
  )

  const minValue = computed(() => toValue(props.minValue) ?? null)
  const maxValue = computed(() => toValue(props.maxValue) ?? null)

  // `shouldCloseOnSelect` is re-resolved on every select/close: a plain boolean,
  // a ref/computed, a getter, or a callback (`() => boolean`) are all accepted.
  const getShouldCloseOnSelect = (): boolean => {
    const raw = toValue(props.shouldCloseOnSelect as any) as boolean | (() => boolean) | undefined
    const resolved = typeof raw === 'function' ? (raw as () => boolean)() : raw
    return resolved ?? true
  }

  // Resolve placeholder time lazily and live — a getter-backed defaultValue /
  // placeholderValue may change between renders (official reads it per render).
  const getPlaceholder = () =>
    getPlaceholderTime(
      (toValue(props.defaultValue) ?? toValue(props.placeholderValue)) as IntlDateValue | null | undefined,
    ) as unknown as TimeValue

  // Date portion selected but not yet committed (used when `hasTime` and the
  // user picked a date but not a time yet).
  // shallowRef: Vue's deep ref unwrapping (UnwrapRef) mangles the
  // @internationalized/date class instances (they carry #private).
  const selectedDateRef = shallowRef<DateValue | null>(null)
  const selectedTimeRef = shallowRef<TimeValue | null>(null)

  const pendingSelectedDate = () =>
    value.value ?? selectedDateRef.value
  const pendingSelectedTime = () => {
    if (value.value && 'hour' in value.value) {
      return value.value as unknown as TimeValue
    }
    return selectedTimeRef.value
  }

  // The raw JavaScript Date of the committed value, used for formatting.
  const dateValue = computed<Date | null>(() =>
    value.value != null ? (value.value as any).toDate(defaultTimeZone.value ?? 'UTC') : null,
  )

  const showEra = computed(
    () =>
      value.value?.calendar.identifier === 'gregory' &&
      (value.value as any)?.era === 'BC',
  )
  const formatOpts = computed<FormatterOptions>(() => ({
    granularity: granularity.value,
    timeZone: defaultTimeZone.value,
    hideTimeZone: toValue(props.hideTimeZone),
    hourCycle: toValue(props.hourCycle),
    shouldForceLeadingZeros: toValue(props.shouldForceLeadingZeros),
    showEra: showEra.value,
  }))

  const builtinValidation = computed(() =>
    getValidationResult(
      value.value,
      minValue.value,
      maxValue.value,
      // Read the current prop on every validation call — never snapshot the
      // setup-time function reference (mirrors `validate`).
      (date) => props.isDateUnavailable?.(date) ?? false,
      formatOpts.value,
    ),
  )

  const validation = useFormValidationState<MappedDateValue<T>>({
    value: () => value.value as MappedDateValue<T> | null,
    // Read the current prop on every validation call.
    isInvalid: () => toValue(props.isInvalid),
    validationState: () => toValue(props.validationState),
    name: () => toValue(props.name),
    validate: (val) => props.validate?.(val as any) as any,
    validationBehavior: () => toValue(props.validationBehavior),
    builtinValidation: () => builtinValidation.value,
  })

  const isValueInvalid = computed(() => validation.displayValidation.isInvalid)
  const validationState = computed<'valid' | 'invalid' | null>(() =>
    toValue(props.validationState) || (isValueInvalid.value ? 'invalid' : null),
  )

  const commitValue = (date: DateValue, time: TimeValue) => {
    setValue(
      ('timeZone' in time
        ? (time as any).set(toCalendarDate(date as any))
        : toCalendarDateTime(date as any, time as any)) as DateValue,
    )
    selectedDateRef.value = null
    selectedTimeRef.value = null
    validation.commitValidation()
  }

  // Intercept setValue to make sure the time section is not changed by date selection in the calendar.
  const setDateValue = (newValue: DateValue) => {
    const shouldClose = getShouldCloseOnSelect()
    if (hasTime.value) {
      const pendingTime = pendingSelectedTime()

      if (pendingTime || shouldClose) {
        commitValue(newValue, pendingTime || getPlaceholder())
      } else {
        selectedDateRef.value = newValue
      }
    } else {
      setValue(newValue)
      validation.commitValidation()
    }

    if (shouldClose) {
      overlayState.setOpen(false)
    }
  }

  const setTimeValue = (newValue: TimeValue) => {
    const pendingDate = pendingSelectedDate()
    if (pendingDate && newValue) {
      commitValue(pendingDate, newValue)
    } else {
      selectedTimeRef.value = newValue
    }
  }

  // Commit the pending date when the popover is closed. Use a placeholder time
  // if one wasn't set. If only the time was set and not the date, don't commit.
  // The state will be preserved until the user opens the popover again.
  const setOpen = (isOpen: boolean) => {
    if (!isOpen && !value.value && selectedDateRef.value && hasTime.value) {
      commitValue(
        selectedDateRef.value,
        pendingSelectedTime() || getPlaceholder(),
      )
    }

    overlayState.setOpen(isOpen)
  }

  const state: DatePickerState = {
    // Live delegation of the validation state — spreading `validation` would
    // flatten the getters and freeze display/realtime validation.
    get realtimeValidation() {
      return validation.realtimeValidation
    },
    get displayValidation() {
      return validation.displayValidation
    },
    updateValidation: (result) => validation.updateValidation(result),
    resetValidation: () => validation.resetValidation(),
    commitValidation: () => validation.commitValidation(),
    get value() {
      return value.value
    },
    get defaultValue() {
      return (toValue(props.defaultValue) ?? initialValue) as DateValue | null
    },
    setValue,
    get dateValue() {
      return value.value ?? selectedDateRef.value
    },
    setDateValue,
    get timeValue() {
      return pendingSelectedTime()
    },
    setTimeValue,
    get granularity() {
      return granularity.value
    },
    get hasTime() {
      return hasTime.value
    },
    isOpen: overlayState.isOpen,
    setOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!overlayState.isOpen.value),
    point: overlayState.point,
    setPoint: overlayState.setPoint,
    get validationState() {
      return validationState.value
    },
    get isInvalid() {
      return isValueInvalid.value
    },
    formatValue(locale: string, fieldOptions: FieldOptions) {
      if (!dateValue.value) {
        return ''
      }

      const formatOptions = getFormatOptions(fieldOptions, formatOpts.value)
      const formatter = new DateFormatter(locale, formatOptions)
      return formatter.format(dateValue.value)
    },
    getDateFormatter(locale: string, formatOptions: FormatterOptions) {
      const newOptions = {...formatOpts.value, ...formatOptions}
      const newFormatOptions = getFormatOptions({}, newOptions)
      return new DateFormatter(locale, newFormatOptions)
    },
  }

  return state
}
