/*
 * Port of `react-aria@3.53.1` `I18nProvider` / `useLocale`
 * (`packages/react-aria/src/i18n/I18nProvider.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted to Vue provide/inject. With no provider, `useLocale` falls back to
 * the browser locale exactly like official `useDefaultLocale`.
 */

import {computed, defineComponent, inject, provide, type InjectionKey} from 'vue'
import {isRTL} from './utils'
import {getDefaultLocale} from './useDefaultLocale'

export interface Locale {
  /** The [BCP47](https://www.ietf.org/rfc/bcp/bcp47.txt) language code for the locale. */
  locale: string
  /** The writing direction for the locale. */
  direction: 'ltr' | 'rtl'
}

export interface I18nProviderProps {
  /** Contents that should have the locale applied. */
  children?: unknown
  /** The locale to apply to the children. */
  locale?: string
}

export const I18nContextKey: InjectionKey<Locale> = Symbol('vue-aria.I18nContext')

/** Stable reactive locale value shared through provide/inject. */
function createLocaleValue(getLocale: () => string | undefined, defaultLocale: Locale): Locale {
  const resolved = computed<Locale>(() => {
    const locale = getLocale()
    if (!locale) {
      return defaultLocale
    }
    return {
      locale,
      direction: isRTL(locale) ? 'rtl' : 'ltr',
    }
  })

  return {
    get locale() {
      return resolved.value.locale
    },
    get direction() {
      return resolved.value.direction
    },
  }
}

/**
 * Provides the locale for the application to all child components.
 */
export const I18nProvider = defineComponent({
  name: 'I18nProvider',
  props: {
    locale: {type: String, default: undefined},
  },
  setup(props, {slots}) {
    const value = createLocaleValue(() => props.locale, getDefaultLocale())
    provide(I18nContextKey, value)
    return () => slots.default?.()
  },
})

/**
 * Returns the current locale and layout direction.
 */
export function useLocale(): Locale {
  const context = inject(I18nContextKey, null)
  return context ?? getDefaultLocale()
}
