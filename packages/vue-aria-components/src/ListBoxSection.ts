import {defineComponent, h, provide, type PropType, type VNode} from 'vue'
import {useListBoxSection} from 'vue-aria/useListBox'
import type {Key} from 'vue-stately/useListState'
import {ListBoxSectionContextKey} from './context'

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
    id: {type: null as unknown as PropType<Key | undefined>, default: undefined},
    value: {type: null, default: undefined},
    'aria-label': {type: String, default: undefined},
    title: {type: null, default: undefined},
  },
  setup(props, {slots, attrs}) {
    provide(ListBoxSectionContextKey, {key: (props.id ?? null) as Key | null})
    return () => {
      const ariaLabel = props['aria-label'] ?? (attrs as any)['aria-label'] ?? (props as any).ariaLabel ?? (attrs as any).ariaLabel
      const hasHeading = !!(slots.header || slots.title || props.title != null)
      const {itemProps, headingProps, groupProps} = useListBoxSection({
        heading: hasHeading ? (slots.header || slots.title || props.title) : undefined,
        'aria-label': ariaLabel,
      })
      const headerSlot = slots.header?.() ?? (slots.title?.() ?? (props.title != null ? [String(props.title)] : null))
      const sectionChildren: VNode[] = []
      if (hasHeading && headerSlot) {
        sectionChildren.push(h('header', {class: 'react-aria-Header', ...headingProps, 'data-slot': 'header'}, headerSlot))
      }
      const body = slots.default?.()
      if (body) sectionChildren.push(...(Array.isArray(body) ? body : [body]))
      return h('section', {
        ...attrs,
        ...groupProps,
        class: ['react-aria-ListBoxSection', (attrs as any).class].filter(Boolean),
        'data-slot': (attrs as any)['data-slot'] ?? 'listbox-section',
      }, sectionChildren)
    }
  },
})
