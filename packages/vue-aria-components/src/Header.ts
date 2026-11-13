import {defineComponent, h} from 'vue'

export interface HeaderProps { id?: string }

export const Header = defineComponent({
  name: 'Header',
  inheritAttrs: false,
  props: {
    id: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    return () => h('header', {
      ...attrs,
      class: ['react-aria-Header', (attrs as any).class].filter(Boolean),
      ...(props.id ? {id: props.id} : {}),
      'data-slot': (attrs as any)['data-slot'] ?? 'header',
    }, slots.default?.())
  },
})
