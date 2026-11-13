import {computed, defineComponent, h, inject, provide, ref, watchEffect, type PropType} from 'vue'
import {mergeProps, toHeroDataAttrs, useSelectable} from 'vue-aria'
import {useMenuItem} from 'vue-aria/useMenu'
import type {Key} from 'vue-stately/useListState'
import {KeyboardContextKey, ListBoxItemContextKey, MenuContextKey, MenuItemContextKey, MenuStateContextKey, RootMenuTriggerStateContextKey, TextContextKey} from './context'

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
    const itemContext = inject(MenuItemContextKey, null) as any
    const itemRef = ref<HTMLElement | null>(null)

    // Register trigger/item ref when provided via SubmenuTrigger context.
    if (itemContext?.ref) {
      watchEffect(() => {
        itemContext.ref.value = itemRef.value
      })
    }

    const itemKey = computed<Key>(() => (props.id ?? null) as Key)
    const shouldCloseOnSelect = computed(() => props.shouldCloseOnSelect ?? itemContext?.shouldCloseOnSelect)

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
        'aria-haspopup': () => itemContext?.['aria-haspopup'],
        'aria-expanded': () => itemContext?.['aria-expanded'],
        'aria-controls': () => itemContext?.['aria-controls'],
        onPressStart: itemContext?.onPressStart,
        onPress: itemContext?.onPress,
        onHoverChange: itemContext?.onHoverChange,
        onKeyDown: itemContext?.onKeyDown,
        isOpen: itemContext?.isOpen,
        shouldCloseOnSelect: shouldCloseOnSelect.value,
        href: props.href,
        onAction: (k) => { props.onAction?.(k); emit('action', k) },
        onClose: () => {
          ;(menuContext as any)?.onClose?.()
          if (!(menuContext as any)?.onClose) (rootState as any)?.close?.()
        },
      },
      state as any,
      itemRef as any,
    )

    provide(ListBoxItemContextKey, {labelProps, descriptionProps})
    provide(TextContextKey, {
      slots: {
        label: labelProps,
        description: descriptionProps,
      },
    })
    provide(KeyboardContextKey, keyboardShortcutProps)
    provide(MenuItemContextKey, {shouldCloseOnSelect: shouldCloseOnSelect.value})

    const {selectedAttrs} = useSelectable({isSelected: () => isSelected.value})

    watchEffect(() => {
      if (isFocused.value && itemRef.value && document.activeElement !== itemRef.value) {
        try { itemRef.value.focus?.() } catch {}
      }
    })

    return () => {
      const selectionMode = (state as any).selectionManager?.selectionMode ?? 'none'
      // Preserve any id set by submenu trigger context on the element via aria/id merge in menuItemProps.
      const base = mergeProps(menuItemProps, attrs)
      // For submenu trigger items, prefer submenu trigger id for aria-labelledby linkage.
      if (itemContext?.id) Object.defineProperty(base, 'id', {value: itemContext.id, enumerable: true, configurable: true, writable: true})
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

      const domProps: Record<string, any> = {}
      // Copy descriptors first to keep handlers/getters, then materialize dynamic values for Vue patching.
      for (const [k, desc] of Object.entries(Object.getOwnPropertyDescriptors(base))) {
        if (desc && ('get' in desc || 'set' in desc)) {
          try { domProps[k] = (base as any)[k] } catch { domProps[k] = undefined }
        } else if (desc) {
          domProps[k] = desc.value
        }
      }

      const hasSubmenu = !!domProps['aria-haspopup']
      const expanded = domProps['aria-expanded']
      if (hasSubmenu) dataAttrs['data-has-submenu'] = 'true'
      if (expanded === 'true' || expanded === true) dataAttrs['data-open'] = 'true'

      for (const [k, v] of Object.entries(dataAttrs)) {
        domProps[k] = v
      }
      domProps.class = ['react-aria-MenuItem', (attrs as any).class].filter(Boolean)
      domProps.ref = (el: any) => { itemRef.value = el as HTMLElement }
      const Tag = props.href ? 'a' : 'div'
      if (props.href) domProps.href = props.href
      return h(Tag, domProps, slots.default?.())
    }
  },
})
