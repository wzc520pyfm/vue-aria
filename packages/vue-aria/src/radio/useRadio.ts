/*
 * Port of `react-aria@3.53.1` `useRadio`
 * (`packages/react-aria/src/radio/useRadio.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Roving tabIndex, press state on the label,
 * native form reset, and group-level validation behavior are preserved.
 * Returned *Props are plain objects with live getters.
 */

import {toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import {filterDOMProps} from '../utils/filterDOMProps'
import {mergeProps} from '../utils/mergeProps'
import {radioGroupData} from './utils'
import type {RadioGroupState} from '../../../vue-stately/src/radio/useRadioGroupState'
import {useFocusable} from '../interactions/useFocusable'
import {useFormReset} from '../utils/useFormReset'
import {useFormValidation} from '../form/useFormValidation'
import {usePress, type PressEvent} from '../interactions/press'
import {useId, useSlotId} from '../utils/useId'

export interface RadioProps {
  /**
   * The value of the radio button, used when submitting an HTML form.
   * See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio#Value).
   */
  value: MaybeRefOrGetter<string>
  /** The label for the Radio. Accepts any renderable node. */
  children?: unknown
  /**
   * Whether the radio button is disabled or not.
   * Shows that a selection exists, but is not available in that circumstance.
   */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  id?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-details'?: MaybeRefOrGetter<string | undefined>
  'aria-errormessage'?: MaybeRefOrGetter<string | undefined>
  onPress?: (e: PressEvent) => void
  onPressStart?: (e: PressEvent) => void
  onPressEnd?: (e: PressEvent) => void
  onPressChange?: (isPressed: boolean) => void
  onPressUp?: (e: PressEvent) => void
  onClick?: (e: MouseEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  excludeFromTabOrder?: MaybeRefOrGetter<boolean | undefined>
}

export interface AriaRadioProps extends RadioProps {}

export interface RadioAria {
  /** Props for the label wrapper element. */
  labelProps: Record<string, any>
  /** Props for the input element. */
  inputProps: Record<string, any>
  /** Props for the radio description element, if any. */
  descriptionProps: Record<string, any>
  /** Whether the radio is disabled. */
  readonly isDisabled: boolean
  /** Whether the radio is currently selected. */
  readonly isSelected: boolean
  /** Whether the radio is in a pressed state. */
  readonly isPressed: boolean
}

/**
 * Provides the behavior and accessibility implementation for an individual
 * radio button in a radio group.
 *
 * @param props - Props for the radio.
 * @param state - State for the radio group, as returned by `useRadioGroupState`.
 * @param ref - Ref to the HTML input element.
 */
export function useRadio(
  props: AriaRadioProps,
  state: RadioGroupState,
  ref: Ref<HTMLInputElement | null>,
): RadioAria {
  const value = () => toValue(props.value)

  const isDisabled = () => Boolean(toValue(props.isDisabled) || state.isDisabled)

  const checked = () => state.selectedValue === value()

  const onChange = (e: Event) => {
    e.stopPropagation()
    state.setSelectedValue(value())
  }

  // Handle press state for keyboard interactions and cases where labelProps is not used.
  const {pressProps, isPressed} = usePress({
    onPressStart: props.onPressStart,
    onPressEnd: props.onPressEnd,
    onPressChange: props.onPressChange,
    onPress: props.onPress,
    onPressUp: props.onPressUp,
    onClick: props.onClick,
    isDisabled,
  })

  // Handle press state on the label.
  const {pressProps: labelPressProps, isPressed: isLabelPressed} = usePress({
    onPressStart: props.onPressStart,
    onPressEnd: props.onPressEnd,
    onPressChange: props.onPressChange,
    onPressUp: props.onPressUp,
    onClick: props.onClick,
    isDisabled,
    onPress(e) {
      props.onPress?.(e)
      state.setSelectedValue(value())
      ref.value?.focus()
    },
  })

  // Chain the user's focus handlers with the group's lastFocusedValue
  // tracker (official `useFocusable(mergeProps(props, {onFocus}))`) — the
  // user's `onFocus` must still run alongside `setLastFocusedValue`.
  const {focusableProps} = useFocusable(
    mergeProps(
      {
        onFocus: props.onFocus,
        onBlur: props.onBlur,
        onFocusChange: props.onFocusChange,
        onKeyDown: props.onKeyDown,
        onKeyUp: props.onKeyUp,
        autoFocus: props.autoFocus,
        excludeFromTabOrder: props.excludeFromTabOrder,
      } as any,
      {onFocus: () => state.setLastFocusedValue(value())},
    ),
    ref as any,
  )
  const interactions = mergeProps(pressProps, focusableProps)
  const domProps = filterDOMProps(props, {labelable: true})

  // Roving tabIndex: the selected radio (or the last focused one when nothing
  // is selected) is tabbable; all others are arrow-key reachable only.
  const tabIndex = () => {
    let t: number | undefined = -1
    if (state.selectedValue != null) {
      if (state.selectedValue === value()) {
        t = 0
      }
    } else if (state.lastFocusedValue === value() || state.lastFocusedValue == null) {
      t = 0
    }
    if (isDisabled()) {
      t = undefined
    }
    return t
  }

  const groupData = () => radioGroupData.get(state)
  useFormReset(ref, () => state.defaultSelectedValue, state.setSelectedValue)
  useFormValidation(
    {validationBehavior: () => groupData()?.validationBehavior() ?? 'aria'} as any,
    state,
    ref,
  )

  const descriptionId = useId('vue-aria-description')
  const resolvedDescriptionId = useSlotId(descriptionId)
  const descriptionProps: Record<string, any> = {}
  Object.defineProperties(descriptionProps, {
    id: {get: () => resolvedDescriptionId.value, enumerable: true, configurable: true},
  })

  const inputProps = mergeProps(domProps, {
    ...interactions,
    type: 'radio',
    onChange,
  })
  Object.defineProperties(inputProps, {
    name: {get: () => groupData()?.name?.(), enumerable: true, configurable: true},
    form: {get: () => groupData()?.form?.(), enumerable: true, configurable: true},
    tabIndex: {get: () => tabIndex(), enumerable: true, configurable: true},
    disabled: {get: () => isDisabled() || undefined, enumerable: true, configurable: true},
    required: {
      get: () =>
        (state.isRequired && (groupData()?.validationBehavior() ?? 'aria') === 'native') ||
        undefined,
      enumerable: true,
      configurable: true,
    },
    checked: {get: () => checked(), enumerable: true, configurable: true},
    value: {get: () => value(), enumerable: true, configurable: true},
    'aria-describedby': {
      get: () =>
        [
          toValue(props['aria-describedby']),
          resolvedDescriptionId.value,
          state.isInvalid ? groupData()?.errorMessageId?.() : null,
          groupData()?.descriptionId?.(),
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      enumerable: true,
      configurable: true,
    },
  })
  for (const key of ['id', 'aria-label', 'aria-labelledby', 'aria-details'] as const) {
    Object.defineProperty(inputProps, key, {
      get: () => toValue((props as any)[key]),
      enumerable: true,
      configurable: true,
    })
  }

  const labelProps = mergeProps(labelPressProps, {
    onClick: (e: MouseEvent) => e.preventDefault(),
    // Official camelCase name (for parity with React Aria) plus the
    // lowercase form Vue actually binds to the native `mousedown` event.
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
    // Prevent label from being focused when mouse down on it.
    // Note, this does not prevent the input from being focused in the `click` event.
    onMousedown: (e: MouseEvent) => e.preventDefault(),
  })

  const out = {
    labelProps,
    inputProps,
    descriptionProps,
  } as RadioAria
  Object.defineProperties(out, {
    isDisabled: {get: () => isDisabled(), enumerable: true, configurable: true},
    isSelected: {get: () => checked(), enumerable: true, configurable: true},
    isPressed: {
      get: () => isPressed.value || isLabelPressed.value,
      enumerable: true,
      configurable: true,
    },
  })
  return out
}
