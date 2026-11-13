/*
 * Port of `react-aria-components@1.22.1` `DateField` (including `TimeField`,
 * `DateInput`, and `DateSegment`)
 * (`packages/react-aria-components/src/DateField.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: `FieldError`/`Form`/`FormContext` and the deferred
 * DatePicker/DateRangePicker branches are intentionally out of scope, context
 * values keep live getters instead of spread snapshots, and Hero UI data-*
 * attributes are emitted locally as "true" strings.
 */

import {
  defineComponent,
  h,
  inject,
  provide,
  ref,
  type InjectionKey,
  type PropType,
  type Ref,
} from 'vue'
import {Fragment, isVNode, type VNode, type VNodeChild} from 'vue'
import {
  createCalendar as createDefaultCalendar,
  type DateValue as IntlDateValue,
} from '@internationalized/date'
import {useDateField, useDateSegment} from 'vue-aria/useDateField'
import {useTimeField} from 'vue-aria/useTimeField'
import {useDateFieldState, type DateFieldState} from 'vue-stately/useDateFieldState'
import {useTimeFieldState, type TimeFieldState} from 'vue-stately/useTimeFieldState'
import {useLocale} from 'vue-aria/I18nProvider'
import {mergeProps, useFocusVisible, useHover} from 'vue-aria'
import type {Granularity} from 'vue-stately/useDateFieldState'
import {Group, GroupContextKey} from './Group'
import {HiddenDateInput} from './HiddenDateInput'
import {Input} from './Input'
import {
  InputContextKey,
  LabelContextKey,
  TextContextKey,
} from './context'

export interface DateFieldRenderProps {
  /** State of the date field. */
  state: DateFieldState
  /** Whether the date field is invalid. */
  isInvalid: boolean
  /** Whether the date field is disabled. */
  isDisabled: boolean
  /** Whether the date field is read only. */
  isReadOnly: boolean
  /** Whether the date field is required. */
  isRequired: boolean
}

export interface DateFieldProps {
  value?: any
  defaultValue?: any
  onChange?: (value: any) => void
  minValue?: any
  maxValue?: any
  placeholderValue?: any
  hourCycle?: 12 | 24
  granularity?: Granularity
  hideTimeZone?: boolean
  shouldForceLeadingZeros?: boolean
  isDateUnavailable?: (date: IntlDateValue) => boolean
  validate?: (value: any) => any
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  /** @deprecated Use `isInvalid` instead. */
  validationState?: 'valid' | 'invalid'
  /** @default 'native' */
  validationBehavior?: 'aria' | 'native'
  name?: string
  form?: string
  autoComplete?: string
  autoFocus?: boolean
  createCalendar?: (identifier: any) => any
  id?: string
  slot?: string
  class?: any
  style?: any
}

export interface TimeFieldProps extends Omit<DateFieldProps, 'createCalendar'> {}

export const DateFieldContextKey: InjectionKey<Record<string, any> | null> = Symbol(
  'vue-aria-components.DateFieldContext',
)
export {DateFieldContextKey as DateFieldContext}
export const TimeFieldContextKey: InjectionKey<Record<string, any> | null> = Symbol(
  'vue-aria-components.TimeFieldContext',
)
export {TimeFieldContextKey as TimeFieldContext}
export const DateFieldStateContextKey: InjectionKey<DateFieldState | null> = Symbol(
  'vue-aria-components.DateFieldStateContext',
)
export {DateFieldStateContextKey as DateFieldStateContext}
export const TimeFieldStateContextKey: InjectionKey<TimeFieldState | null> = Symbol(
  'vue-aria-components.TimeFieldStateContext',
)
export {TimeFieldStateContextKey as TimeFieldStateContext}

function flatten(v: VNodeChild): VNode[] {
  if (v == null || typeof v === 'boolean') return []
  if (Array.isArray(v)) return v.flatMap(flatten)
  if (isVNode(v)) {
    if (v.type === Fragment) return flatten(v.children as any)
    return [v]
  }
  return []
}

function getComponentName(v: VNode): string | null {
  const t: any = v.type
  if (!t) return null
  if (typeof t === 'string') return null
  return t.name || t.__name || null
}

function detectLabel(vnodes: Array<VNode>): boolean {
  // Only top-level composition counts: a <Label> directly inside the field.
  for (const vnode of vnodes) {
    if (getComponentName(vnode) === 'Label') return true
  }
  return false
}

/**
 * Live copy of a plain object with getters — never snapshots values.
 * Function values (event handlers) are copied as plain writable values so
 * `mergeProps` can chain them with later handler objects — a getter-only
 * accessor would be silently overwritten by a plain handler instead of
 * chaining.
 */
function liveCopy(source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'function') {
      Object.defineProperty(out, key, {
        value: source[key],
        enumerable: true,
        configurable: true,
        writable: true,
      })
      continue
    }
    let override: {value: any} | null = null
    Object.defineProperty(out, key, {
      get: () => (override ? override.value : source[key]),
      // Vue's vnode normalization assigns normalized `class`/`style` to the
      // props object — a getter-only accessor would throw there. The setter
      // lets that assignment land without breaking liveness of other keys.
      set: (value: any) => {
        override = {value}
      },
      enumerable: true,
      configurable: true,
    })
  }
  return out
}

function resolveAriaProps(props: any, attrs: Record<string, any>) {
  return {
    get id() {
      return (attrs.id ?? props.id) as string | undefined
    },
    get 'aria-label'() {
      return (attrs['aria-label'] ?? (props as any)['aria-label']) as string | undefined
    },
    get 'aria-labelledby'() {
      return (attrs['aria-labelledby'] ?? (props as any)['aria-labelledby']) as string | undefined
    },
    get 'aria-describedby'() {
      return (attrs['aria-describedby'] ?? (props as any)['aria-describedby']) as string | undefined
    },
  }
}

function fieldStateProps(
  props: any,
  locale: {locale: string},
  validationBehavior: () => 'aria' | 'native',
) {
  return {
    value: () => props.value,
    defaultValue: () => props.defaultValue,
    minValue: () => props.minValue,
    maxValue: () => props.maxValue,
    placeholderValue: () => props.placeholderValue,
    hourCycle: () => props.hourCycle,
    granularity: () => props.granularity,
    hideTimeZone: () => props.hideTimeZone,
    shouldForceLeadingZeros: () => props.shouldForceLeadingZeros,
    isDateUnavailable: (date: IntlDateValue) => props.isDateUnavailable?.(date) ?? false,
    validate: (value: any) => props.validate?.(value),
    isDisabled: () => props.isDisabled,
    isReadOnly: () => props.isReadOnly,
    isRequired: () => props.isRequired,
    isInvalid: () => props.isInvalid,
    validationState: () => props.validationState,
    validationBehavior,
    autoFocus: () => props.autoFocus,
    name: () => props.name,
    form: () => props.form,
    label: () => undefined,
    description: () => undefined,
    errorMessage: () => undefined,
    locale: () => locale.locale,
  }
}

function fieldAriaProps(
  props: any,
  attrs: Record<string, any>,
  validationBehavior: () => 'aria' | 'native',
  hasLabel: boolean,
  inputRef: Ref<HTMLInputElement | null>,
) {
  return {
    ...resolveAriaProps(props, attrs),
    label: () => (hasLabel ? true : undefined),
    isDisabled: () => props.isDisabled,
    isReadOnly: () => props.isReadOnly,
    isRequired: () => props.isRequired,
    isInvalid: () => props.isInvalid,
    validationState: () => props.validationState,
    validationBehavior,
    name: () => props.name,
    form: () => props.form,
    autoFocus: () => props.autoFocus,
    inputRef,
    onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
    onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
    onFocusChange: (v: boolean) => (attrs as any).onFocusChange?.(v),
  }
}

function provideFieldContexts(
  state: DateFieldState,
  fieldAria: ReturnType<typeof useDateField>,
  fieldRef: Ref<Element | null>,
  inputRef: Ref<HTMLInputElement | null>,
  stateContextKey: InjectionKey<any>,
) {
  provide(stateContextKey, state)

  const groupCtx = liveCopy(fieldAria.fieldProps as any)
  groupCtx.ref = (el: any) => {
    fieldRef.value = el
  }
  Object.defineProperties(groupCtx, {
    isInvalid: {get: () => state.isInvalid, enumerable: true, configurable: true},
    isDisabled: {get: () => state.isDisabled, enumerable: true, configurable: true},
  })
  provide(GroupContextKey, groupCtx)

  const inputCtx = liveCopy(fieldAria.inputProps as any)
  inputCtx.ref = inputRef as any
  provide(InputContextKey, inputCtx)

  const labelCtx = liveCopy(fieldAria.labelProps as any)
  labelCtx.ref = ref(null)
  ;(labelCtx as any).elementType = 'span'
  provide(LabelContextKey, labelCtx)

  provide(TextContextKey, {
    slots: {
      description: fieldAria.descriptionProps,
      errorMessage: fieldAria.errorMessageProps,
    },
  })
}

function renderField(
  props: any,
  attrs: Record<string, any>,
  slots: any,
  defaultClassName: string,
  state: DateFieldState,
) {
  const values: DateFieldRenderProps = {
    state,
    isInvalid: state.isInvalid,
    isDisabled: state.isDisabled,
    isReadOnly: state.isReadOnly,
    isRequired: props.isRequired || false,
  }
  const className =
    typeof attrs.class === 'function' ? attrs.class(values) : attrs.class
  const style = typeof attrs.style === 'function' ? attrs.style(values) : attrs.style

  const outerAttrs: Record<string, any> = {...attrs}
  delete outerAttrs.id
  delete outerAttrs.class
  delete outerAttrs.style

  return h(
    'div',
    mergeProps(outerAttrs, {
      slot: props.slot || undefined,
      class: className ?? defaultClassName,
      style,
      'data-invalid': state.isInvalid ? 'true' : undefined,
      'data-disabled': state.isDisabled ? 'true' : undefined,
      'data-readonly': state.isReadOnly ? 'true' : undefined,
      'data-required': props.isRequired ? 'true' : undefined,
    }),
    slots.default?.(values),
  )
}

/**
 * A date field allows users to enter and edit date and time values using a keyboard.
 * Each part of a date value is displayed in an individually editable segment.
 */
export const DateField = defineComponent({
  name: 'DateField',
  inheritAttrs: false,
  props: {
    value: {default: undefined},
    defaultValue: {default: undefined},
    minValue: {default: undefined},
    maxValue: {default: undefined},
    placeholderValue: {default: undefined},
    hourCycle: {type: Number as PropType<12 | 24>, default: undefined},
    granularity: {type: String as PropType<Granularity>, default: undefined},
    hideTimeZone: {type: Boolean, default: undefined},
    shouldForceLeadingZeros: {type: Boolean, default: undefined},
    isDateUnavailable: {type: Function as PropType<(date: IntlDateValue) => boolean>, default: undefined},
    validate: {type: Function as PropType<(value: any) => any>, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    isReadOnly: {type: Boolean, default: undefined},
    isRequired: {type: Boolean, default: undefined},
    isInvalid: {type: Boolean, default: undefined},
    validationState: {type: String as PropType<'valid' | 'invalid' | undefined>, default: undefined},
    validationBehavior: {type: String as PropType<'aria' | 'native' | undefined>, default: undefined},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    autoComplete: {type: String, default: undefined},
    autoFocus: {type: Boolean, default: undefined},
    createCalendar: {type: Function as PropType<(identifier: any) => any>, default: undefined},
    id: {type: String, default: undefined},
    slot: {type: String, default: undefined},
  },
  emits: ['change', 'focuschange'],
  setup(props, {slots, attrs, emit}) {
    const locale = useLocale()
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'

    // Pass live getters rather than spreading Vue props: spreading snapshots
    // controlled inputs (value/defaultValue/min/max/etc.) at setup, so later
    // parent updates would never reach the state.
    const state = useDateFieldState({
      ...fieldStateProps(props, locale, validationBehavior),
      onChange: (value: any) => emit('change', value),
      createCalendar: () => props.createCalendar ?? createDefaultCalendar,
    } as any)

    const fieldRef = ref<Element | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)

    // Detect a top-level <Label> in the default slot; the field needs to know
    // a label exists so aria-labelledby on the field includes the label id.
    let hasLabel = false
    try {
      if (slots.default) {
        const probe = slots.default({
          state,
          isInvalid: state.isInvalid,
          isDisabled: state.isDisabled,
          isReadOnly: state.isReadOnly,
          isRequired: props.isRequired || false,
        })
        hasLabel = detectLabel(flatten(probe))
      }
    } catch {
      hasLabel = false
    }

    const fieldAria = useDateField(
      {
        ...fieldAriaProps(props, attrs as Record<string, any>, validationBehavior, hasLabel, inputRef),
        onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
        onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
        onFocusChange: (v: boolean) => emit('focuschange', v),
      } as any,
      state as any,
      fieldRef as any,
    )

    provideFieldContexts(
      state as any,
      fieldAria as any,
      fieldRef,
      inputRef,
      DateFieldStateContextKey,
    )

    return () => [
      renderField(props, attrs as Record<string, any>, slots, 'react-aria-DateField', state as any),
      h(HiddenDateInput, {
        state: state as any,
        autoComplete: props.autoComplete,
        name: props.name,
        isDisabled: props.isDisabled,
      }),
    ]
  },
})

/**
 * A time field allows users to enter and edit time values using a keyboard.
 * Each part of a time value is displayed in an individually editable segment.
 */
export const TimeField = defineComponent({
  name: 'TimeField',
  inheritAttrs: false,
  props: {
    value: {default: undefined},
    defaultValue: {default: undefined},
    minValue: {default: undefined},
    maxValue: {default: undefined},
    placeholderValue: {default: undefined},
    hourCycle: {type: Number as PropType<12 | 24>, default: undefined},
    granularity: {type: String as PropType<Granularity>, default: undefined},
    hideTimeZone: {type: Boolean, default: undefined},
    shouldForceLeadingZeros: {type: Boolean, default: undefined},
    isDateUnavailable: {type: Function as PropType<(date: IntlDateValue) => boolean>, default: undefined},
    validate: {type: Function as PropType<(value: any) => any>, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    isReadOnly: {type: Boolean, default: undefined},
    isRequired: {type: Boolean, default: undefined},
    isInvalid: {type: Boolean, default: undefined},
    validationState: {type: String as PropType<'valid' | 'invalid' | undefined>, default: undefined},
    validationBehavior: {type: String as PropType<'aria' | 'native' | undefined>, default: undefined},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    autoComplete: {type: String, default: undefined},
    autoFocus: {type: Boolean, default: undefined},
    id: {type: String, default: undefined},
    slot: {type: String, default: undefined},
  },
  emits: ['change', 'focuschange'],
  setup(props, {slots, attrs, emit}) {
    const locale = useLocale()
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'

    const state = useTimeFieldState({
      ...fieldStateProps(props, locale, validationBehavior),
      onChange: (value: any) => emit('change', value),
    } as any)

    const fieldRef = ref<Element | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)

    let hasLabel = false
    try {
      if (slots.default) {
        const probe = slots.default({
          state,
          isInvalid: state.isInvalid,
          isDisabled: state.isDisabled,
          isReadOnly: state.isReadOnly,
          isRequired: props.isRequired || false,
        })
        hasLabel = detectLabel(flatten(probe))
      }
    } catch {
      hasLabel = false
    }

    const fieldAria = useTimeField(
      {
        ...fieldAriaProps(props, attrs as Record<string, any>, validationBehavior, hasLabel, inputRef),
        onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
        onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
        onFocusChange: (v: boolean) => emit('focuschange', v),
      } as any,
      state as any,
      fieldRef as any,
    )

    provideFieldContexts(
      state as any,
      fieldAria as any,
      fieldRef,
      inputRef,
      TimeFieldStateContextKey,
    )

    return () =>
      renderField(props, attrs as Record<string, any>, slots, 'react-aria-TimeField', state as any)
  },
})

export interface DateInputRenderProps {
  /** Whether the date input is currently hovered with a mouse. */
  isHovered: boolean
  /** Whether an element within the date input is focused, either via a mouse or keyboard. */
  isFocusWithin: boolean
  /** Whether an element within the date input is keyboard focused. */
  isFocusVisible: boolean
  /** Whether the date input is disabled. */
  isDisabled: boolean
  /** Whether the date input is invalid. */
  isInvalid: boolean
}

export interface DateInputProps {
  slot?: string
  class?: any
  style?: any
}

/**
 * A date input groups the editable date segments within a date field.
 */
export const DateInput = defineComponent({
  name: 'DateInput',
  inheritAttrs: false,
  props: {
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    // If state is provided by DateField/TimeField, just render.
    // Otherwise (e.g. in DatePicker), we need to call hooks and create state ourselves.
    const dateFieldState = inject(DateFieldStateContextKey, null)
    const timeFieldState = inject(TimeFieldStateContextKey, null)
    const inner = dateFieldState || timeFieldState ? DateInputInner : DateInputStandalone
    return () => h(inner, attrs as any, slots)
  },
})

const DateInputStandalone = defineComponent({
  name: 'DateInputStandalone',
  inheritAttrs: false,
  props: {
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const locale = useLocale()
    // useContextProps({slot}, DateFieldContext): merge slotted DateField props.
    const dateFieldCtx = inject(DateFieldContextKey, null) as Record<string, any> | null
    const ctx = dateFieldCtx ?? {}

    const fieldRef = ref<Element | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)

    const state = useDateFieldState({
      value: () => ctx.value,
      defaultValue: () => ctx.defaultValue,
      minValue: () => ctx.minValue,
      maxValue: () => ctx.maxValue,
      placeholderValue: () => ctx.placeholderValue,
      hourCycle: () => ctx.hourCycle,
      granularity: () => ctx.granularity,
      hideTimeZone: () => ctx.hideTimeZone,
      shouldForceLeadingZeros: () => ctx.shouldForceLeadingZeros,
      isDateUnavailable: (date: IntlDateValue) => ctx.isDateUnavailable?.(date) ?? false,
      validate: (value: any) => ctx.validate?.(value),
      isDisabled: () => ctx.isDisabled,
      isReadOnly: () => ctx.isReadOnly,
      isRequired: () => ctx.isRequired,
      isInvalid: () => ctx.isInvalid,
      validationState: () => ctx.validationState,
      validationBehavior: () => ctx.validationBehavior,
      autoFocus: () => ctx.autoFocus,
      name: () => ctx.name,
      form: () => ctx.form,
      label: () => undefined,
      description: () => undefined,
      errorMessage: () => undefined,
      onChange: (value: any) => ctx.onChange?.(value),
      locale: () => locale.locale,
      createCalendar: () => ctx.createCalendar ?? createDefaultCalendar,
    } as any)

    const fieldAria = useDateField(
      {
        id: () => ctx.id,
        'aria-label': () => ctx['aria-label'],
        'aria-labelledby': () => ctx['aria-labelledby'],
        'aria-describedby': () => ctx['aria-describedby'],
        label: () => undefined,
        isDisabled: () => ctx.isDisabled,
        isReadOnly: () => ctx.isReadOnly,
        isRequired: () => ctx.isRequired,
        isInvalid: () => ctx.isInvalid,
        validationState: () => ctx.validationState,
        validationBehavior: () => ctx.validationBehavior,
        name: () => ctx.name,
        form: () => ctx.form,
        autoFocus: () => ctx.autoFocus,
        inputRef,
      } as any,
      state as any,
      fieldRef as any,
    )

    provide(DateFieldStateContextKey, state as any)
    provideFieldContexts(
      state as any,
      fieldAria as any,
      fieldRef,
      inputRef,
      DateFieldStateContextKey,
    )

    return () => h(DateInputInner, attrs as any, slots)
  },
})

const DateInputInner = defineComponent({
  name: 'DateInputInner',
  inheritAttrs: false,
  props: {
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const dateFieldState = inject(DateFieldStateContextKey, null)
    const timeFieldState = inject(TimeFieldStateContextKey, null)
    const state = (dateFieldState ?? timeFieldState)! as DateFieldState

    return () => {
      const attrsAny = attrs as Record<string, any>

      const segments = state.segments
      const children = segments.map((segment: any, i: number) => {
        const vnode = slots.default?.(segment)
        return vnode == null
          ? vnode
          : Array.isArray(vnode) && vnode.length === 1
            ? vnode[0]
            : vnode
      })

      return [
        h(
          Group,
          mergeProps(attrsAny, {
            slot: props.slot || undefined,
            // Group resolves function classes itself (official render props).
            class: attrsAny.class ?? 'react-aria-DateInput',
            style: attrsAny.style,
            isReadOnly: state.isReadOnly,
            isInvalid: state.isInvalid,
            isDisabled: state.isDisabled,
          }),
          {default: () => children},
        ),
        h(Input, {class: ''} as any),
      ]
    }
  },
})

export interface DateSegmentRenderProps {
  isHovered: boolean
  isFocused: boolean
  isFocusVisible: boolean
  isPlaceholder: boolean
  isReadOnly: boolean
  isDisabled: boolean
  isInvalid: boolean
  type: string
}

export interface DateSegmentProps {
  segment: any
  class?: any
  style?: any
}

/**
 * A date segment displays an individual unit of a date and time, and allows users to edit
 * the value by typing or using the arrow keys to increment and decrement.
 */
export const DateSegment = defineComponent({
  name: 'DateSegment',
  inheritAttrs: false,
  props: {
    segment: {type: Object as PropType<any>, required: true},
  },
  setup(props, {slots, attrs}) {
    const dateFieldState = inject(DateFieldStateContextKey, null)
    const timeFieldState = inject(TimeFieldStateContextKey, null)
    const state = (dateFieldState ?? timeFieldState)! as DateFieldState

    const domRef = ref<HTMLElement | null>(null)
    const {segmentProps} = useDateSegment(() => props.segment, state as any, domRef)
    const {isFocused, isFocusVisible, focusProps} = useFocusVisible()
    const {hoverProps, isHovered} = useHover({
      isDisabled: () => state.isDisabled || props.segment.type === 'literal',
    })

    return () => {
      const segment = props.segment
      const values = {
        ...segment,
        isReadOnly: state.isReadOnly,
        isInvalid: state.isInvalid,
        isDisabled: state.isDisabled,
        isHovered: isHovered.value,
        isFocused: isFocused.value,
        isFocusVisible: isFocusVisible.value,
      }
      const attrsAny = attrs as Record<string, any>
      const className = typeof attrsAny.class === 'function' ? attrsAny.class(values) : attrsAny.class
      const style = typeof attrsAny.style === 'function' ? attrsAny.style(values) : attrsAny.style

      const dataAttrs = {
        'data-placeholder': segment.isPlaceholder ? 'true' : undefined,
        'data-invalid': state.isInvalid ? 'true' : undefined,
        'data-readonly': state.isReadOnly ? 'true' : undefined,
        'data-disabled': state.isDisabled ? 'true' : undefined,
        'data-type': segment.type,
        'data-hovered': isHovered.value ? 'true' : undefined,
        'data-focused': isFocused.value ? 'true' : undefined,
        'data-focus-visible': isFocusVisible.value ? 'true' : undefined,
      }

      return h(
        'span',
        mergeProps(
          attrsAny,
          segmentProps as any,
          focusProps as any,
          hoverProps as any,
          {
            ref: (el: any) => {
              domRef.value = el
            },
            class: className ?? 'react-aria-DateSegment',
            style: (segmentProps as any).style,
            ...dataAttrs,
          },
        ),
        slots.default?.(values) ?? segment.text,
      )
    }
  },
})
