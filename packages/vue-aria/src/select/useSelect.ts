import {computed, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {Key} from 'vue-stately/useListState'
import type {SelectState} from 'vue-stately/useSelectState'
import {ListKeyboardDelegate} from '../listbox/useListKeyboardDelegate'
import {useMenuTrigger} from '../menu/useMenuTrigger'
import {useKeyboard} from '../interactions/useKeyboard'
import {useTypeSelect} from '../listbox/useTypeSelect'
import {useField} from '../label/useField'
import {useId} from '../utils/useId'
import {mergeProps} from '../utils/mergeProps'

export type SelectionMode = 'single' | 'multiple'

export interface AriaSelectProps<T = unknown, M extends SelectionMode = 'single'> {
  id?: MaybeRefOrGetter<string | undefined>
  label?: unknown
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  description?: unknown
  errorMessage?: unknown
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  autoComplete?: MaybeRefOrGetter<string | undefined>
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  validationBehavior?: MaybeRefOrGetter<'aria' | 'native' | undefined>
  allowsEmptyCollection?: MaybeRefOrGetter<boolean | undefined>
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  keyboardDelegate?: any
}

export interface AriaSelectOptions<T = unknown, M extends SelectionMode = 'single'> extends Omit<AriaSelectProps<T, M>, 'children'> {
  keyboardDelegate?: any
}

export interface SelectAria<T = unknown, M extends SelectionMode = 'single'> {
  labelProps: Record<string, any>
  triggerProps: Record<string, any>
  valueProps: Record<string, any>
  menuProps: Record<string, any>
  descriptionProps: Record<string, any>
  errorMessageProps: Record<string, any>
  hiddenSelectProps: Record<string, any>
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

// Internal data for HiddenSelect (official stores on WeakMap).
export interface SelectHiddenData {
  isDisabled?: boolean
  isRequired?: boolean
  name?: string
  form?: string
  validationBehavior?: 'aria' | 'native'
  autoComplete?: string
  label?: unknown
}
export const selectData = new WeakMap<object, SelectHiddenData>()

export function useSelect<T, M extends SelectionMode = 'single'>(
  props: AriaSelectOptions<T, M>,
  state: SelectState<T, M>,
  ref: Ref<HTMLElement | null>,
): SelectAria<T, M> {
  const keyboardDelegateProp = (props as any).keyboardDelegate
  const isDisabled = computed(() => !!toValue(props.isDisabled as any))
  const isRequired = computed(() => !!toValue(props.isRequired as any))
  const name = computed(() => toValue(props.name as any))
  const form = computed(() => toValue(props.form as any))
  const validationBehavior = computed<'aria' | 'native'>(() => (toValue(props.validationBehavior as any) ?? 'aria') as any)

  const collator = new Intl.Collator(undefined, {usage: 'search', sensitivity: 'base'})
  const delegate = computed(() => {
    if (keyboardDelegateProp) return keyboardDelegateProp
    return new ListKeyboardDelegate({
      collection: () => state.collection.value as any,
      ref,
      collator,
      disabledKeys: () => state.selectionManager.disabledKeys,
      disabledBehavior: () => state.selectionManager.disabledBehavior as any,
      layout: 'stack',
      orientation: 'vertical',
      direction: 'ltr',
    })
  })

  const {menuTriggerProps, menuProps} = useMenuTrigger<T>(
    {isDisabled: () => isDisabled.value, type: 'listbox'},
    state as any,
    ref,
  )

  // Closed-arrow selection for single mode only.
  const {keyboardProps} = useKeyboard({
    onKeyDown: (e) => {
      if (e.defaultPrevented) return
      if (state.selectionManager.selectionMode === 'multiple') return
      if (e.key === 'ArrowLeft') {
        const key = state.selectionManager.firstSelectedKey != null
          ? delegate.value.getKeyAbove?.(state.selectionManager.firstSelectedKey)
          : delegate.value.getFirstKey?.()
        if (key != null) state.setValue(key as any)
      } else if (e.key === 'ArrowRight') {
        const key = state.selectionManager.firstSelectedKey != null
          ? delegate.value.getKeyBelow?.(state.selectionManager.firstSelectedKey)
          : delegate.value.getFirstKey?.()
        if (key != null) state.setValue(key as any)
      }
      props.onKeyDown?.(e)
    },
    onKeyUp: (e) => props.onKeyUp?.(e),
  })

  const isMultiple = computed(() => state.selectionManager.selectionMode === 'multiple')
  let typeSelectProps: any = {}
  if (!isMultiple.value) {
    ;({typeSelectProps} = useTypeSelect({
      keyboardDelegate: delegate.value as any,
      selectionManager: state.selectionManager as any,
      onTypeSelect(key) {
        state.setValue(key as any)
      },
    }))
  }

  const isInvalid = computed(() => !!toValue(props.isInvalid as any) || !!state.displayValidation?.isInvalid?.value)
  const validationErrors = computed(() => state.displayValidation?.validationErrors?.value ?? [])
  const validationDetails = computed(() => state.displayValidation?.validationDetails?.value ?? {})

  const {labelProps, fieldProps, descriptionProps, errorMessageProps} = useField({
    id: props.id,
    label: props.label as any,
    'aria-labelledby': props['aria-labelledby'],
    'aria-label': props['aria-label'],
    labelElementType: 'span',
    isInvalid: () => isInvalid.value,
    description: props.description as any,
    errorMessage: props.errorMessage as any,
  })

  const valueId = useId('vue-aria-select-value')

  selectData.set(state as object, {
    isDisabled: isDisabled.value,
    isRequired: isRequired.value,
    name: name.value,
    form: form.value,
    validationBehavior: validationBehavior.value,
    autoComplete: toValue(props.autoComplete as any),
    label: props.label,
  })

  const labelPropsOut: Record<string, any> = {...labelProps}
  labelPropsOut.onClick = () => {
    if (!isDisabled.value) {
      ;(ref.value as HTMLElement | null)?.focus?.()
    }
  }

  const triggerProps: Record<string, any> = mergeProps(
    !isMultiple.value ? typeSelectProps : {},
    menuTriggerProps,
    fieldProps,
    {
      onKeyDown: (e: KeyboardEvent) => {
        ;(menuTriggerProps as any).onKeyDown?.(e)
        if (e.defaultPrevented) return
        ;(keyboardProps as any).onKeyDown?.(e)
      },
      onKeyUp: (e: KeyboardEvent) => {
        ;(keyboardProps as any).onKeyUp?.(e)
      },
      onFocus: (e: FocusEvent) => {
        if (state.isFocused.value) return
        props.onFocus?.(e)
        props.onFocusChange?.(true)
        state.setFocused(true)
      },
      onBlur: (e: FocusEvent) => {
        // If focus moved into the open menu, don't mark blurred yet.
        if (state.isOpen.value) return
        props.onBlur?.(e)
        props.onFocusChange?.(false)
        state.setFocused(false)
      },
    },
  )
  // Ensure aria-labelledby includes SelectValue id + label linkage.
  Object.defineProperty(triggerProps, 'aria-controls', {
    get: () => (menuTriggerProps as any)['aria-controls'],
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(triggerProps, 'aria-labelledby', {
    get: () => {
      const parts = [
        valueId.value,
        fieldProps['aria-labelledby'],
        triggerProps['aria-label'] && !fieldProps['aria-labelledby'] ? (fieldProps.id ?? menuTriggerProps.id) : null,
      ].filter(Boolean)
      return parts.join(' ') || undefined
    },
    enumerable: true,
    configurable: true,
  })

  const menuPropsOut: Record<string, any> = {
    ...menuProps,
    autoFocus: (state.focusStrategy?.value || true) as any,
    shouldSelectOnPressUp: true,
    shouldFocusOnHover: true,
    disallowEmptySelection: true,
    linkBehavior: 'selection',
    onAction: undefined,
  }
  Object.defineProperty(menuPropsOut, 'autoFocus', {
    get: () => (state.focusStrategy?.value || true),
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(menuPropsOut, 'aria-labelledby', {
    get: () => {
      const parts = [
        fieldProps['aria-labelledby'],
        triggerProps['aria-label'] && !fieldProps['aria-labelledby'] ? (fieldProps.id ?? menuTriggerProps.id) : null,
      ].filter(Boolean)
      return parts.join(' ') || undefined
    },
    enumerable: true,
    configurable: true,
  })
  menuPropsOut.onBlur = (e: FocusEvent) => {
    const target = e.currentTarget as Node | null
    const related = e.relatedTarget as Node | null
    if (target && related && target.contains(related)) return
    props.onBlur?.(e)
    props.onFocusChange?.(false)
    state.setFocused(false)
  }

  const valueProps: Record<string, any> = {}
  Object.defineProperty(valueProps, 'id', {get: () => valueId.value, enumerable: true})

  const hiddenSelectProps: Record<string, any> = {
    state,
    triggerRef: ref,
  }
  // Keep reactive fields accessible.
  Object.defineProperties(hiddenSelectProps, {
    isDisabled: {get: () => isDisabled.value, enumerable: true},
    isRequired: {get: () => isRequired.value, enumerable: true},
    name: {get: () => name.value, enumerable: true},
    form: {get: () => form.value, enumerable: true},
    autoComplete: {get: () => toValue(props.autoComplete as any), enumerable: true},
    label: {get: () => props.label, enumerable: true},
    validationBehavior: {get: () => validationBehavior.value, enumerable: true},
  })

  return {
    labelProps: labelPropsOut,
    triggerProps,
    valueProps,
    menuProps: menuPropsOut,
    descriptionProps,
    errorMessageProps,
    hiddenSelectProps,
    isInvalid: isInvalid.value,
    validationErrors: validationErrors.value,
    validationDetails: validationDetails.value,
  }
}
