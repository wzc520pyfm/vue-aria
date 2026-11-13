import {computed, defineComponent, h, inject, provide, ref, watchEffect, type PropType} from 'vue'
import {mergeProps, toHeroDataAttrs, useSelectable} from 'vue-aria'
import {useMenuItem} from 'vue-aria/useMenu'
import type {Key} from 'vue-stately/useListState'
import {ListBoxItemContextKey, MenuContextKey, MenuItemContextKey, MenuStateContextKey, KeyboardContextKey, TextContextKey, RootMenuTriggerStateContextKey} from './context'

export interface MenuItemProps {
  id?: Key
  textValue?: string
  isDisabled?: boolean
  value?: unknown
  href?: string
  'aria-label'?: string
  shouldCloseOnSelect?: boolean
  onAction?: (key?: Key) => void
}

export const MenuItem = defineComponent({
  name: 'MenuItem',
  inheritAttrs: false,
  props: {
    id: {type: null as unknown as PropType<Key | undefined>, default: undefined},
    textValue: {type: String, default: undefined},
    isDisabled: {type: Boolean, default: false},
    value: {type: null, default: undefined},
    href: {type: String, default: undefined},
    'aria-label': {type: String, default: undefined},
    shouldCloseOnSelect: {type: Boolean, default: undefined},
    onAction: {type: Function as PropType<((key?: Key) => void) | undefined>, default: undefined},
  },
  emits: ['action'],
  setup(props, {slots, attrs, emit}) {
    const state = inject(MenuStateContextKey, null)
    if (!state) {
      throw new Error('MenuItem must be used within a Menu')
    }
    const rootState = inject(RootMenuTriggerStateContextKey, null)
    const menuContext = inject(MenuContextKey, null)
    const itemRef = ref<HTMLElement | null>(null)
    const itemKey = computed<Key>(() => (props.id ?? null) as Key)

    const {
      menuItemProps,
      labelProps,
      descriptionProps,
      keyboardShortcutProps,
      isFocused,
      isFocusVisible,
      isSelected,
      isPressed,
      isDisabled,
      isHovered,
    } = useMenuItem(
      {
        key: itemKey,
        isDisabled: () => props.isDisabled,
        'aria-label': () => props['aria-label'],
        shouldCloseOnSelect: props.shouldCloseOnSelect,
        href: props.href,
        onAction: (k) => { props.onAction?.(k); emit('action', k) },
        onClose: () => {
          ;(menuContext as any)?.onClose?.()
          ;(rootState as any)?.close?.()
        },
      },
      state as any,
      itemRef as any,
    )

    // Provide contexts for Text and Keyboard (official slot ids)
    provide(ListBoxItemContextKey, {labelProps, descriptionProps})
    provide(TextContextKey, {
      slots: {
        label: labelProps,
        description: descriptionProps,
      },
    })
    provide(KeyboardContextKey, keyboardShortcutProps)
    provide(MenuItemContextKey, {shouldCloseOnSelect: props.shouldCloseOnSelect})

    const {selectedAttrs} = useSelectable({isSelected: () => isSelected.value})

    watchEffect(() => {
      if (isFocused.value && itemRef.value && document.activeElement !== itemRef.value) {
        try { itemRef.value.focus?.() } catch {}
      }
    })

    return () => {
      const selectionMode = (state as any).selectionManager?.selectionMode ?? 'none'
      const base = mergeProps(menuItemProps, attrs)
      const dataAttrs: Record<string, any> = {
        ...toHeroDataAttrs({
          hovered: isHovered.value,
          focused: isFocused.value,
          focusVisible: isFocusVisible.value,
          disabled: isDisabled.value,
          pressed: isPressed.value,
        }),
        ...selectedAttrs.value,
      }
      if (selectionMode !== 'none') {
        dataAttrs['data-selection-mode'] = selectionMode
      }
      const domProps = {
        ...base,
        ...dataAttrs,
        class: ['react-aria-MenuItem', (attrs as any).class].filter(Boolean),
        ref: (el: any) => { itemRef.value = el as HTMLElement },
      }
      const Tag = props.href ? 'a' : 'div'
      if (props.href) (domProps as any).href = props.href
      return h(Tag, domProps, slots.default?.())
    }
  },
})
