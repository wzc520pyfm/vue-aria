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

import {onBeforeUnmount, ref, type Ref} from 'vue'
import type {Key} from 'vue-stately/useListState'
import type {MultipleSelectionManager} from 'vue-stately/useMultipleSelectionState'

/** Official typeahead debounce wait, in milliseconds. */
export const TYPEAHEAD_DEBOUNCE_WAIT_MS = 1000

export interface AriaTypeSelectOptions {
  /** A delegate that returns collection item keys with respect to visual layout. */
  keyboardDelegate: {getKeyForSearch?: (search: string, fromKey?: Key) => Key | null; getFirstKey?: () => Key | null; getNextKey?: (key: Key) => Key | null}
  /** An interface for reading and updating multiple selection state. */
  selectionManager: MultipleSelectionManager
  /** Called when an item is focused by typing. */
  onTypeSelect?: (key: Key) => void
}

export interface TypeSelectAria {
  /** Props to be spread on the owner of the options. */
  typeSelectProps: {
    onKeyDownCapture?: (e: KeyboardEvent) => void
    onKeyDown?: (e: KeyboardEvent) => void
  }
}

function getStringForKey(key: string): string {
  // If the key is of length 1, it is an ASCII value. Otherwise, if there are no
  // ASCII characters in the key name, it is a Unicode character.
  if (key.length === 1 || !/^[A-Z]/i.test(key)) {
    return key
  }
  return ''
}

/**
 * Handles typeahead interactions with collections.
 */
export function useTypeSelect(options: AriaTypeSelectOptions): TypeSelectAria {
  const {keyboardDelegate, selectionManager, onTypeSelect} = options
  const state = ref<{search: string; timeout: ReturnType<typeof setTimeout> | undefined}>({
    search: '',
    timeout: undefined,
  })

  const clearTimer = () => {
    if (state.value.timeout) {
      clearTimeout(state.value.timeout)
      state.value.timeout = undefined
    }
  }

  const reset = () => {
    state.value.search = ''
    clearTimer()
  }

  const findKey = (search: string, fromKey?: Key | null): Key | null => {
    const getKeyForSearch = keyboardDelegate.getKeyForSearch
    if (!getKeyForSearch) {
      return null
    }
    // try from fromKey onward
    let key = getKeyForSearch.call(keyboardDelegate, search, fromKey ?? undefined)
    if (key != null) return key
    // wrap: search from start
    if (fromKey != null) {
      key = getKeyForSearch.call(keyboardDelegate, search)
      if (key != null) return key
    }
    return null
  }

  const onKeyDownCapture = (e: KeyboardEvent) => {
    // If we're in the middle of a search, then a spacebar should be treated as
    // a search and we should not propagate the event since we handle it in a
    // capture phase, so we should ignore it in the bubble phase.
    if (state.value.search.length > 0 && e.key === ' ') {
      e.preventDefault()
      state.value.search += ' '
      const key = findKey(state.value.search, selectionManager.focusedKey)
      if (key != null) {
        selectionManager.setFocusedKey(key)
        onTypeSelect?.(key)
      }
      clearTimer()
      state.value.timeout = setTimeout(() => {
        state.value.search = ''
      }, TYPEAHEAD_DEBOUNCE_WAIT_MS)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const character = getStringForKey(e.key)
    if (
      !character ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      (state.value.search.length === 0 && character === ' ')
    ) {
      return
    }

    state.value.search += character
    const key = findKey(state.value.search, selectionManager.focusedKey)
    if (key != null) {
      selectionManager.setFocusedKey(key)
      onTypeSelect?.(key)
      e.preventDefault()
    } else {
      reset()
    }

    clearTimer()
    state.value.timeout = setTimeout(() => {
      state.value.search = ''
    }, TYPEAHEAD_DEBOUNCE_WAIT_MS)
  }

  onBeforeUnmount(() => {
    reset()
  })

  return {
    typeSelectProps: {
      onKeyDownCapture: keyboardDelegate.getKeyForSearch ? onKeyDownCapture : undefined,
      onKeyDown: keyboardDelegate.getKeyForSearch ? onKeyDown : undefined,
    },
  }
}
