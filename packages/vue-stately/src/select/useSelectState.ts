/*
 * Port of `react-stately@3.51.0` `useSelectState`
 * (`packages/react-stately/src/select/useSelectState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity and faithful to landed
 * `useListState` + `useOverlayTriggerState`. Do not rewrite those hooks.
 */

import {computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import type {CollectionNode, Key} from '../collections/types'
import type {FocusStrategy, Selection, SelectionMode} from '../selection/types'
import {useListState, type UseListStateProps} from '../list/useListState'
import {useOverlayTriggerState} from '../overlays/useOverlayTriggerState'
import {useControlledState} from '../utils/useControlledState'

export type {SelectionMode}
export type ValueType<M extends SelectionMode> = M extends 'single' ? Key | null : readonly Key[]
export type ChangeValueType<M extends SelectionMode> = M extends 'single' ? Key | null : Key[]

type ValidationType<M extends SelectionMode> = M extends 'single' ? Key : Key[]

export interface SelectProps<T, M extends SelectionMode = 'single'> {
  items?: Iterable<T>
  nodes?: Iterable<CollectionNode<T>> | (() => Iterable<CollectionNode<T>>)
  collection?: UseListStateProps<T>['collection']
  filter?: UseListStateProps<T>['filter']
  layoutDelegate?: unknown
  /** @default 'single' */
  selectionMode?: MaybeRefOrGetter<M | undefined>
  value?: MaybeRefOrGetter<ValueType<M> | undefined>
  defaultValue?: MaybeRefOrGetter<ValueType<M> | undefined>
  onChange?: (value: ChangeValueType<M>) => void
  /** @deprecated */
  selectedKey?: MaybeRefOrGetter<Key | null | undefined>
  /** @deprecated */
  defaultSelectedKey?: MaybeRefOrGetter<Key | null | undefined>
  /** @deprecated */
  onSelectionChange?: (key: Key | null) => void
  isOpen?: MaybeRefOrGetter<boolean | undefined>
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  onOpenChange?: (isOpen: boolean) => void
  shouldCloseOnSelect?: MaybeRefOrGetter<boolean | undefined>
  allowsEmptyCollection?: MaybeRefOrGetter<boolean | undefined>
  disabledKeys?: MaybeRefOrGetter<Iterable<Key> | undefined>
  selectionBehavior?: MaybeRefOrGetter<'toggle' | 'replace' | undefined>
  disallowEmptySelection?: MaybeRefOrGetter<boolean | undefined>
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  validate?: (value: ValidationType<M> | null) => string | string[] | true | null | undefined
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  label?: unknown
  description?: unknown
  errorMessage?: unknown
}

export interface SelectStateOptions<T, M extends SelectionMode = 'single'> extends Omit<SelectProps<T, M>, 'children'> {}

function toDisplayKeys(value: Key | readonly Key[] | null | undefined): Set<Key> | undefined {
  if (value === undefined) return undefined
  if (value === null) return new Set()
  return new Set(Array.isArray(value) ? (value as Key[]) : [value as Key])
}

export interface SelectState<T, M extends SelectionMode = 'single'> {
  collection: ReturnType<typeof useListState<T>>['collection']
  disabledKeys: ReturnType<typeof useListState<T>>['disabledKeys']
  selectionManager: ReturnType<typeof useListState<T>>['selectionManager']
  isOpen: ComputedRef<boolean>
  setOpen: (isOpen: boolean) => void
  open: (focusStrategy?: FocusStrategy | null) => void
  close: () => void
  toggle: (focusStrategy?: FocusStrategy | null) => void
  /** @deprecated */
  selectedKey: ComputedRef<Key | null>
  /** @deprecated */
  defaultSelectedKey: Key | null
  /** @deprecated */
  setSelectedKey: (key: Key | null) => void
  value: ComputedRef<ValueType<M>>
  defaultValue: ValueType<M>
  setValue: (value: Key | readonly Key[] | null) => void
  /** @deprecated */
  selectedItem: ComputedRef<CollectionNode<T> | null>
  selectedItems: ComputedRef<CollectionNode<T>[]>
  isFocused: Ref<boolean>
  setFocused: (isFocused: boolean) => void
  focusStrategy: Ref<FocusStrategy | null>
  displayValidation: {
    isInvalid: ComputedRef<boolean>
    validationErrors: ComputedRef<string[]>
    validationDetails: ComputedRef<Record<string, any>>
  }
  commitValidation: () => void
  _initialValue: Key | readonly Key[] | null
}

export function useSelectState<T, M extends SelectionMode = 'single'>(
  props: SelectStateOptions<T, M>,
): SelectState<T, M> {
  const selectionMode = computed<M>(() => (toValue(props.selectionMode as any) ?? 'single') as M)
  const shouldCloseOnSelect = computed<boolean>(() => {
    const explicit = toValue(props.shouldCloseOnSelect as any)
    if (explicit != null) return !!explicit
    return selectionMode.value === 'single'
  })

  const triggerState = useOverlayTriggerState({
    isOpen: props.isOpen as any,
    defaultOpen: props.defaultOpen as any,
    onOpenChange: props.onOpenChange,
  })

  const focusStrategy = ref<FocusStrategy | null>(null)

  const initialDefaultValue = computed<ValueType<M>>(() => {
    const dv = toValue(props.defaultValue as any)
    if (dv !== undefined) return dv as ValueType<M>
    const dsk = toValue(props.defaultSelectedKey as any)
    if (selectionMode.value === 'single') return ((dsk ?? null) as unknown) as ValueType<M>
    return ([] as unknown) as ValueType<M>
  })
  const initialValue = computed<ValueType<M> | undefined>(() => {
    const v = toValue(props.value as any)
    if (v !== undefined) return v as ValueType<M>
    const sk = toValue(props.selectedKey as any)
    if (selectionMode.value === 'single') return ((sk === undefined ? undefined : (sk ?? null)) as unknown) as ValueType<M>
    return undefined
  })

  const [controlledValue, setControlledValueRaw] = useControlledState<Key | readonly Key[] | null>(
    () => initialValue.value as any,
    () => initialDefaultValue.value as any,
    props.onChange as any,
  )
  const displayValue = computed<Key | readonly Key[] | null>(() => {
    const v = controlledValue.value
    if (selectionMode.value === 'single' && Array.isArray(v)) return (v[0] ?? null)
    return (v ?? null) as any
  })

  const isFocused = ref(false)
  const setFocused = (v: boolean) => { isFocused.value = v }

  function setValue(value: Key | readonly Key[] | null) {
    if (selectionMode.value === 'single') {
      const key = Array.isArray(value) ? ((value as any)[0] ?? null) : value
      const prev = displayValue.value
      setControlledValueRaw(key as any)
      if (key !== prev) {
        props.onSelectionChange?.(key as Key | null)
      }
    } else {
      let keys: Key[] = []
      if (Array.isArray(value)) keys = value as Key[]
      else if (value != null) keys = [value as Key]
      setControlledValueRaw(keys as any)
    }
  }

  const listState = useListState<T>({
    ...(props as any),
    selectionMode: () => selectionMode.value as any,
    disallowEmptySelection: () => selectionMode.value === 'single',
    allowDuplicateSelectionEvents: true,
    selectedKeys: () => toDisplayKeys(displayValue.value) as any,
    onSelectionChange: (keys: Selection) => {
      if (keys === 'all') return
      if (selectionMode.value === 'single') {
        let key: Key | null = null
        for (const k of keys as Set<Key>) { key = k; break }
        setValue(key)
      } else {
        setValue([...(keys as Set<Key>)])
      }
      if (shouldCloseOnSelect.value) {
        triggerState.close()
      }
    },
  } as UseListStateProps<T>)

  const selectedKey = computed<Key | null>(() => listState.selectionManager.firstSelectedKey ?? null)
  const selectedItems = computed<CollectionNode<T>[]>(() => {
    const items: CollectionNode<T>[] = []
    for (const key of listState.selectionManager.selectedKeys) {
      const item = listState.collection.value.getItem(key)
      if (item) items.push(item)
    }
    return items
  })
  const selectedItem = computed<CollectionNode<T> | null>(() => selectedItems.value[0] ?? null)

  const displayValidation = {
    isInvalid: computed(() => !!toValue((props as any).isInvalid)),
    validationErrors: computed<string[]>(() => []),
    validationDetails: computed<Record<string, any>>(() => ({})),
  }
  const commitValidation = () => {}

  const defaultSelectedKey =
    (toValue(props.defaultSelectedKey as any) ?? (selectionMode.value === 'single' ? (initialDefaultValue.value as any) : null)) ?? null

  function open(focusStrategyArg: FocusStrategy | null = null) {
    const allowsEmpty = !!toValue(props.allowsEmptyCollection as any)
    if (listState.collection.value.size !== 0 || allowsEmpty) {
      focusStrategy.value = focusStrategyArg
      triggerState.open()
    }
  }
  function toggle(focusStrategyArg: FocusStrategy | null = null) {
    const allowsEmpty = !!toValue(props.allowsEmptyCollection as any)
    if (listState.collection.value.size !== 0 || allowsEmpty) {
      focusStrategy.value = focusStrategyArg
      triggerState.toggle()
    }
  }

  const _initialValue = (toValue(props.defaultValue as any) !== undefined
    ? (toValue(props.defaultValue as any) as any)
    : (selectionMode.value === 'single' ? (toValue(props.defaultSelectedKey as any) ?? null) : [])) as Key | readonly Key[] | null

  return {
    collection: listState.collection,
    disabledKeys: listState.disabledKeys,
    selectionManager: listState.selectionManager,
    isOpen: triggerState.isOpen,
    setOpen: triggerState.setOpen,
    open,
    close: triggerState.close,
    toggle,
    selectedKey,
    defaultSelectedKey: defaultSelectedKey as Key | null,
    setSelectedKey: (key) => setValue(key),
    value: computed(() => displayValue.value as ValueType<M>),
    defaultValue: (initialDefaultValue.value ?? (_initialValue as any)) as ValueType<M>,
    setValue,
    selectedItem,
    selectedItems,
    isFocused,
    setFocused,
    focusStrategy,
    displayValidation,
    commitValidation,
    _initialValue,
  }
}
