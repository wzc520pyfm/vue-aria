/*
 * Searchfield strings copied from the official pin
 * (adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc,
 * packages/react-aria/intl/searchfield/*.json). Internal.
 */

import type {LocalizedStrings} from '@internationalized/string'

/**
 * Compile the raw ICU message strings at module load. The official packages
 * ship these via `@internationalized/string-compiler` at publish time; the raw
 * committed JSON keeps `{placeholder}` templates, so we wrap any message that
 * contains a placeholder in a compiled `(variables) => string` function here.
 */
function isLocalizedString(value: unknown): value is (variables: any) => string {
  return typeof value === 'function'
}

function compileMessage(message: unknown): any {
  if (typeof message !== 'string' || !message.includes('{')) {
    return message
  }
  return (variables?: Record<string, string | number | boolean>) =>
    message.replace(/\{(\w+)\}/g, (match, key) =>
      variables?.[key] != null ? String(variables[key]) : match,
    )
}

function compileStrings(
  strings: Record<string, Record<string, unknown>>,
): Record<string, Record<string, any>> {
  const out: Record<string, Record<string, any>> = {}
  for (const locale of Object.keys(strings)) {
    const entry = strings[locale]
    const compiled: Record<string, any> = {}
    for (const key of Object.keys(entry)) {
      compiled[key] = compileMessage(entry[key])
    }
    out[locale] = compiled
  }
  return out
}
import arAE from '../../intl/searchfield/ar-AE.json'
import bgBG from '../../intl/searchfield/bg-BG.json'
import csCZ from '../../intl/searchfield/cs-CZ.json'
import daDK from '../../intl/searchfield/da-DK.json'
import deDE from '../../intl/searchfield/de-DE.json'
import elGR from '../../intl/searchfield/el-GR.json'
import enUS from '../../intl/searchfield/en-US.json'
import esES from '../../intl/searchfield/es-ES.json'
import etEE from '../../intl/searchfield/et-EE.json'
import fiFI from '../../intl/searchfield/fi-FI.json'
import frFR from '../../intl/searchfield/fr-FR.json'
import heIL from '../../intl/searchfield/he-IL.json'
import hrHR from '../../intl/searchfield/hr-HR.json'
import huHU from '../../intl/searchfield/hu-HU.json'
import itIT from '../../intl/searchfield/it-IT.json'
import jaJP from '../../intl/searchfield/ja-JP.json'
import koKR from '../../intl/searchfield/ko-KR.json'
import ltLT from '../../intl/searchfield/lt-LT.json'
import lvLV from '../../intl/searchfield/lv-LV.json'
import nbNO from '../../intl/searchfield/nb-NO.json'
import nlNL from '../../intl/searchfield/nl-NL.json'
import plPL from '../../intl/searchfield/pl-PL.json'
import ptBR from '../../intl/searchfield/pt-BR.json'
import ptPT from '../../intl/searchfield/pt-PT.json'
import roRO from '../../intl/searchfield/ro-RO.json'
import ruRU from '../../intl/searchfield/ru-RU.json'
import skSK from '../../intl/searchfield/sk-SK.json'
import slSI from '../../intl/searchfield/sl-SI.json'
import srSP from '../../intl/searchfield/sr-SP.json'
import svSE from '../../intl/searchfield/sv-SE.json'
import trTR from '../../intl/searchfield/tr-TR.json'
import ukUA from '../../intl/searchfield/uk-UA.json'
import zhCN from '../../intl/searchfield/zh-CN.json'
import zhTW from '../../intl/searchfield/zh-TW.json'

const searchfieldStrings: LocalizedStrings<string, any> = compileStrings({
  'ar-AE': arAE,
  'bg-BG': bgBG,
  'cs-CZ': csCZ,
  'da-DK': daDK,
  'de-DE': deDE,
  'el-GR': elGR,
  'en-US': enUS,
  'es-ES': esES,
  'et-EE': etEE,
  'fi-FI': fiFI,
  'fr-FR': frFR,
  'he-IL': heIL,
  'hr-HR': hrHR,
  'hu-HU': huHU,
  'it-IT': itIT,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'lt-LT': ltLT,
  'lv-LV': lvLV,
  'nb-NO': nbNO,
  'nl-NL': nlNL,
  'pl-PL': plPL,
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'ro-RO': roRO,
  'ru-RU': ruRU,
  'sk-SK': skSK,
  'sl-SI': slSI,
  'sr-SP': srSP,
  'sv-SE': svSE,
  'tr-TR': trTR,
  'uk-UA': ukUA,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
})

export default searchfieldStrings
export {searchfieldStrings}
