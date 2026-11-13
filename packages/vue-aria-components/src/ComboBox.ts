/*
 * Port of `react-aria-components@1.22.1` `ComboBox` / `ComboBoxValue`
 * (`packages/react-aria-components/src/ComboBox.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: consumes `ComboBoxContext`, renders a hidden input per selected key
 * (markup replaces the official HiddenSelect, which is intentionally not ported),
 * emits Hero UI data-* locally, and does not extend `toHeroDataAttrs`.
 *
 * Group / FieldInputContext / FieldError / Form / Autocomplete remain deferred, so
 * the context is input-only (label/button/text/input cleared inside the Popover).
 */

import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  isVNode,
  provide,
  ref,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'
import {mergeProps} from 'vue-aria'
import {useComboBox} from 'vue-aria/useComboBox'
import {useComboBoxState} from 'vue-stately/useComboBoxState'
import {useFilter} from 'vue-aria/useFilter'
import type {CollectionNode, Key} from 'vue-stately/useListState'
import type {MenuTriggerAction} from 'vue-stately/useComboBoxState'
import {Button} from './Button'
import {Input} from './Input'
import {Label} from './Label'
import {Text} from './Text'
import {Popover} from './Popover'
import {ListBox, ListBoxItem, ListBoxSection, Collection, buildNodesFromDynamicItems} from './ListBox'
import {
  ButtonContextKey,
  ComboBoxContextKey,
  ComboBoxStateContextKey,
  ComboBoxValueContextKey,
  InputContextKey,
  LabelContextKey,
  ListBoxContextKey,
  ListStateContextKey,
  OverlayTriggerStateKey,
  PopoverContextKey,
  TextContextKey,
} from './context'

function genKey(prefix = 'item', ...segments: Array<string | number>): Key {
  const suffix = segments.join('-')
  return suffix ? `$$va-${prefix}-${suffix}` : `$$va-${prefix}`
}
function flatten(v: VNodeChild): VNode[] {
  if (v == null || typeof v === 'boolean') return []
  if (Array.isArray(v)) return v.flatMap(flatten)
  if (isVNode(v)) {
    if (v.type === Fragment) return flatten(v.children as any)
    return [v]
  }
  return []
}
function getTextContent(vnodes: VNode[] | undefined): string {
  if (!vnodes) return ''
  let out = ''
  for (const n of vnodes) {
    if (n == null) continue
    if (typeof n.children === 'string') out += n.children
    else if (Array.isArray(n.children)) out += getTextContent(n.children as any)
  }
  return out.trim()
}
function getComponentName(v: VNode): string | null {
  const t: any = v.type
  if (!t) return null
  if (typeof t === 'string') return null
  return t.name || t.__name || null
}
function resolveVNodesFromSlot(vnode: VNode): VNode[] {
  const children = vnode.children
  if (typeof children === 'object' && children && !Array.isArray(children) && 'default' in (children as any)) {
    const fn = (children as any).default
    if (typeof fn !== 'function') return []
    try {
      const result = fn({})
      return flatten(result)
    } catch {
      // Scoped slots that require render props cannot be walked without them.
      return []
    }
  }
  if (Array.isArray(children)) return flatten(children as any)
  return []
}

function detectLabel(vnodes: Array<VNode>): boolean {
  // Only top-level composition counts: a <Label> directly inside the ComboBox.
  // Labels nested in the Popover belong to the overlay, not the field.
  for (const vnode of vnodes) {
    if (getComponentName(vnode) === 'Label') return true
  }
  return false
}

function buildCollectionFromVNodes(
  vnodes: VNodeChild,
  parentKey: Key | null = null,
  level = 0,
  path: Array<Key | number> = [],
  itemsFallback?: any[],
): {nodes: CollectionNode<any>[]} {
  const nodes: CollectionNode<any>[] = []
  let index = 0
  for (const vnode of flatten(vnodes as any)) {
    const name = getComponentName(vnode)
    const props: any = vnode.props || {}
    if (name === 'Popover' || name === 'Dialog' || name === 'Modal' || name === 'ModalOverlay') {
      // Walk into unmounted/overlay children to build collection (ComboBox ListBox lives in Popover).
      const childVNodes = resolveVNodesFromSlot(vnode)
      const sub = buildCollectionFromVNodes(childVNodes, parentKey, level, path, itemsFallback)
      nodes.push(...sub.nodes)
      continue
    }
    if (name === 'ListBox') {
      // <ListBox :items="items"> (Collection pattern): the state collection is built from the items array.
      // A ComboBox may also provide `items` on itself while the ListBox stays generic
      // (official ListBoxContext behavior), so fall back to those items.
      const items = (props.items as any[] | undefined) ?? itemsFallback
      if (Array.isArray(items)) {
        nodes.push(...(buildNodesFromDynamicItems(items, undefined, parentKey, level) as any[]))
        continue
      }
    }
    if (name === 'Collection') {
      const children = typeof vnode.children === 'object' && vnode.children && 'default' in (vnode.children as any)
        ? ((vnode.children as any).default as any)
        : (vnode.children as any)
      const items = props.items as any[] | undefined
      const childVNodes = items && Array.isArray(items) && items.length > 0
        ? items.flatMap((item: any) => flatten(((children as any)?.({item})) ?? []))
        : flatten(typeof children === 'function' ? ((children as any)() ?? []) : children)
      const sub = buildCollectionFromVNodes(childVNodes, parentKey, level, path, itemsFallback)
      nodes.push(...sub.nodes)
      continue
    }
    if (name === 'ListBoxSection' || name === 'MenuSection') {
      const key = (props.id ?? null) as Key | null
      const sectionKey = key ?? genKey('section', ...path, index)
      const childSlotVNodes = resolveVNodesFromSlot(vnode)
      const childPath = [...path, sectionKey]
      const childResult = buildCollectionFromVNodes(childSlotVNodes, sectionKey, level + 1, childPath, itemsFallback)
      nodes.push({
        key: sectionKey,
        parentKey,
        type: 'section',
        value: props.value ?? {key: sectionKey, 'aria-label': props['aria-label']},
        props: {...props, title: props.title},
        index: index++,
        level,
        hasChildNodes: true,
        childNodes: childResult.nodes,
        textValue: props.textValue || getTextContent(flatten(childSlotVNodes)),
        'aria-label': props['aria-label'],
      } as any)
      continue
    }
    if (name === 'ListBoxItem' || name === 'MenuItem') {
      const key = (props.id ?? null) as Key | null
      const resolvedKey = key ?? genKey('item', ...path, index)
      nodes.push({
        key: resolvedKey,
        parentKey,
        type: 'item',
        value: props.value ?? {key: resolvedKey},
        props: {...props, isDisabled: !!props.isDisabled},
        index: index++,
        level,
        hasChildNodes: false,
        textValue: props.textValue || getTextContent(flatten(resolveVNodesFromSlot(vnode))),
        'aria-label': props['aria-label'],
      } as any)
      continue
    }
    // Recurse into generic wrappers to be safe.
    const childVNodes = resolveVNodesFromSlot(vnode)
    if (childVNodes.length) {
      const sub = buildCollectionFromVNodes(childVNodes, parentKey, level, path, itemsFallback)
      nodes.push(...sub.nodes)
    }
  }
  return {nodes}
}

function formatList(values: string[]): string {
  try {
    const lang = typeof document !== 'undefined' ? (document.documentElement.lang || 'en') : 'en'
    // @ts-ignore
    if (typeof Intl !== 'undefined' && Intl.ListFormat) {
      // @ts-ignore
      return new Intl.ListFormat(lang || 'en', {style: 'long', type: 'conjunction'}).format(values)
    }
  } catch {}
  return values.join(', ')
}

export interface ComboBoxProps<T = any, M extends 'single' | 'multiple' = 'single'> {
  selectionMode?: M
  value?: any
  defaultValue?: any
  onChange?: (value: any) => void
  selectedKey?: Key | null
  defaultSelectedKey?: Key | null
  onSelectionChange?: (key: Key | null) => void
  inputValue?: string
  defaultInputValue?: string
  onInputChange?: (value: string) => void
  allowsCustomValue?: boolean
  menuTrigger?: MenuTriggerAction
  allowsEmptyCollection?: boolean
  shouldCloseOnBlur?: boolean
  selectionBehavior?: 'toggle' | 'replace'
  disabledKeys?: Iterable<Key>
  items?: any[]
  defaultItems?: Iterable<T>
  defaultFilter?: (textValue: string, inputValue: string) => boolean
  formValue?: 'text' | 'key'
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  isReadOnly?: boolean
  name?: string
  form?: string
  placeholder?: string
  validationBehavior?: 'aria' | 'native'
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  label?: any
  description?: any
  errorMessage?: any
}

export interface ComboBoxValueRenderProps<T> {
  isPlaceholder: boolean
  selectedItem: T | null
  selectedItems: (T | null)[]
  selectedText: string
  state: any
}

export interface ComboBoxValueProps<T = any> {
  className?: string | ((values: ComboBoxValueRenderProps<T>) => string)
  placeholder?: string
}

export interface ComboBoxRenderProps {
  isOpen: boolean
  isDisabled: boolean
  isInvalid: boolean
  isRequired: boolean
  isReadOnly: boolean
}

/** Forward every key of `source` onto `target` as live getters (keeps provided contexts reactive). */
function live<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  for (const key of Object.keys(source)) {
    Object.defineProperty(target, key, {
      get: () => source[key],
      enumerable: true,
      configurable: true,
    })
  }
  return target
}

export const ComboBox = defineComponent({
  name: 'ComboBox',
  inheritAttrs: false,
  props: {
    selectionMode: {type: String as PropType<'single' | 'multiple'>, default: 'single'},
    value: {type: null as any, default: undefined},
    defaultValue: {type: null as any, default: undefined},
    selectedKey: {type: null as any, default: undefined},
    defaultSelectedKey: {type: null as any, default: undefined},
    inputValue: {type: String, default: undefined},
    defaultInputValue: {type: String, default: undefined},
    allowsCustomValue: {type: Boolean, default: undefined},
    menuTrigger: {type: String as PropType<MenuTriggerAction>, default: 'input'},
    allowsEmptyCollection: {type: Boolean, default: undefined},
    shouldCloseOnBlur: {type: Boolean, default: undefined},
    selectionBehavior: {type: String as PropType<'toggle' | 'replace'>, default: undefined},
    disabledKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
    items: {type: Array as PropType<any[]>, default: undefined},
    defaultItems: {type: null as any, default: undefined},
    defaultFilter: {type: Function as PropType<((textValue: string, inputValue: string) => boolean) | undefined>, default: undefined},
    formValue: {type: String as PropType<'text' | 'key'>, default: 'key'},
    isDisabled: {type: Boolean, default: false},
    isInvalid: {type: Boolean, default: false},
    isRequired: {type: Boolean, default: false},
    isReadOnly: {type: Boolean, default: false},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    placeholder: {type: String, default: undefined},
    validationBehavior: {type: String as PropType<'aria' | 'native'>, default: 'native'},
    id: {type: String, default: undefined},
    'aria-label': {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    'aria-describedby': {type: String, default: undefined},
  },
  emits: ['change', 'inputchange', 'selectionchange', 'openchange'],
  setup(props, {slots, attrs, emit}) {
    const inputRef = ref<HTMLInputElement | null>(null)
    const buttonRef = ref<HTMLElement | null>(null)
    const listBoxRef = ref<HTMLElement | null>(null)
    const popoverRef = ref<HTMLElement | null>(null)

    const buildNodes = () => {
      const children = slots.default?.({
        isOpen: false, isDisabled: !!props.isDisabled, isInvalid: !!props.isInvalid, isRequired: !!props.isRequired,
        isReadOnly: !!props.isReadOnly, defaultChildren: null,
      }) ?? []
      return buildCollectionFromVNodes(children as any, null, 0, [], props.items ?? (props.defaultItems as any)).nodes
    }

    // Detect a top-level <Label> in the default slot; the field needs to know
    // a label exists so aria-labelledby on the trigger includes the label id.
    const hasLabel = (() => {
      try {
        if (!slots.default) return false
        const out = slots.default({
          isOpen: false, isDisabled: !!props.isDisabled, isInvalid: !!props.isInvalid,
          isRequired: !!props.isRequired, isReadOnly: !!props.isReadOnly, defaultChildren: null,
        }) as any
        return detectLabel(flatten(out))
      } catch {
        return false
      }
    })()

    const {contains} = useFilter({sensitivity: 'base'})

    // formValue is forced to 'text' when allowsCustomValue (official behavior).
    const resolvedFormValue = () => (props.allowsCustomValue ? 'text' : props.formValue)

    const state = useComboBoxState<any, any>({
      selectionMode: () => props.selectionMode as any,
      value: () => props.value,
      defaultValue: () => props.defaultValue,
      onChange: (value: any) => emit('change', value),
      selectedKey: () => props.selectedKey,
      defaultSelectedKey: () => props.defaultSelectedKey,
      onSelectionChange: (key: Key | null) => emit('selectionchange', key),
      disabledKeys: () => props.disabledKeys,
      selectionBehavior: () => props.selectionBehavior as any,
      inputValue: () => props.inputValue,
      defaultInputValue: () => props.defaultInputValue,
      onInputChange: (value: string) => emit('inputchange', value),
      allowsCustomValue: () => props.allowsCustomValue,
      menuTrigger: () => props.menuTrigger,
      shouldCloseOnBlur: () => props.shouldCloseOnBlur,
      allowsEmptyCollection: () => props.allowsEmptyCollection,
      isInvalid: () => props.isInvalid,
      isRequired: () => props.isRequired,
      isReadOnly: () => props.isReadOnly,
      validationBehavior: () => props.validationBehavior as any,
      onOpenChange: (isOpen: boolean, menuTrigger?: MenuTriggerAction) => emit('openchange', isOpen, menuTrigger),
      items: props.items,
      defaultItems: props.defaultItems as any,
      defaultFilter: props.defaultFilter || contains,
      nodes: buildNodes,
    } as any)

    const comboBoxAria = useComboBox<any, any>({
      id: () => props.id,
      label: hasLabel ? true : (attrs as any).label,
      'aria-label': () => props['aria-label'],
      'aria-labelledby': () => props['aria-labelledby'],
      'aria-describedby': () => props['aria-describedby'],
      isDisabled: () => props.isDisabled,
      isRequired: () => props.isRequired,
      isReadOnly: () => props.isReadOnly,
      isInvalid: () => props.isInvalid,
      name: resolvedFormValue() === 'text' ? props.name : undefined,
      form: () => props.form,
      placeholder: () => props.placeholder,
      validationBehavior: () => props.validationBehavior as any,
      allowsCustomValue: () => props.allowsCustomValue,
      selectionMode: () => props.selectionMode as any,
      defaultValue: () => props.defaultValue,
      defaultInputValue: () => props.defaultInputValue,
      inputValue: () => props.inputValue,
      menuTrigger: () => props.menuTrigger,
      autoFocus: () => false,
      inputRef,
      buttonRef: buttonRef as any,
      listBoxRef: listBoxRef as any,
      popoverRef: popoverRef as any,
      onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
      onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
      onKeyDown: (e: KeyboardEvent) => (attrs as any).onKeyDown?.(e),
    }, state as any)
    const {
      labelProps,
      inputProps,
      listBoxProps,
      buttonProps,
      valueProps,
      descriptionProps,
      errorMessageProps,
    } = comboBoxAria

    // Provide contexts for composition.
    provide(ComboBoxContextKey, props as any)
    provide(ComboBoxStateContextKey, state as any)
    provide(ComboBoxValueContextKey, live({...valueProps, placeholder: props.placeholder}, {...valueProps, placeholder: props.placeholder}) as any)

    const labelRef = ref<HTMLElement | null>(null)
    const labelCtx: any = live({...labelProps, elementType: 'label'}, labelProps)
    labelCtx.ref = labelRef
    provide(LabelContextKey, labelCtx as any)

    const buttonCtx: any = live({...buttonProps}, buttonProps)
    Object.defineProperties(buttonCtx, {
      isPressed: {get: () => state.isOpen.value, enumerable: true, configurable: true},
      isDisabled: {get: () => !!props.isDisabled || !!props.isReadOnly, enumerable: true, configurable: true},
    })
    buttonCtx.ref = (el: any) => { buttonRef.value = el }
    provide(ButtonContextKey, buttonCtx as any)

    const inputCtx: any = live({...inputProps}, inputProps)
    inputCtx.ref = (el: any) => { inputRef.value = el }
    provide(InputContextKey, inputCtx as any)

    provide(OverlayTriggerStateKey, state as any)
    // Position the popover against the input (Group is deferred, so no Group ref).
    const popoverTriggerRef = computed(() => inputRef.value)
    const popoverCtx: any = {
      triggerRef: popoverTriggerRef as any,
      trigger: 'ComboBox',
      scrollRef: listBoxRef as any,
      placement: 'bottom start',
      isNonModal: true,
      clearContexts: [LabelContextKey, ButtonContextKey, InputContextKey, TextContextKey],
    }
    Object.defineProperty(popoverCtx, 'aria-labelledby', {get: () => (listBoxProps as any)['aria-labelledby'], enumerable: true})
    provide(PopoverContextKey, popoverCtx as any)

    // ListBox needs context props (listBoxProps) and state.
    const listBoxCtx: any = live({...listBoxProps}, listBoxProps)
    Object.defineProperties(listBoxCtx, {
      items: {get: () => props.items ?? (props.defaultItems as any), enumerable: true, configurable: true},
      renderFromCollection: {value: true, enumerable: true},
    })
    listBoxCtx.ref = (el: any) => { listBoxRef.value = el }
    provide(ListBoxContextKey, listBoxCtx as any)
    provide(ListStateContextKey, state as any)
    provide(TextContextKey, {
      slots: {
        description: descriptionProps,
        errorMessage: errorMessageProps,
      },
    } as any)

    return () => {
      const isOpen = state.isOpen.value
      const renderProps: ComboBoxRenderProps = {
        isOpen,
        isDisabled: !!props.isDisabled,
        isInvalid: !!(comboBoxAria as any).isInvalid,
        isRequired: !!props.isRequired,
        isReadOnly: !!props.isReadOnly,
      }
      const children = typeof slots.default === 'function'
        ? slots.default({...renderProps, defaultChildren: null})
        : slots.default

      const hiddenInputs: VNode[] = []
      if (props.name && resolvedFormValue() === 'key') {
        const values: (Key | null)[] = Array.isArray(state.value.value) ? state.value.value : [state.value.value as any]
        if (values.length === 0) {
          // Always render a hidden input when a name is set so FormData sees an empty string when nothing is selected.
          hiddenInputs.push(h('input', {type: 'hidden', name: props.name, form: props.form, value: '', key: 0}))
        } else {
          values.forEach((value, i) => {
            hiddenInputs.push(h('input', {type: 'hidden', name: props.name, form: props.form, value: value ?? '', key: i}))
          })
        }
      }

      const domProps = mergeProps(
        attrs,
        {
          class: ['react-aria-ComboBox', (attrs as any).class].filter(Boolean),
          'data-focused': state.isFocused.value ? 'true' : undefined,
          'data-open': isOpen ? 'true' : undefined,
          'data-disabled': props.isDisabled ? 'true' : undefined,
          'data-readonly': props.isReadOnly ? 'true' : undefined,
          'data-invalid': (comboBoxAria as any).isInvalid ? 'true' : undefined,
          'data-required': props.isRequired ? 'true' : undefined,
        },
      )
      // User data-* stay on the outer ComboBox (attrs spread above).
      return h('div', domProps, [children, ...hiddenInputs])
    }
  },
})

export const ComboBoxValue = defineComponent({
  name: 'ComboBoxValue',
  inheritAttrs: false,
  props: {
    placeholder: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = (inject(ComboBoxValueContextKey, undefined) as any) || {}
    const state = inject(ComboBoxStateContextKey, null) as any
    return () => {
      if (!state) return null
      const items = state.selectedItems?.value ?? []
      const textValues = items.map((it: any) => it?.textValue ?? it?.value?.textValue ?? String(it?.key ?? ''))
      const selectedText = formatList(textValues)
      const isPlaceholder = items.length === 0
      const placeholder = props.placeholder ?? ctx.placeholder
      const defaultChildren = isPlaceholder ? placeholder : selectedText

      const renderProps: ComboBoxValueRenderProps<any> = {
        isPlaceholder,
        selectedItem: (items[0]?.value ?? null) as any,
        selectedItems: items.map((i: any) => (i?.value ?? null)),
        selectedText,
        state,
      }

      const content = slots.default ? slots.default(renderProps) : defaultChildren

      return h(
        'div',
        mergeProps(attrs, {
          id: ctx.id,
          class: ['react-aria-ComboBoxValue', (attrs as any).class].filter(Boolean),
          'data-placeholder': isPlaceholder ? 'true' : undefined,
        }),
        content,
      )
    }
  },
})

export {ComboBoxContextKey as ComboBoxContext, ComboBoxStateContextKey as ComboBoxStateContext, ComboBoxValueContextKey as ComboBoxValueContext}
export {Button, Input, Label, Text, Popover, ListBox, ListBoxItem, ListBoxSection, Collection}
