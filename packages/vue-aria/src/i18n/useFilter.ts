/*
 * Port of `react-aria@3.53.1` `useFilter`
 * (`packages/react-aria/src/i18n/useFilter.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: no I18nProvider — the locale comes from `document.documentElement.lang`
 * (falling back to `en-US`). The collator uses `Intl.Collator({usage: 'search', ...options})`
 * and NFC normalization, like the official implementation. Empty substrings match.
 */

export interface Filter {
  /** Returns whether a string starts with a given substring. */
  startsWith: (string: string, substring: string) => boolean
  /** Returns whether a string ends with a given substring. */
  endsWith: (string: string, substring: string) => boolean
  /** Returns whether a string contains a given substring. */
  contains: (string: string, substring: string) => boolean
}

const collatorCache = new Map<string, Intl.Collator>()

function getLocale(): string {
  try {
    if (typeof document !== 'undefined' && document.documentElement?.lang) {
      return document.documentElement.lang
    }
  } catch {}
  return 'en-US'
}

function getCollator(options?: Intl.CollatorOptions): Intl.Collator {
  const locale = getLocale()
  const cacheKey =
    locale +
    (options
      ? Object.entries(options)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .join()
      : '')
  let collator = collatorCache.get(cacheKey)
  if (!collator) {
    collator = new Intl.Collator(locale, {usage: 'search', ...options})
    collatorCache.set(cacheKey, collator)
  }
  return collator
}

/**
 * Provides localized string search functionality that is useful for filtering or matching items in
 * a list. Options can be provided to adjust the sensitivity to case, diacritics, and other
 * parameters.
 */
export function useFilter(options?: Intl.CollatorOptions): Filter {
  const collator = getCollator({usage: 'search', ...options})

  const startsWith = (string: string, substring: string): boolean => {
    if (substring.length === 0) return true

    // Normalize both strings so we can slice safely
    string = string.normalize('NFC')
    substring = substring.normalize('NFC')
    return collator.compare(string.slice(0, substring.length), substring) === 0
  }

  const endsWith = (string: string, substring: string): boolean => {
    if (substring.length === 0) return true

    string = string.normalize('NFC')
    substring = substring.normalize('NFC')
    return collator.compare(string.slice(-substring.length), substring) === 0
  }

  const contains = (string: string, substring: string): boolean => {
    if (substring.length === 0) return true

    string = string.normalize('NFC')
    substring = substring.normalize('NFC')

    const sliceLen = substring.length
    for (let scan = 0; scan + sliceLen <= string.length; scan++) {
      const slice = string.slice(scan, scan + sliceLen)
      if (collator.compare(substring, slice) === 0) {
        return true
      }
    }

    return false
  }

  return {startsWith, endsWith, contains}
}
