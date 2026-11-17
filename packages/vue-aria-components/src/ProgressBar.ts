/*
 * Port of `react-aria-components@1.22.1` `ProgressBar`
 * (`packages/react-aria-components/src/ProgressBar.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Render state and context are read during render.
 * Hook props are copied into a fresh vnode bag on each render.
 */

import {
  defineComponent,
  getCurrentInstance,
  h,
  inject,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
  ref,
  type InjectionKey,
  type PropType,
} from 'vue'
import {mergeProps, useProgressBar} from 'vue-aria'
import {LabelContextKey} from './context'
import {
  assignRef,
  assignRefIfCurrent,
  bindDom,
  clamp,
  defineLive,
  domFrom,
  localClassValue,
  mergeClassNames,
  mergeRenderStyle,
  pick,
  readAriaProp,
  readNumber,
  readSlotContext,
  useImplicitLabelPresence,
} from './progressDom'

export const ProgressBarContextKey: InjectionKey<Record<string, any> | null> = Symbol('vue-aria-components.ProgressBarContext')
export {ProgressBarContextKey as ProgressBarContext}

export interface ProgressBarRenderProps {
  /** The value as a percentage between the minimum and maximum. */
  percentage: number | undefined
  /** A formatted version of the value. */
  valueText: string | undefined
  /** Whether the progress bar is indeterminate. */
  isIndeterminate: boolean
}

export type ProgressBarStyle =
  | string
  | Record<string, any>
  | ((values: ProgressBarRenderProps & {defaultStyle: Record<string, any>}) => string | Record<string, any> | null | undefined)

export interface ProgressBarProps {
  value?: number
  minValue?: number
  maxValue?: number
  isIndeterminate?: boolean
  formatOptions?: Intl.NumberFormatOptions
  valueLabel?: unknown
  id?: string
  slot?: string | null
  className?: string | ((values: ProgressBarRenderProps & {defaultClassName?: string}) => string)
  style?: ProgressBarStyle
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-details'?: string
}

const progressBarPropDefs = {
  value: {type: Number, default: undefined},
  minValue: {type: Number, default: undefined},
  maxValue: {type: Number, default: undefined},
  isIndeterminate: {type: null as unknown as PropType<boolean | undefined>, default: undefined},
  formatOptions: {type: Object as PropType<Intl.NumberFormatOptions | undefined>, default: undefined},
  valueLabel: {type: null as unknown as PropType<any>, default: undefined},
  id: {type: String, default: undefined},
  slot: {type: String as PropType<string | null | undefined>, default: undefined},
  className: {type: null as unknown as PropType<any>, default: undefined},
  style: {type: null as unknown as PropType<any>, default: undefined},
  'aria-label': {type: String, default: undefined},
  'aria-labelledby': {type: String, default: undefined},
  'aria-describedby': {type: String, default: undefined},
  'aria-details': {type: String, default: undefined},
}

export const ProgressBar = defineComponent({
  name: 'ProgressBar',
  inheritAttrs: false,
  props: progressBarPropDefs,
  setup(props, {slots, attrs}) {
    const instance = getCurrentInstance()
    const ctxSource = inject(ProgressBarContextKey, null)
    const slotValue = () => (props.slot !== undefined ? props.slot : (attrs.slot as string | null | undefined))
    const resolved = () => readSlotContext(ctxSource, slotValue())
    const rootEl = ref<Element | null>(null)
    const labelRef = ref<Element | null>(null)
    const hasLabel = useImplicitLabelPresence(
      () => Boolean(
        readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-label')
        || readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-labelledby'),
      ),
      labelRef,
    )
    let mountedEl: Element | null = null
    let boundContextRef: unknown
    let boundContextEl: Element | null = null

    const aria = useProgressBar({
      value: () => pick(props.value, resolved(), 'value'),
      minValue: () => pick(props.minValue, resolved(), 'minValue'),
      maxValue: () => pick(props.maxValue, resolved(), 'maxValue'),
      isIndeterminate: () => pick(props.isIndeterminate, resolved(), 'isIndeterminate'),
      formatOptions: () => pick(props.formatOptions, resolved(), 'formatOptions'),
      valueLabel: () => pick(props.valueLabel, resolved(), 'valueLabel'),
      id: () => pick(props.id, resolved(), 'id') ?? (attrs.id as string | undefined),
      label: () => hasLabel.value || undefined,
      'aria-label': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-label'),
      'aria-labelledby': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-labelledby'),
      'aria-describedby': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-describedby'),
      'aria-details': () => readAriaProp(props, attrs as Record<string, any>, resolved(), 'aria-details'),
    })

    const labelCtx: Record<string, any> = {ref: labelRef, elementType: 'span'}
    defineLive(labelCtx, 'id', () => aria.labelProps.id)
    provide(LabelContextKey, labelCtx)

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
      const next = resolved()?.ref
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
      const isIndeterminate = Boolean(pick(props.isIndeterminate, ctx, 'isIndeterminate'))
      const minValue = readNumber(pick(props.minValue, ctx, 'minValue'), 0)
      const maxValue = readNumber(pick(props.maxValue, ctx, 'maxValue'), 100)
      const value = clamp(readNumber(pick(props.value, ctx, 'value'), 0), minValue, maxValue)
      const range = maxValue - minValue
      const percentage = isIndeterminate ? undefined : range === 0 ? 0 : ((value - minValue) / range) * 100
      const values: ProgressBarRenderProps = {
        percentage,
        valueText: aria.progressBarProps['aria-valuetext'],
        isIndeterminate,
      }
      const children = slots.default?.(values)
      const className = mergeClassNames(
        ctx?.className,
        localClassValue(props, attrs as Record<string, any>),
        values,
        'react-aria-ProgressBar',
      )
      const style = mergeRenderStyle(ctx?.style, props.style ?? (attrs as any).style, values as unknown as Record<string, unknown>)
      return h(
        'div',
        bindDom(mergeProps(domFrom(ctx), domFrom(attrs as Record<string, any>), aria.progressBarProps, {
          ref: (el: Element | null) => {
            rootEl.value = el
            if (el) mountedEl = el
            syncContextRef(el)
          },
          slot: props.slot || undefined,
          class: className ?? 'react-aria-ProgressBar',
          style,
        })),
        children,
      )
    }
  },
})
