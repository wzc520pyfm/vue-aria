/*
 * Port of `react-aria@3.53.1` `useNumberFormatter`
 * (`packages/react-aria/src/i18n/useNumberFormatter.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted to Vue. Public.
 */

import {NumberFormatter, type NumberFormatOptions} from '@internationalized/number'
import {toValue, type MaybeRefOrGetter} from 'vue'
import {useLocale} from './I18nProvider'

/**
 * Provides localized number formatting for the current locale. Automatically
 * follows the `I18nProvider` locale at call time.
 *
 * @param options - Formatting options. May be a getter for live options.
 */
export function useNumberFormatter(
  options: MaybeRefOrGetter<NumberFormatOptions | undefined> = {},
): NumberFormatter {
  const i18n = useLocale()

  // `@internationalized/number` caches the underlying Intl formatter per
  // locale + options, so constructing one per call is cheap. Return a live
  // formatter view so the locale is re-read on every format call.
  const formatter = () => new NumberFormatter(i18n.locale, toValue(options) ?? {})

  return {
    format(value: number) {
      return formatter().format(value)
    },
    formatToParts(value: number) {
      return formatter().formatToParts(value)
    },
    formatRange(start: number, end: number) {
      return formatter().formatRange(start, end)
    },
    formatRangeToParts(start: number, end: number) {
      return formatter().formatRangeToParts(start, end)
    },
    resolvedOptions() {
      return formatter().resolvedOptions()
    },
  } as unknown as NumberFormatter
}
