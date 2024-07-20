import {buttonShortcuts, getButtonSafeList} from '@nev-ui/preset-button'
import {getSpinnerSafeList, spinnerShortcuts} from '@nev-ui/preset-spinner'
import {getIconSafeList, iconShortcuts} from '@nev-ui/preset-icon'

export const uiShortcuts = [buttonShortcuts, spinnerShortcuts, iconShortcuts]

export function getUISafeList() {
  const buttonSafeList = getButtonSafeList()
  const spinnerSafeList = getSpinnerSafeList()
  const iconSafeList = getIconSafeList()
  return [...buttonSafeList, ...spinnerSafeList, ...iconSafeList]
}

export {buttonShortcuts, spinnerShortcuts}
