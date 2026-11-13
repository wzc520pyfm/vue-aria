/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {computed, ref, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {OverlayTriggerState} from '../overlays/useOverlayTriggerState'
import type {FocusStrategy, Key, RootMenuTriggerState} from './useMenuTriggerState'

export interface SubmenuTriggerProps {
  /** Key of the trigger item. */
  triggerKey: MaybeRefOrGetter<Key | null | undefined> | Key
}

export interface SubmenuTriggerState extends OverlayTriggerState {
  /** Controls which item will be auto focused when the submenu opens. */
  focusStrategy: Ref<FocusStrategy | null>
  /** Opens the submenu. */
  open: (focusStrategy?: FocusStrategy | null) => void
  /** Closes the submenu. */
  close: () => void
  /** Closes all menus and submenus in the menu tree. */
  closeAll: () => void
  /** The level of the submenu. */
  submenuLevel: number
  /** Toggles the submenu. */
  toggle: (focusStrategy?: FocusStrategy | null) => void
  /** @private */
  setOpen: (isOpen: boolean) => void
}

/**
 * Manages state for a submenu trigger. Tracks whether the submenu is currently open, the level of
 * the submenu, and controls which item will receive focus when it opens.
 *
 * Port of `react-stately@3.51.0` `useSubmenuTriggerState`
 * (`packages/react-stately/src/menu/useSubmenuTriggerState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */
export function useSubmenuTriggerState(
  props: SubmenuTriggerProps,
  state: RootMenuTriggerState,
): SubmenuTriggerState {
  const triggerKey = computed(() => toValue(props.triggerKey as any) as Key | null | undefined)
  const {expandedKeysStack, openSubmenu, closeSubmenu, close: closeAll} = state
  // Capture submenu level once at setup (official useState).
  const submenuLevel = expandedKeysStack.value.length
  const isOpen = computed(() => {
    const key = triggerKey.value
    return key != null && expandedKeysStack.value[submenuLevel] === key
  })
  const focusStrategy = ref<FocusStrategy | null>(null)
  const point = ref<{x: number; y: number} | null>(null)

  const open = (fs: FocusStrategy | null = null) => {
    const key = triggerKey.value
    if (key == null) return
    focusStrategy.value = fs
    openSubmenu(key, submenuLevel)
  }

  const close = () => {
    const key = triggerKey.value
    if (key == null) return
    focusStrategy.value = null
    closeSubmenu(key, submenuLevel)
  }

  const toggle = (fs: FocusStrategy | null = null) => {
    if (isOpen.value) {
      close()
    } else {
      open(fs)
    }
  }

  return {
    focusStrategy,
    isOpen,
    open,
    close,
    closeAll,
    submenuLevel,
    // Placeholders for OverlayTriggerState parity.
    setOpen: () => {},
    toggle,
    point,
    setPoint: (p) => { point.value = p },
  }
}
