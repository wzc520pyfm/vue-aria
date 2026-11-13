/*
 * Port of `react-stately@3.51.0` `useComboBoxState`
 * (`packages/react-stately/src/combobox/useComboBoxState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity and faithful to landed
 * `useListState` + `useOverlayTriggerState`. Do not rewrite those hooks.
 */

import {computed, ref, toValue, watchEffect, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import type {Collection, CollectionNode, Key} from '../collections/types'
import {ListCollection} from '../collections/ListCollection'
import type {FocusStrategy, Selection, SelectionMode} from '../selection/types'
import {useListState, type UseListStateProps} from '../list/useListState'
import {useOverlayTriggerState} from '../overlays/useOverlayTriggerState'
import {useControlledState} from '../utils/useControlledState'

export type {SelectionMode}
export type MenuTriggerAction = 'focus' | 'input' | 'manual'
export type ValueType<M extends SelectionMode> = M extends 'single' ? Key | null : readonly Key[]
export type ChangeValueType<M extends SelectionMode> = M extends 'single' ? Key | null : Key[]
type ValidationType<M extends SelectionMode> = M extends 'single' ? Key | null : Key[]
type FilterFn = (textValue: string, inputValue: string) => boolean

export interface ComboBoxValidationValue<M extends SelectionMode = 'single'> {
  /**
   * The selected key in the ComboBox.
   *
   * @deprecated
   */
  selectedKey: Key | null
  /** The keys of the currently selected items. */
  value: ValidationType<M>
  /** The value of the ComboBox input. */
  inputValue: string
}

export interface ComboBoxProps<T, M extends SelectionMode = 'single'> {
  id?: MaybeRefOrGetter<string | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  placeholder?: MaybeRefOrGetter<string | undefined>
  autoComplete?: MaybeRefOrGetter<string | undefined>
  autoCapitalize?: MaybeRefOrGetter<string | undefined>
  maxLength?: MaybeRefOrGetter<number | undefined>
  minLength?: MaybeRefOrGetter<number | undefined>
  inputMode?: MaybeRefOrGetter<string | undefined>
  pattern?: MaybeRefOrGetter<string | undefined>
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  validate?: (value: ComboBoxValidationValue<M> | null) => string | string[] | true | null | undefined
  label?: unknown
  description?: unknown
  errorMessage?: unknown
  /** The list of ComboBox items (uncontrolled). */
  defaultItems?: Iterable<T>
  /** The list of ComboBox items (controlled). */
  items?: Iterable<T>
  /** Prebuilt collection nodes (Vue slot-based builder). */
  nodes?: Iterable<CollectionNode<T>> | (() => Iterable<CollectionNode<T>>)
  /** Prebuilt collection. */
  collection?: Collection<T>
  /** The currently selected key in the collection (controlled). @deprecated */
  selectedKey?: MaybeRefOrGetter<Key | null | undefined>
  /** The initial selected key in the collection (uncontrolled). @deprecated */
  defaultSelectedKey?: MaybeRefOrGetter<Key | null | undefined>
  /** Handler that is called when the selection changes. @deprecated */
  onSelectionChange?: (key: Key | null) => void
  /** The value of the selected items (controlled). */
  value?: MaybeRefOrGetter<ValueType<M> | undefined>
  /** The default value of the selected items (uncontrolled). */
  defaultValue?: MaybeRefOrGetter<ValueType<M> | undefined>
  /** Handler that is called when the value changes. */
  onChange?: (value: ChangeValueType<M>) => void
  /** The value of the ComboBox input (controlled). */
  inputValue?: MaybeRefOrGetter<string | undefined>
  /** The default value of the ComboBox input (uncontrolled). */
  defaultInputValue?: MaybeRefOrGetter<string | undefined>
  /** Handler that is called when the ComboBox input value changes. */
  onInputChange?: (value: string) => void
  /** Whether the ComboBox allows a non-item matching input value to be set. */
  allowsCustomValue?: MaybeRefOrGetter<boolean | undefined>
  /** The interaction required to display the ComboBox menu. @default 'input' */
  menuTrigger?: MaybeRefOrGetter<MenuTriggerAction | undefined>
  /** Whether single or multiple selection is enabled. @default 'single' */
  selectionMode?: MaybeRefOrGetter<M | undefined>
  selectionBehavior?: MaybeRefOrGetter<'toggle' | 'replace' | undefined>
  disabledKeys?: MaybeRefOrGetter<Iterable<Key> | undefined>
  /**
   * Method that is called when the open state of the menu changes. Returns the new open state and
   * the action that caused the opening of the menu.
   */
  onOpenChange?: (isOpen: boolean, menuTrigger?: MenuTriggerAction) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
}

export interface ComboBoxStateOptions<T, M extends SelectionMode = 'single'> extends Omit<ComboBoxProps<T, M>, 'children'> {
  /** The filter function used to determine if a option should be included in the combo box list. */
  defaultFilter?: FilterFn
  /** Whether the combo box allows the menu to be open when the collection is empty. */
  allowsEmptyCollection?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the combo box menu should close on blur. */
  shouldCloseOnBlur?: MaybeRefOrGetter<boolean | undefined>
}

export interface ComboBoxState<T, M extends SelectionMode = 'single'> {
  collection: ComputedRef<Collection<T>>
  disabledKeys: ReturnType<typeof useListState<T>>['disabledKeys']
  selectionManager: ReturnType<typeof useListState<T>>['selectionManager']
  isOpen: ComputedRef<boolean>
  setOpen: (isOpen: boolean) => void
  /** Opens the menu. */
  open: (focusStrategy?: FocusStrategy | null, trigger?: MenuTriggerAction) => void
  /** Toggles the menu. */
  toggle: (focusStrategy?: FocusStrategy | null, trigger?: MenuTriggerAction) => void
  /** Closes the menu and commits the current value. */
  close: () => void
  /** @deprecated */
  readonly selectedKey: ComputedRef<Key | null>
  /** @deprecated */
  readonly defaultSelectedKey: Key | null
  /** @deprecated */
  setSelectedKey(key: Key | null): void
  /** The current combobox value. */
  readonly value: ComputedRef<ValueType<M>>
  /** The default combobox value. */
  readonly defaultValue: ValueType<M>
  /** Sets the combobox value. */
  setValue(value: Key | readonly Key[] | null): void
  /** @deprecated */
  readonly selectedItem: ComputedRef<CollectionNode<T> | null>
  /** The value of the selected items. */
  readonly selectedItems: ComputedRef<CollectionNode<T>[]>
  /** The current value of the combo box input. */
  readonly inputValue: ComputedRef<string>
  /** The default value of the combo box input. */
  readonly defaultInputValue: string
  /** Sets the value of the combo box input. */
  setInputValue(value: string): void
  /** Selects the currently focused item and updates the input value. */
  commit(): void
  /** Controls which item will be auto focused when the menu opens. */
  readonly focusStrategy: Ref<FocusStrategy | null>
  /** Whether the select is currently focused. */
  readonly isFocused: Ref<boolean>
  /** Sets whether the select is focused. */
  setFocused(isFocused: boolean): void
  /** Resets the input value to the previously selected item's text if any and closes the menu. */
  revert(): void
  displayValidation: {
    isInvalid: ComputedRef<boolean>
    validationErrors: ComputedRef<string[]>
    validationDetails: ComputedRef<Record<string, any>>
  }
  commitValidation: () => void
  _initialValue: Key | readonly Key[] | null
}

function toDisplayKeys(value: Key | readonly Key[] | null | undefined): Set<Key> | undefined {
  if (value === undefined) return undefined
  if (value === null) return new Set()
  return new Set(Array.isArray(value) ? (value as Key[]) : [value as Key])
}

export function useComboBoxState<T, M extends SelectionMode = 'single'>(
  props: ComboBoxStateOptions<T, M>,
): ComboBoxState<T, M> {
  const selectionMode = computed<M>(() => (toValue(props.selectionMode as any) ?? 'single') as M)
  const menuTrigger = computed<MenuTriggerAction>(() => (toValue(props.menuTrigger as any) ?? 'input') as MenuTriggerAction)
  const allowsEmptyCollection = computed(() => !!toValue(props.allowsEmptyCollection as any))
  const shouldCloseOnBlur = computed(() => (toValue(props.shouldCloseOnBlur as any) ?? true) as boolean)
  const allowsCustomValue = computed(() => !!toValue(props.allowsCustomValue as any))
  const defaultFilter = props.defaultFilter

  const showAllItems = ref(false)
  const setShowAllItems = (v: boolean) => { showAllItems.value = v }
  const isFocused = ref(false)
  const focusStrategy = ref<FocusStrategy | null>(null)
  const closedDueToEmpty = ref(false)

  const initialDefaultValue = computed<ValueType<M>>(() => {
    const dv = toValue(props.defaultValue as any)
    if (dv !== undefined) return dv as ValueType<M>
    const dsk = toValue(props.defaultSelectedKey as any)
    if (selectionMode.value === 'single') return (dsk ?? null) as unknown as ValueType<M>
    return [] as unknown as ValueType<M>
  })
  const initialValue = computed<ValueType<M> | undefined>(() => {
    const v = toValue(props.value as any)
    if (v !== undefined) return v as ValueType<M>
    const sk = toValue(props.selectedKey as any)
    if (selectionMode.value === 'single') return (sk === undefined ? undefined : (sk ?? null)) as unknown as ValueType<M>
    return undefined
  })

  const [controlledValue, setControlledValue] = useControlledState<Key | readonly Key[] | null>(
    () => initialValue.value as any,
    () => initialDefaultValue.value as any,
    (v) => props.onChange?.(v as any),
  )
  // Only display the first selected item if in single selection mode but the value is an array.
  const displayValue = computed<Key | readonly Key[] | null>(() => {
    const v = controlledValue.value
    if (selectionMode.value === 'single' && Array.isArray(v)) return ((v[0] ?? null) as any)
    return (v ?? (selectionMode.value === 'single' ? null : [])) as any
  })

  const setFocusedState = (v: boolean) => { isFocused.value = v }

  function setValue(value: Key | readonly Key[] | null) {
    if (selectionMode.value === 'single') {
      const key = Array.isArray(value) ? ((value as any)[0] ?? null) : value
      const prev = displayValue.value
      setControlledValue(key as any)
      if (key !== prev) {
        props.onSelectionChange?.(key as Key | null)
      }
    } else {
      let keys: Key[] = []
      if (Array.isArray(value)) keys = value as Key[]
      else if (value != null) keys = [value as Key]
      setControlledValue(keys as any)
    }
  }

  const listState = useListState<T>({
    ...(props as any),
    items: () => toValue(props.items as any) ?? toValue(props.defaultItems as any),
    nodes: props.nodes as any,
    collection: props.collection as any,
    selectionMode: () => selectionMode.value,
    disallowEmptySelection: () => selectionMode.value === 'single',
    allowDuplicateSelectionEvents: true,
    selectedKeys: () => toDisplayKeys(displayValue.value) as any,
    onSelectionChange: (keys: Selection) => {
      if (keys === 'all') return
      if (selectionMode.value === 'single') {
        let key: Key | null = null
        for (const k of keys as Set<Key>) { key = k; break }
        if (key === displayValue.value) {
          props.onSelectionChange?.(key as Key | null)
          // If key is the same, reset the inputValue and close the menu
          // (scenario: user clicks on already selected option)
          resetInputValue()
          closeMenu()
        } else {
          setValue(key)
        }
      } else {
        setValue([...(keys as Set<Key>)])
      }
    },
  } as UseListStateProps<T>)

  const selectedKey = computed<Key | null>(() => (selectionMode.value === 'single' ? (listState.selectionManager.firstSelectedKey ?? null) : null))
  const selectedItems = computed<CollectionNode<T>[]>(() => {
    const items: CollectionNode<T>[] = []
    for (const key of listState.selectionManager.selectedKeys) {
      const item = listState.collection.value.getItem(key)
      if (item) items.push(item)
    }
    return items
  })
  const selectedItem = computed<CollectionNode<T> | null>(() => selectedItems.value[0] ?? null)

  const selectedKeyForDefault = computed(() => selectedKey.value)
  const [inputValue, setInputValueState] = useControlledState<string>(
    () => toValue(props.inputValue as any),
    () => getDefaultInputValue(toValue(props.defaultInputValue as any), selectedKeyForDefault.value, listState.collection.value) ?? '',
    (v) => props.onInputChange?.(v),
  )
  const setInputValue = (value: string) => setInputValueState(value)
  const initialValueState = displayValue.value
  const lastValue = ref(inputValue.value)

  // Preserve original collection so we can show all items on demand
  const originalCollection = computed<Collection<T>>(() =>
    // The original, unfiltered collection (built by useListState).
    listState.collection.value as unknown as Collection<T>)
  const filteredCollection = computed<Collection<T>>(() =>
    // No default filter if items are controlled.
    toValue(props.items as any) != null || !defaultFilter
      ? originalCollection.value
      : filterCollection(originalCollection.value, inputValue.value, defaultFilter))
  const lastCollection = ref(filteredCollection.value) as Ref<Collection<T>>

  // Track what action is attempting to open the menu
  const menuOpenTrigger = ref<MenuTriggerAction | undefined>('focus')
  const onOpenChange = (open: boolean) => {
    props.onOpenChange?.(open, open ? menuOpenTrigger.value : undefined)
    listState.selectionManager.setFocused(open)
    if (!open) {
      listState.selectionManager.setFocusedKey(null)
    }
  }

  const triggerState = useOverlayTriggerState({onOpenChange})

  function open(focusStrategyArg: FocusStrategy | null = null, trigger?: MenuTriggerAction) {
    const mt = menuTrigger.value
    const displayAllItems = trigger === 'manual' || (trigger === 'focus' && mt === 'focus')
    // Prevent open operations from triggering if there is nothing to display
    // Also prevent open operations from triggering if items are uncontrolled but defaultItems is empty, even if displayAllItems is true.
    if (
      allowsEmptyCollection.value ||
      filteredCollection.value.size > 0 ||
      (displayAllItems && originalCollection.value.size > 0) ||
      toValue(props.items as any) !== undefined
    ) {
      if (displayAllItems && !triggerState.isOpen.value && toValue(props.items as any) === undefined) {
        // Show all items if menu is manually opened. Only care about this if items are undefined
        setShowAllItems(true)
      }

      menuOpenTrigger.value = trigger
      focusStrategy.value = focusStrategyArg
      triggerState.open()
    }
  }

  function toggle(focusStrategyArg: FocusStrategy | null = null, trigger?: MenuTriggerAction) {
    const mt = menuTrigger.value
    const displayAllItems = trigger === 'manual' || (trigger === 'focus' && mt === 'focus')
    // If the menu is closed and there is nothing to display, early return so toggle isn't called to prevent extraneous onOpenChange
    if (
      !(
        allowsEmptyCollection.value ||
        filteredCollection.value.size > 0 ||
        (displayAllItems && originalCollection.value.size > 0) ||
        toValue(props.items as any) !== undefined
      ) &&
      !triggerState.isOpen.value
    ) {
      return
    }

    if (displayAllItems && !triggerState.isOpen.value && toValue(props.items as any) === undefined) {
      // Show all items if menu is toggled open. Only care about this if items are undefined
      setShowAllItems(true)
    }

    // Only update the menuOpenTrigger if menu is currently closed
    if (!triggerState.isOpen.value) {
      menuOpenTrigger.value = trigger
    }

    toggleMenu(focusStrategyArg)
  }

  const updateLastCollection = () => {
    lastCollection.value = showAllItems.value ? originalCollection.value : filteredCollection.value
  }

  // If menu is going to close, save the current collection so we can freeze the displayed collection when the
  // user clicks outside the popover to close the menu. Prevents the menu contents from updating as the menu closes.
  const toggleMenu = (focusStrategyArg: FocusStrategy | null = null) => {
    if (triggerState.isOpen.value) {
      updateLastCollection()
    }

    focusStrategy.value = focusStrategyArg
    triggerState.toggle()
  }

  const closeMenu = () => {
    if (triggerState.isOpen.value) {
      updateLastCollection()
      triggerState.close()
    }
  }

  const itemTextFor = (key: Key | null): string =>
    key != null ? (listState.collection.value.getItem(key)?.textValue ?? '') : ''

  const resetInputValue = () => {
    const itemText = itemTextFor(selectedKey.value)
    lastValue.value = itemText
    setInputValue(itemText)
  }

  const lastValueRef = ref(displayValue.value as Key | readonly Key[] | null)
  const lastSelectedKeyText = ref(itemTextFor(selectedKey.value))

  watchEffect(() => {
    const isFocusedV = isFocused.value
    const filteredSize = filteredCollection.value.size
    const isOpenV = triggerState.isOpen.value
    const inputVal = inputValue.value
    const mt = menuTrigger.value

    // Open and close menu automatically when the input value changes if the input is focused,
    // and there are items in the collection or allowEmptyCollection is true.
    if (
      isFocusedV &&
      (filteredSize > 0 || allowsEmptyCollection.value) &&
      !isOpenV &&
      inputVal !== lastValue.value &&
      mt !== 'manual'
    ) {
      open(null, 'input')
    }

    // Close the menu if the collection is empty. Don't close menu if filtered collection size is 0
    // but we are currently showing all items via button press
    if (
      !showAllItems.value &&
      !allowsEmptyCollection.value &&
      isOpenV &&
      filteredSize === 0
    ) {
      closedDueToEmpty.value = true
      closeMenu()
    }

    // Re-open the menu when items become non-empty after being auto-closed due to
    // an empty collection (e.g. async load completed with results after a previous empty response).
    // This works for both controlled items on ComboBox and Collection patterns
    // (where items are provided on the ListBox rather than the ComboBox).
    if (
      isFocusedV &&
      closedDueToEmpty.value &&
      filteredSize > 0 &&
      !isOpenV &&
      mt !== 'manual'
    ) {
      closedDueToEmpty.value = false
      open(null, 'input')
    }

    const dv = displayValue.value
    // Close when an item is selected.
    if (
      dv != null &&
      dv !== lastValueRef.value &&
      selectionMode.value === 'single'
    ) {
      closeMenu()
    }

    // Clear focused key when input value changes and display filtered collection again.
    if (inputVal !== lastValue.value) {
      listState.selectionManager.setFocusedKey(null)
      setShowAllItems(false)

      // Set value to null when the user clears the input.
      // If controlled, this is the application developer's responsibility.
      if (
        selectionMode.value === 'single' &&
        inputVal === '' &&
        (toValue(props.inputValue as any) === undefined || toValue(props.value as any) === undefined)
      ) {
        setValue(null)
      }
    }

    // If the value changed, update the input value.
    // Do nothing if both inputValue and value are controlled.
    // In this case, it's the user's responsibility to update inputValue in onSelectionChange.
    if (
      dv !== lastValueRef.value &&
      (toValue(props.inputValue as any) === undefined || toValue(props.value as any) === undefined)
    ) {
      resetInputValue()
    } else if (lastValue.value !== inputVal) {
      lastValue.value = inputVal
    }

    // Update the inputValue if the selected item's text changes from its last tracked value.
    // This is to handle cases where a selectedKey is specified but the items aren't available (async loading) or the selected item's text value updates.
    // Only reset if the user isn't currently within the field so we don't erroneously modify user input.
    // If inputValue is controlled, it is the user's responsibility to update the inputValue when items change.
    const selectedItemText = itemTextFor(selectedKey.value)
    if (
      !isFocusedV &&
      selectedKey.value != null &&
      toValue(props.inputValue as any) === undefined &&
      selectedKey.value === lastValueRef.value
    ) {
      if (lastSelectedKeyText.value !== selectedItemText) {
        lastValue.value = selectedItemText
        setInputValue(selectedItemText)
      }
    }

    lastValueRef.value = dv
    lastSelectedKeyText.value = selectedItemText
  })

  const displayValidation = {
    isInvalid: computed(() => !!toValue((props as any).isInvalid)),
    validationErrors: computed<string[]>(() => []),
    validationDetails: computed<Record<string, any>>(() => ({})),
  }
  const commitValidation = () => {}

  // Revert input value and close menu
  const revert = () => {
    closedDueToEmpty.value = false
    if (allowsCustomValue.value && selectedKey.value == null) {
      commitCustomValue()
    } else {
      commitSelection()
    }
  }

  const commitCustomValue = () => {
    if (selectionMode.value === 'multiple') {
      // In multi-select mode, the input's custom text is independent from the selected items.
      // Closing or committing the field should not clear the existing selection.
      lastValue.value = inputValue.value
      closeMenu()
      return
    }

    const value = null
    lastValueRef.value = value as any
    setValue(value)
    closeMenu()
  }

  const commitSelection = (shouldForceSelectionChange = false) => {
    const inputVal = inputValue.value
    const itemText = itemTextFor(selectedKey.value)
    // If multiple things are controlled, call onSelectionChange only when selecting the focused item,
    // or when inputValue needs to be synced back to the selected item on commit/blur.
    if (toValue(props.value as any) !== undefined && toValue(props.inputValue as any) !== undefined) {
      if (shouldForceSelectionChange || selectionMode.value === 'multiple' || inputVal !== itemText) {
        props.onSelectionChange?.(selectedKey.value)
        props.onChange?.(displayValue.value as ChangeValueType<M>)
      }

      // Stop menu from reopening from the watchEffect
      lastValue.value = itemText
      closeMenu()
    } else {
      // If only a single aspect of combobox is controlled, reset input value and close menu for the user
      resetInputValue()
      closeMenu()
    }
  }

  const commitValue = () => {
    closedDueToEmpty.value = false
    if (allowsCustomValue.value) {
      const itemText = itemTextFor(selectedKey.value)
      if (inputValue.value === itemText) commitSelection()
      else commitCustomValue()
    } else {
      // Reset inputValue and close menu
      commitSelection()
    }
  }

  const commit = () => {
    if (triggerState.isOpen.value && listState.selectionManager.focusedKey != null) {
      // Reset inputValue and close menu here if the selected key is already the focused key. Otherwise
      // fire onSelectionChange to allow the application to control the closing.
      if (listState.selectionManager.isSelected(listState.selectionManager.focusedKey) && selectionMode.value === 'single') {
        commitSelection(true)
      } else {
        listState.selectionManager.select(listState.selectionManager.focusedKey)
      }
    } else {
      commitValue()
    }
  }

  const valueOnFocus = ref<[string, Key | readonly Key[] | null]>([inputValue.value, displayValue.value])
  const setFocused = (isFocusedArg: boolean) => {
    if (isFocusedArg) {
      valueOnFocus.value = [inputValue.value, displayValue.value]
      if (menuTrigger.value === 'focus' && !toValue(props.isReadOnly as any)) {
        open(null, 'focus')
      }
    } else {
      if (shouldCloseOnBlur.value) {
        commitValue()
      }

      // Commit validation if the input value or selected items changed.
      if (inputValue.value !== valueOnFocus.value[0] || displayValue.value !== valueOnFocus.value[1]) {
        commitValidation()
      }
    }

    setFocusedState(isFocusedArg)
  }

  const displayedCollection = computed<Collection<T>>(() => {
    if (triggerState.isOpen.value) {
      if (showAllItems.value) {
        return originalCollection.value
      } else {
        return filteredCollection.value
      }
    } else {
      return lastCollection.value
    }
  })

  const defaultSelectedKey =
    (toValue(props.defaultSelectedKey as any) ?? (selectionMode.value === 'single' ? (initialValueState as Key | null) : null)) ?? null

  const _initialValue = (toValue(props.defaultValue as any) !== undefined
    ? (toValue(props.defaultValue as any) as any)
    : (selectionMode.value === 'single' ? (toValue(props.defaultSelectedKey as any) ?? null) : [])) as Key | readonly Key[] | null

  const defaultInputValue =
    getDefaultInputValue(toValue(props.defaultInputValue as any), defaultSelectedKey as Key | null, listState.collection.value) ??
    inputValue.value

  return {
    collection: displayedCollection,
    disabledKeys: listState.disabledKeys,
    selectionManager: listState.selectionManager,
    isOpen: triggerState.isOpen,
    setOpen: triggerState.setOpen,
    open,
    toggle,
    close: commitValue,
    selectedKey,
    defaultSelectedKey: defaultSelectedKey as Key | null,
    setSelectedKey: (key: Key | null) => setValue(key),
    value: computed(() => displayValue.value as ValueType<M>),
    defaultValue: (initialDefaultValue.value ?? (initialValueState as any)) as ValueType<M>,
    setValue,
    selectedItem,
    selectedItems,
    inputValue,
    defaultInputValue,
    setInputValue,
    commit,
    revert,
    focusStrategy,
    isFocused,
    setFocused,
    displayValidation,
    commitValidation,
    _initialValue,
  }
}

function filterCollection<T>(
  collection: Collection<T>,
  inputValue: string,
  filter: FilterFn,
): Collection<T> {
  // ListCollection implements [Symbol.iterator] (visits root nodes; sections carry childNodes).
  return new ListCollection<T>(filterNodes(collection as unknown as Iterable<CollectionNode<T>>, inputValue, filter))
}

function filterNodes<T>(
  nodes: Iterable<CollectionNode<T>>,
  inputValue: string,
  filter: FilterFn,
): Iterable<CollectionNode<T>> {
  const filteredNodes: CollectionNode<T>[] = []
  for (const node of nodes) {
    if (node.type === 'section' && node.hasChildNodes) {
      const filtered = [...filterNodes(node.childNodes ?? [], inputValue, filter)]
      if (filtered.some(child => child.type === 'item')) {
        filteredNodes.push({...node, childNodes: filtered})
      }
    } else if (node.type === 'item' && filter(node.textValue ?? '', inputValue)) {
      filteredNodes.push({...node})
    } else if (node.type !== 'item') {
      filteredNodes.push({...node})
    }
  }
  return filteredNodes
}

function getDefaultInputValue(
  defaultInputValue: string | null | undefined,
  selectedKey: Key | null,
  collection: Collection<unknown>,
) {
  if (defaultInputValue == null) {
    if (selectedKey != null) {
      return collection.getItem(selectedKey)?.textValue ?? ''
    }
  }

  return defaultInputValue
}
