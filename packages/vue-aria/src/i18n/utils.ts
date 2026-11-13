/*
 * Port of `react-aria@3.53.1` `isRTL`
 * (`packages/react-aria/src/i18n/utils.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */

// https://en.wikipedia.org/wiki/Right-to-left
const RTL_SCRIPTS = new Set([
  'Arab',
  'Syrc',
  'Samr',
  'Mand',
  'Thaa',
  'Mend',
  'Nkoo',
  'Adlm',
  'Rohg',
  'Hebr',
])
const RTL_LANGS = new Set([
  'ae',
  'ar',
  'arc',
  'bcc',
  'bqi',
  'ckb',
  'dv',
  'fa',
  'glk',
  'he',
  'ku',
  'mzn',
  'nqo',
  'pnb',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
])

/**
 * Determines if a locale is read right to left using
 * [Intl.Locale]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale}.
 */
export function isRTL(localeString: string): boolean {
  // If the Intl.Locale API is available, use it to get the locale's text direction.
  if (Intl.Locale) {
    const locale = new Intl.Locale(localeString).maximize()

    // Use the text info object to get the direction if possible.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getTextInfo
    const textInfo =
      // @ts-ignore - implemented as a property by some browsers before it was standardized as a function.
      typeof locale.getTextInfo === 'function' ? locale.getTextInfo() : locale.textInfo
    if (textInfo) {
      return textInfo.direction === 'rtl'
    }

    // Fallback: guess using the script.
    if (locale.script) {
      return RTL_SCRIPTS.has(locale.script)
    }
  }

  // If not, just guess by the language (first part of the locale).
  const lang = localeString.split('-')[0]
  return RTL_LANGS.has(lang)
}
