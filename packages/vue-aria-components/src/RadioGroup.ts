/*
 * Port of `react-aria-components@1.22.1` `RadioGroup`
 * (`packages/react-aria-components/src/RadioGroup.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: contexts are plain objects with live getters, the native
 * input is hidden with `VisuallyHidden` (`elementType` span), group labels use
 * `elementType: 'span'`, the RadioGroup is a `div`, and children render
 * directly (SharedElementTransition / SelectionIndicator are out of scope).
 * Form / FieldError remain deferred: `validationBehavior` defaults to
 * `'native'`.
 */

import {
  defineComponent,
  h,
  inject,
  provide,
  ref,
  watch,
  type InjectionKey,
  type PropType,
} from 'vue'
import {Fragment, isVNode, type VNode, type VNodeChild} from 'vue'
import {useRadio, useRadioGroup} from 'vue-aria/useRadioGroup'
import {useRadioGroupState} from 'vue-stately/useRadioGroupState'
import type {RadioGroupState} from 'vue-stately/useRadioGroupState'
import {VisuallyHidden, useHover, useFocusVisible} from 'vue-aria'
import {mergeProps} from 'vue-aria'
// Internal (not on the public barrel) — tsup inlines it at build time.
import {filterDOMProps} from '../../vue-aria/src/utils/filterDOMProps'
import {LabelContextKey, TextContextKey} from './context'

export const RadioGroupStateContextKey: InjectionKey<RadioGroupState | null> = Symbol(
  'vue-aria-components.RadioGroupStateContext',
)
export {RadioGroupStateContextKey as RadioGroupStateContext}

export const RadioGroupContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.RadioGroupContext',
)
export {RadioGroupContextKey as RadioGroupContext}

export const RadioContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.RadioContext',
)
export {RadioContextKey as RadioContext}

export const RadioFieldContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.RadioFieldContext',
)
export {RadioFieldContextKey as RadioFieldContext}

/** Internal context shared by Radio / RadioField and RadioButton. */
export interface InternalRadioContextValue extends Record<string, any> {
  labelProps: Record<string, any>
  inputProps: Record<string, any>
  descriptionProps: Record<string, any>
  inputRef: {value: HTMLInputElement | null}
  defaultClassName: string
}

const InternalRadioContextKey: InjectionKey<InternalRadioContextValue | null> = Symbol(
  'vue-aria-components.InternalRadioContext',
)

export interface RadioGroupRenderProps {
  /** The orientation of the radio group. @selector [data-orientation="horizontal | vertical"] */
  orientation: 'horizontal' | 'vertical'
  /** Whether the radio group is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the radio group is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the radio group is required. @selector [data-required] */
  isRequired: boolean
  /** Whether the radio group is invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** State of the radio group. */
  state: RadioGroupState
}

export interface RadioRenderProps {
  /** Whether the radio is selected. @selector [data-selected] */
  isSelected: boolean
  /** Whether the radio is currently hovered with a mouse. @selector [data-hovered] */
  isHovered: boolean
  /** Whether the radio is currently in a pressed state. @selector [data-pressed] */
  isPressed: boolean
  /** Whether the radio is focused, either via a mouse or keyboard. @selector [data-focused] */
  isFocused: boolean
  /** Whether the radio is keyboard focused. @selector [data-focus-visible] */
  isFocusVisible: boolean
  /** Whether the radio is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the radio is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the radio is invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the radio is required. @selector [data-required] */
  isRequired: boolean
}

export interface RadioFieldRenderProps {
  /** Whether the radio is selected. @selector [data-selected] */
  isSelected: boolean
  /** Whether the radio is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the radio is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the radio is invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the radio is required. @selector [data-required] */
  isRequired: boolean
}

export interface RadioButtonRenderProps extends RadioRenderProps {}

export interface RadioGroupProps {
  value?: any
  defaultValue?: any
  onChange?: (value: any) => void
  orientation?: 'horizontal' | 'vertical'
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  /** @deprecated Use `isInvalid` instead. */
  validationState?: 'valid' | 'invalid'
  /** @default 'native' */
  validationBehavior?: 'aria' | 'native'
  validate?: (value: any) => true | string | string[] | null | undefined
  name?: string
  form?: string
  id?: string
  label?: any
  description?: any
  errorMessage?: any
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-errormessage'?: string
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  slot?: string
  class?: any
  style?: any
}

export interface RadioProps {
  value?: string
  isDisabled?: boolean
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-details'?: string
  'aria-errormessage'?: string
  onPress?: (e: any) => void
  onPressStart?: (e: any) => void
  onPressEnd?: (e: any) => void
  onPressChange?: (isPressed: boolean) => void
  onPressUp?: (e: any) => void
  onClick?: (e: MouseEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  onHoverStart?: (e: any) => void
  onHoverEnd?: (e: any) => void
  onHoverChange?: (isHovering: boolean) => void
  autoFocus?: boolean
  /** A ref for the HTML input element. */
  inputRef?: {value: HTMLInputElement | null}
  slot?: string
  class?: any
  style?: any
}

export interface RadioFieldProps extends Omit<RadioProps, 'class' | 'style'> {
  class?: any
  style?: any
}

export interface RadioButtonProps {
  onHoverStart?: (e: any) => void
  onHoverEnd?: (e: any) => void
  onHoverChange?: (isHovering: boolean) => void
  slot?: string
  class?: any
  style?: any
}

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
  // Only top-level composition counts: a <Label> directly inside the group.
  for (const vnode of vnodes) {
    if (getComponentName(vnode) === 'Label') return true
  }
  return false
}

/**
 * Live copy of a plain object with getters — never snapshots values.
 * Function values (event handlers) are copied as plain writable values so
 * `mergeProps` can chain them with later handler objects.
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
    Object.defineProperty(out, key, {
      get: () => source[key],
      set: (value: any) => {
        Object.defineProperty(out, key, {value, enumerable: true, configurable: true})
      },
      enumerable: true,
      configurable: true,
    })
  }
  return out
}

/** Official `useContextProps`: context values fill in props left undefined. */
function contextProps(
  props: Record<string, any>,
  ctx: Record<string, any> | undefined,
): Record<string, any> {
  if (!ctx) return props
  const out: Record<string, any> = {}
  const keys = new Set([...Object.keys(ctx), ...Object.keys(props)])
  for (const key of keys) {
    Object.defineProperty(out, key, {
      get: () => (props[key] !== undefined ? props[key] : ctx[key]),
      enumerable: true,
      configurable: true,
    })
  }
  return out
}

/**
 * Evaluates a *Props object into concrete vnode props for `h()`. Live getters
 * must be evaluated during render: Vue diffs vnode props by value, and
 * getter-to-getter comparison always reads the current state (no change, no
 * patch). Render-time evaluation keeps the read reactive so a state change
 * re-renders and the concrete values are compared properly.
 */
function snapProps(source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const key of Object.keys(source)) {
    out[key] = (source as any)[key]
  }
  return out
}

/** A write-through merged input ref (user `inputRef` + internal tracking). */
function mergedInputRef(userRef: {value: HTMLInputElement | null} | undefined) {
  // A real Vue ref: hook internals watch it directly; a watcher mirrors
  // assignments to the user's ref (a getter/setter proxy is not a valid
  // watch source).
  const internal = ref<HTMLInputElement | null>(null)
  if (userRef) {
    watch(internal, (v) => {
      userRef.value = v
    })
  }
  return internal
}

const radioGroupStateProps = (props: any, validationBehavior: () => 'aria' | 'native') => ({
  value: () => props.value,
  defaultValue: () => props.defaultValue,
  isDisabled: () => props.isDisabled,
  isReadOnly: () => props.isReadOnly,
  isRequired: () => props.isRequired,
  isInvalid: () => props.isInvalid,
  validationState: () => props.validationState,
  validate: (v: any) => props.validate?.(v),
  validationBehavior,
  name: () => props.name,
  form: () => props.form,
  orientation: () => props.orientation,
  label: () => props.label,
  description: () => props.description,
  errorMessage: () => props.errorMessage,
  id: () => props.id,
  'aria-label': () => props['aria-label'],
  'aria-labelledby': () => props['aria-labelledby'],
  'aria-describedby': () => props['aria-describedby'],
  'aria-errormessage': () => props['aria-errormessage'],
})

/**
 * A radio group allows a user to select a single item from a list of mutually exclusive options.
 */
export const RadioGroup = defineComponent({
  name: 'RadioGroup',
  inheritAttrs: false,
  props: {
    value: {default: undefined},
    defaultValue: {default: undefined},
    orientation: {type: String as PropType<'horizontal' | 'vertical' | undefined>, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    isReadOnly: {type: Boolean, default: undefined},
    isRequired: {type: Boolean, default: undefined},
    isInvalid: {type: Boolean, default: undefined},
    validationState: {type: String as PropType<'valid' | 'invalid' | undefined>, default: undefined},
    validationBehavior: {type: String as PropType<'aria' | 'native' | undefined>, default: undefined},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    id: {type: String, default: undefined},
    label: {default: undefined},
    description: {default: undefined},
    errorMessage: {default: undefined},
    'aria-label': {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    'aria-describedby': {type: String, default: undefined},
    'aria-errormessage': {type: String, default: undefined},
    slot: {type: String, default: undefined},
  },
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    // No FormContext yet (Form is deferred): default to 'native' at the
    // component level (the hook default stays 'aria'). Official
    // `useContextProps(props, ref, RadioGroupContext)`: context values fill in
    // props left undefined. The merged view is lazy — the getter chain stays
    // live for the hooks.
    const groupCtx = inject(RadioGroupContextKey, undefined)
    const merged = contextProps(props as any, groupCtx)
    const validationBehavior = () => ((merged as any).validationBehavior ?? 'native') as 'aria' | 'native'

    // Detect a top-level <Label> in the default slot so the group is labeled
    // via aria-labelledby instead of aria-label.
    let hasLabel = false
    try {
      if (slots.default) {
        const probe = slots.default({} as any)
        hasLabel = detectLabel(flatten(probe))
      }
    } catch {
      hasLabel = false
    }

    const state = useRadioGroupState({
      ...radioGroupStateProps(merged, validationBehavior),
      onChange: (value: any) => emit('change', value),
    } as any)

    const groupAria = useRadioGroup(
      {
        ...radioGroupStateProps(merged, validationBehavior),
        label: () => (hasLabel ? true : undefined),
        onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
        onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
        onFocusChange: (isFocused: boolean) => (attrs as any).onFocusChange?.(isFocused),
      } as any,
      state,
    )

    provide(RadioGroupStateContextKey, state)
    const labelCtx = liveCopy(groupAria.labelProps as any)
    labelCtx.ref = ref<Element | null>(null)
    ;(labelCtx as any).elementType = 'span'
    provide(LabelContextKey, labelCtx)
    provide(TextContextKey, {
      slots: {
        description: groupAria.descriptionProps,
        errorMessage: groupAria.errorMessageProps,
      },
    })

    return () => {
      const values: RadioGroupRenderProps = {
        orientation: (((merged as any).orientation) || 'vertical') as 'horizontal' | 'vertical',
        isDisabled: state.isDisabled,
        isReadOnly: state.isReadOnly,
        isRequired: state.isRequired,
        isInvalid: state.isInvalid,
        state,
      }
      const className =
        typeof (attrs as any).class === 'function' ? (attrs as any).class(values) : (attrs as any).class
      const style =
        typeof (attrs as any).style === 'function' ? (attrs as any).style(values) : (attrs as any).style

      const outerAttrs: Record<string, any> = {...(attrs as any)}
      delete outerAttrs.class
      delete outerAttrs.style

      const domProps = filterDOMProps(outerAttrs, {global: true}) as Record<string, any>

      return h(
        'div',
        mergeProps(domProps, snapProps(groupAria.radioGroupProps as any), {
          class: className ?? 'react-aria-RadioGroup',
          style,
          slot: props.slot || undefined,
          'data-orientation': (((merged as any).orientation) || 'vertical') as string,
          'data-invalid': state.isInvalid ? 'true' : undefined,
          'data-disabled': state.isDisabled ? 'true' : undefined,
          'data-readonly': state.isReadOnly ? 'true' : undefined,
          'data-required': state.isRequired ? 'true' : undefined,
        }),
        // SharedElementTransition is out of scope: children render directly.
        slots.default?.(values),
      )
    }
  },
})

/** Provides the contexts shared by the RadioField / Radio inner components. */
function provideRadioContexts(
  aria: Record<string, any>,
  inputRef: {value: HTMLInputElement | null},
  defaultClassName: string,
) {
  const ctx: InternalRadioContextValue = {
    labelProps: aria.labelProps,
    inputProps: aria.inputProps,
    descriptionProps: aria.descriptionProps,
    inputRef,
    defaultClassName,
  }
  Object.defineProperties(ctx, {
    isSelected: {get: () => aria.isSelected, enumerable: true, configurable: true},
    isPressed: {get: () => aria.isPressed, enumerable: true, configurable: true},
    isDisabled: {get: () => aria.isDisabled, enumerable: true, configurable: true},
  })
  provide(InternalRadioContextKey, ctx)
  provide(TextContextKey, {
    slots: {
      description: aria.descriptionProps,
    },
  })
}

const radioBaseProps = {
  value: {type: String, default: undefined},
  isDisabled: {type: Boolean, default: undefined},
  id: {type: String, default: undefined},
  'aria-label': {type: String, default: undefined},
  'aria-labelledby': {type: String, default: undefined},
  'aria-describedby': {type: String, default: undefined},
  'aria-details': {type: String, default: undefined},
  'aria-errormessage': {type: String, default: undefined},
  onPress: {type: Function as PropType<(e: any) => void>, default: undefined},
  onPressStart: {type: Function as PropType<(e: any) => void>, default: undefined},
  onPressEnd: {type: Function as PropType<(e: any) => void>, default: undefined},
  onPressChange: {type: Function as PropType<(isPressed: boolean) => void>, default: undefined},
  onPressUp: {type: Function as PropType<(e: any) => void>, default: undefined},
  onClick: {type: Function as PropType<(e: MouseEvent) => void>, default: undefined},
  onFocus: {type: Function as PropType<(e: FocusEvent) => void>, default: undefined},
  onBlur: {type: Function as PropType<(e: FocusEvent) => void>, default: undefined},
  onFocusChange: {type: Function as PropType<(isFocused: boolean) => void>, default: undefined},
  onKeyDown: {type: Function as PropType<(e: KeyboardEvent) => void>, default: undefined},
  onKeyUp: {type: Function as PropType<(e: KeyboardEvent) => void>, default: undefined},
  onHoverStart: {type: Function as PropType<(e: any) => void>, default: undefined},
  onHoverEnd: {type: Function as PropType<(e: any) => void>, default: undefined},
  onHoverChange: {type: Function as PropType<(isHovering: boolean) => void>, default: undefined},
  autoFocus: {type: Boolean, default: undefined},
  inputRef: {type: Object as PropType<{value: HTMLInputElement | null}>, default: undefined},
  slot: {type: String, default: undefined},
}

const radioHandlerProps = (props: any) => ({
  onPress: props.onPress,
  onPressStart: props.onPressStart,
  onPressEnd: props.onPressEnd,
  onPressChange: props.onPressChange,
  onPressUp: props.onPressUp,
  onClick: props.onClick,
  autoFocus: () => props.autoFocus,
})

/** Shared RadioField / Radio inner component: always calls `useRadio`. */
const RadioInner = defineComponent({
  name: 'RadioInner',
  inheritAttrs: false,
  props: {
    ...radioBaseProps,
    /** 'field' renders a div with field data-*; 'radio' renders a RadioButton. */
    as: {type: String as PropType<'field' | 'radio'>, required: true},
  },
  setup(props, {slots, attrs}) {
    const state = inject(RadioGroupStateContextKey, null)
    if (!state) {
      throw new Error('RadioField/Radio must be used within a RadioGroup')
    }
    const inputRef = mergedInputRef(props.inputRef)

    const aria = useRadio(
      {
        value: () => props.value,
        isDisabled: () => props.isDisabled,
        id: () => props.id,
        'aria-label': () => props['aria-label'],
        'aria-labelledby': () => props['aria-labelledby'],
        'aria-describedby': () => props['aria-describedby'],
        'aria-details': () => props['aria-details'],
        'aria-errormessage': () => props['aria-errormessage'],
        onFocus: props.onFocus,
        onBlur: props.onBlur,
        onFocusChange: props.onFocusChange,
        onKeyDown: props.onKeyDown,
        onKeyUp: props.onKeyUp,
        ...radioHandlerProps(props),
      } as any,
      state,
      inputRef as any,
    )

    provideRadioContexts(aria as any, inputRef, props.as === 'radio' ? 'react-aria-Radio' : 'react-aria-RadioButton')

    if (props.as === 'radio') {
      return () =>
        h(RadioButton, {
          ...(attrs as any),
          onHoverStart: props.onHoverStart,
          onHoverEnd: props.onHoverEnd,
          onHoverChange: props.onHoverChange,
        } as any, slots)
    }

    return () => {
      const values: RadioFieldRenderProps = {
        isSelected: aria.isSelected,
        isDisabled: aria.isDisabled,
        isReadOnly: state.isReadOnly,
        isInvalid: state.isInvalid,
        isRequired: state.isRequired,
      }
      const className =
        typeof (attrs as any).class === 'function' ? (attrs as any).class(values) : (attrs as any).class
      const style =
        typeof (attrs as any).style === 'function' ? (attrs as any).style(values) : (attrs as any).style

      const outerAttrs: Record<string, any> = {...(attrs as any)}
      delete outerAttrs.class
      delete outerAttrs.style

      const domProps = filterDOMProps(outerAttrs, {global: true}) as Record<string, any>
      delete domProps.id
      delete domProps.onClick

      return h(
        'div',
        mergeProps(domProps, {
          class: className ?? 'react-aria-RadioField',
          style,
          slot: props.slot || undefined,
          'data-selected': values.isSelected ? 'true' : undefined,
          'data-disabled': values.isDisabled ? 'true' : undefined,
          'data-readonly': values.isReadOnly ? 'true' : undefined,
          'data-invalid': values.isInvalid ? 'true' : undefined,
          'data-required': values.isRequired ? 'true' : undefined,
        }),
        slots.default?.(values),
      )
    }
  },
})

/**
 * A radio represents an individual option within a radio group.
 *
 * @deprecated Use RadioField + RadioButton instead.
 */
export const Radio = defineComponent({
  name: 'Radio',
  inheritAttrs: false,
  props: radioBaseProps,
  setup(props, {slots, attrs}) {
    const ctx = inject(RadioContextKey, undefined)
    return () =>
      h(
        RadioInner,
        {
          ...contextProps(props as any, ctx),
          ...(attrs as any),
          as: 'radio',
        } as any,
        slots,
      )
  },
})

/**
 * A RadioField represents an individual option within a radio group, containing a RadioButton and
 * optional description.
 */
export const RadioField = defineComponent({
  name: 'RadioField',
  inheritAttrs: false,
  props: radioBaseProps,
  setup(props, {slots, attrs}) {
    const ctx = inject(RadioFieldContextKey, undefined)
    return () =>
      h(
        RadioInner,
        {
          ...contextProps(props as any, ctx),
          ...(attrs as any),
          as: 'field',
        } as any,
        slots,
      )
  },
})

/**
 * A RadioButton is the clickable area of a radio, including the indicator and label.
 */
export const RadioButton = defineComponent({
  name: 'RadioButton',
  inheritAttrs: false,
  props: {
    onHoverStart: {type: Function as PropType<(e: any) => void>, default: undefined},
    onHoverEnd: {type: Function as PropType<(e: any) => void>, default: undefined},
    onHoverChange: {type: Function as PropType<(isHovering: boolean) => void>, default: undefined},
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject(InternalRadioContextKey, null)!
    const state = inject(RadioGroupStateContextKey, null)!

    const interactionDisabled = () => ctx.isDisabled || state.isReadOnly
    const {hoverProps, isHovered} = useHover({
      isDisabled: interactionDisabled,
      onHoverStart: props.onHoverStart,
      onHoverEnd: props.onHoverEnd,
      onHoverChange: props.onHoverChange,
    })
    // Official parity (RadioGroup.tsx 469-474): `useFocusRing()` is called with
    // no disabled flag — `interactionDisabled` only guards `useHover`, so a
    // readonly focused input still lights `data-focused` / `data-focus-visible`.
    const {isFocused, isFocusVisible, focusProps} = useFocusVisible()

    return () => {
      const values: RadioButtonRenderProps = {
        isSelected: ctx.isSelected,
        isPressed: ctx.isPressed,
        isHovered: isHovered.value,
        isFocused: isFocused.value,
        isFocusVisible: isFocusVisible.value,
        isDisabled: ctx.isDisabled,
        isReadOnly: state.isReadOnly,
        isInvalid: state.isInvalid,
        isRequired: state.isRequired,
      }
      const className =
        typeof (attrs as any).class === 'function' ? (attrs as any).class(values) : (attrs as any).class
      const style =
        typeof (attrs as any).style === 'function' ? (attrs as any).style(values) : (attrs as any).style

      const outerAttrs: Record<string, any> = {...(attrs as any)}
      delete outerAttrs.class
      delete outerAttrs.style

      const domProps = filterDOMProps(outerAttrs, {global: true}) as Record<string, any>
      delete domProps.id
      delete domProps.onClick

      return h(
        'label',
        mergeProps(domProps, ctx.labelProps, hoverProps as any, {
          class: className ?? ctx.defaultClassName,
          style,
          slot: props.slot || undefined,
          'data-selected': values.isSelected ? 'true' : undefined,
          'data-pressed': values.isPressed ? 'true' : undefined,
          'data-hovered': values.isHovered ? 'true' : undefined,
          'data-focused': values.isFocused ? 'true' : undefined,
          'data-focus-visible': values.isFocusVisible ? 'true' : undefined,
          'data-disabled': values.isDisabled ? 'true' : undefined,
          'data-readonly': values.isReadOnly ? 'true' : undefined,
          'data-invalid': values.isInvalid ? 'true' : undefined,
          'data-required': values.isRequired ? 'true' : undefined,
        }),
        [
          h(VisuallyHidden as any, {elementType: 'span'}, () =>
            h('input', mergeProps(snapProps(ctx.inputProps as any), focusProps as any, {ref: ctx.inputRef as any})),
          ),
          slots.default?.(values),
        ],
      )
    }
  },
})
