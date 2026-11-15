/*
 * Port of `react-aria-components@1.22.1` `DatePicker` (single-value branch only)
 * (`packages/react-aria-components/src/DatePicker.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: `Form`/`FieldError` and the deferred `DateRangePicker`
 * branch are intentionally out of scope, context values keep live getters
 * instead of spread snapshots, and Hero UI data-* attributes are emitted
 * locally as "true" strings.
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
import {
  type DateValue as IntlDateValue,
} from '@internationalized/date'
import {useDatePicker} from 'vue-aria/useDatePicker'
import {useDatePickerState, type DatePickerState} from 'vue-stately/useDatePickerState'
import {useLocale} from 'vue-aria/I18nProvider'
import {mergeProps, useFocusVisible, useFocusWithin} from 'vue-aria'
import type {Granularity} from 'vue-stately/useDateFieldState'
import {HiddenDateInput} from './HiddenDateInput'
import {
  ButtonContextKey,
  LabelContextKey,
  TextContextKey,
  PopoverContextKey,
  OverlayTriggerStateKey,
  DialogOverlayPropsKey,
} from './context'
import {GroupContextKey} from './Group'
import {CalendarContext} from './Calendar'
import {DateFieldContextKey, DateFieldStateContextKey} from './DateField'

export interface DatePickerRenderProps {
  /** Whether an element within the date picker is focused, either via a mouse or keyboard. */
  isFocusWithin: boolean
  /** Whether an element within the date picker is keyboard focused. */
  isFocusVisible: boolean
  /** Whether the date picker is disabled. */
  isDisabled: boolean
  /** Whether the date picker is read only. */
  isReadOnly: boolean
  /** Whether the date picker is invalid. */
  isInvalid: boolean
  /** Whether the date picker is required. */
  isRequired: boolean
  /** Whether the date picker's popover is currently open. */
  isOpen: boolean
  /** State of the date picker. */
  state: DatePickerState
}

export interface DatePickerProps {
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
  shouldCloseOnSelect?: boolean | (() => boolean)
  pageBehavior?: 'single' | 'visible'
  firstDayOfWeek?: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
  isOpen?: boolean
  defaultOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  id?: string
  slot?: string
  class?: any
  style?: any
}

export const DatePickerContextKey: InjectionKey<Record<string, any> | null> = Symbol(
  'vue-aria-components.DatePickerContext',
)
export {DatePickerContextKey as DatePickerContext}
export const DatePickerStateContextKey: InjectionKey<DatePickerState | null> = Symbol(
  'vue-aria-components.DatePickerStateContext',
)
export {DatePickerStateContextKey as DatePickerStateContext}

// Contexts to clear inside the popover.
const CLEAR_CONTEXTS = [GroupContextKey, ButtonContextKey, LabelContextKey, TextContextKey]

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
  // Only top-level composition counts: a <Label> directly inside the picker.
  for (const vnode of vnodes) {
    if (getComponentName(vnode) === 'Label') return true
  }
  return false
}

/**
 * Live copy of a plain object with getters — never snapshots values.
 * See DateField.ts for the same treatment.
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
      // props object — a getter-only accessor would throw there.
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

function stateProps(
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
    locale: () => locale.locale,
  }
}

/**
 * A date picker combines a DateField and a Calendar popover to allow users to enter or select a
 * date and time value.
 */
export const DatePicker = defineComponent({
  name: 'DatePicker',
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
    shouldCloseOnSelect: {type: null as any, default: undefined},
    pageBehavior: {type: String as PropType<'single' | 'visible' | undefined>, default: undefined},
    firstDayOfWeek: {
      type: String as PropType<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | undefined>,
      default: undefined,
    },
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    id: {type: String, default: undefined},
    slot: {type: String, default: undefined},
  },
  emits: ['change', 'openchange', 'focuschange'],
  setup(props, {slots, attrs, emit}) {
    const locale = useLocale()
    const validationBehavior = () => (props.validationBehavior ?? 'native') as 'aria' | 'native'

    // Pass live getters rather than spreading Vue props: spreading snapshots
    // controlled inputs (value/defaultValue/min/max/etc.) at setup, so later
    // parent updates would never reach the state.
    const state = useDatePickerState({
      ...stateProps(props, locale, validationBehavior),
      onChange: (value: any) => emit('change', value),
      shouldCloseOnSelect: () => props.shouldCloseOnSelect as any,
      pageBehavior: () => props.pageBehavior,
      firstDayOfWeek: () => props.firstDayOfWeek,
      isOpen: () => props.isOpen,
      defaultOpen: () => props.defaultOpen,
      onOpenChange: (isOpen: boolean) => emit('openchange', isOpen),
    } as any)

    const groupRef = ref<Element | null>(null)
    const labelRef = ref<HTMLElement | null>(null)
    // The positioning ref for the popover is the group element; the restore
    // ref is the trigger button — a focusable element (the group div is not).
    const buttonElRef = ref<Element | null>(null)

    // Detect a top-level <Label> in the default slot; the picker needs to know
    // a label exists so aria-labelledby on the field includes the label id.
    let hasLabel = false
    try {
      if (slots.default) {
        const probe = slots.default({
          state,
          isInvalid: state.isInvalid,
          isDisabled: Boolean(props.isDisabled),
          isReadOnly: Boolean(props.isReadOnly),
          isRequired: props.isRequired || false,
          isOpen: state.isOpen.value,
        })
        hasLabel = detectLabel(flatten(probe))
      }
    } catch {
      hasLabel = false
    }

    const pickerAria = useDatePicker(
      {
        ...resolveAriaProps(props, attrs as Record<string, any>),
        label: hasLabel ? true : undefined,
        description: () => (attrs as any).description,
        errorMessage: () => (attrs as any).errorMessage,
        placeholderValue: () => props.placeholderValue,
        hideTimeZone: () => props.hideTimeZone,
        hourCycle: () => props.hourCycle,
        shouldForceLeadingZeros: () => props.shouldForceLeadingZeros,
        granularity: () => props.granularity,
        minValue: () => props.minValue,
        maxValue: () => props.maxValue,
        isDisabled: () => props.isDisabled,
        isReadOnly: () => props.isReadOnly,
        isRequired: () => props.isRequired,
        isInvalid: () => props.isInvalid,
        validationState: () => props.validationState,
        validationBehavior,
        isDateUnavailable: (date: IntlDateValue) => props.isDateUnavailable?.(date) ?? false,
        firstDayOfWeek: () => props.firstDayOfWeek,
        pageBehavior: () => props.pageBehavior,
        validate: (value: any) => props.validate?.(value),
        autoFocus: () => props.autoFocus,
        name: () => props.name,
        form: () => props.form,
        onFocus: (e: FocusEvent) => (attrs as any).onFocus?.(e),
        onBlur: (e: FocusEvent) => (attrs as any).onBlur?.(e),
        onFocusChange: (v: boolean) => emit('focuschange', v),
        onKeyDown: (attrs as any).onKeyDown,
        onKeyUp: (attrs as any).onKeyUp,
      } as any,
      state as any,
      groupRef as any,
    )
    const {
      groupProps,
      labelProps,
      fieldProps,
      buttonProps,
      dialogProps,
      calendarProps,
      descriptionProps,
      errorMessageProps,
    } = pickerAria

    provide(DatePickerStateContextKey, state as any)

    const groupCtx = liveCopy(groupProps as any)
    groupCtx.ref = (el: any) => {
      groupRef.value = el
    }
    Object.defineProperties(groupCtx, {
      isInvalid: {get: () => state.isInvalid, enumerable: true, configurable: true},
      isDisabled: {get: () => Boolean(props.isDisabled), enumerable: true, configurable: true},
    })
    provide(GroupContextKey, groupCtx)

    provide(DateFieldContextKey, liveCopy(fieldProps as any))

    const labelCtx = liveCopy(labelProps as any)
    labelCtx.ref = labelRef
    ;(labelCtx as any).elementType = 'span'
    provide(LabelContextKey, labelCtx)

    const buttonCtx = liveCopy(buttonProps as any)
    Object.defineProperties(buttonCtx, {
      isPressed: {get: () => state.isOpen.value, enumerable: true, configurable: true},
      isDisabled: {get: () => Boolean(props.isDisabled) || Boolean(props.isReadOnly), enumerable: true, configurable: true},
      autoFocus: {get: () => Boolean(props.autoFocus), enumerable: true, configurable: true},
    })
    buttonCtx.ref = (el: any) => {
      buttonElRef.value = el
    }
    provide(ButtonContextKey, buttonCtx)

    provide(CalendarContext as any, calendarProps as any)
    provide(OverlayTriggerStateKey, state as any)
    provide(PopoverContextKey, {
      triggerRef: groupRef as any,
      restoreRef: buttonElRef as any,
      trigger: 'DatePicker',
      placement: 'bottom start',
      clearContexts: CLEAR_CONTEXTS,
      get 'aria-labelledby'() {
        return (dialogProps as any)['aria-labelledby'] as any
      },
    })
    provide(DialogOverlayPropsKey, dialogProps as any)
    provide(TextContextKey, {
      slots: {
        description: descriptionProps,
        errorMessage: errorMessageProps,
      },
    } as any)

    // Clear the field contexts for anything composed inside the popover so
    // overlay controls do not inherit the picker's group/button semantics.
    const {isFocusVisible, focusProps} = useFocusVisible()
    const isFocusWithin = ref(false)
    const {focusWithinProps} = useFocusWithin({
      onFocusWithinChange: (value: boolean) => {
        isFocusWithin.value = value
      },
    })

    return () => {
      const isFocusWithinV = isFocusWithin.value
      const isFocusVisibleV = isFocusWithin.value && isFocusVisible.value
      const values: DatePickerRenderProps = {
        state,
        isFocusWithin: isFocusWithinV,
        isFocusVisible: isFocusVisibleV,
        isDisabled: props.isDisabled || false,
        isInvalid: state.isInvalid,
        isOpen: state.isOpen.value,
        isReadOnly: props.isReadOnly || false,
        isRequired: props.isRequired || false,
      }
      const className =
        typeof attrs.class === 'function' ? (attrs.class as any)(values) : attrs.class
      const style = typeof attrs.style === 'function' ? (attrs.style as any)(values) : attrs.style

      const outerAttrs: Record<string, any> = {...attrs}
      delete outerAttrs.id
      delete outerAttrs.class
      delete outerAttrs.style

      return [
        h(
          'div',
          mergeProps(
            outerAttrs,
            focusWithinProps as any,
            focusProps as any,
            {
              slot: props.slot || undefined,
              class: className ?? 'react-aria-DatePicker',
              style,
              'data-focus-within': isFocusWithinV ? 'true' : undefined,
              'data-focus-visible': isFocusVisibleV ? 'true' : undefined,
              'data-invalid': state.isInvalid ? 'true' : undefined,
              'data-disabled': props.isDisabled ? 'true' : undefined,
              'data-readonly': props.isReadOnly ? 'true' : undefined,
              'data-required': props.isRequired ? 'true' : undefined,
              'data-open': state.isOpen.value ? 'true' : undefined,
            },
          ),
          slots.default?.(values),
        ),
        h(HiddenDateInput, {
          state: state as any,
          autoComplete: props.autoComplete,
          name: props.name,
          isDisabled: props.isDisabled,
        }),
      ]
    }
  },
})
