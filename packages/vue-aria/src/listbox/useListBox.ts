import {computed, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {ListState} from 'vue-stately/useListState'
import type {Key} from 'vue-stately/useListState'
import {ListKeyboardDelegate} from './useListKeyboardDelegate'
import {setListData} from './utils'
import {useId} from '../utils/useId'
import {useTypeSelect} from './useTypeSelect'

export interface UseListBoxProps {
  id?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  label?: MaybeRefOrGetter<unknown>
  selectionMode?: MaybeRefOrGetter<'none' | 'single' | 'multiple' | undefined>
  selectionBehavior?: MaybeRefOrGetter<'toggle' | 'replace' | undefined>
  orientation?: MaybeRefOrGetter<'vertical' | 'horizontal' | undefined>
  layout?: MaybeRefOrGetter<'stack' | 'grid' | undefined>
  autoFocus?: MaybeRefOrGetter<boolean | 'first' | 'last' | undefined>
  shouldFocusWrap?: MaybeRefOrGetter<boolean | undefined>
  shouldSelectOnPressUp?: MaybeRefOrGetter<boolean | undefined>
  shouldFocusOnHover?: MaybeRefOrGetter<boolean | undefined>
  disallowEmptySelection?: MaybeRefOrGetter<boolean | undefined>
  escapeKeyBehavior?: MaybeRefOrGetter<'clearSelection' | 'none' | undefined>
  disallowSelectAll?: MaybeRefOrGetter<boolean | undefined>
  disallowTypeAhead?: MaybeRefOrGetter<boolean | undefined>
  linkBehavior?: MaybeRefOrGetter<'action' | 'selection' | 'override' | 'none' | undefined>
  keyboardDelegate?: MaybeRefOrGetter<any>
  isVirtualized?: MaybeRefOrGetter<boolean | undefined>
  shouldUseVirtualFocus?: MaybeRefOrGetter<boolean | undefined>
  onAction?: (key: Key) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
}

export interface ListBoxAria {
  listBoxProps: Record<string, any>
  labelProps: Record<string, any>
}

function isCtrlKeyPressed(e: KeyboardEvent) {
  if (typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)) return e.metaKey
  return e.ctrlKey
}

export function useListBox<T>(props: UseListBoxProps, state: ListState<T>, ref: Ref<HTMLElement | null>): ListBoxAria {
  const selectionBehavior = computed(() => (toValue(props.selectionBehavior) ?? 'toggle') as 'toggle' | 'replace')
  const orientation = computed(() => (toValue(props.orientation) ?? 'vertical') as 'vertical' | 'horizontal')
  const escapeKeyBehavior = computed(() => (toValue(props.escapeKeyBehavior) ?? 'clearSelection') as 'clearSelection' | 'none')
  const shouldFocusWrap = computed(() => !!toValue(props.shouldFocusWrap))
  const disallowSelectAll = computed(() => !!toValue(props.disallowSelectAll))
  const disallowEmptySelection = computed(() => !!toValue(props.disallowEmptySelection))

  const linkBehavior = computed(() => {
    let behavior = (toValue(props.linkBehavior) ?? (selectionBehavior.value === 'replace' ? 'action' : 'override')) as string
    if (selectionBehavior.value === 'toggle' && behavior === 'action') behavior = 'override'
    return behavior
  })

  const domId = useId(toValue(props.id))

  setListData(state as any, {
    id: domId.value,
    shouldSelectOnPressUp: !!toValue(props.shouldSelectOnPressUp),
    shouldFocusOnHover: !!toValue(props.shouldFocusOnHover),
    shouldUseVirtualFocus: !!toValue(props.shouldUseVirtualFocus),
    isVirtualized: !!toValue(props.isVirtualized),
    onAction: props.onAction,
    linkBehavior: linkBehavior.value as any,
  })

  const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'base'})
  const delegate = computed(() => {
    const provided = toValue(props.keyboardDelegate)
    if (provided) return provided
    return new ListKeyboardDelegate({
      collection: () => state.collection.value as any,
      ref,
      collator,
      disabledKeys: () => state.selectionManager.disabledKeys,
      disabledBehavior: () => state.selectionManager.disabledBehavior as any,
      layout: (toValue(props.layout) ?? 'stack') as any,
      orientation: orientation.value,
      direction: 'ltr',
    })
  })

  const {typeSelectProps} = useTypeSelect({
    keyboardDelegate: delegate.value as any,
    selectionManager: state.selectionManager as any,
  })

  const onKeyDown = (e: KeyboardEvent) => {
    typeSelectProps.onKeyDownCapture?.(e)
    if (e.defaultPrevented) return
    typeSelectProps.onKeyDown?.(e)
    if (e.defaultPrevented) return

    const manager = state.selectionManager
    const d = delegate.value
    const focusedKey = manager.focusedKey

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = focusedKey == null ? d.getFirstKey?.() : d.getKeyBelow?.(focusedKey)
        const key = next ?? (shouldFocusWrap.value ? d.getFirstKey?.() : null)
        if (key != null) {
          manager.setFocusedKey(key)
          if (selectionBehavior.value === 'replace' && !e.shiftKey && !isCtrlKeyPressed(e)) manager.replaceSelection(key)
          else if (e.shiftKey && manager.selectionMode === 'multiple') manager.extendSelection(key)
        }
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = focusedKey == null ? d.getLastKey?.() : d.getKeyAbove?.(focusedKey)
        const key = prev ?? (shouldFocusWrap.value ? d.getLastKey?.() : null)
        if (key != null) {
          manager.setFocusedKey(key)
          if (selectionBehavior.value === 'replace' && !e.shiftKey && !isCtrlKeyPressed(e)) manager.replaceSelection(key)
          else if (e.shiftKey && manager.selectionMode === 'multiple') manager.extendSelection(key)
        }
        break
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (orientation.value === 'horizontal') {
          e.preventDefault()
          const next = e.key === 'ArrowRight'
            ? (focusedKey == null ? d.getFirstKey?.() : d.getKeyBelow?.(focusedKey))
            : (focusedKey == null ? d.getLastKey?.() : d.getKeyAbove?.(focusedKey))
          if (next != null) manager.setFocusedKey(next)
        }
        break
      }
      case 'Home': {
        e.preventDefault()
        const key = d.getFirstKey?.()
        if (key != null) {
          manager.setFocusedKey(key)
          if (e.shiftKey && manager.selectionMode === 'multiple') manager.extendSelection(key)
          else if (selectionBehavior.value === 'replace') manager.replaceSelection(key)
        }
        break
      }
      case 'End': {
        e.preventDefault()
        const key = d.getLastKey?.()
        if (key != null) {
          manager.setFocusedKey(key)
          if (e.shiftKey && manager.selectionMode === 'multiple') manager.extendSelection(key)
          else if (selectionBehavior.value === 'replace') manager.replaceSelection(key)
        }
        break
      }
      case 'Escape': {
        if (escapeKeyBehavior.value === 'clearSelection' && !disallowEmptySelection.value && manager.selectedKeys.size > 0) {
          e.preventDefault()
          e.stopPropagation()
          manager.clearSelection()
        }
        break
      }
      case 'a': {
        if ((e.ctrlKey || e.metaKey) && manager.selectionMode === 'multiple' && !disallowSelectAll.value) {
          e.preventDefault()
          manager.selectAll()
        }
        break
      }
    }
  }

  const onFocus = (e: FocusEvent) => {
    if (!state.selectionManager.isFocused) {
      state.selectionManager.setFocused(true)
      props.onFocusChange?.(true)
    }
    if (state.selectionManager.focusedKey == null) {
      const autoFocus = toValue(props.autoFocus)
      let key: Key | null = null
      if (autoFocus === 'last') key = delegate.value.getLastKey?.() ?? null
      else key = state.selectionManager.firstSelectedKey ?? delegate.value.getFirstKey?.() ?? null
      if (key != null) state.selectionManager.setFocusedKey(key)
    }
    props.onFocus?.(e)
  }

  const onBlur = (e: FocusEvent) => {
    if (ref.value && !(e.relatedTarget instanceof Node && ref.value.contains(e.relatedTarget))) {
      state.selectionManager.setFocused(false)
      props.onFocusChange?.(false)
    }
    props.onBlur?.(e)
  }

  const listBoxProps: Record<string, any> = {}
  Object.defineProperties(listBoxProps, {
    role: {value: 'listbox', enumerable: true},
    id: {get: () => domId.value, enumerable: true},
    'aria-orientation': {get: () => orientation.value, enumerable: true},
    tabIndex: {get: () => (state.selectionManager.focusedKey == null ? 0 : -1), enumerable: true},
    onKeyDown: {value: onKeyDown, enumerable: true},
    onKeydown: {value: onKeyDown, enumerable: true},
    onFocus: {value: onFocus, enumerable: true},
    onBlur: {value: onBlur, enumerable: true},
    'aria-label': {get: () => (toValue(props['aria-label']) ?? toValue(props.label)) as any, enumerable: true},
    'aria-labelledby': {get: () => toValue(props['aria-labelledby']) as any, enumerable: true},
    'aria-multiselectable': {get: () => (state.selectionManager.selectionMode === 'multiple' ? 'true' : undefined), enumerable: true},
  })

  return {listBoxProps, labelProps: {}}
}
