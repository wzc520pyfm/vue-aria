/*
 * Port of `react-aria@3.53.1` `useComboBox`
 * (`packages/react-aria/src/combobox/useComboBox.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity and faithful to the landed vue-aria primitives
 * (`useMenuTrigger`, `useTextField`, `useListBox`, `ListKeyboardDelegate`,
 * `ariaHideOutside`). The input-side collection keyboard handling from
 * `useSelectableCollection` is inlined (no separate hook in this port).
 *
 * Disclosed simplifications (en-US only): no live-announcer / VoiceOver
 * announcements, no iOS center-tap heuristics, no href/router link items.
 * en-US strings: "Show suggestions" (button label) and "Suggestions" (listbox label).
 */

import {computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import type {Key} from 'vue-stately/useListState'
import type {ComboBoxState, ComboBoxProps, SelectionMode} from 'vue-stately/useComboBoxState'
import {useMenuTrigger} from '../menu/useMenuTrigger'
import {ListKeyboardDelegate} from '../listbox/useListKeyboardDelegate'
import {getItemId, setListData} from '../listbox/utils'
import {ariaHideOutside} from '../overlays/ariaHideOutside'
import {useId} from '../utils/useId'
import {mergeProps} from '../utils/mergeProps'
import {useTextField} from '../textfield/useTextField'

export interface AriaComboBoxProps<T, M extends SelectionMode = 'single'> extends Omit<ComboBoxProps<T, M>, 'children'> {
  id?: MaybeRefOrGetter<string | undefined>
  /** Whether keyboard navigation is circular. */
  shouldFocusWrap?: MaybeRefOrGetter<boolean | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-errormessage'?: MaybeRefOrGetter<string | undefined>
  labelElementType?: 'label' | 'span' | 'div' | 'p' | string
}

export interface AriaComboBoxOptions<T, M extends SelectionMode = 'single'> extends Omit<AriaComboBoxProps<T, M>, 'children'> {
  /** The ref for the input element. */
  inputRef: Ref<HTMLInputElement | null>
  /** The ref for the list box popover. */
  popoverRef: Ref<Element | null>
  /** The ref for the list box. */
  listBoxRef: Ref<HTMLElement | null>
  /** The ref for the optional list box popup trigger button. */
  buttonRef?: Ref<Element | null>
  /** An optional keyboard delegate implementation, to override the default. */
  keyboardDelegate?: any
  /** A delegate object that provides layout information for items in the collection. */
  layoutDelegate?: any
}

export interface ComboBoxAria<T> {
  /** Props for the label element. */
  labelProps: Record<string, any>
  /** Props for the combo box input element. */
  inputProps: Record<string, any>
  /** Props for the list box, to be passed to `useListBox`. */
  listBoxProps: Record<string, any>
  /** Props for the optional trigger button, to be passed to `useButton`. */
  buttonProps: Record<string, any>
  /** Props for the element representing the selected value. */
  valueProps: Record<string, any>
  /** Props for the combo box description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the combo box error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Whether the combo box is invalid. Live: see getter. */
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

const nodeContains = (el: Element | null | undefined, target: EventTarget | null | undefined): boolean => {
  if (!el || !(target instanceof Node)) return false
  return el === target || el.contains(target as Node)
}

/**
 * Provides the behavior and accessibility implementation for a combo box component. A combo box
 * combines a text input with a listbox, allowing users to filter a list of options to items
 * matching a query.
 *
 * @param props - Props for the combo box.
 * @param state - State for the combo box, as returned by `useComboBoxState`.
 */
export function useComboBox<T, M extends SelectionMode = 'single'>(
  props: AriaComboBoxOptions<T, M>,
  state: ComboBoxState<T, M>,
): ComboBoxAria<T> {
  const {
    buttonRef: buttonRefProp,
    popoverRef,
    inputRef,
    listBoxRef,
    keyboardDelegate,
    layoutDelegate,
    shouldFocusWrap,
    isReadOnly,
    isDisabled,
  } = props
  const backupBtnRef = ref<Element | null>(null)
  const buttonRef = (buttonRefProp ?? backupBtnRef) as Ref<Element | null>

  const isDisabledC = computed(() => !!toValue(isDisabled as any))
  const isReadOnlyC = computed(() => !!toValue(isReadOnly as any))
  const isRequiredC = computed(() => !!toValue(props.isRequired as any))
  const selectionModeC = computed(() => state.selectionManager.selectionMode as 'single' | 'multiple')
  const isMultipleC = computed(() => selectionModeC.value === 'multiple')

  const {menuTriggerProps, menuProps} = useMenuTrigger<T>(
    {
      type: 'listbox',
      isDisabled: () => isDisabledC.value || isReadOnlyC.value,
    },
    state as any,
    buttonRef,
  )

  // Set listbox id so it can be used when calling getItemId later
  setListData(state as any, {id: menuProps.id})

  const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'base'})
  // By default, a KeyboardDelegate is provided which uses the DOM to query layout information (e.g. for page up/page down).
  // When virtualized, the layout object will be passed in as a prop and override this.
  const delegate = computed(() =>
    keyboardDelegate ??
    new ListKeyboardDelegate<T>({
      collection: () => state.collection.value as any,
      ref: listBoxRef as any,
      collator,
      disabledKeys: () => state.selectionManager.disabledKeys,
      disabledBehavior: () => (state.selectionManager as any).disabledBehavior,
      layout: 'stack',
      orientation: 'vertical',
      direction: 'ltr',
    } as any))

  const valueId = useId('vue-aria-combobox-value')
  // Official `useValueId`: only include the value element id in aria-describedby
  // while a ComboBoxValue (or equivalent) is actually rendered. The presence check
  // must stay reactive because selected values can mount the element later.
  const valueExists = ref(true)
  const checkValueExists = () => {
    if (typeof document === 'undefined') return
    valueExists.value = !!document.getElementById(valueId.value)
  }
  const describedById = computed(() => (valueExists.value ? valueId.value : undefined))
  onMounted(() => checkValueExists())
  const stopValueIdWatch = watch(
    () => [state.selectionManager.selectedKeys, state.selectionManager.selectionMode] as const,
    async () => {
      valueExists.value = true
      await nextTick()
      checkValueExists()
    },
    {flush: 'post'},
  )
  onBeforeUnmount(() => stopValueIdWatch())

  // Input-side collection keyboard handling. Official comes from
  // `useSelectableCollection({disallowTypeAhead: true, disallowEmptySelection: true,
  // shouldFocusWrap, ref: inputRef, isVirtualized: true})`; inlined here.
  const isPlain = (e: KeyboardEvent) => !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
  const isShiftOnly = (e: KeyboardEvent) => e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
  const isMod = (e: KeyboardEvent) => !e.shiftKey && !e.altKey && (e.ctrlKey || e.metaKey)

  const onCollectionKeyDown = (e: KeyboardEvent) => {
    if (!state.isOpen.value) return
    const manager = state.selectionManager
    const d = delegate.value
    const isMultiple = selectionModeC.value === 'multiple'
    const focusedKey = manager.focusedKey
    const navigate = (getKey: () => Key | null | undefined) => {
      const target = getKey() ?? null
      if (target == null) return false
      manager.setFocusedKey(target)
      if (isShiftOnly(e) && isMultiple) {
        manager.extendSelection(target)
      }
      e.preventDefault()
      return true
    }
    switch (e.key) {
      case 'ArrowDown':
        if (isPlain(e) || isShiftOnly(e)) navigate(() => (focusedKey != null ? d.getKeyBelow(focusedKey) : d.getFirstKey()))
        break
      case 'ArrowUp':
        if (isPlain(e) || isShiftOnly(e)) navigate(() => (focusedKey != null ? d.getKeyAbove(focusedKey) : d.getLastKey()))
        break
      case 'PageDown':
        if (isPlain(e) || isShiftOnly(e)) navigate(() => (focusedKey != null ? d.getKeyPageBelow?.(focusedKey) ?? null : null))
        break
      case 'PageUp':
        if (isPlain(e) || isShiftOnly(e)) navigate(() => (focusedKey != null ? d.getKeyPageAbove?.(focusedKey) ?? null : null))
        break
      case 'Home':
        if (isPlain(e) || isShiftOnly(e)) navigate(() => d.getFirstKey())
        break
      case 'End':
        if (isPlain(e) || isShiftOnly(e)) navigate(() => d.getLastKey())
        break
      case 'a':
        if (isMod(e) && isMultiple && typeof (manager as any).selectAll === 'function') {
          manager.selectAll()
          e.preventDefault()
        }
        break
      // Escape: collection would clear selection, but the combobox passes
      // disallowEmptySelection, so nothing happens here — falls through to revert.
      // Tab: falls through to commit the current value.
      default:
        break
    }
  }

  const onShortcutKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter': {
        const shouldPreventDefault = state.isOpen.value
        // If the focused item is a link (href) this would open it; links are deferred.
        // onAction items are supported.
        if (state.isOpen.value && listBoxRef.value && state.selectionManager.focusedKey != null) {
          const item = state.collection.value.getItem(state.selectionManager.focusedKey) as any
          const onAction = item?.props?.onAction
          if (typeof onAction === 'function') {
            onAction()
            state.close()
            if (shouldPreventDefault) e.preventDefault()
            return
          }
        }
        state.commit()
        if (shouldPreventDefault) e.preventDefault()
        return
      }
      case 'Tab': {
        if (state.isOpen.value) {
          state.commit()
        }
        return
      }
      case 'Escape': {
        state.revert()
        return
      }
      default:
        return
    }
  }

  const onRepeatKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        state.open('first', 'manual')
        return
      case 'ArrowUp':
        state.open('last', 'manual')
        return
      case 'ArrowLeft':
      case 'ArrowRight':
        state.selectionManager.setFocusedKey(null)
        return
      default:
        return
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (isReadOnlyC.value) {
      props.onKeyDown?.(e)
      return
    }
    onCollectionKeyDown(e)
    onShortcutKeyDown(e)
    onRepeatKeyDown(e)
    props.onKeyDown?.(e)
  }

  const onBlur = (e: FocusEvent) => {
    const blurFromButton = nodeContains(buttonRef.value, e.relatedTarget)
    const blurIntoPopover = nodeContains(popoverRef.value, e.relatedTarget)

    // Ignore blur if focused moved to the button (if exists) or into the popover.
    if (blurFromButton || blurIntoPopover) {
      return
    }

    props.onBlur?.(e)
    props.onFocusChange?.(false)
    state.setFocused(false)
  }

  const onFocus = (e: FocusEvent) => {
    if (state.isFocused.value) {
      return
    }

    props.onFocus?.(e)
    props.onFocusChange?.(true)
    state.setFocused(true)
  }

  // The focused option, if the list is open and an option is virtually focused.
  const focusedItem = computed(() =>
    state.selectionManager.focusedKey != null && state.isOpen.value
      ? state.collection.value.getItem(state.selectionManager.focusedKey)
      : undefined,
  )

  const textFieldAria = useTextField<'input'>({
    ...(props as any),
    id: props.id,
    isDisabled: () => isDisabledC.value,
    isReadOnly: () => isReadOnlyC.value,
    isRequired: () => (isMultipleC.value ? isRequiredC.value && state.selectionManager.isEmpty : isRequiredC.value),
    onChange: state.setInputValue,
    onKeyDown,
    onBlur,
    onFocus,
    value: () => state.inputValue.value,
    defaultValue: state.defaultInputValue,
    autoComplete: 'off',
    validationBehavior: () => (toValue(props.validationBehavior as any) ?? 'native') as 'aria' | 'native',
    'aria-describedby': () =>
      [describedById.value, toValue(props['aria-describedby'] as any)].filter(Boolean).join(' ') || undefined,
  }, inputRef)
  const {labelProps, inputProps: textFieldInputProps, descriptionProps, errorMessageProps} = textFieldAria

  // Support form reset to the default value.
  const onReset = () => {
    state.setValue(state.defaultValue)
    if (toValue(props.inputValue as any) === undefined) {
      state.setInputValue(state.defaultInputValue)
    }
  }
  onMounted(() => {
    const form = (inputRef.value as HTMLInputElement | null)?.form
    if (form) {
      form.addEventListener('reset', onReset)
    }
  })
  onBeforeUnmount(() => {
    const form = (inputRef.value as HTMLInputElement | null)?.form
    if (form) {
      form.removeEventListener('reset', onReset)
    }
  })

  // Props for the combo box button.
  const triggerLabelProps = {
    'aria-label': 'Show suggestions',
    'aria-labelledby': toValue(props['aria-labelledby'] as any) ?? (labelProps as any).id,
  }

  const buttonProps: Record<string, any> = {}
  for (const key of ['id', 'onKeyDown', 'aria-haspopup', 'aria-expanded', 'aria-controls'] as const) {
    const desc = Object.getOwnPropertyDescriptor(menuTriggerProps, key)
    if (desc) Object.defineProperty(buttonProps, key, {...desc, enumerable: true, configurable: true})
  }
  Object.assign(buttonProps, triggerLabelProps, {
    excludeFromTabOrder: true,
    preventFocusOnPress: true,
    onPress: (e: any) => {
      // Focus the input field in case it isn't focused yet
      if (e.pointerType === 'touch') {
        inputRef.value?.focus()
        state.toggle(null, 'manual')
      }
    },
    onPressStart: (e: any) => {
      if (e.pointerType !== 'touch') {
        inputRef.value?.focus()
        state.toggle(
          e.pointerType === 'keyboard' || e.pointerType === 'virtual' ? 'first' : null,
          'manual',
        )
      }
    },
  })
  Object.defineProperty(buttonProps, 'isDisabled', {
    get: () => isDisabledC.value || isReadOnlyC.value,
    enumerable: true,
    configurable: true,
  })

  // Props for the list box.
  const listBoxLabelProps = {
    id: (menuProps as any).id,
    'aria-label': 'Suggestions',
    'aria-labelledby': toValue(props['aria-labelledby'] as any) ?? (labelProps as any).id,
  }

  const listBoxProps = mergeProps(menuProps, listBoxLabelProps, {
    shouldUseVirtualFocus: true,
    shouldSelectOnPressUp: true,
    shouldFocusOnHover: true,
    linkBehavior: 'selection',
  })
  // `autoFocus` comes from menuProps (live getter on the combobox focus strategy);
  // fall back to focusing the first option when no strategy is set.
  Object.defineProperty(listBoxProps, 'autoFocus', {
    get: () => state.focusStrategy.value || true,
    enumerable: true,
    configurable: true,
  })

  // Focus the input in case the label is not a native <label> element.
  const labelPropsOut: Record<string, any> = {...labelProps}
  if (!('htmlFor' in labelPropsOut) || !labelPropsOut.htmlFor) {
    if (!isDisabledC.value) {
      labelPropsOut.onClick = () => {
        inputRef.value?.focus()
      }
    }
  }

  // Hide everything outside the input and popover while open.
  let restore: (() => void) | undefined
  watch(state.isOpen, (isOpen) => {
    if (restore) {
      restore()
      restore = undefined
    }
    if (isOpen && typeof document !== 'undefined') {
      const targets = [inputRef.value, popoverRef.value].filter((el): el is Element => el != null)
      restore = ariaHideOutside(targets)
    }
  }, {flush: 'post'})
  onBeforeUnmount(() => {
    if (restore) {
      restore()
      restore = undefined
    }
  })

  const inputProps = mergeProps(textFieldInputProps, {
    role: 'combobox',
    'aria-autocomplete': 'list',
    autoCorrect: 'off',
    // This disables the macOS Safari spell check auto corrections.
    spellCheck: 'false',
  })
  Object.defineProperties(inputProps, {
    'aria-expanded': {
      get: () => (state.isOpen.value ? true : false),
      enumerable: true,
      configurable: true,
    },
    'aria-controls': {
      get: () => (state.isOpen.value ? (menuProps as any).id : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-activedescendant': {
      get: () => {
        const item = focusedItem.value
        return item ? getItemId(state as any, item.key) : undefined
      },
      enumerable: true,
      configurable: true,
    },
    onKeyDown: {value: onKeyDown, enumerable: true, configurable: true},
    onKeydown: {value: onKeyDown, enumerable: true, configurable: true},
  })

  const valueProps: Record<string, any> = {}
  Object.defineProperty(valueProps, 'id', {get: () => valueId.value, enumerable: true, configurable: true})

  const out: ComboBoxAria<T> = {
    labelProps: labelPropsOut,
    inputProps,
    listBoxProps,
    buttonProps,
    valueProps,
    descriptionProps,
    errorMessageProps,
    // Keep isInvalid live: expose a getter rather than a setup-time snapshot.
    isInvalid: false,
    validationErrors: textFieldAria.validationErrors,
    validationDetails: textFieldAria.validationDetails,
  }
  Object.defineProperty(out, 'isInvalid', {get: () => textFieldAria.isInvalid, enumerable: true})
  return out
}
