import {defineComponent, h, provide, isVNode, type VNode} from 'vue'
import {useListBoxSection} from 'vue-aria/useListBox'
import type {Key} from 'vue-stately/useListState'
import {HeaderContextKey, ListBoxSectionContextKey} from './context'

export interface ListBoxSectionProps {
  id?: Key
  value?: unknown
  'aria-label'?: string
  title?: unknown
}

export const ListBoxSection = defineComponent({
  name: 'ListBoxSection',
  inheritAttrs: false,
  props: {
    id: {type: null as unknown as any, default: undefined},
    value: {type: null, default: undefined},
    'aria-label': {type: String, default: undefined},
    title: {type: null, default: undefined},
  },
  setup(props, {slots, attrs}) {
    provide(ListBoxSectionContextKey, {key: (props.id ?? null) as Key | null})

    const ariaLabel = props['aria-label'] ?? (attrs as any)['aria-label'] ?? (props as any).ariaLabel ?? (attrs as any).ariaLabel
    const hasHeading = !!(slots.header || slots.title || props.title != null)
    const {itemProps, headingProps, groupProps} = useListBoxSection({
      heading: hasHeading ? (slots.header || slots.title || props.title) : undefined,
      'aria-label': ariaLabel,
    })
    provide(HeaderContextKey, headingProps)

    const rawHeader = slots.header?.() ?? (slots.title?.() ?? (props.title != null ? [String(props.title)] : null))
    const headerVNodes: VNode[] = []
    if (rawHeader) headerVNodes.push(...(Array.isArray(rawHeader) ? (rawHeader as VNode[]) : [rawHeader as VNode]))
    const containsHeaderComponent = headerVNodes.some((v) => isVNode(v) && (v.type as any)?.name === 'Header')
    const sectionChildren: VNode[] = []
    if (hasHeading) {
      if (containsHeaderComponent) {
        // The slot already renders a <Header>; let it pick the heading props up
        // from context so we do not double-wrap it in another <header>.
        sectionChildren.push(...headerVNodes)
      } else if (headerVNodes.length > 0) {
        sectionChildren.push(h('header', {class: 'react-aria-Header', ...headingProps, 'data-slot': 'header'}, headerVNodes))
      }
    }
    const body = slots.default?.()
    if (body) sectionChildren.push(...(Array.isArray(body) ? body : [body]))

    return () =>
      h('section', {
        ...attrs,
        ...groupProps,
        class: ['react-aria-ListBoxSection', (attrs as any).class].filter(Boolean),
        'data-slot': (attrs as any)['data-slot'] ?? 'listbox-section',
      }, sectionChildren)
  },
})
