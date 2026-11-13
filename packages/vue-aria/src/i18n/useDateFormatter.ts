/*
 * Port of `react-aria@3.53.1` `useDateFormatter`
 * (`packages/react-aria/src/i18n/useDateFormatter.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted to Vue. Uses `@internationalized/date`'s `DateFormatter`, not bare
 * `Intl.DateTimeFormat`, so calendar options are honored.
 */

import {DateFormatter} from '@internationalized/date'
import {toValue, type MaybeRefOrGetter} from 'vue'
import {useLocale} from './I18nProvider'

export interface DateFormatterOptions extends Intl.DateTimeFormatOptions {
  calendar?: string
}

/**
 * Provides localized date formatting for the current locale. Automatically
 * follows the `I18nProvider` locale at call time.
 *
 * @param options - Formatting options. May be a getter for live options
 * (e.g. when the time zone follows the current field state).
 */
export function useDateFormatter(
  options: MaybeRefOrGetter<DateFormatterOptions> = {},
): DateFormatter {
  const i18n = useLocale()

  // `@internationalized/date` caches the underlying Intl formatter per
  // locale + options, so constructing one per call is cheap.
  const formatter = () => new DateFormatter(i18n.locale, toValue(options))

  return {
    format(value: Date) {
      return formatter().format(value)
    },
    formatToParts(value: Date) {
      return formatter().formatToParts(value)
    },
    formatRange(start: Date, end: Date) {
      return formatter().formatRange(start, end)
    },
    formatRangeToParts(start: Date, end: Date) {
      return formatter().formatRangeToParts(start, end)
    },
    resolvedOptions() {
      return formatter().resolvedOptions()
    },
  } as unknown as DateFormatter
}
