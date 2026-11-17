/*
 * Port of `react-aria-components@1.22.1` `Disclosure`
 * (`packages/react-aria-components/src/Disclosure.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Contexts are plain objects / state objects with live
 * getters. The component event is lowercase `expandedchange`; the hook
 * option remains `onExpandedChange`.
 *
 * `data-focus-visible-within` tracks descendant focus with local
 * `focusin` / `focusout` plus a capture modality listener. It does not use
 * `useFocusVisible`'s non-bubbling `onFocus` / `onBlur`, and it does not
 * change that frozen helper.
 */

import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  type InjectionKey,
  type PropType,
  type Ref,
} from 'vue'
import {mergeProps, useId} from 'vue-aria'
import {useDisclosure} from 'vue-aria/useDisclosure'
import {useDisclosureState, type DisclosureState} from 'vue-stately/useDisclosureState'
import {
  useDisclosureGroupState,
  type DisclosureGroupState,
} from 'vue-stately/useDisclosureGroupState'
import type {Key} from 'vue-stately/useListState'
import {filterDOMProps} from '../../vue-aria/src/utils/filterDOMProps'
import {ButtonContextKey} from './context'

export type {DisclosureState, DisclosureGroupState, Key}

export const DisclosureGroupStateContextKey: InjectionKey<DisclosureGroupState | null> = Symbol(
  'vue-aria-components.DisclosureGroupStateContext',
)
export {DisclosureGroupStateContextKey as DisclosureGroupStateContext}

export const DisclosureStateContextKey: InjectionKey<DisclosureState | null> = Symbol(
  'vue-aria-components.DisclosureStateContext',
)
export {DisclosureStateContextKey as DisclosureStateContext}

export const DisclosureContextKey: InjectionKey<Record<string, any> | null> = Symbol(
  'vue-aria-components.DisclosureContext',
)
export {DisclosureContextKey as DisclosureContext}

interface InternalDisclosureContextValue {
  panelProps: Record<string, any>
  panelRef: Ref<HTMLElement | null>
}

const InternalDisclosureContextKey: InjectionKey<InternalDisclosureContextValue | null> = Symbol(
  'vue-aria-components.InternalDisclosureContext',
)

export interface DisclosureGroupRenderProps {
  /** Whether the disclosure group is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** State of the disclosure group. */
  state: DisclosureGroupState
}

export interface DisclosureGroupProps {
  /** Whether multiple items can be expanded at the same time. */
  allowsMultipleExpanded?: boolean
  /** Whether all items are disabled. */
  isDisabled?: boolean
  /** The currently expanded keys in the group (controlled). */
  expandedKeys?: Iterable<Key>
  /** The initial expanded keys in the group (uncontrolled). */
  defaultExpandedKeys?: Iterable<Key>
  /** Handler that is called when items are expanded or collapsed. */
  onExpandedChange?: (keys: Set<Key>) => void
  class?: any
  style?: any
}

export interface DisclosureRenderProps {
  /** Whether the disclosure is expanded. @selector [data-expanded] */
  isExpanded: boolean
  /** Whether the disclosure has keyboard focus. @selector [data-focus-visible-within] */
  isFocusVisibleWithin: boolean
  /** Whether the disclosure is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** State of the disclosure. */
  state: DisclosureState
}

export interface DisclosureProps {
  /** Whether the disclosure is disabled. */
  isDisabled?: boolean
  /** Whether the disclosure is expanded (controlled). */
  isExpanded?: boolean
  /** Whether the disclosure is expanded by default (uncontrolled). */
  defaultExpanded?: boolean
  /** Handler that is called when the expanded state changes. */
  onExpandedChange?: (isExpanded: boolean) => void
  /**
   * Id for the disclosure when used within a DisclosureGroup, matching the id
   * used in `expandedKeys`. Not rendered as the DOM id.
   */
  id?: Key
  /**
   * Render-prop or string class. Vue normalizes the reserved `class` key, so a
   * function must be passed as `className` (the official RAC name). String
   * `class` still works.
   */
  class?: any
  className?: any
  style?: any
}

export interface DisclosurePanelRenderProps {
  /** Whether keyboard focus is within the disclosure panel. @selector [data-focus-visible-within] */
  isFocusVisibleWithin: boolean
}

export interface DisclosurePanelProps {
  /** The accessibility role for the disclosure's panel. @default 'group' */
  role?: 'group' | 'region'
  class?: any
  style?: any
}

type Modality = 'pointer' | 'keyboard' | 'virtual'

/**
 * Local descendant focus-visible tracker. `useFocusVisible`'s `onFocus` /
 * `onBlur` do not bubble, so this listens for `focusin` / `focusout` and
 * tracks modality with capture listeners. It does not modify the frozen
 * focus-visible module.
 */
function useFocusVisibleWithin() {
  const isFocusVisibleWithin = ref(false)
  const isFocusedWithin = ref(false)
  let modality: Modality = 'virtual'

  const onPointerDown = () => {
    modality = 'pointer'
    if (isFocusedWithin.value) isFocusVisibleWithin.value = false
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey || event.ctrlKey) return
    modality = 'keyboard'
    if (isFocusedWithin.value) isFocusVisibleWithin.value = true
  }
  const onFocusIn = (event: FocusEvent) => {
    const current = event.currentTarget as Node | null
    const target = event.target as Node | null
    if (!current || !target || !current.contains(target)) return
    isFocusedWithin.value = true
    isFocusVisibleWithin.value = modality !== 'pointer'
  }
  const onFocusOut = (event: FocusEvent) => {
    const current = event.currentTarget as Node | null
    const related = event.relatedTarget as Node | null
    if (current && related && current.contains(related)) return
    isFocusedWithin.value = false
    isFocusVisibleWithin.value = false
  }

  onMounted(() => {
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown, true)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('keydown', onKeyDown, true)
  })

  return {
    isFocusVisibleWithin,
    focusWithinProps: {
      onFocusin: onFocusIn,
      onFocusout: onFocusOut,
    },
  }
}

function resolveClass(source: unknown, values: unknown) {
  return typeof source === 'function' ? (source as (v: unknown) => unknown)(values) : source
}

function resolveStyle(source: unknown, values: unknown) {
  return typeof source === 'function' ? (source as (v: unknown) => unknown)(values) : source
}

function assignRef(target: unknown, el: unknown) {
  if (typeof target === 'function') {
    target(el)
    return
  }
  if (target && typeof target === 'object' && 'value' in (target as any)) {
    ;(target as {value: unknown}).value = el
  }
}

function domAttrs(attrs: Record<string, any>, labelable: boolean) {
  const copy: Record<string, any> = {}
  for (const key of Object.keys(attrs)) {
    if (key === 'class' || key === 'style' || key === 'className') continue
    copy[key] = attrs[key]
  }
  return filterDOMProps(copy, {global: true, labelable, events: true})
}

function withPanelVars(style: unknown, panel: HTMLElement | null) {
  if (!panel) return style
  const width = panel.style.getPropertyValue('--disclosure-panel-width')
  const height = panel.style.getPropertyValue('--disclosure-panel-height')
  if (!width && !height) return style
  const vars: Record<string, string> = {}
  if (width) vars['--disclosure-panel-width'] = width
  if (height) vars['--disclosure-panel-height'] = height
  if (style == null || typeof style === 'string') return {...vars}
  if (Array.isArray(style)) return [...style, vars]
  if (typeof style === 'object') return {...(style as object), ...vars}
  return style
}

/**
 * A DisclosureGroup is a grouping of related disclosures, sometimes called an accordion.
 * It supports both single and multiple expanded items.
 */
export const DisclosureGroup = defineComponent({
  name: 'DisclosureGroup',
  inheritAttrs: false,
  props: {
    allowsMultipleExpanded: {type: Boolean, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    expandedKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
    defaultExpandedKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
    onExpandedChange: {type: Function as PropType<(keys: Set<Key>) => void>, default: undefined},
    class: {type: null as unknown as PropType<any>, default: undefined},
    style: {type: null as unknown as PropType<any>, default: undefined},
  },
  emits: ['expandedchange'],
  setup(props, {slots, attrs, emit}) {
    const state = useDisclosureGroupState({
      allowsMultipleExpanded: () => props.allowsMultipleExpanded,
      isDisabled: () => props.isDisabled,
      expandedKeys: () => props.expandedKeys as Iterable<Key> | undefined,
      defaultExpandedKeys: () => props.defaultExpandedKeys as Iterable<Key> | undefined,
      onExpandedChange(keys) {
        props.onExpandedChange?.(keys)
        emit('expandedchange', keys)
      },
    })
    provide(DisclosureGroupStateContextKey, state)

    return () => {
      const values: DisclosureGroupRenderProps = {
        isDisabled: Boolean(props.isDisabled),
        state,
      }
      const className = resolveClass(props.class ?? (attrs as any).class, values)
      const style = resolveStyle(props.style ?? (attrs as any).style, values)
      return h(
        'div',
        mergeProps(domAttrs(attrs as Record<string, any>, false), {
          class: className ?? 'react-aria-DisclosureGroup',
          style,
          'data-disabled': props.isDisabled ? 'true' : undefined,
        }),
        slots.default?.(values),
      )
    }
  },
})

/**
 * A disclosure is a collapsible section of content. It is composed of a header
 * with a heading and trigger button, and a panel that contains the content.
 */
export const Disclosure = defineComponent({
  name: 'Disclosure',
  inheritAttrs: false,
  props: {
    isDisabled: {type: Boolean, default: undefined},
    isExpanded: {type: Boolean, default: undefined},
    defaultExpanded: {type: Boolean, default: undefined},
    onExpandedChange: {type: Function as PropType<(isExpanded: boolean) => void>, default: undefined},
    id: {type: [String, Number] as PropType<Key>, default: undefined},
    className: {type: null as unknown as PropType<any>, default: undefined},
    style: {type: null as unknown as PropType<any>, default: undefined},
  },
  emits: ['expandedchange'],
  setup(props, {slots, attrs, emit}) {
    const groupState = inject(DisclosureGroupStateContextKey, null)
    const ctx = inject(DisclosureContextKey, null)
    const generatedId = useId()
    const keyOf = (): Key => {
      if (props.id != null) return props.id
      if (ctx && ctx.id != null) return ctx.id as Key
      return generatedId.value
    }

    const isDisabled = () => Boolean(props.isDisabled || ctx?.isDisabled || groupState?.isDisabled)

    const state = useDisclosureState({
      isExpanded: () => {
        if (groupState) return groupState.expandedKeys.has(keyOf())
        if (props.isExpanded !== undefined) return props.isExpanded
        if (ctx && ctx.isExpanded !== undefined) return ctx.isExpanded as boolean
        return undefined
      },
      defaultExpanded: () => {
        if (props.defaultExpanded !== undefined) return props.defaultExpanded
        if (ctx && ctx.defaultExpanded !== undefined) return Boolean(ctx.defaultExpanded)
        return undefined
      },
      onExpandedChange(isExpanded) {
        if (groupState) groupState.toggleKey(keyOf())
        props.onExpandedChange?.(isExpanded)
        ctx?.onExpandedChange?.(isExpanded)
        emit('expandedchange', isExpanded)
      },
    })

    const panelRef = ref<HTMLElement | null>(null)
    const {buttonProps, panelProps} = useDisclosure(
      {
        isDisabled,
        isExpanded: () => state.isExpanded,
      },
      state,
      panelRef,
    )
    const {isFocusVisibleWithin, focusWithinProps} = useFocusVisibleWithin()

    provide(ButtonContextKey, {
      slots: {
        trigger: buttonProps,
      },
    })
    provide(InternalDisclosureContextKey, {panelProps, panelRef})
    provide(DisclosureStateContextKey, state)

    const rootRef = ref<HTMLElement | null>(null)

    return () => {
      const values: DisclosureRenderProps = {
        isExpanded: state.isExpanded,
        isDisabled: isDisabled(),
        isFocusVisibleWithin: isFocusVisibleWithin.value,
        state,
      }
      // Vue normalizes a function `class` to '' before attrs/vnode props exist.
      // `className` is the official RAC name and stays a live function.
      const classSource = (props as any).className ?? (attrs as any).className ?? (attrs as any).class
      const className = resolveClass(classSource, values)
      const style = resolveStyle((props as any).style ?? (attrs as any).style, values)
      const userEvents = {
        onFocus: (attrs as any).onFocus,
        onBlur: (attrs as any).onBlur,
        onFocusin: (attrs as any).onFocusin,
        onFocusout: (attrs as any).onFocusout,
      }
      return h(
        'div',
        mergeProps(domAttrs(attrs as Record<string, any>, false), userEvents, focusWithinProps, {
          class: className ?? 'react-aria-Disclosure',
          style,
          ref: (el: HTMLElement | null) => {
            rootRef.value = el
            assignRef(ctx?.ref, el)
          },
          'data-expanded': state.isExpanded ? 'true' : undefined,
          'data-disabled': isDisabled() ? 'true' : undefined,
          'data-focus-visible-within': isFocusVisibleWithin.value ? 'true' : undefined,
        }),
        slots.default?.(values),
      )
    }
  },
})

/**
 * A DisclosurePanel provides the content for a disclosure.
 */
export const DisclosurePanel = defineComponent({
  name: 'DisclosurePanel',
  inheritAttrs: false,
  props: {
    role: {type: String as PropType<'group' | 'region'>, default: undefined},
    class: {type: null as unknown as PropType<any>, default: undefined},
    style: {type: null as unknown as PropType<any>, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const internal = inject(InternalDisclosureContextKey, null)
    if (!internal) {
      throw new Error('DisclosurePanel must be rendered inside a Disclosure.')
    }
    const {panelProps, panelRef} = internal
    const {isFocusVisibleWithin, focusWithinProps} = useFocusVisibleWithin()
    // Clear the disclosure trigger slot so buttons inside the panel (and a
    // nested disclosure's own trigger) are not wired to this disclosure.
    provide(ButtonContextKey, null)

    return () => {
      const values: DisclosurePanelRenderProps = {
        isFocusVisibleWithin: isFocusVisibleWithin.value,
      }
      const className = resolveClass(props.class ?? (attrs as any).class, values)
      const style = resolveStyle(props.style ?? (attrs as any).style, values)
      const userEvents = {
        onFocus: (attrs as any).onFocus,
        onBlur: (attrs as any).onBlur,
        onFocusin: (attrs as any).onFocusin,
        onFocusout: (attrs as any).onFocusout,
      }
      const merged = mergeProps(domAttrs(attrs as Record<string, any>, true), userEvents, panelProps, focusWithinProps, {
        class: className ?? 'react-aria-DisclosurePanel',
        style: withPanelVars(style, panelRef.value),
        role: props.role ?? 'group',
        ref: (el: HTMLElement | null) => {
          panelRef.value = el
        },
        'data-focus-visible-within': isFocusVisibleWithin.value ? 'true' : undefined,
      })
      merged['aria-hidden'] = panelProps['aria-hidden'] ? 'true' : 'false'
      return h('div', merged, slots.default?.(values))
    }
  },
})
