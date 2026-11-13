/*
 * Port of `react-aria@3.53.1` `useDisplayNames`
 * (`packages/react-aria/src/datepicker/useDisplayNames.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not part of the public surface.
 */

import {useLocale} from '../i18n/I18nProvider'
import {useLocalizedStringDictionary} from '../i18n/useLocalizedStringFormatter'
import datepickerStrings from '../i18n/datepickerStrings'
import type {LocalizedStringDictionary} from '@internationalized/string'
import type {DateSegmentType} from 'vue-stately/useDateFieldState'

type Field = DateSegmentType

interface DisplayNames {
  of(field: Field): string | undefined
}

/** @private */
export function useDisplayNames(): DisplayNames {
  const {locale} = useLocale()
  const dictionary = useLocalizedStringDictionary(
    datepickerStrings as any,
    '@react-aria/datepicker',
  )
  // Try to use Intl.DisplayNames if possible. It may be supported in browsers, but not support
  // the dateTimeField type as that was only added in v2. https://github.com/tc39/intl-displaynames-v2
  try {
    return new Intl.DisplayNames(locale, {type: 'dateTimeField'}) as unknown as DisplayNames
  } catch {
    return new DisplayNamesPolyfill(locale, dictionary as LocalizedStringDictionary<Field, string>)
  }
}

class DisplayNamesPolyfill implements DisplayNames {
  private locale: string
  private dictionary: LocalizedStringDictionary<Field, string>

  constructor(locale: string, dictionary: LocalizedStringDictionary<Field, string>) {
    this.locale = locale
    this.dictionary = dictionary
  }

  of(field: Field): string {
    return this.dictionary.getStringForLocale(field, this.locale)
  }
}
