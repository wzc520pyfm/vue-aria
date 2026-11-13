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

import {computed, ref, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {ListState} from 'vue-stately/useListState'
import type {Key} from 'vue-stately/useListState'
import {getItemId, getListData} from '../listbox/utils'
import {getMenuData} from './utils'
import {usePress} from '../interactions/press'
import {useHover} from '../interactions/hover'
import {useFocusVisible} from '../interactions/focusVisible'
import {useId, useSlotId} from '../utils/useId'

export interface AriaMenuItemProps {
  key: MaybeRefOrGetter<Key>
  id?: string
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isSelected?: MaybeRefOrGetter<boolean | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-haspopup'?: MaybeRefOrGetter<string | boolean | undefined>
  'aria-expanded'?: MaybeRefOrGetter<string | boolean | undefined>
  'aria-controls'?: MaybeRefOrGetter<string | undefined>
  shouldSelectOnPressUp?: MaybeRefOrGetter<boolean | undefined>
  shouldFocusOnHover?: MaybeRefOrGetter<boolean | undefined>
  closeOnSelect?: boolean
  shouldCloseOnSelect?: boolean
  onAction?: (key?: Key) => void
  onClose?: () => void
  isVirtualized?: boolean
  href?: string
  selectionManager?: any
  // submenu trigger integration
  onPressStart?: (e?: any) => void
  onPress?: (e?: any) => void
  onHoverChange?: (isHovered: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  isOpen?: boolean
}

export interface MenuItemAria {
  menuItemProps: Record<string, any>
  labelProps: Record<string, any>
  descriptionProps: Record<string, any>
  keyboardShortcutProps: Record<string, any>
  isFocused: import('vue').ComputedRef<boolean>
  isFocusVisible: import('vue').ComputedRef<boolean>
  isSelected: import('vue').ComputedRef<boolean>
  isPressed: import('vue').ComputedRef<boolean>
  isDisabled: import('vue').ComputedRef<boolean>
  isHovered: import('vue').Ref<boolean>
}

/**
 * Provides the behavior and accessibility implementation for an item in a menu.
 * Port of official `useMenuItem` (react-aria@3.53.1), adapted for Vue and ListState.
 */
export function useMenuItem<T>(
  props: AriaMenuItemProps,
  state: ListState<T>,
  itemRef: Ref<HTMLElement | null>,
): MenuItemAria {
  const key = computed<Key>(() => toValue(props.key) as Key)
  const data = getListData(state as any)
  const mdata = getMenuData(state as any)
  const manager = props.selectionManager ?? state.selectionManager

  const isDisabled = computed(() => !!toValue(props.isDisabled) || manager.isDisabled(key.value))
  const isSelected = computed(() => {
    const v = toValue(props.isSelected)
    if (v != null) return !!v
    return manager.isSelected(key.value)
  })

  const hasPopup = computed(() => toValue(props['aria-haspopup']) as string | boolean | undefined)
  const isTrigger = computed(() => !!hasPopup.value)
  const ariaExpanded = computed(() => toValue(props['aria-expanded']) as string | boolean | undefined)
  const isExpanded = computed(() => ariaExpanded.value === true || ariaExpanded.value === 'true')

  const roleGetter = () => {
    if (isTrigger.value) return 'menuitem'
    if (manager.selectionMode === 'single') return 'menuitemradio'
    if (manager.selectionMode === 'multiple') return 'menuitemcheckbox'
    return 'menuitem'
  }

  const baseId = computed(() => getItemId(state as any, key.value))
  const labelId = useId('vue-aria-menuitem-label')
  const descriptionId = useId('vue-aria-menuitem-desc')
  const keyboardId = useId('vue-aria-menuitem-kbd')
  const resolvedLabelId = useSlotId(labelId)
  const resolvedDescriptionId = useSlotId(descriptionId)
  const resolvedKeyboardId = useSlotId(keyboardId)

  const focusVisibleState = useFocusVisible()
  const isFocused = computed(() => manager.isFocused && manager.focusedKey === key.value)
  const isFocusVisible = computed(() => isFocused.value && focusVisibleState.isFocusVisible.value)
  const effectiveIsFocusVisible = computed(() => (isExpanded.value ? false : isFocusVisible.value))

  const shouldSelectOnPressUp = computed(() => (toValue(props.shouldSelectOnPressUp) ?? data.shouldSelectOnPressUp) || true)

  const performAction = () => {
    if (isTrigger.value) return
    props.onAction?.(key.value)
    if (data.onAction) data.onAction(key.value)
    if (mdata.onAction) mdata.onAction(key.value)
  }

  const interaction = ref<{pointerType: string; key?: string} | null>(null)
  const isPressedRef = ref(false)

  const {pressProps, isPressed} = usePress({
    isDisabled,
    onPressStart: (e) => {
      if (typeof props.onPressStart === 'function') props.onPressStart(e)
    },
    onPress: (e) => {
      if (typeof props.onPress === 'function') props.onPress(e)
    },
    onPressUp: (e) => {
      if (e.pointerType !== 'keyboard') interaction.value = {pointerType: e.pointerType}
      if (e.pointerType === 'mouse' && !isPressedRef.value) {
        // allowsDifferentPressOrigin
      }
      void shouldSelectOnPressUp
    },
    onPressChange: (p) => { isPressedRef.value = p },
  })

  const {hoverProps, isHovered} = useHover({
    isDisabled,
    onHoverStart: () => {
      if (!focusVisibleState.isFocusVisible.value) {
        manager.setFocused(true)
        manager.setFocusedKey(key.value)
      }
    },
    onHoverChange: (hovered) => {
      if (typeof props.onHoverChange === 'function') props.onHoverChange(hovered)
    },
  })

  const onClick = (e: MouseEvent) => {
    if (isDisabled.value) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    // Submenu triggers must not fire onAction or close the menu.
    if (isTrigger.value) {
      interaction.value = null
      return
    }
    const pointerType = interaction.value?.pointerType ?? 'mouse'
    const kbdKey = interaction.value?.key
    // selection for selectable modes
    if (manager.selectionMode !== 'none' && manager.canSelectItem(key.value)) {
      manager.select(key.value, e)
    }
    performAction()
    const onClose = props.onClose || mdata.onClose || (mdata as any).rootClose
    const isLink = !!props.href
    let shouldClose =
      pointerType === 'keyboard'
        ? kbdKey === 'Enter' || manager.selectionMode === 'none' || isLink
        : manager.selectionMode !== 'multiple' || isLink

    shouldClose = props.shouldCloseOnSelect ?? props.closeOnSelect ?? mdata.shouldCloseOnSelect ?? mdata.closeOnSelect ?? shouldClose

    if (onClose && shouldClose) {
      onClose()
    }
    interaction.value = null
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isDisabled.value) return
    if (typeof props.onKeyDown === 'function') props.onKeyDown(e)
    // External trigger handlers (e.g. Arrow keys to open submenu) may prevent default.
    // For Enter/Space activation, continue even if press/external handlers prevented default.
    if (e.defaultPrevented && e.key !== ' ' && e.key !== 'Enter') return
    if (e.key === ' ' || e.key === 'Enter') {
      interaction.value = {pointerType: 'keyboard', key: e.key}
      e.preventDefault()
      // For submenu triggers, keyboard open is handled by onPressStart/onKeyDown from trigger props.
      // For normal items, click unifies selection/action/close behavior.
      if (!isTrigger.value) {
        const el = itemRef.value as HTMLElement | null
        if (el && typeof (el as any).click === 'function') (el as any).click()
      }
    }
  }

  const baseProps: Record<string, any> = {
    onClick,
    onKeydown: onKeyDown,
  }
  const mergedInteractionProps = {...pressProps, ...hoverProps, ...focusVisibleState.focusProps}
  for (const key of Object.keys(baseProps)) {
    const a = (mergedInteractionProps as any)[key]
    const b = (baseProps as any)[key]
    if (typeof a === 'function' && typeof b === 'function') {
      ;(mergedInteractionProps as any)[key] = (...args: any[]) => { a(...args); b(...args) }
    } else if (b !== undefined) {
      ;(mergedInteractionProps as any)[key] = b
    }
  }

  const menuItemProps: Record<string, any> = {
    ...mergedInteractionProps,
  }
  Object.defineProperties(menuItemProps, {
    id: {get: () => props.id ?? baseId.value, enumerable: true},
    role: {get: () => roleGetter(), enumerable: true},
    'aria-disabled': {get: () => (isDisabled.value ? true : undefined), enumerable: true},
    'aria-label': {get: () => toValue(props['aria-label']), enumerable: true},
    'aria-labelledby': {get: () => resolvedLabelId.value, enumerable: true},
    'aria-describedby': {
      get: () => {
        const parts = [toValue((props as any)['aria-describedby']), resolvedDescriptionId.value, resolvedKeyboardId.value].filter(Boolean)
        return parts.length ? parts.join(' ') : undefined
      },
      enumerable: true,
    },
    'aria-checked': {
      get: () => (manager.selectionMode !== 'none' && !isTrigger.value ? isSelected.value : undefined),
      enumerable: true,
    },
    'aria-haspopup': {get: () => hasPopup.value ?? undefined, enumerable: true},
    'aria-expanded': {get: () => (hasPopup.value != null ? (ariaExpanded.value ?? undefined) : undefined), enumerable: true},
    'aria-controls': {get: () => toValue(props['aria-controls']) ?? undefined, enumerable: true},
    tabIndex: {get: () => (isFocused.value ? (isExpanded.value ? -1 : 0) : -1), enumerable: true},
  })

  return {
    menuItemProps,
    labelProps: {id: labelId.value},
    descriptionProps: {id: descriptionId.value},
    keyboardShortcutProps: {id: keyboardId.value},
    isFocused,
    isFocusVisible: effectiveIsFocusVisible,
    isSelected,
    isPressed,
    isDisabled,
    isHovered,
  }
}
