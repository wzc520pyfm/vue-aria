import {computed, toValue, watchEffect, type MaybeRefOrGetter, type Ref} from 'vue'
import type {ListState} from 'vue-stately/useListState'
import type {Key} from 'vue-stately/useListState'
import {getItemId, getListData} from './utils'
import {usePress} from '../interactions/press'
import {useHover} from '../interactions/hover'
import {useFocusVisible} from '../interactions/focusVisible'

export interface AriaOptionProps {
  /** The unique key for the option. May be a ref/getter so it can stay reactive. */
  key: MaybeRefOrGetter<Key>
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isSelected?: MaybeRefOrGetter<boolean | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  shouldSelectOnPressUp?: MaybeRefOrGetter<boolean | undefined>
  shouldFocusOnHover?: MaybeRefOrGetter<boolean | undefined>
  isVirtualized?: MaybeRefOrGetter<boolean | undefined>
  shouldUseVirtualFocus?: MaybeRefOrGetter<boolean | undefined>
}

export interface OptionAria {
  optionProps: Record<string, any>
  labelProps: {id?: string}
  descriptionProps: {id?: string}
  isFocused: import('vue').ComputedRef<boolean>
  isFocusVisible: import('vue').ComputedRef<boolean>
  isSelected: import('vue').ComputedRef<boolean>
  isDisabled: import('vue').ComputedRef<boolean>
  isPressed: import('vue').ComputedRef<boolean>
  isHovered: import('vue').Ref<boolean>
  allowsSelection: import('vue').ComputedRef<boolean>
  hasAction: import('vue').ComputedRef<boolean>
}

export function useOption<T>(props: AriaOptionProps, state: ListState<T>, ref: Ref<HTMLElement | null>): OptionAria {
  const key = computed<Key>(() => toValue(props.key) as Key)
  const data = getListData(state as any)
  const manager = state.selectionManager

  const isDisabled = computed(() => !!toValue(props.isDisabled) || manager.isDisabled(key.value))
  const isSelected = computed(() => {
    const v = toValue(props.isSelected)
    if (v != null) return !!v
    return manager.isSelected(key.value)
  })
  const allowsSelection = computed(() => manager.selectionMode !== 'none' && manager.canSelectItem(key.value))
  const hasAction = computed(() => !!data.onAction)

  const itemId = computed(() => getItemId(state as any, key.value))
  const labelId = computed(() => `${itemId.value}-label`)
  const descriptionId = computed(() => `${itemId.value}-description`)

  const focusVisibleState = useFocusVisible()
  const isFocused = computed(() => manager.isFocused && manager.focusedKey === key.value)
  const isKeyboardFocusVisible = computed(() => isFocused.value && focusVisibleState.isFocusVisible.value)

  const shouldFocusOnHover = computed(() => (toValue(props.shouldFocusOnHover) ?? data.shouldFocusOnHover) || false)
  const shouldSelectOnPressUp = computed(() => (toValue(props.shouldSelectOnPressUp) ?? data.shouldSelectOnPressUp) || false)

  const onSelect = (e?: any) => {
    if (!allowsSelection.value || isDisabled.value) return
    manager.select(key.value, e)
  }

  const {pressProps, isPressed} = usePress({
    isDisabled,
    onPressStart: (e) => {
      if (e.pointerType === 'keyboard') {
        if (allowsSelection.value) onSelect(e)
      } else if (e.pointerType !== 'virtual') {
        manager.setFocusedKey(key.value)
      }
    },
    onPress: (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen' || e.pointerType === 'virtual') {
        if (allowsSelection.value) onSelect(e)
        if (data.onAction) data.onAction(key.value)
        return
      }
      if (e.pointerType === 'keyboard') {
        if (data.onAction) data.onAction(key.value)
        return
      }
      if (e.pointerType === 'mouse' && !shouldSelectOnPressUp.value) {
        if (allowsSelection.value) onSelect(e)
        if (data.onAction) data.onAction(key.value)
      }
    },
    onPressUp: (e) => {
      if (e.pointerType === 'mouse' && shouldSelectOnPressUp.value) {
        if (allowsSelection.value) onSelect(e)
        if (data.onAction) data.onAction(key.value)
      }
    },
  })

  const {hoverProps, isHovered} = useHover({
    isDisabled,
    onHoverStart: () => {
      if (shouldFocusOnHover.value && !focusVisibleState.isFocusVisible.value) {
        manager.setFocusedKey(key.value)
      }
    },
  })

  const optionProps: Record<string, any> = {}
  // copy handler props from press/hover (stable functions on those objects)
  for (const src of [pressProps, hoverProps]) {
    for (const k of Object.keys(src)) optionProps[k] = (src as any)[k]
  }
  Object.defineProperties(optionProps, {
    role: {value: 'option', enumerable: true},
    id: {value: itemId.value, enumerable: true},
    tabIndex: {get: () => (isFocused.value ? 0 : -1), enumerable: true},
    'aria-labelledby': {value: labelId.value, enumerable: true},
    'aria-describedby': {value: descriptionId.value, enumerable: true},
    'aria-selected': {get: () => (manager.selectionMode !== 'none' ? isSelected.value : undefined), enumerable: true},
    'aria-disabled': {get: () => (isDisabled.value ? true : undefined), enumerable: true},
  })

  return {
    optionProps,
    labelProps: {id: labelId.value},
    descriptionProps: {id: descriptionId.value},
    isFocused,
    isFocusVisible: isKeyboardFocusVisible,
    isSelected,
    isDisabled,
    isPressed,
    isHovered,
    allowsSelection,
    hasAction,
  }
}
