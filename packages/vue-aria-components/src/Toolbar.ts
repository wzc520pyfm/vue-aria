/**
 * Port of `react-aria-components` `Toolbar`
 * (`packages/react-aria-components/src/Toolbar.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Render state is orientation only. Hook props are copied
 * into a fresh vnode bag on each render. There is no label registration.
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
  ref,
  type InjectionKey,
  type PropType,
} from 'vue'
import {mergeProps, useToolbar} from 'vue-aria'
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

export const ToolbarContextKey: InjectionKey<Record<string, any> | null> = Symbol('vue-aria-components.ToolbarContext')
export {ToolbarContextKey as ToolbarContext}

export interface ToolbarRenderProps {
  /**
   * The current orientation of the toolbar.
   * @selector [data-orientation]
   */
  orientation: 'horizontal' | 'vertical'
}

export type ToolbarStyle =
  | string
  | Record<string, any>
  | ((values: ToolbarRenderProps & {defaultStyle: Record<string, any>}) => string | Record<string, any> | null | undefined)

export interface ToolbarProps {
  /** @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical'
  id?: string
  slot?: string | null
  className?: string | ((values: ToolbarRenderProps & {defaultClassName?: string}) => string)
  style?: ToolbarStyle
  'aria-label'?: string | null
  'aria-labelledby'?: string | null
  'aria-describedby'?: string | null
  'aria-details'?: string | null
}

const toolbarPropDefs = {
  orientation: {type: String as PropType<'horizontal' | 'vertical' | undefined>, default: undefined},
  id: {type: String, default: undefined},
  slot: {type: String as PropType<string | null | undefined>, default: undefined},
  className: {type: null as unknown as PropType<ToolbarProps['className']>, default: undefined},
  style: {type: null as unknown as PropType<ToolbarStyle>, default: undefined},
  'aria-label': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-labelledby': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-describedby': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-details': {type: String as PropType<string | null | undefined>, default: undefined},
}

export const Toolbar = defineComponent({
  name: 'Toolbar',
  inheritAttrs: false,
  props: toolbarPropDefs,
  setup(props, {slots, attrs}) {
    const instance = getCurrentInstance()
    const injected = inject(ToolbarContextKey, null)
    const slotValue = () => {
      if (props.slot !== undefined) return props.slot
      return (attrs.slot as string | null | undefined)
    }
    const resolved = () => {
      const source = (isRef(injected) ? injected.value : injected) as Record<string, any> | null
      return readSlotContext(source, slotValue())
    }
    const rootEl = ref<HTMLElement | null>(null)
    let mountedEl: Element | null = null
    let boundContextRef: unknown
    let boundContextEl: Element | null = null

    const aria = useToolbar({
      orientation: () => pick(props.orientation, resolved(), 'orientation'),
      id: () => pick(props.id, resolved(), 'id') ?? (attrs.id as string | undefined),
      'aria-label': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-label'),
      'aria-labelledby': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-labelledby'),
      'aria-describedby': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-describedby'),
      'aria-details': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-details'),
    }, rootEl)

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
      const orientation = pick(props.orientation, ctx, 'orientation') === 'vertical' ? 'vertical' : 'horizontal'
      const values: ToolbarRenderProps = {orientation}
      const children = slots.default?.(values)
      const className = mergeClassNames(
        ctx?.className,
        localClassValue(props, attrs as Record<string, any>),
        values,
        'react-aria-Toolbar',
      )
      const style = mergeRenderStyle(ctx?.style, props.style ?? (attrs as any).style, values as unknown as Record<string, unknown>)
      const toolbarBag = bindDom(aria.toolbarProps)
      if (toolbarBag.role !== 'toolbar') {
        delete toolbarBag.onKeydownCapture
        delete toolbarBag.onFocusCapture
        delete toolbarBag.onBlurCapture
      }
      const merged = mergeProps(domFrom(ctx), domFrom(attrs as Record<string, any>), toolbarBag, {
        ref: (el: Element | null) => {
          rootEl.value = el as HTMLElement | null
          if (el) mountedEl = el
          syncContextRef(el)
        },
        slot: props.slot || undefined,
        class: className ?? 'react-aria-Toolbar',
        style,
        'data-orientation': orientation,
      })
      for (const key of ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-details', 'id']) {
        if (aria.toolbarProps[key] == null) delete merged[key]
      }
      return h('div', bindDom(merged), children)
    }
  },
})
