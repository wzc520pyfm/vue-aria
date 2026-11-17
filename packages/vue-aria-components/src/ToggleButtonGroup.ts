/**
 * Port of `react-aria-components` `ToggleButtonGroup`
 * (`packages/react-aria-components/src/ToggleButtonGroup.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Children read `ToggleGroupStateContext`. SharedElementTransition
 * and SelectionIndicator are not rendered in this slice.
 */

import {
  defineComponent,
  getCurrentInstance,
  h,
  inject,
  isRef,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
  ref,
  type PropType,
} from 'vue'
import {mergeProps, useToggleButtonGroup} from 'vue-aria'
import {useToggleGroupState, type Key, type ToggleGroupState} from 'vue-stately/useToggleGroupState'
import {ToggleButtonGroupContextKey, ToggleGroupStateContextKey} from './toggleContext'
import {
  assignRef,
  assignRefIfCurrent,
  bindDom,
  domFrom,
  localClassValue,
  mergeClassNames,
  mergeRenderStyle,
  pick,
  readAriaProp,
  readContextRef,
  readSlotContext,
} from './toolbarDom'

export {ToggleButtonGroupContextKey as ToggleButtonGroupContext}
export {ToggleGroupStateContextKey as ToggleGroupStateContext}

export interface ToggleButtonGroupRenderProps {
  /**
   * The orientation of the toggle button group.
   * @selector [data-orientation="horizontal | vertical"]
   */
  orientation: 'horizontal' | 'vertical'
  /**
   * Whether the toggle button group is disabled.
   * @selector [data-disabled]
   */
  isDisabled: boolean
  /** State of the toggle button group. */
  state: ToggleGroupState
}

export type ToggleButtonGroupStyle =
  | string
  | Record<string, any>
  | ((values: ToggleButtonGroupRenderProps & {defaultStyle: Record<string, any>}) => string | Record<string, any> | null | undefined)

export interface ToggleButtonGroupProps {
  /** @default 'single' */
  selectionMode?: 'single' | 'multiple'
  disallowEmptySelection?: boolean
  selectedKeys?: Iterable<Key>
  defaultSelectedKeys?: Iterable<Key>
  isDisabled?: boolean
  /** @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical'
  id?: string
  slot?: string | null
  className?: string | ((values: ToggleButtonGroupRenderProps & {defaultClassName?: string}) => string)
  style?: ToggleButtonGroupStyle
  onSelectionChange?: (keys: Set<Key>) => void
  /** Vue listener for the lowercase `selectionchange` emit. */
  onSelectionchange?: (keys: Set<Key>) => void
  'aria-label'?: string | null
  'aria-labelledby'?: string | null
  'aria-describedby'?: string | null
  'aria-details'?: string | null
}

const propDefs = {
  selectionMode: {type: String as PropType<'single' | 'multiple' | undefined>, default: undefined},
  disallowEmptySelection: {type: Boolean, default: undefined},
  selectedKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
  defaultSelectedKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
  isDisabled: {type: Boolean, default: undefined},
  orientation: {type: String as PropType<'horizontal' | 'vertical' | undefined>, default: undefined},
  id: {type: String, default: undefined},
  slot: {type: String as PropType<string | null | undefined>, default: undefined},
  className: {type: null as unknown as PropType<ToggleButtonGroupProps['className']>, default: undefined},
  style: {type: null as unknown as PropType<ToggleButtonGroupStyle>, default: undefined},
  onSelectionChange: {type: Function as PropType<((keys: Set<Key>) => void) | undefined>, default: undefined},
  'aria-label': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-labelledby': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-describedby': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-details': {type: String as PropType<string | null | undefined>, default: undefined},
}

export const ToggleButtonGroup = defineComponent({
  name: 'ToggleButtonGroup',
  inheritAttrs: false,
  props: propDefs,
  emits: {
    selectionchange: (_keys: Set<Key>) => true,
  },
  setup(props, {slots, attrs, emit}) {
    const instance = getCurrentInstance()
    const injected = inject(ToggleButtonGroupContextKey, null)
    const slotValue = () => {
      if (props.slot !== undefined) return props.slot
      return (attrs.slot as string | null | undefined)
    }
    const resolved = () => {
      const source = (isRef(injected) ? injected.value : injected) as Record<string, any> | null
      return readSlotContext(source, slotValue())
    }
    const aria = (name: 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-details') =>
      readAriaProp(props, attrs as Record<string, any>, resolved(), name)
    const orientation = () =>
      pick(props.orientation, resolved(), 'orientation') === 'vertical' ? 'vertical' : 'horizontal'

    const state = useToggleGroupState({
      selectionMode: () => {
        const value = pick(props.selectionMode, resolved(), 'selectionMode')
        return value === 'multiple' ? 'multiple' : 'single'
      },
      disallowEmptySelection: () => Boolean(pick(props.disallowEmptySelection, resolved(), 'disallowEmptySelection')),
      selectedKeys: () => pick(props.selectedKeys, resolved(), 'selectedKeys'),
      defaultSelectedKeys: () => pick(props.defaultSelectedKeys, resolved(), 'defaultSelectedKeys'),
      isDisabled: () => Boolean(pick(props.isDisabled, resolved(), 'isDisabled')),
      onSelectionChange: (keys) => {
        const ctx = resolved()
        props.onSelectionChange?.(keys)
        if (ctx?.onSelectionChange && ctx.onSelectionChange !== props.onSelectionChange) ctx.onSelectionChange(keys)
        emit('selectionchange', keys)
      },
    })
    provide(ToggleGroupStateContextKey, state)

    const rootEl = ref<HTMLElement | null>(null)
    let mountedEl: Element | null = null
    let boundContextRef: unknown
    let boundContextEl: Element | null = null
    const group = useToggleButtonGroup({
      selectionMode: () => state.selectionMode,
      isDisabled: () => pick(props.isDisabled, resolved(), 'isDisabled'),
      orientation,
      id: () => pick(props.id, resolved(), 'id'),
      'aria-label': () => aria('aria-label'),
      'aria-labelledby': () => aria('aria-labelledby'),
      'aria-describedby': () => aria('aria-describedby'),
      'aria-details': () => aria('aria-details'),
    }, state, rootEl)

    function externalRef() {
      const raw = instance?.vnode.ref as {r?: unknown} | null | undefined
      return raw && typeof raw === 'object' && 'r' in raw ? raw.r : (attrs as any).ref
    }
    function syncExternal() {
      assignRef(externalRef(), rootEl.value)
    }
    function releaseContextRef() {
      if (boundContextRef == null) return
      assignRefIfCurrent(boundContextRef, null, boundContextEl)
      boundContextRef = undefined
      boundContextEl = null
    }
    function syncContextRef(el: Element | null) {
      const next = readContextRef(resolved())
      if (next !== boundContextRef) {
        releaseContextRef()
        boundContextRef = next
      }
      if (next != null) {
        assignRef(next, el)
        boundContextEl = el
      }
    }
    onMounted(() => {
      syncExternal()
      syncContextRef(rootEl.value)
    })
    onUpdated(() => {
      syncExternal()
      syncContextRef(rootEl.value)
    })
    onUnmounted(() => {
      releaseContextRef()
      assignRefIfCurrent(externalRef(), null, mountedEl)
      rootEl.value = null
      mountedEl = null
    })

    return () => {
      const ctx = resolved()
      readContextRef(ctx)
      const orient = orientation()
      const values: ToggleButtonGroupRenderProps = {
        orientation: orient,
        isDisabled: state.isDisabled,
        state,
      }
      const children = slots.default?.(values)
      const className = mergeClassNames(
        ctx?.className,
        localClassValue(props, attrs as Record<string, any>),
        values,
        'react-aria-ToggleButtonGroup',
      )
      const style = mergeRenderStyle(
        ctx?.style,
        props.style ?? (attrs as any).style,
        values as unknown as Record<string, unknown>,
      )
      const disabled = pick(props.isDisabled, ctx, 'isDisabled')
      const merged = mergeProps(domFrom(ctx), domFrom(attrs as Record<string, any>), group.groupProps, {
        ref: (el: Element | null) => {
          rootEl.value = el as HTMLElement | null
          if (el) mountedEl = el
          syncContextRef(el)
        },
        slot: props.slot || undefined,
        class: className ?? 'react-aria-ToggleButtonGroup',
        style,
        'data-orientation': orient,
        'data-disabled': disabled || undefined,
      })
      return h('div', bindDom(merged), children)
    }
  },
})
