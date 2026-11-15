/*
 * Port of `react-aria-components@1.22.1` `NumberField`
 * (`packages/react-aria-components/src/NumberField.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: contexts carry live getters instead of spread snapshots,
 * and the Hero UI data-* attributes are emitted locally as "true" strings.
 * Form / FieldError remain deferred (official NumberField only optionally
 * reads `validationBehavior` from FormContext and defaults to `'native'`).
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
import {useNumberField, type AriaNumberFieldProps, type NumberFieldAria} from 'vue-aria/useNumberField'
import {useNumberFieldState, type NumberFieldState} from 'vue-stately/useNumberFieldState'
import {useLocale} from 'vue-aria/I18nProvider'
import {mergeProps} from 'vue-aria'
import {GroupContextKey} from './Group'
import {ButtonContextKey, InputContextKey, LabelContextKey, TextContextKey} from './context'

export interface NumberFieldRenderProps {
  /** Whether the number field is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the number field is invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the number field is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the number field is required. @selector [data-required] */
  isRequired: boolean
  /** State of the number field. */
  state: NumberFieldState
}

export interface NumberFieldProps {
  value?: any
  defaultValue?: any
  onChange?: (value: number) => void
  minValue?: any
  maxValue?: any
  step?: any
  formatOptions?: any
  commitBehavior?: 'snap' | 'validate'
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
  isWheelDisabled?: boolean
  incrementAriaLabel?: string
  decrementAriaLabel?: string
  placeholder?: string
  id?: string
  label?: any
  description?: any
  errorMessage?: any
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (v: boolean) => void
  onPaste?: (e: ClipboardEvent) => void
  slot?: string
  class?: any
  style?: any
}

export const NumberFieldContextKey: InjectionKey<Record<string, any> | null> = Symbol(
  'vue-aria-components.NumberFieldContext',
)
export {NumberFieldContextKey as NumberFieldContext}
export const NumberFieldStateContextKey: InjectionKey<NumberFieldState | null> = Symbol(
  'vue-aria-components.NumberFieldStateContext',
)
export {NumberFieldStateContextKey as NumberFieldStateContext}

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
    Object.defineProperty(out, key, {
      get: () => source[key],
      // Vue's vnode normalization assigns normalized `class`/`style` to the
      // props object — a getter-only accessor would throw there. The setter
      // lets that assignment land without breaking liveness of other keys.
      set: (value: any) => {
        Object.defineProperty(out, key, {value, enumerable: true, configurable: true})
      },
      enumerable: true,
      configurable: true,
    })
  }
  return out
}

function numberFieldStateProps(
  props: any,
  locale: {locale: string},
  validationBehavior: () => 'aria' | 'native',
) {
  return {
    value: () => props.value,
    defaultValue: () => props.defaultValue,
    minValue: () => props.minValue,
    maxValue: () => props.maxValue,
    step: () => props.step,
    formatOptions: () => props.formatOptions,
    commitBehavior: () => props.commitBehavior ?? 'snap',
    isDisabled: () => props.isDisabled,
    isReadOnly: () => props.isReadOnly,
    isRequired: () => props.isRequired,
    isInvalid: () => props.isInvalid,
    validationState: () => props.validationState,
    validationBehavior,
    autoFocus: () => props.autoFocus,
    name: () => props.name,
    form: () => props.form,
    label: () => props.label,
    description: () => props.description,
    errorMessage: () => props.errorMessage,
    locale: () => locale.locale,
    validate: (value: any) => props.validate?.(value),
  }
}

function numberFieldAriaProps(
  props: any,
  attrs: Record<string, any>,
  validationBehavior: () => 'aria' | 'native',
  hasLabel: boolean,
  inputRef: Ref<HTMLInputElement | null>,
) {
  return {
    isDisabled: () => props.isDisabled,
    isReadOnly: () => props.isReadOnly,
    isRequired: () => props.isRequired,
    isInvalid: () => props.isInvalid,
    validationState: () => props.validationState,
    validationBehavior,
    minValue: () => props.minValue,
    maxValue: () => props.maxValue,
    step: () => props.step,
    formatOptions: () => props.formatOptions,
    autoFocus: () => props.autoFocus,
    isWheelDisabled: () => props.isWheelDisabled,
    incrementAriaLabel: () => props.incrementAriaLabel,
    decrementAriaLabel: () => props.decrementAriaLabel,
    placeholder: () => props.placeholder,
    id: () => props.id,
    'aria-label': () => props['aria-label'],
    'aria-labelledby': () => props['aria-labelledby'],
    'aria-describedby': () => props['aria-describedby'],
    label: () => (hasLabel ? true : undefined),
    description: () => props.description,
    errorMessage: () => props.errorMessage,
    onPaste: props.onPaste,
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
  }
}

function provideFieldContexts(
  state: NumberFieldState,
  fieldAria: ReturnType<typeof useNumberField>,
  fieldRef: Ref<Element | null>,
  inputRef: Ref<HTMLInputElement | null>,
  stateContextKey: InjectionKey<any>,
  isDisabled: () => boolean,
  isReadOnly: () => boolean,
) {
  provide(stateContextKey, state)

  const groupCtx = liveCopy(fieldAria.groupProps as any)
  groupCtx.ref = (el: any) => {
    fieldRef.value = el
  }
  Object.defineProperties(groupCtx, {
    isInvalid: {get: () => state.displayValidation.isInvalid, enumerable: true, configurable: true},
    isDisabled: {get: isDisabled, enumerable: true, configurable: true},
    isReadOnly: {get: isReadOnly, enumerable: true, configurable: true},
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

  provide(ButtonContextKey, {
    slots: {
      increment: fieldAria.incrementButtonProps,
      decrement: fieldAria.decrementButtonProps,
    },
  })
}

/**
 * A number field allows a user to enter a number, and increment or decrement the value using stepper
 * buttons.
 */
export const NumberField = defineComponent({
  name: 'NumberField',
  inheritAttrs: false,
  props: {
    value: {default: undefined},
    defaultValue: {default: undefined},
    minValue: {default: undefined},
    maxValue: {default: undefined},
    step: {default: undefined},
    formatOptions: {default: undefined},
    commitBehavior: {type: String as PropType<'snap' | 'validate' | undefined>, default: undefined},
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
    isWheelDisabled: {type: Boolean, default: undefined},
    incrementAriaLabel: {type: String, default: undefined},
    decrementAriaLabel: {type: String, default: undefined},
    placeholder: {type: String, default: undefined},
    id: {type: String, default: undefined},
    label: {default: undefined},
    description: {default: undefined},
    errorMessage: {default: undefined},
    'aria-label': {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    'aria-describedby': {type: String, default: undefined},
    onKeyDown: {type: Function as PropType<(e: KeyboardEvent) => void>, default: undefined},
    onKeyUp: {type: Function as PropType<(e: KeyboardEvent) => void>, default: undefined},
    onFocus: {type: Function as PropType<(e: FocusEvent) => void>, default: undefined},
    onBlur: {type: Function as PropType<(e: FocusEvent) => void>, default: undefined},
    onFocusChange: {type: Function as PropType<(v: boolean) => void>, default: undefined},
    onPaste: {type: Function as PropType<(e: ClipboardEvent) => void>, default: undefined},
    slot: {type: String, default: undefined},
  },
  emits: ['change', 'focuschange'],
  setup(props, {slots, attrs, emit}) {
    const locale = useLocale()
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'

    const state = useNumberFieldState({
      ...numberFieldStateProps(props, locale, validationBehavior),
      onChange: (value: number) => emit('change', value),
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
          isInvalid: state.displayValidation.isInvalid,
          isDisabled: props.isDisabled || false,
          isReadOnly: props.isReadOnly || false,
          isRequired: props.isRequired || false,
        })
        hasLabel = detectLabel(flatten(probe))
      }
    } catch {
      hasLabel = false
    }

    const fieldAria = useNumberField(
      {
        ...numberFieldAriaProps(props, attrs as Record<string, any>, validationBehavior, hasLabel, inputRef),
        onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
        onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
        onFocusChange: (v: boolean) => emit('focuschange', v),
      } as any,
      state as any,
      inputRef,
    )

    provideFieldContexts(
      state as any,
      fieldAria as any,
      fieldRef,
      inputRef,
      NumberFieldStateContextKey,
      () => Boolean(props.isDisabled),
      () => Boolean(props.isReadOnly),
    )

    const groupPropsForRender = fieldAria.groupProps as Record<string, any>

    return () => {
      const values: NumberFieldRenderProps = {
        state: state as any,
        isInvalid: state.displayValidation.isInvalid,
        isDisabled: props.isDisabled || false,
        isReadOnly: props.isReadOnly || false,
        isRequired: props.isRequired || false,
      }
      const className =
        typeof (attrs as any).class === 'function' ? (attrs as any).class(values) : (attrs as any).class
      const style =
        typeof (attrs as any).style === 'function' ? (attrs as any).style(values) : (attrs as any).style

      const outerAttrs: Record<string, any> = {...attrs}
      delete outerAttrs.id
      delete outerAttrs.class
      delete outerAttrs.style

      const groupVNode = h(
        'div',
        mergeProps(outerAttrs, groupPropsForRender, {
          slot: props.slot || undefined,
          class: className ?? 'react-aria-NumberField',
          style,
          'data-invalid': values.isInvalid ? 'true' : undefined,
          'data-disabled': values.isDisabled ? 'true' : undefined,
          'data-readonly': values.isReadOnly ? 'true' : undefined,
          'data-required': values.isRequired ? 'true' : undefined,
        }),
        slots.default?.(values),
      )

      const hiddenVNode = props.name
        ? h('input', {
            type: 'hidden',
            name: props.name,
            form: props.form,
            value: isNaN(state.numberValue) ? '' : state.numberValue,
            disabled: props.isDisabled || undefined,
          })
        : null

      return [groupVNode, hiddenVNode]
    }
  },
})
