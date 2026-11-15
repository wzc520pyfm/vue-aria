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
  const i18n = useLocale()
  const dictionary = useLocalizedStringDictionary(
    datepickerStrings as any,
    '@react-aria/datepicker',
  )
  // Resolve DisplayNames lazily per locale so a post-mount I18nProvider locale
  // switch is honored (official reads the provider locale at format time).
  const cache = new Map<string, DisplayNames>()
  const resolve = (): DisplayNames => {
    const locale = i18n.locale
    let displayNames = cache.get(locale)
    if (displayNames) {
      return displayNames
    }
    try {
      displayNames = new Intl.DisplayNames(locale, {type: 'dateTimeField'}) as unknown as DisplayNames
    } catch {
      displayNames = new DisplayNamesPolyfill(locale, dictionary as LocalizedStringDictionary<Field, string>)
    }
    cache.set(locale, displayNames)
    return displayNames
  }
  return {
    of(field: Field) {
      return resolve().of(field)
    },
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
