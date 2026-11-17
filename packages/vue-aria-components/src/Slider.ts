/*
 * Port of `react-aria-components@1.22.1` `Slider`
 * (`packages/react-aria-components/src/Slider.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Contexts and render state are read live. Component emits
 * are lowercase `change` / `changeend` (listeners `onChange` / `onChangeend`).
 * The state hook still receives `onChange` / `onChangeEnd`.
 */

import {
  defineComponent,
  Fragment,
  h,
  inject,
  isVNode,
  provide,
  ref,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNode,
  type VNodeChild,
} from 'vue'
import {mergeProps, useFocusVisible, useHover, useNumberFormatter, VisuallyHidden} from 'vue-aria'
import {useSlider, useSliderThumb, type Orientation} from 'vue-aria/useSlider'
import {useSliderState, type SliderState} from 'vue-stately/useSliderState'
import {filterDOMProps} from '../../vue-aria/src/utils/filterDOMProps'
import {LabelContextKey} from './context'

export type {SliderState, Orientation}

export const SliderContextKey: InjectionKey<Record<string, any> | null> = Symbol('vue-aria-components.SliderContext')
export const SliderStateContextKey: InjectionKey<SliderState | null> = Symbol('vue-aria-components.SliderStateContext')
export const SliderTrackContextKey: InjectionKey<Record<string, any> | null> = Symbol('vue-aria-components.SliderTrackContext')
export const SliderOutputContextKey: InjectionKey<Record<string, any> | null> = Symbol('vue-aria-components.SliderOutputContext')
export const SliderFillContextKey: InjectionKey<Record<string, any> | null> = Symbol('vue-aria-components.SliderFillContext')

export {SliderContextKey as SliderContext}
export {SliderStateContextKey as SliderStateContext}
export {SliderTrackContextKey as SliderTrackContext}
export {SliderOutputContextKey as SliderOutputContext}
export {SliderFillContextKey as SliderFillContext}

export interface SliderRenderProps {
  orientation: Orientation
  isDisabled: boolean
  state: SliderState
}

export interface SliderTrackRenderProps extends SliderRenderProps {
  isHovered: boolean
}

export interface SliderThumbRenderProps {
  state: SliderState
  isDragging: boolean
  isHovered: boolean
  isFocused: boolean
  isFocusVisible: boolean
  isDisabled: boolean
}

export interface SliderFillRenderProps extends SliderRenderProps {
  isHovered: boolean
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
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

function flatten(v: VNodeChild): VNode[] {
  if (v == null || typeof v === 'boolean') return []
  if (Array.isArray(v)) return v.flatMap(flatten)
  if (isVNode(v)) {
    // A Fragment is not a component boundary. A Label wrapped by one still names the slider.
    if (v.type === Fragment) return flatten(v.children as VNodeChild)
    return [v]
  }
  return []
}

function hasLabelNode(v: VNodeChild): boolean {
  return flatten(v).some((node) => componentName(node) === 'Label')
}

function componentName(v: VNode) {
  const type = v.type as {name?: string; __name?: string} | string
  if (!type || typeof type === 'string') return null
  return type.name || type.__name || null
}

function resolveClass(source: unknown, values: unknown) {
  return typeof source === 'function' ? (source as (v: unknown) => unknown)(values) : source
}

function isStyleObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function mergeRenderStyle(contextStyle: unknown, localStyle: unknown, values: Record<string, unknown>) {
  if (contextStyle == null && localStyle == null) return undefined
  if (contextStyle != null && localStyle != null) {
    if (typeof contextStyle === 'function' || typeof localStyle === 'function') {
      const contextResolved = typeof contextStyle === 'function' ? contextStyle(values) : contextStyle
      // A string context style has no object fields to copy into defaultStyle.
      // Keep the string itself so `color: red` survives a local style function.
      if (typeof contextResolved === 'string') {
        const localResolved = typeof localStyle === 'function' ? localStyle({...values, defaultStyle: {}}) : localStyle
        if (localResolved == null || localResolved === '') return contextResolved
        return [contextResolved, localResolved]
      }
      const defaultStyle = isStyleObject(contextResolved) ? {...contextResolved} : {}
      const localResolved = typeof localStyle === 'function' ? localStyle({...values, defaultStyle}) : localStyle
      if (typeof localResolved === 'string') return [defaultStyle, localResolved]
      if (isStyleObject(localResolved)) return {...defaultStyle, ...localResolved}
      return defaultStyle
    }
    if (typeof contextStyle === 'string' || typeof localStyle === 'string') {
      return [contextStyle, localStyle].filter((item) => item != null && item !== '')
    }
    if (isStyleObject(contextStyle) && isStyleObject(localStyle)) return {...contextStyle, ...localStyle}
  }
  const only = localStyle != null ? localStyle : contextStyle
  return typeof only === 'function' ? only(values) : only
}

function mergeClassNames(contextClass: unknown, localClass: unknown, values: unknown) {
  if (typeof contextClass === 'string' && typeof localClass === 'string') {
    return [contextClass, localClass].filter(Boolean).join(' ')
  }
  const chosen = localClass !== undefined ? localClass : contextClass
  const resolved = resolveClass(chosen, values)
  return resolved === '' || resolved == null ? undefined : resolved
}

function localClassValue(props: {className?: unknown}, attrs: Record<string, any>) {
  if (props.className !== undefined) return props.className
  if (attrs.className !== undefined) return attrs.className
  if (typeof attrs.class === 'string' && attrs.class !== '') return attrs.class
  if (typeof attrs.class === 'function') return attrs.class
  return undefined
}

function layerStyle(position: Record<string, unknown>, extra: unknown) {
  if (extra == null || extra === '') return position
  if (typeof extra === 'string') return [position, extra]
  if (Array.isArray(extra)) return [position, ...extra]
  if (isStyleObject(extra)) return {...position, ...extra}
  return [position, extra]
}

function readSlotContext(ctx: Record<string, any> | null | undefined, slot?: string | null) {
  if (!ctx) return null
  if (slot && ctx.slots && ctx.slots[slot]) return ctx.slots[slot] as Record<string, any>
  return ctx
}

function pick<T>(local: T | undefined, ctx: Record<string, any> | null, key: string): T | undefined {
  if (local !== undefined) return local
  if (ctx && ctx[key] !== undefined) return ctx[key] as T
  return undefined
}

function domFrom(source: Record<string, any> | null | undefined) {
  if (!source) return {}
  const copy: Record<string, any> = {}
  for (const key of Object.keys(source)) {
    if (key === 'class' || key === 'style' || key === 'className' || key === 'id' || key === 'ref' || key === 'slots' || key === 'render') continue
    copy[key] = source[key]
  }
  return filterDOMProps(copy, {global: true, labelable: false, events: true})
}

function boolAttr(value: boolean) {
  return value ? 'true' : undefined
}

/**
 * Copy a prop bag into a plain object. Hook objects keep live getters, but a
 * native vnode must store the values read during this render. If both the
 * previous and next vnodes share those getters, Vue's patch reads the current
 * value from both sides and skips min, max, and aria-valuetext updates.
 */
function bindDom(props: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const key of Object.keys(props)) {
    const value = props[key]
    if (value !== undefined) out[key] = value
  }
  return out
}

const sliderPropDefs = {
  value: {type: null as unknown as PropType<number | number[] | undefined>, default: undefined},
  defaultValue: {type: null as unknown as PropType<number | number[] | undefined>, default: undefined},
  minValue: {type: Number, default: undefined},
  maxValue: {type: Number, default: undefined},
  step: {type: Number, default: undefined},
  orientation: {type: String as PropType<Orientation | undefined>, default: undefined},
  isDisabled: {type: Boolean, default: undefined},
  formatOptions: {type: Object as PropType<Intl.NumberFormatOptions | undefined>, default: undefined},
  id: {type: String, default: undefined},
  label: {type: null as unknown as PropType<unknown>, default: undefined},
  name: {type: String, default: undefined},
  form: {type: String, default: undefined},
  'aria-label': {type: String, default: undefined},
  'aria-labelledby': {type: String, default: undefined},
  'aria-describedby': {type: String, default: undefined},
  'aria-details': {type: String, default: undefined},
  slot: {type: String, default: undefined},
  className: {type: null as unknown as PropType<any>, default: undefined},
  style: {type: null as unknown as PropType<any>, default: undefined},
  onChangeEnd: {type: Function as PropType<(value: number | number[]) => void>, default: undefined},
}

export const Slider = defineComponent({
  name: 'Slider',
  inheritAttrs: false,
  props: sliderPropDefs,
  emits: ['change', 'changeend'],
  setup(props, {slots, attrs, emit}) {
    const ctxSource = inject(SliderContextKey, null)
    const resolved = () => readSlotContext(ctxSource, props.slot ?? (attrs.slot as string | undefined))
    const hasLabel = ref(false)

    const numberFormatter = useNumberFormatter(() => pick(props.formatOptions, resolved(), 'formatOptions') as Intl.NumberFormatOptions | undefined)
    const state = useSliderState({
      numberFormatter,
      value: () => pick(props.value, resolved(), 'value'),
      defaultValue: () => pick(props.defaultValue, resolved(), 'defaultValue'),
      minValue: () => pick(props.minValue, resolved(), 'minValue'),
      maxValue: () => pick(props.maxValue, resolved(), 'maxValue'),
      step: () => pick(props.step, resolved(), 'step'),
      orientation: () => pick(props.orientation, resolved(), 'orientation'),
      isDisabled: () => pick(props.isDisabled, resolved(), 'isDisabled'),
      label: () => pick(props.label, resolved(), 'label'),
      'aria-label': () => pick(props['aria-label'], resolved(), 'aria-label'),
      'aria-labelledby': () => pick(props['aria-labelledby'], resolved(), 'aria-labelledby'),
      onChange: (value) => {
        resolved()?.onChange?.(value)
        emit('change', value)
      },
      onChangeEnd: (value) => {
        resolved()?.onChangeEnd?.(value)
        props.onChangeEnd?.(value)
        emit('changeend', value)
      },
    })
    const trackRef = ref<HTMLElement | null>(null)
    const labelRef = ref<Element | null>(null)
    const aria = useSlider(
      {
        id: () => pick(props.id, resolved(), 'id'),
        label: () => {
          if (pick(props['aria-label'], resolved(), 'aria-label') || pick(props['aria-labelledby'], resolved(), 'aria-labelledby')) return undefined
          return hasLabel.value || pick(props.label, resolved(), 'label') || undefined
        },
        'aria-label': () => pick(props['aria-label'], resolved(), 'aria-label'),
        'aria-labelledby': () => pick(props['aria-labelledby'], resolved(), 'aria-labelledby'),
        'aria-describedby': () => pick(props['aria-describedby'], resolved(), 'aria-describedby'),
        'aria-details': () => pick(props['aria-details'], resolved(), 'aria-details'),
        isDisabled: () => Boolean(pick(props.isDisabled, resolved(), 'isDisabled')),
        orientation: () => state.orientation,
      },
      state,
      trackRef,
    )

    const labelCtx: Record<string, any> = {ref: labelRef}
    defineLive(labelCtx, 'id', () => aria.labelProps.id)
    defineLive(labelCtx, 'onClick', () => aria.labelProps.onClick)
    const trackCtx: Record<string, any> = {ref: trackRef}
    for (const key of Object.keys(aria.trackProps)) {
      defineLive(trackCtx, key, () => aria.trackProps[key])
    }
    const outputCtx: Record<string, any> = {}
    for (const key of Object.keys(aria.outputProps)) {
      defineLive(outputCtx, key, () => aria.outputProps[key])
    }
    provide(SliderStateContextKey, state)
    provide(SliderTrackContextKey, trackCtx)
    provide(SliderOutputContextKey, outputCtx)
    provide(LabelContextKey, labelCtx)

    return () => {
      const values: SliderRenderProps = {
        orientation: state.orientation,
        isDisabled: state.isDisabled,
        state,
      }
      const children = slots.default?.(values)
      const labelled = hasLabelNode(children)
      if (hasLabel.value !== labelled) hasLabel.value = labelled
      const ctx = resolved()
      const className = mergeClassNames(ctx?.className, localClassValue(props, attrs as Record<string, any>), values)
      const style = mergeRenderStyle(ctx?.style, props.style ?? (attrs as any).style, values as unknown as Record<string, unknown>)
      return h(
        'div',
        bindDom(mergeProps(domFrom(ctx), domFrom(attrs as Record<string, any>), aria.groupProps, {
          ref: (el: Element | null) => {
            assignRef(ctx?.ref, el)
            assignRef((attrs as any).ref, el)
          },
          slot: props.slot || undefined,
          class: className ?? 'react-aria-Slider',
          style,
          'data-orientation': state.orientation,
          'data-disabled': boolAttr(state.isDisabled),
        })),
        children,
      )
    }
  },
})

export interface SliderProps {
  value?: number | number[]
  defaultValue?: number | number[]
  minValue?: number
  maxValue?: number
  step?: number
  orientation?: Orientation
  isDisabled?: boolean
  formatOptions?: Intl.NumberFormatOptions
  id?: string
  name?: string
  form?: string
  slot?: string
  className?: string | ((values: SliderRenderProps) => string)
  style?: any
  onChange?: (value: number | number[]) => void
  onChangeend?: (value: number | number[]) => void
  /** RAC callback. Vue's emit listener is `onChangeend`. */
  onChangeEnd?: (value: number | number[]) => void
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-details'?: string
}

export const SliderOutput = defineComponent({
  name: 'SliderOutput',
  inheritAttrs: false,
  props: {
    className: {type: null as unknown as PropType<any>, default: undefined},
    style: {type: null as unknown as PropType<any>, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const state = inject(SliderStateContextKey, null) as SliderState
    const ctx = inject(SliderOutputContextKey, null)
    return () => {
      const values: SliderRenderProps = {
        orientation: state.orientation,
        isDisabled: state.isDisabled,
        state,
      }
      const className = mergeClassNames(ctx?.className, localClassValue(props, attrs as Record<string, any>), values)
      const style = mergeRenderStyle(ctx?.style, props.style ?? (attrs as any).style, values as unknown as Record<string, unknown>)
      const content = slots.default?.(values)
      return h(
        'output',
        bindDom(mergeProps(ctx ?? {}, domFrom(attrs as Record<string, any>), {
          ref: (el: Element | null) => assignRef(ctx?.ref, el),
          class: className ?? 'react-aria-SliderOutput',
          style,
          for: ctx?.htmlFor,
          'data-orientation': state.orientation,
          'data-disabled': boolAttr(state.isDisabled),
        })),
        content ?? state.getFormattedValue(),
      )
    }
  },
})

export interface SliderOutputProps {
  className?: string | ((values: SliderRenderProps) => string)
  style?: any
}

export const SliderTrack = defineComponent({
  name: 'SliderTrack',
  inheritAttrs: false,
  props: {
    className: {type: null as unknown as PropType<any>, default: undefined},
    style: {type: null as unknown as PropType<any>, default: undefined},
    onHoverStart: {type: Function, default: undefined},
    onHoverEnd: {type: Function, default: undefined},
    onHoverChange: {type: Function, default: undefined},
  },
  emits: ['hoverstart', 'hoverend', 'hoverchange'],
  setup(props, {slots, attrs, emit}) {
    const state = inject(SliderStateContextKey, null) as SliderState
    const ctx = inject(SliderTrackContextKey, null)
    const {hoverProps, isHovered} = useHover({
      isDisabled: () => state.isDisabled,
      onHoverStart: (event) => {
        props.onHoverStart?.(event)
        emit('hoverstart', event)
      },
      onHoverEnd: (event) => {
        props.onHoverEnd?.(event)
        emit('hoverend', event)
      },
      onHoverChange: (value) => {
        props.onHoverChange?.(value)
        emit('hoverchange', value)
      },
    })
    return () => {
      const values: SliderTrackRenderProps = {
        orientation: state.orientation,
        isDisabled: state.isDisabled,
        isHovered: isHovered.value,
        state,
      }
      const className = mergeClassNames(ctx?.className, localClassValue(props, attrs as Record<string, any>), values)
      const behavior = {position: 'relative' as const, touchAction: 'none' as const}
      const userStyle = mergeRenderStyle(ctx?.style, props.style ?? (attrs as any).style, values as unknown as Record<string, unknown>)
      return h(
        'div',
        bindDom(mergeProps(domFrom(ctx), hoverProps, domFrom(attrs as Record<string, any>), {
          ref: (el: Element | null) => {
            assignRef(ctx?.ref, el)
            assignRef((attrs as any).ref, el)
          },
          class: className ?? 'react-aria-SliderTrack',
          style: layerStyle(behavior, userStyle),
          'data-hovered': boolAttr(isHovered.value),
          'data-orientation': state.orientation,
          'data-disabled': boolAttr(state.isDisabled),
        })),
        slots.default?.(values),
      )
    }
  },
})

export interface SliderTrackProps {
  className?: string | ((values: SliderTrackRenderProps) => string)
  style?: any
  onHoverStart?: (event: any) => void
  onHoverEnd?: (event: any) => void
  onHoverChange?: (isHovered: boolean) => void
  onHoverstart?: (event: any) => void
  onHoverend?: (event: any) => void
  onHoverchange?: (isHovered: boolean) => void
}

export const SliderThumb = defineComponent({
  name: 'SliderThumb',
  inheritAttrs: false,
  props: {
    index: {type: Number, default: undefined},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    inputRef: {type: Object as PropType<Ref<HTMLInputElement | null> | null>, default: undefined},
    orientation: {type: String as PropType<Orientation | undefined>, default: undefined},
    label: {default: undefined},
    'aria-label': {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    'aria-describedby': {type: String, default: undefined},
    'aria-details': {type: String, default: undefined},
    'aria-errormessage': {type: String, default: undefined},
    isRequired: {type: Boolean, default: undefined},
    isInvalid: {type: Boolean, default: undefined},
    validationState: {type: String as PropType<'valid' | 'invalid' | undefined>, default: undefined},
    autoFocus: {type: Boolean, default: undefined},
    onKeyDown: {type: Function as PropType<(event: KeyboardEvent) => void>, default: undefined},
    onKeyUp: {type: Function as PropType<(event: KeyboardEvent) => void>, default: undefined},
    className: {type: null as unknown as PropType<any>, default: undefined},
    style: {type: null as unknown as PropType<any>, default: undefined},
    onHoverStart: {type: Function, default: undefined},
    onHoverEnd: {type: Function, default: undefined},
    onHoverChange: {type: Function, default: undefined},
  },
  emits: ['hoverstart', 'hoverend', 'hoverchange', 'focus', 'blur'],
  setup(props, {slots, attrs, emit}) {
    const state = inject(SliderStateContextKey, null) as SliderState
    const track = inject(SliderTrackContextKey, null)
    const trackRef = (track?.ref as Ref<Element | null>) ?? ref(null)
    const internalInput = ref<HTMLInputElement | null>(null)
    const inputRef = (props.inputRef as Ref<HTMLInputElement | null> | null) || internalInput
    const hasThumbLabel = ref(false)
    const thumb = useSliderThumb(
      {
        index: () => props.index,
        name: () => props.name ?? (attrs.name as string | undefined),
        form: () => props.form ?? (attrs.form as string | undefined),
        isDisabled: () => props.isDisabled,
        orientation: () => props.orientation,
        label: () => {
          if (props['aria-label'] || attrs['aria-label'] || props['aria-labelledby'] || attrs['aria-labelledby']) {
            return props.label
          }
          return props.label || (hasThumbLabel.value ? true : undefined)
        },
        'aria-label': () => props['aria-label'] ?? (attrs['aria-label'] as string | undefined),
        'aria-labelledby': () => props['aria-labelledby'] ?? (attrs['aria-labelledby'] as string | undefined),
        'aria-describedby': () => props['aria-describedby'] ?? (attrs['aria-describedby'] as string | undefined),
        'aria-details': () => props['aria-details'] ?? (attrs['aria-details'] as string | undefined),
        'aria-errormessage': () => props['aria-errormessage'],
        isRequired: () => props.isRequired,
        isInvalid: () => props.isInvalid,
        validationState: () => props.validationState,
        autoFocus: () => props.autoFocus ?? (attrs.autoFocus as boolean | undefined),
        onKeyDown: (event) => {
          props.onKeyDown?.(event)
          ;(attrs.onKeydown as ((event: KeyboardEvent) => void) | undefined)?.(event)
          ;(attrs.onKeyDown as ((event: KeyboardEvent) => void) | undefined)?.(event)
        },
        onKeyUp: (event) => {
          props.onKeyUp?.(event)
          ;(attrs.onKeyup as ((event: KeyboardEvent) => void) | undefined)?.(event)
          ;(attrs.onKeyUp as ((event: KeyboardEvent) => void) | undefined)?.(event)
        },
        trackRef,
        inputRef,
        onFocus: (event) => emit('focus', event),
        onBlur: (event) => emit('blur', event),
      },
      state,
    )
    const {hoverProps, isHovered} = useHover({
      isDisabled: () => thumb.isDisabled,
      onHoverStart: (event) => {
        props.onHoverStart?.(event)
        emit('hoverstart', event)
      },
      onHoverEnd: (event) => {
        props.onHoverEnd?.(event)
        emit('hoverend', event)
      },
      onHoverChange: (value) => {
        props.onHoverChange?.(value)
        emit('hoverchange', value)
      },
    })
    const {isFocusVisible, focusProps} = useFocusVisible({isDisabled: () => thumb.isDisabled})
    const labelCtx: Record<string, any> = {}
    defineLive(labelCtx, 'id', () => thumb.labelProps.id)
    defineLive(labelCtx, 'htmlFor', () => thumb.labelProps.htmlFor)
    defineLive(labelCtx, 'for', () => thumb.labelProps.for)
    provide(LabelContextKey, labelCtx)

    return () => {
      const values: SliderThumbRenderProps = {
        state,
        isDragging: thumb.isDragging,
        isHovered: isHovered.value,
        isFocused: thumb.isFocused,
        isFocusVisible: isFocusVisible.value,
        isDisabled: thumb.isDisabled,
      }
      const children = slots.default?.(values)
      if (hasThumbLabel.value !== hasLabelNode(children)) hasThumbLabel.value = hasLabelNode(children)
      const className = mergeClassNames(undefined, localClassValue(props, attrs as Record<string, any>), values)
      const userStyle = mergeRenderStyle(undefined, props.style ?? (attrs as any).style, values as unknown as Record<string, unknown>)
      return h(
        'div',
        bindDom(mergeProps(domFrom(attrs as Record<string, any>), thumb.thumbProps, hoverProps, {
          class: className ?? 'react-aria-SliderThumb',
          style: layerStyle(thumb.thumbProps.style ?? {}, userStyle),
          'data-hovered': boolAttr(values.isHovered),
          'data-dragging': boolAttr(values.isDragging),
          'data-focused': boolAttr(values.isFocused),
          'data-focus-visible': boolAttr(values.isFocusVisible),
          'data-disabled': boolAttr(values.isDisabled),
        })),
        [
          h(VisuallyHidden, () => h('input', bindDom(mergeProps(thumb.inputProps, focusProps, {ref: inputRef})))),
          children,
        ],
      )
    }
  },
})

export interface SliderThumbProps {
  index?: number
  name?: string
  form?: string
  isDisabled?: boolean
  inputRef?: Ref<HTMLInputElement | null> | null
  orientation?: Orientation
  autoFocus?: boolean
  className?: string | ((values: SliderThumbRenderProps) => string)
  style?: any
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-details'?: string
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
  onHoverStart?: (event: any) => void
  onHoverEnd?: (event: any) => void
  onHoverChange?: (isHovered: boolean) => void
  /** Vue listener for the lowercase `hoverstart` emit. */
  onHoverstart?: (event: any) => void
  /** Vue listener for the lowercase `hoverend` emit. */
  onHoverend?: (event: any) => void
  /** Vue listener for the lowercase `hoverchange` emit. */
  onHoverchange?: (isHovered: boolean) => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
}

export const SliderFill = defineComponent({
  name: 'SliderFill',
  inheritAttrs: false,
  props: {
    offset: {type: Number, default: undefined},
    className: {type: null as unknown as PropType<any>, default: undefined},
    style: {type: null as unknown as PropType<any>, default: undefined},
    onHoverStart: {type: Function, default: undefined},
    onHoverEnd: {type: Function, default: undefined},
    onHoverChange: {type: Function, default: undefined},
  },
  emits: ['hoverstart', 'hoverend', 'hoverchange'],
  setup(props, {slots, attrs, emit}) {
    const state = inject(SliderStateContextKey, null) as SliderState
    const ctx = inject(SliderFillContextKey, null)
    const {hoverProps, isHovered} = useHover({
      isDisabled: () => state.isDisabled,
      onHoverStart: (event) => {
        props.onHoverStart?.(event)
        emit('hoverstart', event)
      },
      onHoverEnd: (event) => {
        props.onHoverEnd?.(event)
        emit('hoverend', event)
      },
      onHoverChange: (value) => {
        props.onHoverChange?.(value)
        emit('hoverchange', value)
      },
    })
    return () => {
      const values: SliderFillRenderProps = {
        orientation: state.orientation,
        isDisabled: state.isDisabled,
        isHovered: isHovered.value,
        state,
      }
      const rawOffset = props.offset != null ? props.offset : (ctx?.offset as number | undefined)
      const offset = rawOffset != null
        ? Math.min(Math.max(rawOffset, state.getThumbMinValue(0)), state.getThumbMaxValue(0))
        : state.getThumbMinValue(0)
      const start = state.values.length > 1 ? state.getThumbPercent(0) * 100 : state.getValuePercent(offset) * 100
      const end = state.values.length > 0 ? state.getThumbPercent(state.values.length - 1) * 100 : 0
      const startPercent = Math.min(start, end)
      const endPercent = Math.max(start, end)
      const sizePercent = Math.max(0, endPercent - startPercent)
      const position = state.orientation === 'vertical'
        ? {position: 'absolute', bottom: `${startPercent}%`, height: `${sizePercent}%`, width: '100%'}
        : {position: 'absolute', insetInlineStart: `${startPercent}%`, width: `${sizePercent}%`, height: '100%'}
      const className = mergeClassNames(ctx?.className, localClassValue(props, attrs as Record<string, any>), values)
      const userStyle = mergeRenderStyle(ctx?.style, props.style ?? (attrs as any).style, {...values, defaultStyle: position} as unknown as Record<string, unknown>)
      return h(
        'div',
        bindDom(mergeProps(domFrom(ctx), hoverProps, domFrom(attrs as Record<string, any>), {
          ref: (el: Element | null) => assignRef(ctx?.ref, el),
          class: className ?? 'react-aria-SliderFill',
          style: layerStyle(position, userStyle),
          'data-hovered': boolAttr(isHovered.value),
          'data-orientation': state.orientation,
          'data-disabled': boolAttr(state.isDisabled),
        })),
        slots.default?.(values),
      )
    }
  },
})

export interface SliderFillProps {
  offset?: number
  className?: string | ((values: SliderFillRenderProps) => string)
  style?: any
  onHoverStart?: (event: any) => void
  onHoverEnd?: (event: any) => void
  onHoverChange?: (isHovered: boolean) => void
  /** Vue listener for the lowercase `hoverstart` emit. */
  onHoverstart?: (event: any) => void
  /** Vue listener for the lowercase `hoverend` emit. */
  onHoverend?: (event: any) => void
  /** Vue listener for the lowercase `hoverchange` emit. */
  onHoverchange?: (isHovered: boolean) => void
}
