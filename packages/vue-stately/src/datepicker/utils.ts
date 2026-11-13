/*
 * Port of `react-stately@3.51.0` datepicker utils
 * (`packages/react-stately/src/datepicker/utils.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Kept internal (not publicly exported) per the slice contract. The
 * range/reversed helpers belong to the deferred DateRangePicker and are not
 * ported.
 */

import {
  Calendar,
  DateFormatter,
  getLocalTimeZone,
  now,
  Time,
  toCalendar,
  toCalendarDate,
  toCalendarDateTime,
  type DateValue,
} from '@internationalized/date'
import {LocalizedStringDictionary, LocalizedStringFormatter} from '@internationalized/string'
import type {Granularity, DateValue as DateValueType} from './types'
import {mergeValidation, VALID_VALIDITY_STATE, type ValidationResult} from '../form/useFormValidationState'
import datepickerStrings from './datepickerStrings'

const dictionary = new LocalizedStringDictionary(datepickerStrings as any)

function getLocale() {
  // Match browser language setting here, NOT the I18nProvider, so that we match other
  // browser-provided validation messages, which do not respect our provider's language.
  let locale =
    (typeof navigator !== 'undefined' && (navigator.language || (navigator as any).userLanguage)) ||
    'en-US'

  try {
    Intl.DateTimeFormat.supportedLocalesOf([locale])
  } catch {
    locale = 'en-US'
  }
  return locale
}

export function getValidationResult(
  value: DateValue | null,
  minValue: DateValue | null | undefined,
  maxValue: DateValue | null | undefined,
  isDateUnavailable: ((v: DateValue) => boolean) | undefined,
  options: FormatterOptions,
): ValidationResult {
  const rangeOverflow = value != null && maxValue != null && value.compare(maxValue) > 0
  const rangeUnderflow = value != null && minValue != null && value.compare(minValue) < 0
  const isUnavailable = (value != null && isDateUnavailable?.(value)) || false
  const isInvalid = rangeOverflow || rangeUnderflow || isUnavailable
  const errors: string[] = []

  if (isInvalid) {
    const locale = getLocale()
    const strings =
      LocalizedStringDictionary.getGlobalDictionaryForPackage('@react-stately/datepicker') ||
      dictionary
    const formatter = new LocalizedStringFormatter(locale, strings as any)
    const dateFormatter = new DateFormatter(locale, getFormatOptions({}, options))
    const timeZone = dateFormatter.resolvedOptions().timeZone

    if (rangeUnderflow && minValue != null) {
      errors.push(
        formatter.format('rangeUnderflow', {
          minValue: dateFormatter.format(minValue.toDate(timeZone)),
        }),
      )
    }

    if (rangeOverflow && maxValue != null) {
      errors.push(
        formatter.format('rangeOverflow', {
          maxValue: dateFormatter.format(maxValue.toDate(timeZone)),
        }),
      )
    }

    if (isUnavailable) {
      errors.push(formatter.format('unavailableDate'))
    }
  }

  return {
    isInvalid,
    validationErrors: errors,
    validationDetails: {
      badInput: isUnavailable,
      customError: false,
      patternMismatch: false,
      rangeOverflow,
      rangeUnderflow,
      stepMismatch: false,
      tooLong: false,
      tooShort: false,
      typeMismatch: false,
      valueMissing: false,
      valid: !isInvalid,
    },
  }
}

export type FieldOptions = Pick<
  Intl.DateTimeFormatOptions,
  'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
>
export interface FormatterOptions {
  timeZone?: string
  hideTimeZone?: boolean
  granularity?: Granularity
  maxGranularity?: 'year' | 'month' | Granularity
  hourCycle?: 12 | 24
  showEra?: boolean
  shouldForceLeadingZeros?: boolean
}

const DEFAULT_FIELD_OPTIONS: FieldOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
}

const TWO_DIGIT_FIELD_OPTIONS: FieldOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}

export function getFormatOptions(
  fieldOptions: FieldOptions,
  options: FormatterOptions,
): Intl.DateTimeFormatOptions {
  const defaultFieldOptions = options.shouldForceLeadingZeros
    ? TWO_DIGIT_FIELD_OPTIONS
    : DEFAULT_FIELD_OPTIONS
  fieldOptions = {...defaultFieldOptions, ...fieldOptions}
  const granularity = options.granularity || 'minute'
  const keys = Object.keys(fieldOptions)
  let startIdx = keys.indexOf(options.maxGranularity ?? 'year')
  if (startIdx < 0) {
    startIdx = 0
  }

  let endIdx = keys.indexOf(granularity)
  if (endIdx < 0) {
    endIdx = 2
  }

  if (startIdx > endIdx) {
    throw new Error('maxGranularity must be greater than granularity')
  }

  const opts: Intl.DateTimeFormatOptions = keys.slice(startIdx, endIdx + 1).reduce((acc, key) => {
    ;(acc as any)[key] = fieldOptions[key as keyof FieldOptions]
    return acc
  }, {} as Intl.DateTimeFormatOptions)

  if (options.hourCycle != null) {
    opts.hour12 = options.hourCycle === 12
  }

  opts.timeZone = options.timeZone || 'UTC'

  const hasTime = granularity === 'hour' || granularity === 'minute' || granularity === 'second'
  if (hasTime && options.timeZone && !options.hideTimeZone) {
    opts.timeZoneName = 'short'
  }

  if (options.showEra && startIdx === 0) {
    opts.era = 'short'
  }

  return opts
}

export function getPlaceholderTime(
  placeholderValue: DateValue | null | undefined,
): DateValueType {
  if (placeholderValue && 'hour' in placeholderValue) {
    return placeholderValue
  }

  return new Time() as unknown as DateValueType
}

export function convertValue(
  value: DateValue | null | undefined,
  calendar?: Calendar,
): DateValue | null | undefined {
  if (value === null) {
    return null
  }

  if (!value) {
    return undefined
  }

  return calendar ? toCalendar(value, calendar) : value
}

export function createPlaceholderDate(
  placeholderValue: DateValue | null | undefined,
  granularity: string,
  calendar: Calendar,
  timeZone: string | undefined,
): DateValue {
  if (placeholderValue) {
    return convertValue(placeholderValue, calendar)!
  }

  const date = toCalendar(
    now(timeZone ?? getLocalTimeZone()).set({
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    }),
    calendar,
  )

  if (granularity === 'year' || granularity === 'month' || granularity === 'day') {
    return toCalendarDate(date)
  }

  if (!timeZone) {
    return toCalendarDateTime(date)
  }

  return date
}

export function useDefaultProps(
  v: DateValue | null,
  granularity: Granularity | undefined,
  last: {value: [Granularity, string | undefined]},
): [Granularity, string | undefined] {
  // Compute default granularity and time zone from the value. If the value becomes null, keep the last values.
  const defaultTimeZone = v && 'timeZone' in v ? v.timeZone : undefined
  const defaultGranularity: Granularity = v && 'minute' in v ? 'minute' : 'day'

  // props.granularity must actually exist in the value if one is provided.
  if (v && granularity && !(granularity in v)) {
    throw new Error('Invalid granularity ' + granularity + ' for value ' + v.toString())
  }

  // If the granularity or time zone changed, update the last value.
  if (v && (last.value[0] !== defaultGranularity || last.value[1] !== defaultTimeZone)) {
    last.value = [defaultGranularity, defaultTimeZone]
  }

  if (!granularity) {
    granularity = v ? defaultGranularity : last.value[0]
  }

  const timeZone = v ? defaultTimeZone : last.value[1]
  return [granularity, timeZone]
}

export {mergeValidation, VALID_VALIDITY_STATE}
