/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 * for the specific language governing permissions and limitations under the License.
 */

import type {Key} from 'vue-stately/useListState'

export interface ListData {
  id?: string
  shouldSelectOnPressUp?: boolean
  shouldFocusOnHover?: boolean
  shouldUseVirtualFocus?: boolean
  isVirtualized?: boolean
  onAction?: (key: Key) => void
  linkBehavior?: 'action' | 'selection' | 'override' | 'none'
}

/**
 * Official `listData` WeakMap + `getItemId` from
 * `packages/react-aria/src/listbox/utils.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc
 * (react-aria@3.53.1).
 */
const listDataMap = new WeakMap<object, ListData>()

export function getListData(state: object): ListData {
  let data = listDataMap.get(state)
  if (!data) {
    data = {}
    listDataMap.set(state, data)
  }
  return data
}

export function setListData(state: object, data: ListData) {
  listDataMap.set(state, data)
}

export function getItemId(state: object, key: Key): string {
  const data = getListData(state)
  const listId = data.id ?? 'list'
  const normalizedKey =
    typeof key === 'string' ? key.replace(/\s*/g, '') : String(key)
  return `${listId}-option-${normalizedKey}`
}

/** Official `normalizeKey` equivalent. */
export function normalizeKey(key: Key): string {
  if (typeof key === 'string') {
    return key.replace(/\s*/g, '')
  }
  return '' + key
}

/** Official `isNonContiguousSelectionModifier` equivalent. */
export function isNonContiguousSelectionModifier(e: {
  ctrlKey?: boolean
  altKey?: boolean
}): boolean {
  const isAppleDevice = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform ?? navigator.userAgent ?? '')
  return isAppleDevice ? !!e.altKey : !!e.ctrlKey
}
