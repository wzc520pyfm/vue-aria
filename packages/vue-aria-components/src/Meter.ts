/*
 * Port of `react-aria-components@1.22.1` `Meter`
 * (`packages/react-aria-components/src/Meter.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Meter has no indeterminate presentation.
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
import {mergeProps, useMeter} from 'vue-aria'
import {LabelContextKey} from './context'
import {
  assignRef,
  assignRefIfCurrent,
  bindDom,
  clamp,
  defineLive,
  domFrom,
  hasLabelNode,
  localClassValue,
  mergeClassNames,
  mergeRenderStyle,
  pick,
  readNumber,
  readSlotContext,
} from './progressDom'

export const MeterContextKey: InjectionKey<Record<string, any> | null> = Symbol('vue-aria-components.MeterContext')
export {MeterContextKey as MeterContext}

export interface MeterRenderProps {
  /** The value as a percentage between the minimum and maximum. */
  percentage: number
  /** A formatted version of the value. */
  valueText: string | undefined
}

export interface MeterProps {
  value?: number
  minValue?: number
  maxValue?: number
  formatOptions?: Intl.NumberFormatOptions
  valueLabel?: unknown
  id?: string
  slot?: string | null
  className?: string | ((values: MeterRenderProps & {defaultClassName?: string}) => string)
  style?: unknown
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-details'?: string
}

const meterPropDefs = {
  value: {type: Number, default: undefined},
  minValue: {type: Number, default: undefined},
  maxValue: {type: Number, default: undefined},
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

export const Meter = defineComponent({
  name: 'Meter',
  inheritAttrs: false,
  props: meterPropDefs,
  setup(props, {slots, attrs}) {
    const instance = getCurrentInstance()
    const ctxSource = inject(MeterContextKey, null)
    const resolved = () => readSlotContext(ctxSource, props.slot ?? (attrs.slot as string | undefined))
    const hasLabel = ref(false)
    const rootEl = ref<Element | null>(null)
    const labelRef = ref<Element | null>(null)
    let mountedEl: Element | null = null

    const aria = useMeter({
      value: () => pick(props.value, resolved(), 'value'),
      minValue: () => pick(props.minValue, resolved(), 'minValue'),
      maxValue: () => pick(props.maxValue, resolved(), 'maxValue'),
      formatOptions: () => pick(props.formatOptions, resolved(), 'formatOptions'),
      valueLabel: () => pick(props.valueLabel, resolved(), 'valueLabel'),
      id: () => pick(props.id, resolved(), 'id') ?? (attrs.id as string | undefined),
      label: () => hasLabel.value || undefined,
      'aria-label': () => pick(props['aria-label'], resolved(), 'aria-label'),
      'aria-labelledby': () => pick(props['aria-labelledby'], resolved(), 'aria-labelledby'),
      'aria-describedby': () => pick(props['aria-describedby'], resolved(), 'aria-describedby'),
      'aria-details': () => pick(props['aria-details'], resolved(), 'aria-details'),
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
    onMounted(syncExternal)
    onUpdated(syncExternal)
    onUnmounted(() => {
      assignRefIfCurrent(resolved()?.ref, null, mountedEl)
      assignRefIfCurrent(externalRef(), null, mountedEl)
      rootEl.value = null
      mountedEl = null
    })

    return () => {
      const ctx = resolved()
      const minValue = readNumber(pick(props.minValue, ctx, 'minValue'), 0)
      const maxValue = readNumber(pick(props.maxValue, ctx, 'maxValue'), 100)
      const value = clamp(readNumber(pick(props.value, ctx, 'value'), 0), minValue, maxValue)
      const range = maxValue - minValue
      const percentage = range === 0 ? 0 : ((value - minValue) / range) * 100
      const values: MeterRenderProps = {
        percentage,
        valueText: aria.meterProps['aria-valuetext'],
      }
      const children = slots.default?.(values)
      const labelled = hasLabelNode(children)
      if (hasLabel.value !== labelled) hasLabel.value = labelled
      const className = mergeClassNames(
        ctx?.className,
        localClassValue(props, attrs as Record<string, any>),
        values,
        'react-aria-Meter',
      )
      const style = mergeRenderStyle(ctx?.style, props.style ?? (attrs as any).style, values as unknown as Record<string, unknown>)
      return h(
        'div',
        bindDom(mergeProps(domFrom(ctx), domFrom(attrs as Record<string, any>), aria.meterProps, {
          ref: (el: Element | null) => {
            rootEl.value = el
            if (el) mountedEl = el
            assignRefIfCurrent(ctx?.ref, el, mountedEl)
            if (!el) mountedEl = null
          },
          slot: props.slot || undefined,
          class: className ?? 'react-aria-Meter',
          style,
        })),
        children,
      )
    }
  },
})
