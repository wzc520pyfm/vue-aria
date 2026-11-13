/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {computed, onMounted, ref, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {ListState} from 'vue-stately/useListState'
import type {Key} from 'vue-stately/useListState'
import {ListKeyboardDelegate} from '../listbox/useListKeyboardDelegate'
import {getListData, setListData} from '../listbox/utils'
import {getMenuData} from './utils'
import {useId} from '../utils/useId'
import {useTypeSelect} from '../listbox/useTypeSelect'
import {useFocusVisible} from '../interactions/focusVisible'
import {useLabel} from '../label/useLabel'

export interface MenuProps<T = unknown> {
  autoFocus?: boolean | 'first' | 'last'
  shouldFocusWrap?: boolean
  onAction?: (key: Key) => void
  onClose?: () => void
  shouldCloseOnSelect?: boolean
  selectionMode?: 'none' | 'single' | 'multiple'
  escapeKeyBehavior?: 'clearSelection' | 'none'
}

export interface AriaMenuProps<T = unknown> extends MenuProps<T> {
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export interface AriaMenuOptions<T = unknown> extends Omit<AriaMenuProps<T>, 'children'> {
  isVirtualized?: boolean
  keyboardDelegate?: any
  shouldUseVirtualFocus?: boolean
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  orientation?: 'vertical' | 'horizontal'
  layout?: 'stack' | 'grid'
  shouldSelectOnPressUp?: boolean
  shouldFocusOnHover?: boolean
  disallowEmptySelection?: boolean
  label?: unknown
}

export interface MenuAria {
  /** Props for the menu element. Plain object. */
  menuProps: Record<string, any>
}

function isCtrlKeyPressed(e: KeyboardEvent) {
  if (typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)) return e.metaKey
  return e.ctrlKey
}

/**
 * Provides the behavior and accessibility implementation for a menu component.
 * Port of official `useMenu` (react-aria@3.53.1), adapted to reuse useListState/ListCollection.
 */
export function useMenu<T>(
  props: AriaMenuOptions<T>,
  state: ListState<T>,
  menuRef: Ref<HTMLElement | null>,
): MenuAria {
  const shouldFocusWrap = computed(() => (toValue(props.shouldFocusWrap as any) ?? true) as boolean)
  const orientation = computed(() => (toValue((props as any).orientation) ?? 'vertical') as 'vertical' | 'horizontal')
  const escapeKeyBehavior = computed(() => (toValue((props as any).escapeKeyBehavior) ?? 'clearSelection') as 'clearSelection' | 'none')
  const disallowEmptySelection = computed(() => !!toValue((props as any).disallowEmptySelection))
  const selectionBehavior = computed(() => ((state.selectionManager as any).selectionBehavior ?? 'toggle') as 'toggle' | 'replace')

  if (!props['aria-label'] && !props['aria-labelledby']) {
    try {
      // eslint-disable-next-line no-console
      console.warn('An aria-label or aria-labelledby prop is required for accessibility.')
    } catch {}
  }

  const domId = useId(toValue(props.id as any))

  // Store menu/list data for items
  setListData(state as any, {
    id: domId.value,
    shouldSelectOnPressUp: !!(props as any).shouldSelectOnPressUp,
    shouldFocusOnHover: !!(props as any).shouldFocusOnHover,
    shouldUseVirtualFocus: !!(props as any).shouldUseVirtualFocus,
    isVirtualized: !!(props as any).isVirtualized,
    onAction: props.onAction,
    linkBehavior: 'override',
  })
  const mdata = getMenuData(state as any)
  mdata.onClose = props.onClose
  mdata.onAction = props.onAction
  mdata.shouldCloseOnSelect = (props as any).shouldCloseOnSelect
  mdata.shouldUseVirtualFocus = (props as any).shouldUseVirtualFocus

  const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'base'})
  const delegate = computed(() => {
    const provided = (props as any).keyboardDelegate
    if (provided) return provided
    return new ListKeyboardDelegate({
      collection: () => state.collection.value as any,
      ref: menuRef,
      collator,
      disabledKeys: () => state.selectionManager.disabledKeys,
      disabledBehavior: () => state.selectionManager.disabledBehavior as any,
      layout: ((props as any).layout ?? 'stack') as any,
      orientation: orientation.value,
      direction: 'ltr',
    })
  })

  const {typeSelectProps} = useTypeSelect({
    keyboardDelegate: delegate.value as any,
    selectionManager: state.selectionManager as any,
  })

  const focusVisible = useFocusVisible()
  const focusPropsOnFocus = focusVisible.focusProps.onFocus
  const focusPropsOnBlur = focusVisible.focusProps.onBlur
  const isFocused = computed(() => state.selectionManager.isFocused)

  const onFocus = (e: FocusEvent) => {
    if (!state.selectionManager.isFocused) {
      state.selectionManager.setFocused(true)
    }
    focusPropsOnFocus(e)
    const autoFocus = (props as any).autoFocus
    if (state.selectionManager.focusedKey == null && autoFocus) {
      let key: Key | null = null
      if (autoFocus === 'last') key = delegate.value.getLastKey?.() ?? null
      else key = state.selectionManager.firstSelectedKey ?? delegate.value.getFirstKey?.() ?? null
      if (key != null) state.selectionManager.setFocusedKey(key)
    }
  }

  const onBlur = (e: FocusEvent) => {
    focusPropsOnBlur(e)
    if (menuRef.value && !(e.relatedTarget instanceof Node && menuRef.value.contains(e.relatedTarget))) {
      state.selectionManager.setFocused(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    (typeSelectProps as any).onKeyDownCapture?.(e)
    if (e.defaultPrevented) return
    (typeSelectProps as any).onKeyDown?.(e)
    if (e.defaultPrevented) return

    const manager = state.selectionManager
    const d = delegate.value
    const focusedKey = manager.focusedKey

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = focusedKey == null ? d.getFirstKey?.() : d.getKeyBelow?.(focusedKey)
        const key = next ?? (shouldFocusWrap.value ? d.getFirstKey?.() : null)
        if (key != null) manager.setFocusedKey(key)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = focusedKey == null ? d.getLastKey?.() : d.getKeyAbove?.(focusedKey)
        const key = prev ?? (shouldFocusWrap.value ? d.getLastKey?.() : null)
        if (key != null) manager.setFocusedKey(key)
        break
      }
      case 'Home': {
        e.preventDefault()
        const key = d.getFirstKey?.()
        if (key != null) manager.setFocusedKey(key)
        break
      }
      case 'End': {
        e.preventDefault()
        const key = d.getLastKey?.()
        if (key != null) manager.setFocusedKey(key)
        break
      }
      case 'Escape': {
        if (props.onClose) {
          e.preventDefault()
          props.onClose()
        } else if (escapeKeyBehavior.value === 'clearSelection' && !disallowEmptySelection.value && manager.selectedKeys.size > 0) {
          e.preventDefault()
          manager.clearSelection()
        }
        break
      }
      case 'Enter': {
        // Enter always closes menus (including multiple selection mode)
        if (props.onClose) {
          // Let item activation happen first in bubble phase? this runs on menu; 
          // schedule close so item handlers can run.
          setTimeout(() => props.onClose?.(), 0)
        }
        break
      }
      case 'a': {
        if ((e.ctrlKey || e.metaKey) && manager.selectionMode === 'multiple') {
          e.preventDefault()
          manager.selectAll()
        }
        break
      }
    }
    ;(props as any).onKeyDown?.(e)
  }

  const menuProps: Record<string, any> = {}
  Object.defineProperties(menuProps, {
    role: {value: 'menu', enumerable: true},
    id: {get: () => (props.id ?? domId.value), enumerable: true},
    tabIndex: {get: () => (state.selectionManager.focusedKey == null ? 0 : -1), enumerable: true},
    'aria-label': {get: () => props['aria-label'], enumerable: true},
    'aria-labelledby': {get: () => props['aria-labelledby'], enumerable: true},
    onKeyDown: {value: onKeyDown, enumerable: true},
    onKeydown: {value: onKeyDown, enumerable: true},
    onFocus: {value: onFocus, enumerable: true},
    onBlur: {value: onBlur, enumerable: true},
  })

  const autoFocusRef = ref((props as any).autoFocus)
  onMounted(() => {
    if (!autoFocusRef.value) return
    const autoFocus = (props as any).autoFocus
    let focusedKey: Key | null = null
    if (autoFocus === 'first') focusedKey = delegate.value.getFirstKey?.() ?? null
    else if (autoFocus === 'last') focusedKey = delegate.value.getLastKey?.() ?? null
    const selectedKeys = state.selectionManager.selectedKeys
    if (selectedKeys.size) {
      for (const key of selectedKeys) {
        if (state.selectionManager.canSelectItem(key)) { focusedKey = key; break }
      }
    }
    state.selectionManager.setFocused(true)
    if (focusedKey != null) state.selectionManager.setFocusedKey(focusedKey)
    if (state.collection.value.size > 0) autoFocusRef.value = false
  })

  return {menuProps}
}
