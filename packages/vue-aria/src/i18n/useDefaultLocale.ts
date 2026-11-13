/*
 * Port of `react-aria@3.53.1` `useDefaultLocale`
 * (`packages/react-aria/src/i18n/useDefaultLocale.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * simplified for the browser-only Vue build (no SSR locale provider).
 */

import {isRTL} from './utils'
import type {Locale} from './I18nProvider'

/**
 * Gets the locale setting of the browser.
 */
export function getDefaultLocale(): Locale {
  let locale =
    (typeof navigator !== 'undefined' && (navigator.language || (navigator as any).userLanguage)) ||
    'en-US'

  try {
    if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length === 0) {
      locale = 'en-US'
    }
  } catch {
    locale = 'en-US'
  }
  return {
    locale,
    direction: isRTL(locale) ? 'rtl' : 'ltr',
  }
}
