import {computed, defineComponent, h, inject} from 'vue'
import {HeaderContextKey} from './context'

export interface HeaderProps { id?: string }

export const Header = defineComponent({
  name: 'Header',
  inheritAttrs: false,
  props: {
    id: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    // When rendered inside a ListBoxSection, the section provides the resolved
    // heading props (generated heading id, etc.) via context.
    const headingContext = inject(HeaderContextKey, null)
    const headingProps = computed(() => ({
      ...(headingContext ?? {}),
      ...(props.id ? {id: props.id} : {}),
    }))
    return () => h('header', {
      ...attrs,
      class: ['react-aria-Header', (attrs as any).class].filter(Boolean),
      ...headingProps.value,
      'data-slot': (attrs as any)['data-slot'] ?? 'header',
    }, slots.default?.())
  },
})
