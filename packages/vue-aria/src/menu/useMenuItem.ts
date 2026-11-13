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
  shouldSelectOnPressUp?: MaybeRefOrGetter<boolean | undefined>
  shouldFocusOnHover?: MaybeRefOrGetter<boolean | undefined>
  closeOnSelect?: boolean
  shouldCloseOnSelect?: boolean
  onAction?: (key?: Key) => void
  onClose?: () => void
  isVirtualized?: boolean
  href?: string
  selectionManager?: any
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

  const isTrigger = false
  let role = 'menuitem'
  if (!isTrigger) {
    if (manager.selectionMode === 'single') role = 'menuitemradio'
    else if (manager.selectionMode === 'multiple') role = 'menuitemcheckbox'
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

  const shouldSelectOnPressUp = computed(() => (toValue(props.shouldSelectOnPressUp) ?? data.shouldSelectOnPressUp) || true)

  const performAction = () => {
    if (isTrigger) return
    props.onAction?.(key.value)
    if (data.onAction) data.onAction(key.value)
    if (mdata.onAction) mdata.onAction(key.value)
  }

  const interaction = ref<{pointerType: string; key?: string} | null>(null)
  const isPressedRef = ref(false)

  const {pressProps, isPressed} = usePress({
    isDisabled,
    onPressStart: (e) => {
      // Keyboard interaction key may be captured later in keydown/click paths.
    },
    onPress: (e) => {
      // selection/action on press for keyboard/virtual/touch per official behavior simplified
    },
    onPressUp: (e) => {
      if (e.pointerType !== 'keyboard') interaction.value = {pointerType: e.pointerType}
      // mouse drag-release behavior handled by native click; ensure selection on press up when needed
      if (e.pointerType === 'mouse' && !isPressedRef.value) {
        // allowsDifferentPressOrigin: if mouse up on item without prior press start tracked, activate
      }
      if (shouldSelectOnPressUp.value && e.pointerType !== 'keyboard') {
        // handled in click to unify
      }
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
  })

  const onClick = (e: MouseEvent) => {
    if (isDisabled.value) {
      e.preventDefault()
      e.stopPropagation()
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
        ? // Always close when pressing Enter key, or if item is not selectable.
          kbdKey === 'Enter' ||
          manager.selectionMode === 'none' ||
          isLink
        : // Close except if multi-select is enabled.
          manager.selectionMode !== 'multiple' || isLink

    shouldClose = props.shouldCloseOnSelect ?? props.closeOnSelect ?? mdata.shouldCloseOnSelect ?? mdata.closeOnSelect ?? shouldClose

    if (onClose && shouldClose) {
      onClose()
    }
    interaction.value = null
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isDisabled.value) return
    if (e.key === ' ' || e.key === 'Enter') {
      interaction.value = {pointerType: 'keyboard', key: e.key}
      e.preventDefault()
      const el = itemRef.value as HTMLElement | null
      if (el && typeof (el as any).click === 'function') (el as any).click()
    }
  }

  const baseProps: Record<string, any> = {
    onClick,
    onKeydown: onKeyDown,
  }
  // merge press/hover/focus handlers with our handlers (chain)
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
    role: {get: () => role, enumerable: true},
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
      get: () => (manager.selectionMode !== 'none' && !isTrigger ? isSelected.value : undefined),
      enumerable: true,
    },
    tabIndex: {get: () => (isFocused.value ? 0 : -1), enumerable: true},
  })

  // focus element when manager focuses this key
  // (component can also do this; keep prop simple)

  return {
    menuItemProps,
    labelProps: {id: labelId.value},
    descriptionProps: {id: descriptionId.value},
    keyboardShortcutProps: {id: keyboardId.value},
    isFocused,
    isFocusVisible,
    isSelected,
    isPressed,
    isDisabled,
    isHovered,
  }
}
