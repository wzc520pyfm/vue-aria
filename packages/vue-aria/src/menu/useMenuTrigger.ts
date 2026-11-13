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

import {toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {MenuTriggerState, MenuTriggerType} from 'vue-stately/useMenuTriggerState'
import {useOverlayTrigger} from '../overlays/useOverlayTrigger'
import {useId} from '../utils/useId'

export interface AriaMenuTriggerProps {
  /** The type of menu that the menu trigger opens. */
  type?: 'menu' | 'listbox'
  /** Whether menu trigger is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** How menu is triggered. @default 'press' */
  trigger?: MaybeRefOrGetter<MenuTriggerType | undefined>
}

export interface MenuTriggerAria<T = unknown> {
  /** Props for the menu trigger element. Plain object. */
  menuTriggerProps: Record<string, any>
  /** Props for the menu. Plain object. */
  menuProps: Record<string, any>
}

function focusWithoutScrolling(el: Element | null | undefined) {
  if (!el || !(el instanceof HTMLElement)) return
  try {
    el.focus({preventScroll: true})
  } catch {
    el.focus()
  }
}

/**
 * Provides the behavior and accessibility implementation for a menu trigger.
 * Port of official `useMenuTrigger` (react-aria@3.53.1), press trigger only.
 */
export function useMenuTrigger<T = unknown>(
  props: AriaMenuTriggerProps,
  state: MenuTriggerState,
  triggerRef: Ref<Element | null>,
): MenuTriggerAria<T> {
  const type = props.type ?? 'menu'
  const menuTriggerId = useId('vue-aria-menu-trigger')
  const {triggerProps, overlayProps} = useOverlayTrigger({type}, state)

  const open = (shouldOpen: boolean, e: KeyboardEvent, focusStrategy: 'first' | 'last' = 'first'): boolean | void => {
    if (!shouldOpen || e.defaultPrevented) return false
    state.toggle(focusStrategy)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!!toValue(props.isDisabled)) return
    const trigger = (toValue(props.trigger) ?? 'press') as MenuTriggerType
    if (trigger === 'longPress' || trigger === 'contextMenu') {
      return
    }
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        if (open(true, e, 'first') !== false) e.preventDefault()
        break
      case 'ArrowUp':
        if (open(true, e, 'last') !== false) e.preventDefault()
        break
    }
  }

  let openedByPointerDown = false
  const onPointerDown = (e: PointerEvent) => {
    if (!!toValue(props.isDisabled) || (toValue(props.trigger) ?? 'press') !== 'press') return
    if (e.pointerType !== 'touch' && e.pointerType !== 'keyboard') {
      focusWithoutScrolling(triggerRef.value)
      state.open(e.pointerType === 'virtual' ? 'first' : null)
      openedByPointerDown = true
    } else {
      openedByPointerDown = false
    }
  }

  const onPress = () => {
    if (!!toValue(props.isDisabled) || (toValue(props.trigger) ?? 'press') !== 'press') return
    if (openedByPointerDown) {
      openedByPointerDown = false
      return
    }
    if (!state.isOpen.value) {
      focusWithoutScrolling(triggerRef.value)
      state.toggle()
    } else {
      state.close()
    }
  }

  // Preserve reactivity of triggerProps from useOverlayTrigger
  const menuTriggerProps: Record<string, any> = Object.create(null)
  for (const key of Object.keys(triggerProps)) {
    const desc = Object.getOwnPropertyDescriptor(triggerProps, key)
    if (desc) Object.defineProperty(menuTriggerProps, key, desc)
  }
  menuTriggerProps.id = menuTriggerId.value
  menuTriggerProps.onKeyDown = onKeyDown
  menuTriggerProps.onPointerDown = onPointerDown
  menuTriggerProps.onPress = onPress

  const menuProps: Record<string, any> = Object.create(null)
  for (const key of Object.keys(overlayProps)) {
    const desc = Object.getOwnPropertyDescriptor(overlayProps, key)
    if (desc) Object.defineProperty(menuProps, key, desc)
  }
  menuProps.id = (overlayProps as any).id
  Object.defineProperty(menuProps, 'aria-labelledby', {value: menuTriggerId.value, enumerable: true, configurable: true})
  Object.defineProperty(menuProps, 'autoFocus', {get: () => state.focusStrategy.value || true, enumerable: true, configurable: true})
  menuProps.onClose = () => state.close()

  return {menuTriggerProps, menuProps}
}
