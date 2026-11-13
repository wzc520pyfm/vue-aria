/*
 * Port of `react-aria-components@1.22.1` `Group`
 * (`packages/react-aria-components/src/Group.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: `useFocusRing({within: true})` is composed from the
 * existing `useFocusWithin` + `useFocusVisible` helpers, and the Hero UI
 * data-* attributes are emitted locally as "true" strings.
 */

import {computed, defineComponent, h, inject, ref, type InjectionKey} from 'vue'
import {mergeProps, useFocusVisible, useHover} from 'vue-aria'
import {useFocusWithin} from 'vue-aria/useFocusWithin'
import type {Ref} from 'vue'

export interface GroupRenderProps {
  /** Whether the group is currently hovered with a mouse. */
  isHovered: boolean
  /** Whether an element within the group is focused, either via a mouse or keyboard. */
  isFocusWithin: boolean
  /** Whether an element within the group is keyboard focused. */
  isFocusVisible: boolean
  /** Whether the group is disabled. */
  isDisabled: boolean
  /** Whether the group is invalid. */
  isInvalid: boolean
}

export interface GroupProps {
  /** Whether the group is disabled. */
  isDisabled?: boolean
  /** Whether the group is invalid. */
  isInvalid?: boolean
  /** Whether the group is read only. */
  isReadOnly?: boolean
  /**
   * An accessibility role for the group.
   *
   * @default 'group'
   */
  role?: 'group' | 'region' | 'presentation'
  slot?: string
  class?: any
  style?: any
}

export const GroupContextKey: InjectionKey<Record<string, any> | null> = Symbol(
  'vue-aria-components.GroupContext',
)
export {GroupContextKey as GroupContext}

const boolAttr = (v: unknown): boolean => v === true || v === 'true' || v === ''

/**
 * Keys in the field context that are not DOM attributes: the field's state
 * mirrors (`isInvalid` / `isDisabled`) and the component ref. They drive
 * render-props and the element ref only — official renders them nowhere.
 */
const CONTEXT_NON_DOM_KEYS = new Set(['isInvalid', 'isDisabled', 'isReadOnly', 'ref'])

function filterContextProps(
  ctx: Record<string, any> | null,
): Record<string, any> | null {
  if (!ctx) {
    return null
  }
  const out: Record<string, any> = {}
  for (const key of Object.keys(ctx)) {
    if (CONTEXT_NON_DOM_KEYS.has(key)) {
      continue
    }
    Object.defineProperty(
      out,
      key,
      Object.getOwnPropertyDescriptor(ctx, key) ?? {value: ctx[key]},
    )
  }
  return out
}

/**
 * A group represents a set of related UI controls, and supports interactive states for styling.
 */
export const Group = defineComponent({
  name: 'Group',
  inheritAttrs: false,
  props: {
    isDisabled: {type: Boolean, default: undefined},
    isInvalid: {type: Boolean, default: undefined},
    isReadOnly: {type: Boolean, default: undefined},
    role: {type: String as any, default: undefined},
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject(GroupContextKey, null) as Record<string, any> | null

    const resolve = (key: string) => {
      const attrsAny = attrs as Record<string, any>
      const local = attrsAny[key] !== undefined ? attrsAny[key] : (props as any)[key]
      return local !== undefined ? local : ctx?.[key]
    }
    const resolveDisabled = () => {
      const disabled = resolve('isDisabled')
      if (disabled != null) return boolAttr(disabled)
      const ariaDisabled = resolve('aria-disabled')
      return boolAttr(ariaDisabled) && ariaDisabled !== 'false'
    }
    const resolveInvalid = () => {
      const invalid = resolve('isInvalid')
      if (invalid != null) return boolAttr(invalid)
      const ariaInvalid = resolve('aria-invalid')
      return boolAttr(ariaInvalid) && ariaInvalid !== 'false'
    }

    const {hoverProps, isHovered} = useHover({
      isDisabled: () => resolveDisabled(),
    })
    const {isFocusVisible: isFocusVisibleRaw, focusProps} = useFocusVisible()
    // Official `useFocusRing({within: true})`: keyboard focus visible within the group.
    // `isFocusWithin` state is tracked via the hook's `onFocusWithinChange` callback
    // (the hook keeps its internal flag private).
    const isFocusWithin = ref(false)
    const {focusWithinProps} = useFocusWithin({
      isDisabled: () => resolveDisabled(),
      onFocusWithinChange: (value) => {
        isFocusWithin.value = value
      },
    })
    const isFocusVisible = computed(() => isFocusWithin.value && isFocusVisibleRaw.value)

    return () => {
      const attrsAny = attrs as Record<string, any>
      const values: GroupRenderProps = {
        isHovered: isHovered.value,
        isFocusWithin: isFocusWithin.value,
        isFocusVisible: isFocusVisible.value,
        isDisabled: resolveDisabled(),
        isInvalid: resolveInvalid(),
      }
      const className =
        typeof attrsAny.class === 'function' ? attrsAny.class(values) : attrsAny.class
      const style = typeof attrsAny.style === 'function' ? attrsAny.style(values) : attrsAny.style

      // The context ref points at the field element (DateField fieldRef).
      const ctxRef = ctx?.ref as Ref<Element | null> | ((el: Element | null) => void) | undefined

      const domProps = mergeProps(
        filterContextProps(ctx),
        attrsAny,
        focusProps as any,
        focusWithinProps as any,
        hoverProps as any,
        {
          ...(ctxRef
            ? {
                ref: (el: any) => {
                  if (typeof ctxRef === 'function') ctxRef(el)
                  else if (ctxRef && typeof ctxRef === 'object' && 'value' in ctxRef)
                    ctxRef.value = el
                },
              }
            : {}),
          class: className ?? 'react-aria-Group',
          style,
          role: resolve('role') ?? 'group',
          slot: resolve('slot') ?? undefined,
          'data-focus-within': values.isFocusWithin ? 'true' : undefined,
          'data-hovered': values.isHovered ? 'true' : undefined,
          'data-focus-visible': values.isFocusVisible ? 'true' : undefined,
          'data-disabled': values.isDisabled ? 'true' : undefined,
          'data-invalid': values.isInvalid ? 'true' : undefined,
          'data-readonly': boolAttr(resolve('isReadOnly')) ? 'true' : undefined,
        },
      )
      return h('div', domProps, slots.default?.(values))
    }
  },
})
