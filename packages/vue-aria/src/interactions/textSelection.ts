/*
 * Port of `react-aria@3.53.1` `textSelection`
 * (`packages/react-aria/src/interactions/textSelection.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Internal — not publicly exported.
 */

import {isIOS} from '../utils/platform'

type State = 'default' | 'disabled' | 'restoring'

let state: State = 'default'
let savedUserSelect = ''
const modifiedElementMap = new WeakMap<Element, string>()

function isWebKit() {
  if (typeof window === 'undefined' || window.navigator == null) return false
  const ua = window.navigator.userAgent || ''
  return /AppleWebKit/i.test(ua) && (isIOS() || !/Chrome|Chromium|CriOS/i.test(ua))
}

function ownerDocument(target?: Element) {
  if (target?.ownerDocument) return target.ownerDocument
  return typeof document === 'undefined' ? undefined : document
}

export function disableTextSelection(target?: Element): void {
  if (isIOS() && isWebKit()) {
    if (state === 'default') {
      const documentObject = ownerDocument(target)
      if (!documentObject) return
      savedUserSelect = documentObject.documentElement.style.webkitUserSelect
      documentObject.documentElement.style.webkitUserSelect = 'none'
    }
    state = 'disabled'
    return
  }
  if (target instanceof HTMLElement || target instanceof SVGElement) {
    const property = 'userSelect' in target.style ? 'userSelect' : 'webkitUserSelect'
    modifiedElementMap.set(target, target.style[property])
    target.style[property] = 'none'
  }
}

export function restoreTextSelection(target?: Element): void {
  if (isIOS() && isWebKit()) {
    if (state !== 'disabled') return
    state = 'restoring'
    const finish = () => {
      if (state !== 'restoring') return
      const documentObject = ownerDocument(target)
      if (documentObject && documentObject.documentElement.style.webkitUserSelect === 'none') {
        documentObject.documentElement.style.webkitUserSelect = savedUserSelect || ''
      }
      savedUserSelect = ''
      state = 'default'
    }
    if (typeof setTimeout === 'function') setTimeout(finish, 300)
    else finish()
    return
  }
  if (target instanceof HTMLElement || target instanceof SVGElement) {
    if (!modifiedElementMap.has(target)) return
    const targetOldUserSelect = modifiedElementMap.get(target) as string
    const property = 'userSelect' in target.style ? 'userSelect' : 'webkitUserSelect'
    if (target.style[property] === 'none') target.style[property] = targetOldUserSelect
    if (target.getAttribute('style') === '') target.removeAttribute('style')
    modifiedElementMap.delete(target)
  }
}
