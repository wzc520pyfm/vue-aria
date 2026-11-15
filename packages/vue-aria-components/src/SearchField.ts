/*
 * Port of `react-aria-components@1.22.1` `SearchField`
 * (`packages/react-aria-components/src/SearchField.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: contexts carry live getters instead of spread snapshots,
 * and the Hero UI data-* attributes are emitted locally as "true" strings.
 * Form / FieldError remain deferred (official SearchField only optionally
 * reads `validationBehavior` from FormContext and defaults to `'native'`).
 * The clear button is provided through `ButtonContext`.
 */

import {
  defineComponent,
  h,
  provide,
  ref,
  type InjectionKey,
  type PropType,
} from 'vue'
import {Fragment, isVNode, type VNode, type VNodeChild} from 'vue'
import {useSearchField} from 'vue-aria/useSearchField'
import {useSearchFieldState, type SearchFieldState} from 'vue-stately/useSearchFieldState'
import {mergeProps} from 'vue-aria'
import {GroupContextKey} from './Group'
import {
  ButtonContextKey,
  InputContextKey,
  LabelContextKey,
  TextAreaContextKey,
  TextContextKey,
} from './context'

export interface SearchFieldRenderProps {
  /** Whether the search field is empty. @selector [data-empty] */
  isEmpty: boolean
  /** Whether the search field is disabled. @selector [data-disabled] */
  isDisabled: boolean
  /** Whether the search field is invalid. @selector [data-invalid] */
  isInvalid: boolean
  /** Whether the search field is read only. @selector [data-readonly] */
  isReadOnly: boolean
  /** Whether the search field is required. @selector [data-required] */
  isRequired: boolean
  /** State of the search field. */
  state: SearchFieldState
}

export interface SearchFieldProps {
  value?: any
  defaultValue?: any
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  onClear?: () => void
  type?: string
  placeholder?: string
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
  autoCapitalize?: string
  autoCorrect?: string
  inputMode?: string
  maxLength?: number
  minLength?: number
  pattern?: string
  spellCheck?: string | boolean
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  autoFocus?: boolean
  id?: string
  label?: any
  description?: any
  errorMessage?: any
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-errormessage'?: string
  'aria-activedescendant'?: string
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both'
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  'aria-controls'?: string
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  slot?: string
  class?: any
  style?: any
}

export const SearchFieldContextKey: InjectionKey<Record<string, any> | null> = Symbol(
  'vue-aria-components.SearchFieldContext',
)
export {SearchFieldContextKey as SearchFieldContext}

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

function searchFieldStateProps(
  props: any,
  validationBehavior: () => 'aria' | 'native',
  onChange: (value: string) => void,
) {
  return {
    value: () => props.value,
    defaultValue: () => props.defaultValue,
    isDisabled: () => props.isDisabled,
    isReadOnly: () => props.isReadOnly,
    isRequired: () => props.isRequired,
    isInvalid: () => props.isInvalid,
    validationState: () => props.validationState,
    validationBehavior,
    label: () => props.label,
    description: () => props.description,
    errorMessage: () => props.errorMessage,
    onChange,
  }
}

function searchFieldAriaProps(
  props: any,
  attrs: Record<string, any>,
  validationBehavior: () => 'aria' | 'native',
  hasLabel: boolean,
) {
  return {
    isDisabled: () => props.isDisabled,
    isReadOnly: () => props.isReadOnly,
    isRequired: () => props.isRequired,
    isInvalid: () => props.isInvalid,
    validationState: () => props.validationState,
    validationBehavior,
    type: () => props.type,
    placeholder: () => props.placeholder,
    autoComplete: () => props.autoComplete,
    autoCapitalize: () => props.autoCapitalize,
    autoCorrect: () => props.autoCorrect,
    inputMode: () => props.inputMode,
    spellCheck: () => props.spellCheck,
    enterKeyHint: () => props.enterKeyHint,
    maxLength: () => props.maxLength,
    minLength: () => props.minLength,
    pattern: () => props.pattern,
    autoFocus: () => props.autoFocus,
    id: () => props.id,
    name: () => props.name,
    form: () => props.form,
    label: () => (hasLabel ? true : undefined),
    description: () => props.description,
    errorMessage: () => props.errorMessage,
    'aria-label': () => props['aria-label'],
    'aria-labelledby': () => props['aria-labelledby'],
    'aria-describedby': () => props['aria-describedby'],
    'aria-errormessage': () => props['aria-errormessage'],
    'aria-activedescendant': () => props['aria-activedescendant'],
    'aria-autocomplete': () => props['aria-autocomplete'],
    'aria-haspopup': () => props['aria-haspopup'],
    'aria-controls': () => props['aria-controls'],
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
    onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
    onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
    onInput: (e: InputEvent) => (attrs as any).onInput?.(e),
    onBeforeInput: (e: InputEvent) => (attrs as any).onBeforeInput?.(e),
    onCopy: (e: ClipboardEvent) => (attrs as any).onCopy?.(e),
    onCut: (e: ClipboardEvent) => (attrs as any).onCut?.(e),
    onPaste: (e: ClipboardEvent) => (attrs as any).onPaste?.(e),
    onSelect: (e: Event) => (attrs as any).onSelect?.(e),
    onCompositionEnd: (e: CompositionEvent) => (attrs as any).onCompositionEnd?.(e),
    onCompositionStart: (e: CompositionEvent) => (attrs as any).onCompositionStart?.(e),
    onCompositionUpdate: (e: CompositionEvent) => (attrs as any).onCompositionUpdate?.(e),
  }
}

/**
 * A search field allows a user to enter and clear a search query.
 */
export const SearchField = defineComponent({
  name: 'SearchField',
  inheritAttrs: false,
  props: {
    value: {default: undefined},
    defaultValue: {default: undefined},
    onSubmit: {type: Function as PropType<(value: string) => void>, default: undefined},
    type: {type: String, default: undefined},
    placeholder: {type: String, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    isReadOnly: {type: Boolean, default: undefined},
    isRequired: {type: Boolean, default: undefined},
    isInvalid: {type: Boolean, default: undefined},
    validationState: {type: String as PropType<'valid' | 'invalid' | undefined>, default: undefined},
    validationBehavior: {type: String as PropType<'aria' | 'native' | undefined>, default: undefined},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    autoComplete: {type: String, default: undefined},
    autoCapitalize: {type: String, default: undefined},
    autoCorrect: {type: String, default: undefined},
    inputMode: {type: String, default: undefined},
    spellCheck: {type: [String, Boolean], default: undefined},
    enterKeyHint: {type: String as PropType<SearchFieldProps['enterKeyHint']>, default: undefined},
    maxLength: {type: Number, default: undefined},
    minLength: {type: Number, default: undefined},
    pattern: {type: String, default: undefined},
    autoFocus: {type: Boolean, default: undefined},
    id: {type: String, default: undefined},
    label: {default: undefined},
    description: {default: undefined},
    errorMessage: {default: undefined},
    'aria-label': {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    'aria-describedby': {type: String, default: undefined},
    'aria-errormessage': {type: String, default: undefined},
    'aria-activedescendant': {type: String, default: undefined},
    'aria-autocomplete': {type: String, default: undefined},
    'aria-haspopup': {type: [Boolean, String], default: undefined},
    'aria-controls': {type: String, default: undefined},
    onKeyDown: {type: Function as PropType<(e: KeyboardEvent) => void>, default: undefined},
    onKeyUp: {type: Function as PropType<(e: KeyboardEvent) => void>, default: undefined},
    slot: {type: String, default: undefined},
  },
  emits: ['change', 'clear'],
  setup(props, {slots, attrs, emit}) {
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'

    const state = useSearchFieldState({
      ...searchFieldStateProps(props, validationBehavior, (value: string) => emit('change', value)),
    } as any)

    const inputRef = ref<HTMLInputElement | null>(null)

    // Detect a top-level <Label> in the default slot; the field needs to know
    // a label exists so aria-labelledby on the field includes the label id.
    let hasLabel = false
    try {
      if (slots.default) {
        const probe = slots.default({
          state,
          isEmpty: state.value === '',
          isDisabled: props.isDisabled || false,
          isInvalid: !!props.isInvalid,
          isReadOnly: props.isReadOnly || false,
          isRequired: props.isRequired || false,
        })
        hasLabel = detectLabel(flatten(probe))
      }
    } catch {
      hasLabel = false
    }

    const fieldAria = useSearchField(
      {
        ...searchFieldAriaProps(props, attrs as Record<string, any>, validationBehavior, hasLabel),
        onSubmit: props.onSubmit,
        onClear: () => emit('clear'),
      } as any,
      state,
      inputRef,
    )

    const labelRef = ref<Element | null>(null)

    const groupCtx: Record<string, any> = {}
    Object.defineProperties(groupCtx, {
      isInvalid: {get: () => fieldAria.isInvalid, enumerable: true, configurable: true},
      isDisabled: {get: () => Boolean(props.isDisabled), enumerable: true, configurable: true},
    })
    provide(GroupContextKey, groupCtx)

    const inputCtx = liveCopy(fieldAria.inputProps as any)
    inputCtx.ref = inputRef
    provide(InputContextKey, inputCtx)

    const buttonCtx = liveCopy(fieldAria.clearButtonProps as any)
    provide(ButtonContextKey, buttonCtx)

    const labelCtx = liveCopy(fieldAria.labelProps as any)
    labelCtx.ref = labelRef
    provide(LabelContextKey, labelCtx)

    provide(TextContextKey, {
      slots: {
        description: fieldAria.descriptionProps,
        errorMessage: fieldAria.errorMessageProps,
      },
    })

    return () => {
      const values: SearchFieldRenderProps = {
        state,
        isEmpty: state.value === '',
        isDisabled: props.isDisabled || false,
        isInvalid: fieldAria.isInvalid,
        isReadOnly: props.isReadOnly || false,
        isRequired: props.isRequired || false,
      }
      const className =
        typeof (attrs as any).class === 'function' ? (attrs as any).class(values) : (attrs as any).class
      const style =
        typeof (attrs as any).style === 'function' ? (attrs as any).style(values) : (attrs as any).style

      const outerAttrs: Record<string, any> = {...attrs}
      delete outerAttrs.class
      delete outerAttrs.style

      return h(
        'div',
        mergeProps(outerAttrs, {
          slot: props.slot || undefined,
          class: className ?? 'react-aria-SearchField',
          style,
          'data-empty': values.isEmpty ? 'true' : undefined,
          'data-invalid': values.isInvalid ? 'true' : undefined,
          'data-disabled': values.isDisabled ? 'true' : undefined,
          'data-readonly': values.isReadOnly ? 'true' : undefined,
          'data-required': values.isRequired ? 'true' : undefined,
        }),
        slots.default?.(values),
      )
    }
  },
})
