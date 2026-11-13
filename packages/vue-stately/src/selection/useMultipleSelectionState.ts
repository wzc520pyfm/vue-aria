/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import {computed, ref, shallowRef, toValue, watchEffect} from 'vue'
import type {Key} from '../collections/types'
import {Selection as SelectionImpl} from './Selection'
import {equalSets} from './equalSets'
import type {
  DisabledBehavior,
  FocusStrategy,
  MultipleSelectionState,
  Selection,
  SelectionBehavior,
  SelectionMode,
  UseMultipleSelectionStateProps,
} from './types'

function convertSelection(
  selection: 'all' | Iterable<Key> | Selection | null | undefined,
  defaultValue?: Selection,
): Selection | undefined {
  if (selection == null) return defaultValue
  return selection === 'all' ? 'all' : new SelectionImpl(selection as Iterable<Key>)
}

export function useMultipleSelectionState(props: UseMultipleSelectionStateProps): MultipleSelectionState {
  const selectionMode = computed<SelectionMode>(() => (toValue(props.selectionMode) ?? 'none') as SelectionMode)
  const disallowEmptySelection = computed<boolean>(() => !!toValue(props.disallowEmptySelection))
  const disabledBehavior = computed<DisabledBehavior>(() => (toValue(props.disabledBehavior) ?? 'all') as DisabledBehavior)
  const allowDuplicateSelectionEvents = computed<boolean>(() => !!toValue(props.allowDuplicateSelectionEvents))
  const selectionBehaviorProp = computed<SelectionBehavior>(() => (toValue(props.selectionBehavior) ?? 'toggle') as SelectionBehavior)

  const isFocused = ref(false)
  const focusedKey = ref<Key | null>(null)
  const childFocusStrategy = ref<FocusStrategy | null>(null)
  const setFocused = (v: boolean) => { isFocused.value = v }
  const setFocusedKey = (k: Key | null, strategy: FocusStrategy = 'first') => {
    focusedKey.value = k
    childFocusStrategy.value = k == null ? null : strategy
  }

  const controlled = computed<Selection | undefined>(() => convertSelection(toValue(props.selectedKeys) as any))
  const uncontrolled = shallowRef<Selection>(convertSelection(toValue(props.defaultSelectedKeys) as any, new SelectionImpl())!)
  const selectedKeys = computed<Selection>(() => controlled.value ?? uncontrolled.value)

  const selectionBehavior = ref<SelectionBehavior>(selectionBehaviorProp.value)
  watchEffect(() => { selectionBehavior.value = selectionBehaviorProp.value })
  watchEffect(() => {
    if (selectionBehaviorProp.value === 'replace' && selectionBehavior.value === 'toggle' && selectedKeys.value !== 'all' && (selectedKeys.value as Set<Key>).size === 0) {
      selectionBehavior.value = 'replace'
    }
  })

  const disabledKeys = computed<Set<Key>>(() => new Set<Key>(((toValue(props.disabledKeys) as Iterable<Key>) ?? []) as Iterable<Key>))

  function setSelectedKeys(keys: Selection) {
    const current = selectedKeys.value
    if (!allowDuplicateSelectionEvents.value) {
      if (keys === current) return
      if (keys !== 'all' && current !== 'all' && equalSets(keys as Set<Key>, current as Set<Key>)) return
    }
    if (controlled.value == null) uncontrolled.value = keys
    props.onSelectionChange?.(keys)
  }

  function setSelectionBehavior(next: SelectionBehavior) { selectionBehavior.value = next }

  return {
    selectionMode,
    disallowEmptySelection,
    selectionBehavior,
    setSelectionBehavior,
    isFocused,
    setFocused,
    focusedKey,
    childFocusStrategy,
    setFocusedKey,
    selectedKeys,
    setSelectedKeys,
    disabledKeys,
    disabledBehavior,
  }
}
