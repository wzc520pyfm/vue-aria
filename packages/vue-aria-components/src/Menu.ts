import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  isVNode,
  provide,
  ref,
  watch,
  cloneVNode,
  onBeforeUnmount,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'
import {mergeProps, toHeroDataAttrs, useFocusScope} from 'vue-aria'
import {useMenu} from 'vue-aria/useMenu'
import {useSubmenuTrigger} from 'vue-aria/useSubmenuTrigger'
import {useListState} from 'vue-stately/useListState'
import {useMenuTriggerState} from 'vue-stately/useMenuTriggerState'
import {useSubmenuTriggerState} from 'vue-stately/useSubmenuTriggerState'
import type {CollectionNode, Key} from 'vue-stately/useListState'
import type {Selection} from 'vue-stately/useMultipleSelectionState'
import {Collection as CollectionComponent} from './Collection'
import {
  MenuContextKey,
  MenuItemContextKey,
  MenuStateContextKey,
  OverlayTriggerStateKey,
  PopoverContextKey,
  RootMenuTriggerStateContextKey,
  SeparatorContextKey,
  SubmenuTriggerContextKey,
} from './context'
import {MenuItem} from './MenuItem'
import {MenuSection} from './MenuSection'
import {MenuTrigger} from './MenuTrigger'

export interface MenuProps {
  selectionMode?: 'none' | 'single' | 'multiple'
  selectionBehavior?: 'toggle' | 'replace'
  selectedKeys?: Selection
  defaultSelectedKeys?: Selection | Iterable<Key>
  disabledKeys?: Iterable<Key>
  disallowEmptySelection?: boolean
  autoFocus?: boolean | 'first' | 'last'
  shouldFocusWrap?: boolean
  shouldCloseOnSelect?: boolean
  escapeKeyBehavior?: 'clearSelection' | 'none'
  items?: any[]
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  renderEmptyState?: (props: any) => any
  onAction?: (key: Key) => void
  'data-slot'?: string
}

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

interface CollectionWalkResult {
  nodes: CollectionNode<any>[]
  rendered: VNode[]
}

function resolveVNodesFromSlot(vnode: VNode): VNode[] {
  const children = vnode.children
  if (typeof children === 'object' && children && !Array.isArray(children) && 'default' in (children as any)) {
    const result = (children as any).default?.() ?? []
    return flatten(result)
  }
  if (Array.isArray(children)) return flatten(children as any)
  return []
}

function ensureMenuItemId(vnode: VNode, resolvedKey: Key): VNode {
  const props: any = vnode.props || {}
  return props.id ? vnode : cloneVNode(vnode, {id: resolvedKey})
}

function buildCollection(
  vnodes: VNodeChild,
  parentKey: Key | null = null,
  level = 0,
  path: Array<Key | number> = [],
): CollectionWalkResult {
  const nodes: CollectionNode<any>[] = []
  const rendered: VNode[] = []
  let index = 0
  for (const vnode of flatten(vnodes as any)) {
    const name = getComponentName(vnode)
    const props: any = vnode.props || {}
    if (name === 'Collection') {
      const children = typeof vnode.children === 'object' && vnode.children && 'default' in (vnode.children as any)
        ? ((vnode.children as any).default as any)
        : (vnode.children as any)
      const items = props.items as any[] | undefined
      void props.dependencies
      const childVNodes = items && Array.isArray(items) && items.length > 0
        ? items.flatMap((item: any) => flatten(((children as any)?.({item})) ?? []))
        : flatten(typeof children === 'function' ? ((children as any)() ?? []) : children)
      const sub = buildCollection(childVNodes, parentKey, level, path)
      nodes.push(...sub.nodes)
      rendered.push(...sub.rendered)
      continue
    }
    if (name === 'SubmenuTrigger') {
      const subChildren = flatten(resolveVNodesFromSlot(vnode))
      const triggerVNode = subChildren.find((c) => getComponentName(c) === 'MenuItem') ?? subChildren[0]
      const popoverVNode = subChildren.find((c) => getComponentName(c) === 'Popover') ?? subChildren[1]
      if (triggerVNode) {
        const tProps: any = triggerVNode.props || {}
        const resolvedKey = (tProps.id ?? null) as Key | null ?? genKey('item', ...path, index)
        const triggerWithId = ensureMenuItemId(triggerVNode, resolvedKey)
        nodes.push({
          key: resolvedKey,
          parentKey,
          type: 'item',
          value: tProps.value ?? {key: resolvedKey},
          props: {...tProps, isDisabled: !!tProps.isDisabled},
          index: index++,
          level,
          hasChildNodes: false,
          textValue: tProps.textValue || getTextContent(flatten(resolveVNodesFromSlot(triggerVNode))),
          'aria-label': tProps['aria-label'],
        } as any)
        const cloned = cloneVNode(vnode, props)
        const slotChildren = [triggerWithId, popoverVNode].filter(Boolean)
        ;(cloned as any).children = {default: () => slotChildren}
        rendered.push(cloned)
      } else {
        rendered.push(vnode)
      }
      continue
    }
    if (name === 'MenuSection') {
      const key = (props.id ?? null) as Key | null
      const sectionKey = key ?? genKey('section', ...path, index)
      const childSlotVNodes = resolveVNodesFromSlot(vnode)
      const childPath = [...path, sectionKey]
      const childResult = buildCollection(childSlotVNodes, sectionKey, level + 1, childPath)
      const sectionVnode = cloneVNode(vnode, {id: sectionKey})
      const children = vnode.children
      const isScoped = typeof children === 'object' && children && !Array.isArray(children) && 'default' in (children as any)
      if (isScoped) {
        const originalSlot = (children as any).default
        ;(sectionVnode as any).children = {
          ...(children as any),
          default: (...args: any[]) => {
            const result = originalSlot(...args)
            // When using dynamic/render-prop sections, let buildCollection logic run by returning injected children.
            const arr = flatten(result)
            const injected = buildCollection(arr, sectionKey, level + 1, childPath)
            return injected.rendered
          },
        }
      } else {
        ;(sectionVnode as any).children = childResult.rendered
      }
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
      rendered.push(sectionVnode)
      continue
    }
    if (name === 'MenuItem') {
      const key = (props.id ?? null) as Key | null
      const resolvedKey = key ?? genKey('item', ...path, index)
      rendered.push(key ? vnode : cloneVNode(vnode, {id: resolvedKey}))
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
    rendered.push(vnode)
  }
  return {nodes, rendered}
}

function buildNodesFromDynamicItems(items: any[] | undefined, parentKey: Key | null = null, level = 0): CollectionNode<any>[] {
  const nodes: CollectionNode<any>[] = []
  if (!items) return nodes
  let index = 0
  for (const item of items) {
    const isSection = item && (item.type === 'section' || Array.isArray(item.items) || Array.isArray(item.children))
    if (isSection) {
      const key = item.key ?? item.id ?? genKey('section', index)
      const childItems = item.items ?? item.children ?? []
      const childNodes = buildNodesFromDynamicItems(childItems, key, level + 1)
      nodes.push({
        key,
        parentKey,
        type: 'section',
        value: item,
        props: {'aria-label': item['aria-label'] ?? item.ariaLabel, title: item.title ?? item.name},
        index: index++,
        level,
        hasChildNodes: true,
        childNodes,
        textValue: item.textValue ?? (typeof item.title === 'string' ? item.title : undefined),
        'aria-label': item['aria-label'] ?? item.ariaLabel,
      } as any)
    } else {
      const key = item?.key ?? item?.id ?? item ?? genKey('item', index)
      const textValue = item?.textValue ?? (typeof item === 'string' ? item : item?.name)
      nodes.push({
        key,
        parentKey,
        type: 'item',
        value: item,
        props: {isDisabled: !!item?.isDisabled},
        index: index++,
        level,
        hasChildNodes: false,
        textValue,
      } as any)
    }
  }
  return nodes
}

export const Menu = defineComponent({
  name: 'Menu',
  inheritAttrs: false,
  props: {
    selectionMode: {type: String as PropType<'none' | 'single' | 'multiple'>, default: 'none'},
    selectionBehavior: {type: String as PropType<'toggle' | 'replace'>, default: 'toggle'},
    selectedKeys: {type: null as unknown as PropType<Selection | undefined>, default: undefined},
    defaultSelectedKeys: {type: null as unknown as PropType<Selection | Iterable<Key> | undefined>, default: undefined},
    disabledKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
    disallowEmptySelection: {type: Boolean, default: false},
    autoFocus: {type: [Boolean, String] as PropType<boolean | 'first' | 'last'>, default: false},
    shouldFocusWrap: {type: Boolean, default: true},
    shouldCloseOnSelect: {type: Boolean, default: undefined},
    escapeKeyBehavior: {type: String as PropType<'clearSelection' | 'none'>, default: 'clearSelection'},
    items: {type: Array as PropType<any[]>, default: undefined},
    id: {type: String, default: undefined},
    'aria-label': {type: String, default: undefined},
    ariaLabel: {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    ariaLabelledby: {type: String, default: undefined},
    renderEmptyState: {type: Function as PropType<((props: any) => any) | undefined>, default: undefined},
    onAction: {type: Function as PropType<((key: Key) => void) | undefined>, default: undefined},
    'data-slot': {type: String, default: undefined},
  },
  emits: ['selectionchange', 'action'],
  setup(props, {slots, attrs, emit}) {
    const menuContext = inject(MenuContextKey, null) as any
    const rootStateCtx = inject(RootMenuTriggerStateContextKey, null)
    const fallbackRootState = rootStateCtx ? null : useMenuTriggerState({})
    const rootState = rootStateCtx ?? fallbackRootState!

    const menuRef = ref<HTMLElement | null>(null)

    const nodes = computed(() => {
      if (props.items) return buildNodesFromDynamicItems(props.items)
      const rendered = slots.default?.() ?? []
      const result = buildCollection(rendered, null, 0)
      return result.nodes
    })

    const state = useListState({
      nodes: () => nodes.value ?? [],
      selectionMode: () => props.selectionMode,
      selectionBehavior: () => props.selectionBehavior,
      selectedKeys: () => props.selectedKeys,
      defaultSelectedKeys: () => props.defaultSelectedKeys as any,
      disabledKeys: () => props.disabledKeys,
      disallowEmptySelection: () => props.disallowEmptySelection,
      onSelectionChange: (sel: Selection) => emit('selectionchange', sel),
    } as any)

    provide(MenuStateContextKey, state as any)
    provide(SeparatorContextKey, {elementType: 'div'})
    if (!rootStateCtx) provide(RootMenuTriggerStateContextKey, rootState as any)

    // Submenu trigger context for items rendered inside this menu.
    provide(SubmenuTriggerContextKey, {
      parentMenuRef: menuRef,
      shouldUseVirtualFocus: !!menuContext?.shouldUseVirtualFocus,
    } as any)

    const ariaLabelledby = computed(() => props['aria-labelledby'] ?? menuContext?.['aria-labelledby'])
    const autoFocus = computed(() => {
      const ctxAuto = menuContext?.autoFocus
      if (ctxAuto !== undefined) return ctxAuto
      return props.autoFocus
    })
    const onClose = () => {
      if (menuContext?.onClose) menuContext.onClose()
      else rootState?.close?.()
    }

    // Live autoFocus for submenu mount timing.
    const {menuProps} = useMenu({
      id: props.id ?? menuContext?.id,
      'aria-label': props['aria-label'],
      'aria-labelledby': ariaLabelledby.value,
      selectionMode: props.selectionMode,
      shouldFocusWrap: props.shouldFocusWrap,
      shouldCloseOnSelect: props.shouldCloseOnSelect,
      escapeKeyBehavior: props.escapeKeyBehavior,
      get autoFocus() { return autoFocus.value as any },
      shouldSelectOnPressUp: menuContext?.shouldSelectOnPressUp,
      onAction: (key: Key) => { props.onAction?.(key); emit('action', key) },
      onClose,
    } as any, state as any, menuRef)

    // Submenu close-on-parent-focus is handled by useSubmenuTrigger's focusin listener
    // on the provided parentMenuRef (SubmenuTriggerContext). Keep Menu free of duplicate handling.

    useFocusScope({
      ref: menuRef,
      contain: false,
      autoFocus: false,
      restoreFocus: false,
      isActive: () => true,
    })

    const renderEmptyState = () => {
      if (state.collection.value.size !== 0) return null
      if (slots.empty) return slots.empty({})
      if (props.renderEmptyState) return props.renderEmptyState({})
      return null
    }

    const renderDynamic = (): VNode[] => {
      const items = props.items ?? []
      const out: VNode[] = []
      for (const item of items) {
        const isSection = item && (item.type === 'section' || Array.isArray(item.items) || Array.isArray(item.children))
        if (isSection) {
          const key = item.key ?? item.id ?? genKey('section', items.indexOf(item))
          const childItems = item.items ?? item.children ?? []
          out.push(h(MenuSection as any, {id: key, 'aria-label': item['aria-label'] ?? item.ariaLabel, title: item.title ?? item.name}, {
            default: () => childItems.map((child: any) => slots.default ? slots.default({item: child}) : null),
            ...(item.title || item.name ? {header: () => item.title ?? item.name} : {}),
          }))
        } else {
          const vnode = slots.default ? flatten(slots.default({item}) as unknown as VNodeChild)[0] ?? null : null
          const vnodeKey = item?.key ?? item?.id ?? item ?? genKey('item', items.indexOf(item))
          if (vnode) {
            const vnodeWithKey = (vnode as any)?.props?.id ? vnode : cloneVNode(vnode, {id: vnodeKey})
            out.push(vnodeWithKey)
          }
        }
      }
      return out
    }

    const renderChildren = (): VNode[] => {
      if (props.items) return renderDynamic()
      const result = buildCollection(slots.default?.() ?? [], null, 0)
      return result.rendered
    }

    return () => {
      const isEmpty = state.collection.value.size === 0
      const dataSlot = (attrs as any)['data-slot'] ?? props['data-slot']
      const domProps = mergeProps(attrs, menuProps, {
        ref: (el: any) => {
          menuRef.value = el
          if (menuContext && 'ref' in menuContext) {
            const r = menuContext.ref
            if (r && typeof r === 'object' && 'value' in r) r.value = el
            else menuContext.ref = el
          }
        },
        class: ['react-aria-Menu', (attrs as any).class].filter(Boolean),
        ...(props.id || menuContext?.id ? {id: props.id ?? menuContext?.id} : {}),
        ...(props['aria-label'] ? {'aria-label': props['aria-label']} : {}),
        ...(ariaLabelledby.value ? {'aria-labelledby': ariaLabelledby.value} : {}),
        ...toHeroDataAttrs({slot: dataSlot}),
        ...(isEmpty ? {'data-empty': 'true'} : {}),
      })
      const al = (props as any)['aria-label'] ?? (props as any).ariaLabel ?? (attrs as any)['aria-label'] ?? (attrs as any).ariaLabel
      const alb = ariaLabelledby.value ?? (props as any)['aria-labelledby'] ?? (props as any).ariaLabelledby ?? (attrs as any)['aria-labelledby'] ?? (attrs as any).ariaLabelledby
      if (al) (domProps as any)['aria-label'] = al
      if (alb) (domProps as any)['aria-labelledby'] = alb
      // Merge submenu/menu context keyboard handlers (e.g. submenu Escape/Arrow) so they run.
      if (menuContext?.onKeyDown) {
        const prev = (domProps as any).onKeydown || (domProps as any).onKeyDown
        const chain = (e: KeyboardEvent) => {
          menuContext.onKeyDown(e)
          if (!e.defaultPrevented && typeof prev === 'function') prev(e)
        }
        Object.defineProperty(domProps, 'onKeydown', {value: chain, enumerable: true, configurable: true, writable: true})
        Object.defineProperty(domProps, 'onKeyDown', {value: chain, enumerable: true, configurable: true, writable: true})
      }
      const children: VNode[] = []
      if (isEmpty) {
        const empty = renderEmptyState()
        if (empty) children.push(empty as any)
      } else {
        children.push(...renderChildren())
      }
      return h('div', domProps, children)
    }
  },
})

export interface SubmenuTriggerProps {
  delay?: number
}

export const SubmenuTrigger = defineComponent({
  name: 'SubmenuTrigger',
  inheritAttrs: false,
  props: {
    delay: {type: Number, default: 200},
  },
  setup(props, {slots}) {
    const parentState = inject(MenuStateContextKey, null)
    const rootState = inject(RootMenuTriggerStateContextKey, null)
    const submenuCtx = inject(SubmenuTriggerContextKey, null) as any
    if (!parentState || !rootState || !submenuCtx) {
      throw new Error('SubmenuTrigger must be used within a Menu')
    }

    const itemRef = ref<Element | null>(null)
    const submenuRef = ref<HTMLElement | null>(null)
    const triggerKey = ref<Key | null>(null)
    const triggerDisabled = ref(false)
    const submenuState = useSubmenuTriggerState({triggerKey: () => triggerKey.value}, rootState as any)

    const {submenuTriggerProps, submenuProps, popoverProps} = useSubmenuTrigger(
      {
        parentMenuRef: submenuCtx.parentMenuRef,
        submenuRef,
        delay: () => props.delay,
        type: 'menu',
        isDisabled: () => triggerDisabled.value,
        shouldUseVirtualFocus: submenuCtx.shouldUseVirtualFocus,
      } as any,
      submenuState as any,
      itemRef as any,
    )

    // Provide contexts for submenu content (popover/menu). MenuItemContext for the trigger is provided
    // by a scoped wrapper so it doesn't leak into submenu items.
    const menuCtx: any = {}
    for (const [k, desc] of Object.entries(Object.getOwnPropertyDescriptors(submenuProps))) {
      Object.defineProperty(menuCtx, k, desc)
    }
    menuCtx.ref = submenuRef
    provide(MenuContextKey, menuCtx)

    provide(OverlayTriggerStateKey, submenuState as any)
    // Keep providing existing RootMenuTriggerState (do not replace).
    provide(RootMenuTriggerStateContextKey, rootState as any)

    const popoverCtx: any = {
      trigger: 'SubmenuTrigger',
      triggerRef: itemRef,
      placement: 'end top',
    }
    // aria-labelledby is a getter on submenuProps
    Object.defineProperty(popoverCtx, 'aria-labelledby', {
      get: () => (submenuProps as any)['aria-labelledby'],
      enumerable: true,
      configurable: true,
    })
    for (const [k, desc] of Object.entries(Object.getOwnPropertyDescriptors(popoverProps))) {
      Object.defineProperty(popoverCtx, k, desc)
    }
    provide(PopoverContextKey, popoverCtx as any)

    const menuItemCtx: any = {}
    for (const [k, desc] of Object.entries(Object.getOwnPropertyDescriptors(submenuTriggerProps))) {
      Object.defineProperty(menuItemCtx, k, desc)
    }
    menuItemCtx.onAction = undefined
    menuItemCtx.ref = itemRef

    const TriggerItemProvider = defineComponent({
      name: 'SubmenuTriggerItemProvider',
      setup(_, {slots}) {
        provide(MenuItemContextKey, menuItemCtx)
        return () => slots.default?.()
      },
    })

    return () => {
      const children = flatten(slots.default?.() as any)
      const triggerVNode = children.find((c) => getComponentName(c) === 'MenuItem') ?? children[0]
      const popoverVNode = children.find((c) => getComponentName(c) === 'Popover') ?? children[1]
      triggerKey.value = ((triggerVNode as any)?.props?.id ?? null) as Key | null
      triggerDisabled.value = !!((triggerVNode as any)?.props?.isDisabled)
      return [h(TriggerItemProvider, null, {default: () => triggerVNode}), popoverVNode as any].filter(Boolean)
    }
  },
})

export {MenuItem, MenuSection, MenuTrigger, CollectionComponent as Collection}
