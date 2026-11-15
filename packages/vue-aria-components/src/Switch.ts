/*
 * Port of `react-aria-components@1.22.1` `Switch`
 * (`packages/react-aria-components/src/Switch.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: contexts are plain objects with live getters, the native
 * input is hidden with `VisuallyHidden` (`elementType` span), and focus ring
 * uses the internal `useFocusVisible`. Because both `SwitchField` and the
 * deprecated `Switch` call `useToggleState` + `useSwitch`, they share one
 * inner component (`SwitchInner`) with an `as` mode. Form / FieldError remain
 * deferred: `validationBehavior` defaults to `'native'` and FieldError cases
 * are covered with native validity + `Text slot="errorMessage"` /
 * `isInvalid`.
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
import {useSwitch} from 'vue-aria/useSwitch'
import {useToggleState} from 'vue-stately/useToggleState'
import type {ToggleState} from 'vue-stately/useToggleState'
import {VisuallyHidden, useHover, useFocusVisible} from 'vue-aria'
import {mergeProps} from 'vue-aria'
// Internal (not on the public barrel) — same pattern as the hooks' relative
// imports of vue-stately internals; tsup inlines it at build time.
import {filterDOMProps} from '../../vue-aria/src/utils/filterDOMProps'
import {TextContextKey} from './context'

export const ToggleStateContextKey: InjectionKey<ToggleState | null> = Symbol(
  'vue-aria-components.ToggleStateContext',
)
export {ToggleStateContextKey as ToggleStateContext}

export const SwitchContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.SwitchContext',
)
export {SwitchContextKey as SwitchContext}

export const SwitchFieldContextKey: InjectionKey<Record<string, any> | undefined> = Symbol(
  'vue-aria-components.SwitchFieldContext',
)
export {SwitchFieldContextKey as SwitchFieldContext}

/** Internal context shared by SwitchField / Switch and SwitchButton. */
export interface InternalSwitchContextValue extends Record<string, any> {
  labelProps: Record<string, any>
  inputProps: Record<string, any>
  descriptionProps: Record<string, any>
  errorMessageProps: Record<string, any>
  inputRef: {value: HTMLInputElement | null}
  defaultClassName: string
  isRequired?: boolean
}

const InternalSwitchContextKey: InjectionKey<InternalSwitchContextValue | null> = Symbol(
  'vue-aria-components.InternalSwitchContext',
)

export interface SwitchRenderProps {
  /** Whether the switch is selected. @selector [data-selected] */
  isSelected: boolean
  /** Whether the switch is currently hovered with a mouse. @selector [data-hovered] */
  isHovered: boolean
  /** Whether the switch is currently in a pressed state. @selector [data-pressed] */
  isPressed: boolean
  /** Whether the switch is focused, either via a mouse or keyboard. @selector [data-focused] */
  isFocused: boolean
  /** Whether the switch is keyboard focused. @selector [data-focus-visible] */
  isFocusVisible: boolean
  /** Whether the switch is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the switch is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** State of the switch. */
  state: ToggleState
}

export interface SwitchFieldRenderProps {
  /** Whether the switch is selected. @selector [data-selected] */
  isSelected: boolean
  /** Whether the switch is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the switch is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the switch invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the switch is required. @selector [data-required] */
  isRequired: boolean
  /** State of the switch. */
  state: ToggleState
}

export interface SwitchButtonRenderProps extends SwitchRenderProps {
  /** Whether the switch invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the switch is required. @selector [data-required] */
  isRequired: boolean
}

export interface SwitchProps {
  isSelected?: boolean
  defaultSelected?: boolean
  onChange?: (isSelected: boolean) => void
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

export interface SwitchFieldProps extends Omit<SwitchProps, 'class' | 'style'> {
  class?: any
  style?: any
}

export interface SwitchButtonProps {
  onHoverStart?: (e: any) => void
  onHoverEnd?: (e: any) => void
  onHoverChange?: (isHovering: boolean) => void
  slot?: string
  class?: any
  style?: any
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

const validateProp = {
  validate: {type: Function as PropType<any>, default: undefined},
}

const switchBaseProps = {
  ...validateProp,
  isSelected: {type: Boolean, default: undefined},
  defaultSelected: {type: Boolean, default: undefined},
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

/** Interaction/focus/hover handlers passed through to the toggle hooks. */
const switchHandlerProps = (props: any) => ({
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

/** Provides the contexts shared by the SwitchField / Switch inner components. */
function provideSwitchContexts(
  aria: Record<string, any>,
  inputRef: {value: HTMLInputElement | null},
  props: any,
  state: ToggleState,
  defaultClassName: string,
) {
  const ctx: InternalSwitchContextValue = {
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
    isRequired: {get: () => !!props.isRequired, enumerable: true, configurable: true},
  })
  provide(InternalSwitchContextKey, ctx)
  provide(ToggleStateContextKey, state)
  provide(TextContextKey, {
    slots: {
      description: aria.descriptionProps,
      errorMessage: aria.errorMessageProps,
    },
  })
  // FieldErrorContext is deferred (Form is out of scope).
}

/**
 * Shared SwitchField / deprecated Switch inner component: always calls
 * `useToggleState` + `useSwitch` (one consistent hook set). `as: 'field'`
 * renders the SwitchField div; `as: 'switch'` renders the deprecated
 * SwitchButton.
 */
const SwitchInner = defineComponent({
  name: 'SwitchInner',
  inheritAttrs: false,
  props: {
    ...switchBaseProps,
    as: {type: String as PropType<'field' | 'switch'>, required: true},
  },
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    // No FormContext yet (Form is deferred): default to 'native' at the
    // component level (the hook default stays 'aria').
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'
    const inputRef = mergedInputRef(props.inputRef)

    const state = useToggleState({
      isSelected: () => props.isSelected,
      defaultSelected: () => props.defaultSelected,
      isReadOnly: () => props.isReadOnly,
      onChange: (isSelected: boolean) => emit('change', isSelected),
    } as any)
    const aria = useSwitch(
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
        label: () => props.label,
        description: () => props.description,
        errorMessage: () => props.errorMessage,
        'aria-label': () => props['aria-label'],
        'aria-labelledby': () => props['aria-labelledby'],
        'aria-describedby': () => props['aria-describedby'],
        'aria-errormessage': () => props['aria-errormessage'],
        'aria-controls': () => props['aria-controls'],
        ...switchHandlerProps(props),
      } as any,
      state,
      inputRef as any,
    )

    provideSwitchContexts(
      aria as any,
      inputRef,
      props,
      state,
      props.as === 'field' ? 'react-aria-SwitchButton' : 'react-aria-Switch',
    )

    if (props.as === 'switch') {
      return () =>
        h(SwitchButton, {
          ...(attrs as any),
          onHoverStart: props.onHoverStart,
          onHoverEnd: props.onHoverEnd,
          onHoverChange: props.onHoverChange,
        } as any, slots)
    }

    return () => {
      const values: SwitchFieldRenderProps = {
        isSelected: aria.isSelected,
        isDisabled: aria.isDisabled,
        isReadOnly: aria.isReadOnly,
        isInvalid: aria.isInvalid,
        isRequired: props.isRequired || false,
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
      delete domProps.id
      delete domProps.onClick

      return h(
        'div',
        mergeProps(domProps, {
          class: className ?? 'react-aria-SwitchField',
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
 * A switch allows a user to turn a setting on or off.
 *
 * @deprecated Use SwitchField + SwitchButton instead.
 */
export const Switch = defineComponent({
  name: 'Switch',
  inheritAttrs: false,
  props: switchBaseProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    const ctx = inject(SwitchContextKey, undefined)
    return () =>
      h(
        SwitchInner,
        {
          ...contextProps(props as any, ctx),
          ...(attrs as any),
          as: 'switch',
          onChange: (isSelected: boolean) => emit('change', isSelected),
        } as any,
        slots,
      )
  },
})

/**
 * A switch allows a user to turn a setting on or off, with support for validation and help text.
 */
export const SwitchField = defineComponent({
  name: 'SwitchField',
  inheritAttrs: false,
  props: switchBaseProps,
  emits: ['change'],
  setup(props, {slots, attrs, emit}) {
    const ctx = inject(SwitchFieldContextKey, undefined)
    return () =>
      h(
        SwitchInner,
        {
          ...contextProps(props as any, ctx),
          ...(attrs as any),
          as: 'field',
          onChange: (isSelected: boolean) => emit('change', isSelected),
        } as any,
        slots,
      )
  },
})

/**
 * A switch button is the clickable area of a switch, including the indicator and label.
 */
export const SwitchButton = defineComponent({
  name: 'SwitchButton',
  inheritAttrs: false,
  props: {
    onHoverStart: {type: Function as PropType<(e: any) => void>, default: undefined},
    onHoverEnd: {type: Function as PropType<(e: any) => void>, default: undefined},
    onHoverChange: {type: Function as PropType<(isHovering: boolean) => void>, default: undefined},
    slot: {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject(InternalSwitchContextKey, null)!
    const state = inject(ToggleStateContextKey, null)!

    const isInteractionDisabled = () => ctx.isDisabled || ctx.isReadOnly
    const {hoverProps, isHovered} = useHover({
      isDisabled: isInteractionDisabled,
      onHoverStart: props.onHoverStart,
      onHoverEnd: props.onHoverEnd,
      onHoverChange: props.onHoverChange,
    })
    // Official parity (Switch.tsx 384-390): `useFocusRing()` is called with
    // no disabled flag — `isInteractionDisabled` only guards `useHover`, so a
    // readonly focused input still lights `data-focused` / `data-focus-visible`.
    const {isFocused, isFocusVisible, focusProps} = useFocusVisible()

    return () => {
      const values: SwitchButtonRenderProps = {
        isSelected: ctx.isSelected,
        isPressed: ctx.isPressed,
        isHovered: isHovered.value,
        isFocused: isFocused.value,
        isFocusVisible: isFocusVisible.value,
        isDisabled: ctx.isDisabled,
        isReadOnly: ctx.isReadOnly,
        isInvalid: ctx.isInvalid,
        isRequired: ctx.isRequired || false,
        state: state!,
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
