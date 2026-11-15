/*
 * Port of `react-aria-components@1.22.1` `Checkbox`
 * (`packages/react-aria-components/src/Checkbox.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: contexts are plain objects with live getters, the native
 * input is hidden with `VisuallyHidden` (`elementType` span), group labels use
 * `elementType: 'span'`, and the CheckboxGroup is a `div` (not `Group`).
 * Because Vue setup cannot conditionally call `useCheckbox` vs
 * `useCheckboxGroupItem`, the field/wrapper components split into inner
 * `*Group` / `*Solo` components that each call exactly one hook set.
 * Form / FieldError remain deferred: `validationBehavior` defaults to
 * `'native'` and FieldError cases are covered with native validity +
 * `Text slot="errorMessage"` / `isInvalid`.
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
  type VNodeChild,
} from 'vue'
import {Fragment, isVNode, type VNode} from 'vue'
import {useCheckbox} from 'vue-aria/useCheckbox'
import {useCheckboxGroup, useCheckboxGroupItem} from 'vue-aria/useCheckboxGroup'
import {useToggleState} from 'vue-stately/useToggleState'
import {useCheckboxGroupState} from 'vue-stately/useCheckboxGroupState'
import type {CheckboxGroupState} from 'vue-stately/useCheckboxGroupState'
import {VisuallyHidden, useHover, useFocusVisible} from 'vue-aria'
import {mergeProps} from 'vue-aria'
// Internal (not on the public barrel) — same pattern as the hooks' relative
// imports of vue-stately internals; tsup inlines it at build time.
import {filterDOMProps} from '../../vue-aria/src/utils/filterDOMProps'
import {LabelContextKey, TextContextKey} from './context'

export const CheckboxGroupStateContextKey: InjectionKey<CheckboxGroupState | null> = Symbol(
  'vue-aria-components.CheckboxGroupStateContext',
)
export {CheckboxGroupStateContextKey as CheckboxGroupStateContext}

export const CheckboxGroupContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.CheckboxGroupContext',
)
export {CheckboxGroupContextKey as CheckboxGroupContext}

export const CheckboxFieldContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.CheckboxFieldContext',
)
export {CheckboxFieldContextKey as CheckboxFieldContext}

export const CheckboxContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.CheckboxContext',
)
export {CheckboxContextKey as CheckboxContext}

/** Internal context shared by CheckboxField / Checkbox and CheckboxButton. */
export interface InternalCheckboxContextValue extends Record<string, any> {
  labelProps: Record<string, any>
  inputProps: Record<string, any>
  descriptionProps: Record<string, any>
  errorMessageProps: Record<string, any>
  inputRef: {value: HTMLInputElement | null}
  defaultClassName: string
  isIndeterminate?: boolean
  isRequired?: boolean
}

const InternalCheckboxContextKey: InjectionKey<InternalCheckboxContextValue | null> = Symbol(
  'vue-aria-components.InternalCheckboxContext',
)

export interface CheckboxGroupRenderProps {
  /** Whether the checkbox group is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the checkbox group is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the checkbox group is required. @selector [data-required] */
  isRequired: boolean
  /** Whether the checkbox group is invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** State of the checkbox group. */
  state: CheckboxGroupState
}

export interface CheckboxRenderProps {
  /** Whether the checkbox is selected. @selector [data-selected] */
  isSelected: boolean
  /** Whether the checkbox is indeterminate. @selector [data-indeterminate] */
  isIndeterminate: boolean
  /** Whether the checkbox is currently hovered with a mouse. @selector [data-hovered] */
  isHovered: boolean
  /** Whether the checkbox is currently in a pressed state. @selector [data-pressed] */
  isPressed: boolean
  /** Whether the checkbox is focused, either via a mouse or keyboard. @selector [data-focused] */
  isFocused: boolean
  /** Whether the checkbox is keyboard focused. @selector [data-focus-visible] */
  isFocusVisible: boolean
  /** Whether the checkbox is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the checkbox is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the checkbox invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the checkbox is required. @selector [data-required] */
  isRequired: boolean
}

export interface CheckboxFieldRenderProps {
  /** Whether the checkbox is selected. @selector [data-selected] */
  isSelected: boolean
  /** Whether the checkbox is indeterminate. @selector [data-indeterminate] */
  isIndeterminate: boolean
  /** Whether the checkbox is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the checkbox is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the checkbox invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the checkbox is required. @selector [data-required] */
  isRequired: boolean
}

export interface CheckboxButtonRenderProps extends CheckboxRenderProps {}

export interface CheckboxGroupProps {
  value?: any
  defaultValue?: any
  onChange?: (value: any[]) => void
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  /** @deprecated Use `isInvalid` instead. */
  validationState?: 'valid' | 'invalid'
  /** @default 'native' */
  validationBehavior?: 'aria' | 'native'
  validate?: (value: any[]) => true | string | string[] | null | undefined
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

export interface CheckboxProps {
  isSelected?: boolean
  defaultSelected?: boolean
  onChange?: (isSelected: boolean) => void
  /**
   * Indeterminism is presentational only.
   * The indeterminate visual representation remains regardless of user interaction.
   */
  isIndeterminate?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  /** @deprecated Use `isInvalid` instead. */
  validationState?: 'valid' | 'invalid'
  /** @default 'native' */
  validationBehavior?: 'aria' | 'native'
  validate?: (value: boolean) => true | string | string[] | null | undefined
  value?: string
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
  'aria-controls'?: string
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

export interface CheckboxFieldProps extends Omit<CheckboxProps, 'class' | 'style'> {
  class?: any
  style?: any
}

export interface CheckboxButtonProps {
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

const checkboxStateProps = (props: any, validationBehavior: () => 'aria' | 'native') => ({
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
 * A checkbox group allows a user to select multiple items from a list of options.
 */
export const CheckboxGroup = defineComponent({
  name: 'CheckboxGroup',
  inheritAttrs: false,
  props: {
    value: {default: undefined},
    defaultValue: {default: undefined},
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
    // `useContextProps(props, ref, CheckboxGroupContext)`: context values fill
    // in props left undefined. The merged view is lazy — the getter chain
    // stays live for the hooks.
    const groupCtx = inject(CheckboxGroupContextKey, undefined)
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

    const state = useCheckboxGroupState({
      ...checkboxStateProps(merged, validationBehavior),
      onChange: (value: any[]) => emit('change', value),
    } as any)

    const groupAria = useCheckboxGroup(
      {
        ...checkboxStateProps(merged, validationBehavior),
        label: () => (hasLabel ? true : undefined),
        onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
        onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
        onFocusChange: (isFocused: boolean) => (attrs as any).onFocusChange?.(isFocused),
      } as any,
      state,
    )

    provide(CheckboxGroupStateContextKey, state)
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
      const values: CheckboxGroupRenderProps = {
        isDisabled: state.isDisabled,
        isReadOnly: state.isReadOnly,
        isRequired: Boolean((merged as any).isRequired),
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
        mergeProps(domProps, snapProps(groupAria.groupProps as any), {
          class: className ?? 'react-aria-CheckboxGroup',
          style,
          slot: props.slot || undefined,
          'data-readonly': state.isReadOnly ? 'true' : undefined,
          'data-required': (merged as any).isRequired ? 'true' : undefined,
          'data-invalid': state.isInvalid ? 'true' : undefined,
          'data-disabled': (merged as any).isDisabled ? 'true' : undefined,
        }),
        slots.default?.(values),
      )
    }
  },
})

/**
 * Shared renderer for CheckboxField inner components (no hooks).
 */
function renderCheckboxFieldDom(
  aria: Record<string, any>,
  props: any,
  attrs: Record<string, any>,
  children: ((values: CheckboxFieldRenderProps) => VNodeChild) | undefined,
) {
  const values: CheckboxFieldRenderProps = {
    isSelected: aria.isSelected,
    isIndeterminate: props.isIndeterminate || false,
    isDisabled: aria.isDisabled,
    isReadOnly: aria.isReadOnly,
    isInvalid: aria.isInvalid,
    isRequired: props.isRequired || false,
  }
  const className = typeof attrs.class === 'function' ? attrs.class(values) : attrs.class
  const style = typeof attrs.style === 'function' ? attrs.style(values) : attrs.style

  const outerAttrs: Record<string, any> = {...attrs}
  delete outerAttrs.class
  delete outerAttrs.style

  const domProps = filterDOMProps(outerAttrs, {global: true}) as Record<string, any>
  delete domProps.id
  delete domProps.onClick

  return h(
    'div',
    mergeProps(domProps, {
      class: className ?? 'react-aria-CheckboxField',
      style,
      slot: props.slot || undefined,
      'data-selected': values.isSelected ? 'true' : undefined,
      'data-indeterminate': values.isIndeterminate ? 'true' : undefined,
      'data-disabled': values.isDisabled ? 'true' : undefined,
      'data-readonly': values.isReadOnly ? 'true' : undefined,
      'data-invalid': values.isInvalid ? 'true' : undefined,
      'data-required': values.isRequired ? 'true' : undefined,
    }),
    children?.(values) as any,
  )
}

/** Provides the contexts shared by the CheckboxField inner components. */
function provideCheckboxFieldContexts(
  aria: Record<string, any>,
  inputRef: {value: HTMLInputElement | null},
  props: any,
  defaultClassName: string,
) {
  const ctx: InternalCheckboxContextValue = {
    labelProps: aria.labelProps,
    inputProps: aria.inputProps,
    descriptionProps: aria.descriptionProps,
    errorMessageProps: aria.errorMessageProps,
    inputRef,
    defaultClassName,
  }
  Object.defineProperties(ctx, {
    isSelected: {get: () => aria.isSelected, enumerable: true, configurable: true},
    isPressed: {get: () => aria.isPressed, enumerable: true, configurable: true},
    isDisabled: {get: () => aria.isDisabled, enumerable: true, configurable: true},
    isReadOnly: {get: () => aria.isReadOnly, enumerable: true, configurable: true},
    isInvalid: {get: () => aria.isInvalid, enumerable: true, configurable: true},
    isIndeterminate: {get: () => !!props.isIndeterminate, enumerable: true, configurable: true},
    isRequired: {get: () => !!props.isRequired, enumerable: true, configurable: true},
    validationErrors: {get: () => aria.validationErrors, enumerable: true, configurable: true},
    validationDetails: {get: () => aria.validationDetails, enumerable: true, configurable: true},
  })
  provide(InternalCheckboxContextKey, ctx)
  provide(TextContextKey, {
    slots: {
      description: aria.descriptionProps,
      errorMessage: aria.errorMessageProps,
    },
  })
}

const validateProp = {
  validate: {type: Function as PropType<any>, default: undefined},
}

const checkboxFieldBaseProps = {
  ...validateProp,
  isSelected: {type: Boolean, default: undefined},
  defaultSelected: {type: Boolean, default: undefined},
  isIndeterminate: {type: Boolean, default: undefined},
  isDisabled: {type: Boolean, default: undefined},
  isReadOnly: {type: Boolean, default: undefined},
  isRequired: {type: Boolean, default: undefined},
  isInvalid: {type: Boolean, default: undefined},
  validationState: {type: String as PropType<'valid' | 'invalid' | undefined>, default: undefined},
  validationBehavior: {type: String as PropType<'aria' | 'native' | undefined>, default: undefined},
  value: {type: String, default: undefined},
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
  'aria-controls': {type: String, default: undefined},
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

const innerFieldProps = {
  ...checkboxFieldBaseProps,
  groupState: {type: Object as PropType<CheckboxGroupState | null>, default: null},
}

/** Interaction/focus/hover handlers passed through to the toggle hooks. */
const checkboxHandlerProps = (props: any) => ({
  onPress: props.onPress,
  onPressStart: props.onPressStart,
  onPressEnd: props.onPressEnd,
  onPressChange: props.onPressChange,
  onPressUp: props.onPressUp,
  onClick: props.onClick,
  onFocus: props.onFocus,
  onBlur: props.onBlur,
  onFocusChange: props.onFocusChange,
  onKeyDown: props.onKeyDown,
  onKeyUp: props.onKeyUp,
  autoFocus: () => props.autoFocus,
})

/**
 * Inner CheckboxField inside a CheckboxGroup: always calls
 * `useCheckboxGroupItem` (one consistent hook set).
 */
const CheckboxFieldGroup = defineComponent({
  name: 'CheckboxFieldGroup',
  inheritAttrs: false,
  props: innerFieldProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    // Group items fall back to the group's validationBehavior (via the hook's
    // groupData lookup), so the prop is passed through without a default.
    const validationBehavior = () => props.validationBehavior as 'aria' | 'native' | undefined
    const inputRef = mergedInputRef(props.inputRef)

    const aria = useCheckboxGroupItem(
      {
        value: () => props.value,
        isDisabled: () => props.isDisabled,
        isReadOnly: () => props.isReadOnly,
        isRequired: () => props.isRequired,
        isInvalid: () => props.isInvalid,
        validationState: () => props.validationState,
        validate: (v: boolean) => props.validate?.(v),
        validationBehavior,
        onChange: (isSelected: boolean) => emit('change', isSelected),
        name: () => props.name,
        form: () => props.form,
        id: () => props.id,
        'aria-label': () => props['aria-label'],
        'aria-labelledby': () => props['aria-labelledby'],
        'aria-describedby': () => props['aria-describedby'],
        'aria-errormessage': () => props['aria-errormessage'],
        'aria-controls': () => props['aria-controls'],
        isIndeterminate: () => props.isIndeterminate,
        ...checkboxHandlerProps(props),
      } as any,
      props.groupState!,
      inputRef as any,
    )

    provideCheckboxFieldContexts(aria as any, inputRef, props, 'react-aria-CheckboxButton')

    return () => renderCheckboxFieldDom(aria as any, props, attrs as any, slots.default)
  },
})

/**
 * Inner standalone CheckboxField (outside a CheckboxGroup): always calls
 * `useToggleState` + `useCheckbox` (one consistent hook set).
 */
const CheckboxFieldSolo = defineComponent({
  name: 'CheckboxFieldSolo',
  inheritAttrs: false,
  props: checkboxFieldBaseProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'
    const inputRef = mergedInputRef(props.inputRef)

    const state = useToggleState({
      isSelected: () => props.isSelected,
      defaultSelected: () => props.defaultSelected,
      isReadOnly: () => props.isReadOnly,
      onChange: (isSelected: boolean) => emit('change', isSelected),
    } as any)
    const aria = useCheckbox(
      {
        isDisabled: () => props.isDisabled,
        isReadOnly: () => props.isReadOnly,
        isRequired: () => props.isRequired,
        isInvalid: () => props.isInvalid,
        validationState: () => props.validationState,
        validate: (v: boolean) => props.validate?.(v),
        validationBehavior,
        value: () => props.value,
        name: () => props.name,
        form: () => props.form,
        id: () => props.id,
        'aria-label': () => props['aria-label'],
        'aria-labelledby': () => props['aria-labelledby'],
        'aria-describedby': () => props['aria-describedby'],
        'aria-errormessage': () => props['aria-errormessage'],
        'aria-controls': () => props['aria-controls'],
        isIndeterminate: () => props.isIndeterminate,
        ...checkboxHandlerProps(props),
      } as any,
      state,
      inputRef as any,
    )

    provideCheckboxFieldContexts(aria as any, inputRef, props, 'react-aria-CheckboxButton')

    return () => renderCheckboxFieldDom(aria as any, props, attrs as any, slots.default)
  },
})

/**
 * A checkbox allows a user to select an item, with support for validation and help text.
 */
export const CheckboxField = defineComponent({
  name: 'CheckboxField',
  inheritAttrs: false,
  props: checkboxFieldBaseProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    const groupState = inject(CheckboxGroupStateContextKey, null)
    const fieldCtx = inject(CheckboxFieldContextKey, undefined)
    return () =>
      h(
        groupState ? CheckboxFieldGroup : CheckboxFieldSolo,
        {
          ...contextProps(props as any, fieldCtx),
          ...(attrs as any),
          groupState,
          onChange: (isSelected: boolean) => emit('change', isSelected),
        } as any,
        slots,
      )
  },
})

/**
 * Inner deprecated Checkbox inside a CheckboxGroup: always calls
 * `useCheckboxGroupItem`.
 */
const CheckboxGroupItemInner = defineComponent({
  name: 'CheckboxGroupItemInner',
  inheritAttrs: false,
  props: innerFieldProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    // Group items fall back to the group's validationBehavior (via the hook's
    // groupData lookup), so the prop is passed through without a default.
    const validationBehavior = () => props.validationBehavior as 'aria' | 'native' | undefined
    const inputRef = mergedInputRef(props.inputRef)

    const aria = useCheckboxGroupItem(
      {
        value: () => props.value,
        isDisabled: () => props.isDisabled,
        isReadOnly: () => props.isReadOnly,
        isRequired: () => props.isRequired,
        isInvalid: () => props.isInvalid,
        validationState: () => props.validationState,
        validate: (v: boolean) => props.validate?.(v),
        validationBehavior,
        onChange: (isSelected: boolean) => emit('change', isSelected),
        name: () => props.name,
        form: () => props.form,
        id: () => props.id,
        'aria-label': () => props['aria-label'],
        'aria-labelledby': () => props['aria-labelledby'],
        'aria-describedby': () => props['aria-describedby'],
        'aria-errormessage': () => props['aria-errormessage'],
        'aria-controls': () => props['aria-controls'],
        isIndeterminate: () => props.isIndeterminate,
        ...checkboxHandlerProps(props),
      } as any,
      props.groupState!,
      inputRef as any,
    )

    provideCheckboxFieldContexts(aria as any, inputRef, props, 'react-aria-Checkbox')

    return () =>
      h(CheckboxButton, {
        ...(attrs as any),
        onHoverStart: props.onHoverStart,
        onHoverEnd: props.onHoverEnd,
        onHoverChange: props.onHoverChange,
      } as any, slots)
  },
})

/**
 * Inner standalone deprecated Checkbox: always calls `useToggleState` +
 * `useCheckbox`.
 */
const CheckboxSoloInner = defineComponent({
  name: 'CheckboxSoloInner',
  inheritAttrs: false,
  props: checkboxFieldBaseProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'
    const inputRef = mergedInputRef(props.inputRef)

    const state = useToggleState({
      isSelected: () => props.isSelected,
      defaultSelected: () => props.defaultSelected,
      isReadOnly: () => props.isReadOnly,
      onChange: (isSelected: boolean) => emit('change', isSelected),
    } as any)
    const aria = useCheckbox(
      {
        isDisabled: () => props.isDisabled,
        isReadOnly: () => props.isReadOnly,
        isRequired: () => props.isRequired,
        isInvalid: () => props.isInvalid,
        validationState: () => props.validationState,
        validate: (v: boolean) => props.validate?.(v),
        validationBehavior,
        value: () => props.value,
        name: () => props.name,
        form: () => props.form,
        id: () => props.id,
        'aria-label': () => props['aria-label'],
        'aria-labelledby': () => props['aria-labelledby'],
        'aria-describedby': () => props['aria-describedby'],
        'aria-errormessage': () => props['aria-errormessage'],
        'aria-controls': () => props['aria-controls'],
        isIndeterminate: () => props.isIndeterminate,
        ...checkboxHandlerProps(props),
      } as any,
      state,
      inputRef as any,
    )

    provideCheckboxFieldContexts(aria as any, inputRef, props, 'react-aria-Checkbox')

    return () =>
      h(CheckboxButton, {
        ...(attrs as any),
        onHoverStart: props.onHoverStart,
        onHoverEnd: props.onHoverEnd,
        onHoverChange: props.onHoverChange,
      } as any, slots)
  },
})

/**
 * A checkbox allows a user to select multiple items from a list of individual items, or
 * to mark one individual item as selected.
 *
 * @deprecated Use CheckboxField + CheckboxButton instead.
 */
export const Checkbox = defineComponent({
  name: 'Checkbox',
  inheritAttrs: false,
  props: checkboxFieldBaseProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    const groupState = inject(CheckboxGroupStateContextKey, null)
    const checkboxCtx = inject(CheckboxContextKey, undefined)
    return () =>
      h(
        groupState ? CheckboxGroupItemInner : CheckboxSoloInner,
        {
          ...contextProps(props as any, checkboxCtx),
          ...(attrs as any),
          groupState,
          onChange: (isSelected: boolean) => emit('change', isSelected),
        } as any,
        slots,
      )
  },
})

/**
 * A checkbox button is the clickable area of a checkbox, including the indicator and label.
 */
export const CheckboxButton = defineComponent({
  name: 'CheckboxButton',
  inheritAttrs: false,
  props: {
    onHoverStart: {type: Function as PropType<(e: any) => void>, default: undefined},
    onHoverEnd: {type: Function as PropType<(e: any) => void>, default: undefined},
    onHoverChange: {type: Function as PropType<(isHovering: boolean) => void>, default: undefined},
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject(InternalCheckboxContextKey, null)!

    const isInteractionDisabled = () => ctx.isDisabled || ctx.isReadOnly
    const {hoverProps, isHovered} = useHover({
      isDisabled: isInteractionDisabled,
      onHoverStart: props.onHoverStart,
      onHoverEnd: props.onHoverEnd,
      onHoverChange: props.onHoverChange,
    })
    // Official parity (Checkbox.tsx 506-511): `useFocusRing()` is called with
    // no disabled flag — `isInteractionDisabled` only guards `useHover`, so a
    // readonly focused input still lights `data-focused` / `data-focus-visible`.
    const {isFocused, isFocusVisible, focusProps} = useFocusVisible()

    return () => {
      const values: CheckboxButtonRenderProps = {
        isSelected: ctx.isSelected,
        isIndeterminate: ctx.isIndeterminate || false,
        isPressed: ctx.isPressed,
        isHovered: isHovered.value,
        isFocused: isFocused.value,
        isFocusVisible: isFocusVisible.value,
        isDisabled: ctx.isDisabled,
        isReadOnly: ctx.isReadOnly,
        isInvalid: ctx.isInvalid,
        isRequired: ctx.isRequired || false,
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
          'data-indeterminate': values.isIndeterminate ? 'true' : undefined,
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
