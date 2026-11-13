import {
  Fragment,
  cloneVNode,
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
import {mergeProps, toHeroDataAttrs} from 'vue-aria'
import {HiddenSelect} from 'vue-aria/useSelect'
import {useSelect} from 'vue-aria/useSelect'
import {useSelectState} from 'vue-stately/useSelectState'
import type {CollectionNode, Key} from 'vue-stately/useListState'
import type {Selection} from 'vue-stately/useMultipleSelectionState'
import {Button} from './Button'
import {Label} from './Label'
import {Text} from './Text'
import {Popover} from './Popover'
import {ListBox, ListBoxItem, ListBoxSection, Collection} from './ListBox'
import {
  ButtonContextKey,
  LabelContextKey,
  ListBoxContextKey,
  ListStateContextKey,
  OverlayTriggerStateKey,
  PopoverContextKey,
  SelectContextKey,
  SelectStateContextKey,
  SelectValueContextKey,
  TextContextKey,
  TriggerRefKey,
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

interface WalkResult { nodes: CollectionNode<any>[] }

function detectLabel(vnodes: Array<VNode>): boolean {
  // Only top-level composition counts: a <Label> directly inside the Select.
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
): WalkResult {
  const nodes: CollectionNode<any>[] = []
  let index = 0
  for (const vnode of flatten(vnodes as any)) {
    const name = getComponentName(vnode)
    const props: any = vnode.props || {}
    if (name === 'Popover' || name === 'Dialog' || name === 'Modal' || name === 'ModalOverlay') {
      // Walk into unmounted/overlay children to build collection (Select ListBox lives in Popover).
      const childVNodes = resolveVNodesFromSlot(vnode)
      const sub = buildCollectionFromVNodes(childVNodes, parentKey, level, path)
      nodes.push(...sub.nodes)
      continue
    }
    if (name === 'Collection') {
      const children = typeof vnode.children === 'object' && vnode.children && 'default' in (vnode.children as any)
        ? ((vnode.children as any).default as any)
        : (vnode.children as any)
      const items = props.items as any[] | undefined
      const childVNodes = items && Array.isArray(items) && items.length > 0
        ? items.flatMap((item: any) => flatten(((children as any)?.({item})) ?? []))
        : flatten(typeof children === 'function' ? ((children as any)() ?? []) : children)
      const sub = buildCollectionFromVNodes(childVNodes, parentKey, level, path)
      nodes.push(...sub.nodes)
      continue
    }
    if (name === 'ListBoxSection' || name === 'MenuSection') {
      const key = (props.id ?? null) as Key | null
      const sectionKey = key ?? genKey('section', ...path, index)
      const childSlotVNodes = resolveVNodesFromSlot(vnode)
      const childPath = [...path, sectionKey]
      const childResult = buildCollectionFromVNodes(childSlotVNodes, sectionKey, level + 1, childPath)
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
      const sub = buildCollectionFromVNodes(childVNodes, parentKey, level, path)
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

export interface SelectProps<T = any, M extends 'single' | 'multiple' = 'single'> {
  selectionMode?: M
  value?: any
  defaultValue?: any
  onChange?: (value: any) => void
  selectedKey?: Key | null
  defaultSelectedKey?: Key | null
  onSelectionChange?: (key: Key | null) => void
  isOpen?: boolean
  defaultOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  shouldCloseOnSelect?: boolean
  allowsEmptyCollection?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  autoFocus?: boolean
  name?: string
  form?: string
  autoComplete?: string
  placeholder?: string
  validationBehavior?: 'aria' | 'native'
  disabledKeys?: Iterable<Key>
  items?: any[]
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  label?: any
  description?: any
  errorMessage?: any
}

export interface SelectValueRenderProps<T> {
  isPlaceholder: boolean
  selectedItem: T | null
  selectedItems: (T | null)[]
  selectedText: string
  state: any
}

export interface SelectValueProps<T = any> {
  className?: string | ((values: SelectValueRenderProps<T>) => string)
}
export interface SelectRenderProps {
  isFocused: boolean
  isFocusVisible: boolean
  isDisabled: boolean
  isOpen: boolean
  isInvalid: boolean
  isRequired: boolean
}

export const Select = defineComponent({
  name: 'Select',
  inheritAttrs: false,
  props: {
    selectionMode: {type: String as PropType<'single' | 'multiple'>, default: 'single'},
    value: {type: null as any, default: undefined},
    defaultValue: {type: null as any, default: undefined},
    selectedKey: {type: null as any, default: undefined},
    defaultSelectedKey: {type: null as any, default: undefined},
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    shouldCloseOnSelect: {type: Boolean, default: undefined},
    allowsEmptyCollection: {type: Boolean, default: undefined},
    isDisabled: {type: Boolean, default: false},
    isInvalid: {type: Boolean, default: false},
    isRequired: {type: Boolean, default: false},
    autoFocus: {type: Boolean, default: false},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    autoComplete: {type: String, default: undefined},
    placeholder: {type: String, default: undefined},
    validationBehavior: {type: String as PropType<'aria' | 'native'>, default: 'native'},
    disabledKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
    items: {type: Array as PropType<any[]>, default: undefined},
    id: {type: String, default: undefined},
    'aria-label': {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
  },
  emits: ['change', 'selectionchange', 'openchange'],
  setup(props, {slots, attrs, emit}) {
    const triggerRef = ref<HTMLElement | null>(null)
    const labelRef = ref<HTMLElement | null>(null)
    const scrollRef = ref<HTMLElement | null>(null)
    const rootRef = ref<HTMLElement | null>(null)
    const focusWithin = ref(false)
    const focusVisible = ref(false)
    let modality: 'pointer' | 'keyboard' | 'virtual' = 'virtual'
    if (typeof window !== 'undefined') {
      const pd = () => { modality = 'pointer' }
      const kd = (e: KeyboardEvent) => { if (!e.metaKey && !e.altKey && !e.ctrlKey) modality = 'keyboard' }
      window.addEventListener('pointerdown', pd, true)
      window.addEventListener('keydown', kd, true)
    }
    const focusProps = {
      onFocusin: () => { focusWithin.value = true; focusVisible.value = modality !== 'pointer' },
      onFocusout: (e: FocusEvent) => {
        const current = rootRef.value
        const related = e.relatedTarget as Node | null
        if (current && related && current.contains(related)) return
        focusWithin.value = false
        focusVisible.value = false
      },
    }

    const buildNodes = () => {
      if (props.items) {
        // dynamic items handled via ListBox items; still allow sections/items shape
        const nodes: CollectionNode<any>[] = []
        let index = 0
        for (const item of props.items) {
          const isSection = item && (item.type === 'section' || Array.isArray(item.items) || Array.isArray(item.children))
          if (isSection) {
            const key = item.key ?? item.id ?? genKey('section', index)
            const childItems = item.items ?? item.children ?? []
            const childNodes: CollectionNode<any>[] = childItems.map((child: any, ci: number) => {
              const ck = child?.key ?? child?.id ?? child ?? genKey('item', key, ci)
              return {key: ck, parentKey: key, type: 'item', value: child, props: {isDisabled: !!child?.isDisabled}, index: ci, level: 1, hasChildNodes: false, textValue: child?.textValue ?? (typeof child === 'string' ? child : child?.name)} as any
            })
            nodes.push({key, parentKey: null, type: 'section', value: item, props: {title: item.title ?? item.name, 'aria-label': item['aria-label'] ?? item.ariaLabel}, index: index++, level: 0, hasChildNodes: true, childNodes, textValue: item.textValue ?? item.title ?? item.name} as any)
          } else {
            const key = item?.key ?? item?.id ?? item ?? genKey('item', index)
            nodes.push({key, parentKey: null, type: 'item', value: item, props: {isDisabled: !!item?.isDisabled}, index: index++, level: 0, hasChildNodes: false, textValue: item?.textValue ?? (typeof item === 'string' ? item : item?.name)} as any)
          }
        }
        return nodes
      }
      const children = slots.default ? slots.default({
        isOpen: false, isDisabled: !!props.isDisabled, isInvalid: !!props.isInvalid, isRequired: !!props.isRequired,
        isFocused: false, isFocusVisible: false, defaultChildren: null,
      }) : []
      return buildCollectionFromVNodes(children as any).nodes
    }

    // Detect a top-level <Label> in the default slot; the field needs to know
    // a label exists so aria-labelledby on the trigger includes the label id.
    const hasLabel = (() => {
      try {
        if (!slots.default) return false
        const out = slots.default({
          isOpen: false, isDisabled: !!props.isDisabled, isInvalid: !!props.isInvalid,
          isRequired: !!props.isRequired, isFocused: false, isFocusVisible: false, defaultChildren: null,
        }) as any
        return detectLabel(flatten(out))
      } catch {
        return false
      }
    })()

    const state = useSelectState<any, any>({
      selectionMode: () => props.selectionMode as any,
      value: () => props.value,
      defaultValue: () => props.defaultValue,
      onChange: (value: any) => emit('change', value),
      selectedKey: () => props.selectedKey,
      defaultSelectedKey: () => props.defaultSelectedKey,
      onSelectionChange: (key: Key | null) => emit('selectionchange', key),
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      onOpenChange: (isOpen: boolean) => emit('openchange', isOpen),
      shouldCloseOnSelect: () => props.shouldCloseOnSelect,
      allowsEmptyCollection: () => props.allowsEmptyCollection,
      disabledKeys: () => props.disabledKeys,
      isInvalid: () => props.isInvalid,
      isRequired: () => props.isRequired,
      validationBehavior: () => props.validationBehavior,
      autoFocus: () => props.autoFocus,
      nodes: buildNodes,
    } as any)

    const {
      labelProps,
      triggerProps,
      valueProps,
      menuProps,
      descriptionProps,
      errorMessageProps,
      hiddenSelectProps,
      isInvalid,
    } = useSelect<any, any>(
      {
        id: () => props.id,
        label: hasLabel ? true : (attrs as any).label,
        'aria-label': () => props['aria-label'],
        'aria-labelledby': () => props['aria-labelledby'],
        description: (attrs as any).description,
        errorMessage: (attrs as any).errorMessage,
        isDisabled: () => props.isDisabled,
        isRequired: () => props.isRequired,
        isInvalid: () => props.isInvalid,
        name: () => props.name,
        form: () => props.form,
        autoComplete: () => props.autoComplete,
        autoFocus: () => props.autoFocus,
        validationBehavior: () => props.validationBehavior ?? 'native',
        onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
        onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
        onFocusChange: (v: boolean) => (attrs as any).onFocusChange?.(v),
      } as any,
      state as any,
      triggerRef as any,
    )

    // Provide contexts for composition.
    provide(SelectContextKey, props as any)
    provide(SelectStateContextKey, state as any)
    provide(SelectValueContextKey, {...valueProps, placeholder: props.placeholder} as any)
    const labelCtx: any = { ...labelProps, elementType: 'span' }
    labelCtx.ref = labelRef
    provide(LabelContextKey, labelCtx as any)
    const buttonCtx: any = { ...triggerProps }
    // Keep the trigger aria attributes live (they derive from open state).
    for (const key of ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-labelledby', 'onKeyDown', 'onKeyUp', 'onKeydown', 'onKeyup', 'onFocus', 'onBlur', 'onPointerDown', 'onPointerdown', 'onPress', 'type', 'id'] as const) {
      Object.defineProperty(buttonCtx, key, {
        get: () => (triggerProps as any)[key],
        enumerable: true,
        configurable: true,
      })
    }
    Object.defineProperties(buttonCtx, {
      isPressed: { get: () => state.isOpen.value, enumerable: true },
      isDisabled: { get: () => !!props.isDisabled, enumerable: true },
      autoFocus: { get: () => !!props.autoFocus, enumerable: true },
    })
    buttonCtx.ref = (el: any) => { triggerRef.value = el }
    provide(ButtonContextKey, buttonCtx as any)
    provide(OverlayTriggerStateKey, state as any)
    provide(TriggerRefKey, triggerRef as any)
    const popoverCtx: any = {
      triggerRef: triggerRef as any,
      trigger: 'Select',
      scrollRef: scrollRef as any,
      placement: 'bottom start',
      clearContexts: [LabelContextKey, ButtonContextKey, TextContextKey],
    }
    Object.defineProperty(popoverCtx, 'aria-labelledby', { get: () => (menuProps as any)['aria-labelledby'], enumerable: true })
    provide(PopoverContextKey, popoverCtx as any)
    // ListBox needs context props (menuProps) and state.
    const listBoxCtx: any = { ...menuProps }
    for (const key of ['autoFocus', 'aria-labelledby', 'shouldSelectOnPressUp', 'shouldFocusOnHover', 'disallowEmptySelection', 'onKeyDown', 'onKeydown', 'onKeyUp', 'onKeyup', 'onAction', 'onFocus', 'onBlur'] as const) {
      Object.defineProperty(listBoxCtx, key, {
        get: () => (menuProps as any)[key],
        enumerable: true,
        configurable: true,
      })
    }
    listBoxCtx.ref = (el: any) => { scrollRef.value = el }
    provide(ListBoxContextKey, listBoxCtx as any)
    provide(ListStateContextKey, state as any)
    provide(TextContextKey, {
      slots: {
        description: descriptionProps,
        errorMessage: errorMessageProps,
      },
    } as any)

    return () => {
      const renderProps = {
        isFocused: state.isFocused.value || focusWithin.value,
        isFocusVisible: focusVisible.value,
        isDisabled: !!props.isDisabled,
        isOpen: state.isOpen.value,
        isInvalid: !!(isInvalid ?? props.isInvalid),
        isRequired: !!props.isRequired,
      }
      const children = typeof slots.default === 'function'
        ? slots.default({...renderProps, defaultChildren: null})
        : slots.default

      const domProps = mergeProps(
        attrs,
        focusProps,
        {
          ref: (el: any) => { rootRef.value = el },
          class: ['react-aria-Select', (attrs as any).class].filter(Boolean),
          'data-focused': (state.isFocused.value || focusWithin.value) ? 'true' : undefined,
          'data-focus-visible': focusVisible.value ? 'true' : undefined,
          'data-open': state.isOpen.value ? 'true' : undefined,
          'data-disabled': props.isDisabled ? 'true' : undefined,
          'data-invalid': (isInvalid ?? props.isInvalid) ? 'true' : undefined,
          'data-required': props.isRequired ? 'true' : undefined,
        },
      )
      // Ensure user data-* on attrs stay on outer Select (we spread attrs on root) - ok.
      return h('div', domProps, [
        children,
        h(HiddenSelect as any, {
          ...hiddenSelectProps,
          autoComplete: props.autoComplete,
          name: props.name,
          form: props.form,
          isDisabled: props.isDisabled,
          isRequired: props.isRequired,
          validationBehavior: props.validationBehavior ?? 'native',
        }),
      ])
    }
  },
})

export const SelectValue = defineComponent({
  name: 'SelectValue',
  inheritAttrs: false,
  props: {
    placeholder: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = (inject(SelectValueContextKey, undefined) as any) || {}
    const state = inject(SelectStateContextKey, null) as any
    return () => {
      if (!state) return null
      const items = state.selectedItems?.value ?? []
      const textValues = items.map((it: any) => it?.textValue ?? (it?.value?.textValue) ?? String(it?.key ?? ''))
      const isMultiple = state.selectionManager?.selectionMode === 'multiple'
      const selectedText = isMultiple ? formatList(textValues) : (textValues[0] ?? '')
      const isPlaceholder = items.length === 0
      const placeholder = props.placeholder ?? ctx.placeholder ?? 'Select an item'
      let defaultChildren: any = null
      if (isPlaceholder) {
        defaultChildren = placeholder
      } else if (isMultiple) {
        defaultChildren = selectedText
      } else {
        // Prefer rendered item content if available from node/value, else text.
        const first = items[0]
        defaultChildren = first?.rendered ?? first?.props?.children ?? first?.textValue ?? selectedText
      }

      const renderProps: SelectValueRenderProps<any> = {
        isPlaceholder,
        selectedItem: (items[0]?.value ?? null) as any,
        selectedItems: items.map((i: any) => (i?.value ?? null)),
        selectedText,
        state,
      }

      let content: any
      if (slots.default) {
        content = slots.default(renderProps)
      } else {
        content = defaultChildren
      }

      return h(
        'span',
        mergeProps(attrs, {
          id: ctx.id,
          class: ['react-aria-SelectValue', (attrs as any).class].filter(Boolean),
          'data-placeholder': isPlaceholder ? 'true' : undefined,
        }),
        content,
      )
    }
  },
})

export {SelectContextKey as SelectContext, SelectStateContextKey as SelectStateContext, SelectValueContextKey as SelectValueContext}
export {Button, Label, Text, Popover, ListBox, ListBoxItem, ListBoxSection, Collection}
