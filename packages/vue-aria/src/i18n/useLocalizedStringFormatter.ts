/*
 * Port of `react-aria@3.53.1` `useLocalizedStringFormatter` /
 * `useLocalizedStringDictionary`
 * (`packages/react-aria/src/i18n/useLocalizedStringFormatter.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted to Vue.
 */

import {
  LocalizedStringDictionary,
  LocalizedStringFormatter,
  type LocalizedString,
  type LocalizedStrings,
} from '@internationalized/string'
import {useLocale} from './I18nProvider'

const cache = new WeakMap<object, LocalizedStringDictionary<any, any>>()

function getCachedDictionary<K extends string, T extends LocalizedString>(
  strings: LocalizedStrings<K, T>,
): LocalizedStringDictionary<K, T> {
  let dictionary = cache.get(strings)
  if (!dictionary) {
    dictionary = new LocalizedStringDictionary(strings)
    cache.set(strings, dictionary)
  }

  return dictionary as LocalizedStringDictionary<K, T>
}

/**
 * Returns a cached LocalizedStringDictionary for the given strings.
 */
export function useLocalizedStringDictionary<
  K extends string = string,
  T extends LocalizedString = string,
>(
  strings: LocalizedStrings<K, T>,
  packageName?: string,
): LocalizedStringDictionary<K, T> {
  return (
    (packageName && LocalizedStringDictionary.getGlobalDictionaryForPackage(packageName)) ||
    getCachedDictionary(strings)
  )
}

/**
 * Provides localized string formatting for the current locale. Supports
 * interpolating variables, selecting the correct pluralization, and formatting
 * numbers. Automatically follows the `I18nProvider` locale at call time.
 *
 * @param strings - A mapping of languages to localized strings by key.
 */
export function useLocalizedStringFormatter<
  K extends string = string,
  T extends LocalizedString = string,
>(
  strings: LocalizedStrings<K, T>,
  packageName?: string,
): LocalizedStringFormatter<K, T> {
  const i18n = useLocale()
  const dictionary = useLocalizedStringDictionary(strings, packageName)

  return {
    format(key: K, variables?: Record<string, string | number | boolean>) {
      return new LocalizedStringFormatter(i18n.locale, dictionary).format(key, variables)
    },
  } as unknown as LocalizedStringFormatter<K, T>
}
