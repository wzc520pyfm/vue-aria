import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  isVNode,
  provide,
  ref,
  cloneVNode,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'
import {mergeProps, toHeroDataAttrs, useFocusScope} from 'vue-aria'
import {useMenu} from 'vue-aria/useMenu'
import {useListState} from 'vue-stately/useListState'
import {useMenuTriggerState} from 'vue-stately/useMenuTriggerState'
import type {CollectionNode, Key} from 'vue-stately/useListState'
import type {Selection} from 'vue-stately/useMultipleSelectionState'
import {Collection as CollectionComponent} from './Collection'
import {
  MenuContextKey,
  MenuStateContextKey,
  RootMenuTriggerStateContextKey,
  SeparatorContextKey,
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

function injectGeneratedChildIds(vnodes: VNode[], path: Array<Key | number>): VNode[] {
  const injected: VNode[] = []
  let childIndex = 0
  for (const vnode of vnodes) {
    const name = getComponentName(vnode)
    const props: any = vnode.props || {}
    if (name === 'MenuItem') {
      const key = (props.id ?? null) as Key | null
      const resolvedKey = key ?? genKey('item', ...path, childIndex)
      childIndex += 1
      injected.push(key ? vnode : cloneVNode(vnode, {id: resolvedKey}))
    } else if (name === 'MenuSection') {
      const key = (props.id ?? null) as Key | null
      const sectionKey = key ?? genKey('section', ...path, childIndex)
      childIndex += 1
      const nestedVnode = cloneVNode(vnode, {id: sectionKey})
      const nestedChildren = resolveVNodesFromSlot(vnode)
      ;(nestedVnode as any).children = injectGeneratedChildIds(nestedChildren, [...path, sectionKey])
      injected.push(nestedVnode)
    } else {
      injected.push(vnode)
    }
  }
  return injected
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
            const arr = flatten(result)
            let i = 0
            return arr.map((child: any) => {
              const childName = getComponentName(child)
              const childProps = child?.props || {}
              if (childName === 'MenuItem') {
                const childKey = (childProps.id ?? null) ?? genKey('item', ...childPath, i)
                i += 1
                return childProps.id ? child : cloneVNode(child, {id: childKey})
              }
              return child
            })
          },
        }
      } else {
        ;(sectionVnode as any).children = injectGeneratedChildIds(childSlotVNodes, childPath)
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
    const menuContext = inject(MenuContextKey, null)
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

    const ariaLabelledby = computed(() => props['aria-labelledby'] ?? (menuContext as any)?.['aria-labelledby'])
    const autoFocus = computed(() => {
      const ctxAuto = (menuContext as any)?.autoFocus
      if (ctxAuto !== undefined) return ctxAuto
      return props.autoFocus
    })
    const onClose = () => {
      if ((menuContext as any)?.onClose) (menuContext as any).onClose()
      else rootState?.close?.()
    }

    const {menuProps} = useMenu({
      id: props.id ?? (menuContext as any)?.id,
      'aria-label': props['aria-label'],
      'aria-labelledby': ariaLabelledby.value,
      selectionMode: props.selectionMode,
      shouldFocusWrap: props.shouldFocusWrap,
      shouldCloseOnSelect: props.shouldCloseOnSelect,
      escapeKeyBehavior: props.escapeKeyBehavior,
      autoFocus: autoFocus.value as any,
      shouldSelectOnPressUp: (menuContext as any)?.shouldSelectOnPressUp,
      onAction: (key: Key) => { props.onAction?.(key); emit('action', key) },
      onClose,
    } as any, state as any, menuRef)

    // Close-on-select for Enter and other interactions is handled by useMenuItem,
    // so menu-level key handling must not force-close on Enter.

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
        ref: (el: any) => { menuRef.value = el },
        class: ['react-aria-Menu', (attrs as any).class].filter(Boolean),
        ...(props.id || (menuContext as any)?.id ? {id: props.id ?? (menuContext as any)?.id} : {}),
        ...(props['aria-label'] ? {'aria-label': props['aria-label']} : {}),
        ...(ariaLabelledby.value ? {'aria-labelledby': ariaLabelledby.value} : {}),
        ...toHeroDataAttrs({slot: dataSlot}),
        ...(isEmpty ? {'data-empty': 'true'} : {}),
      })
      const al = (props as any)['aria-label'] ?? (props as any).ariaLabel ?? (attrs as any)['aria-label'] ?? (attrs as any).ariaLabel
      const alb = ariaLabelledby.value ?? (props as any)['aria-labelledby'] ?? (props as any).ariaLabelledby ?? (attrs as any)['aria-labelledby'] ?? (attrs as any).ariaLabelledby
      if (al) (domProps as any)['aria-label'] = al
      if (alb) (domProps as any)['aria-labelledby'] = alb
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

export {MenuItem, MenuSection, MenuTrigger, CollectionComponent as Collection}
