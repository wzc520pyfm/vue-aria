import {defineComponent, h, isVNode, provide, type PropType, type VNode} from 'vue'
import {useMenuSection} from 'vue-aria/useMenu'
import type {Key} from 'vue-stately/useListState'
import {HeaderContextKey} from './context'

export interface MenuSectionProps {
  id?: Key
  value?: unknown
  'aria-label'?: string
  title?: unknown
}

function flatten(v: any): VNode[] {
  if (v == null || typeof v === 'boolean') return []
  if (Array.isArray(v)) return v.flatMap(flatten)
  if (isVNode(v)) {
    if ((v.type as any) === Symbol.for('v-fgt')) return flatten(v.children as any)
    return [v]
  }
  return []
}

function isHeaderVNode(v: VNode) {
  const t: any = v.type
  return t && typeof t === 'object' && (t.name === 'Header' || t.__name === 'Header')
}

export const MenuSection = defineComponent({
  name: 'MenuSection',
  inheritAttrs: false,
  props: {
    id: {type: null as unknown as PropType<Key | undefined>, default: undefined},
    value: {type: null, default: undefined},
    'aria-label': {type: String, default: undefined},
    ariaLabel: {type: String, default: undefined},
    title: {type: null, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const initialAriaLabel = props['aria-label'] ?? (props as any).ariaLabel ?? (attrs as any)['aria-label'] ?? (attrs as any).ariaLabel
    // Always create heading props so a Header component in the default slot can
    // consume an id/role from context if present.
    const {headingProps} = useMenuSection({
      heading: true,
      'aria-label': initialAriaLabel,
    })
    provide(HeaderContextKey, headingProps)

    return () => {
      const ariaLabelNow = props['aria-label'] ?? (props as any).ariaLabel ?? (attrs as any)['aria-label'] ?? (attrs as any).ariaLabel ?? initialAriaLabel
      const hasNamedHeader = !!(slots.header || slots.title || props.title != null)
      const defaultNodes = flatten(slots.default?.() ?? [])
      const headerInDefault = defaultNodes.some(isHeaderVNode)
      const hasHeading = hasNamedHeader || headerInDefault

      const sectionChildren: VNode[] = []
      if (hasNamedHeader) {
        const rawHeader = slots.header?.() ?? (slots.title?.() ?? (props.title != null ? [String(props.title)] : null))
        const headerVNodes: VNode[] = rawHeader ? (Array.isArray(rawHeader) ? (rawHeader as VNode[]) : [rawHeader as VNode]) : []
        const containsHeaderComponent = headerVNodes.some((v) => isVNode(v) && isHeaderVNode(v as VNode))
        if (containsHeaderComponent) sectionChildren.push(...headerVNodes)
        else if (headerVNodes.length > 0) {
          sectionChildren.push(h('header', {class: 'react-aria-Header', ...headingProps, 'data-slot': 'header'}, headerVNodes as any))
        }
        sectionChildren.push(...defaultNodes)
      } else {
        sectionChildren.push(...defaultNodes)
      }

      const labelledBy = hasHeading ? (headingProps as any).id : undefined
      return h('section', {
        ...attrs,
        role: 'group',
        ...(ariaLabelNow ? {'aria-label': ariaLabelNow} : {}),
        ...(labelledBy ? {'aria-labelledby': labelledBy} : {}),
        class: ['react-aria-MenuSection', (attrs as any).class].filter(Boolean),
        'data-slot': (attrs as any)['data-slot'] ?? 'menu-section',
      }, sectionChildren)
    }
  },
})
