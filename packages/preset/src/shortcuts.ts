import {buttonShortcuts, getButtonSafeList} from '@nev-ui/preset-button'
import {getSpinnerSafeList, spinnerShortcuts} from '@nev-ui/preset-spinner'

export const uiShortcuts = [buttonShortcuts, spinnerShortcuts]

export function getUISafeList() {
  const buttonSafeList = getButtonSafeList()
  const spinnerSafeList = getSpinnerSafeList()
  return [...buttonSafeList, ...spinnerSafeList]
}

export {buttonShortcuts, spinnerShortcuts}
