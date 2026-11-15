/*
 * Numberfield strings copied from the official pin
 * (adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc,
 * packages/react-aria/intl/numberfield/*.json). Internal.
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
import arAE from '../../intl/numberfield/ar-AE.json'
import bgBG from '../../intl/numberfield/bg-BG.json'
import csCZ from '../../intl/numberfield/cs-CZ.json'
import daDK from '../../intl/numberfield/da-DK.json'
import deDE from '../../intl/numberfield/de-DE.json'
import elGR from '../../intl/numberfield/el-GR.json'
import enUS from '../../intl/numberfield/en-US.json'
import esES from '../../intl/numberfield/es-ES.json'
import etEE from '../../intl/numberfield/et-EE.json'
import fiFI from '../../intl/numberfield/fi-FI.json'
import frFR from '../../intl/numberfield/fr-FR.json'
import heIL from '../../intl/numberfield/he-IL.json'
import hrHR from '../../intl/numberfield/hr-HR.json'
import huHU from '../../intl/numberfield/hu-HU.json'
import itIT from '../../intl/numberfield/it-IT.json'
import jaJP from '../../intl/numberfield/ja-JP.json'
import koKR from '../../intl/numberfield/ko-KR.json'
import ltLT from '../../intl/numberfield/lt-LT.json'
import lvLV from '../../intl/numberfield/lv-LV.json'
import nbNO from '../../intl/numberfield/nb-NO.json'
import nlNL from '../../intl/numberfield/nl-NL.json'
import plPL from '../../intl/numberfield/pl-PL.json'
import ptBR from '../../intl/numberfield/pt-BR.json'
import ptPT from '../../intl/numberfield/pt-PT.json'
import roRO from '../../intl/numberfield/ro-RO.json'
import ruRU from '../../intl/numberfield/ru-RU.json'
import skSK from '../../intl/numberfield/sk-SK.json'
import slSI from '../../intl/numberfield/sl-SI.json'
import srSP from '../../intl/numberfield/sr-SP.json'
import svSE from '../../intl/numberfield/sv-SE.json'
import trTR from '../../intl/numberfield/tr-TR.json'
import ukUA from '../../intl/numberfield/uk-UA.json'
import zhCN from '../../intl/numberfield/zh-CN.json'
import zhTW from '../../intl/numberfield/zh-TW.json'

const numberfieldStrings: LocalizedStrings<string, any> = compileStrings({
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

export default numberfieldStrings
export {numberfieldStrings}
