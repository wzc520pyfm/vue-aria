/*
 * Port of `react-aria@3.53.1` `useRadioGroup`
 * (`packages/react-aria/src/radio/useRadioGroup.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue reactivity. Arrow-key navigation walks focusable radio
 * inputs (RTL handled via `useLocale` for horizontal orientation); the
 * `radioGroupData` WeakMap is populated with live getters. Returned *Props
 * are plain objects with live getters.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'
import {filterDOMProps} from '../utils/filterDOMProps'
import {getEventTarget, getOwnerWindow} from '../utils/dom'
import {getFocusableTreeWalker} from '../focus/useFocusScope'
import {mergeProps} from '../utils/mergeProps'
import {radioGroupData} from './utils'
import type {RadioGroupProps, RadioGroupState} from '../../../vue-stately/src/radio/useRadioGroupState'
import {useField} from '../label/useField'
import {useFocusWithin} from '../interactions/useFocusWithin'
import {useId} from '../utils/useId'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocale} from '../i18n/I18nProvider'

export interface AriaRadioGroupProps extends RadioGroupProps {
  /** Handler that is called when the group receives focus. */
  onFocus?: (e: FocusEvent) => void
  /** Handler that is called when the group loses focus. */
  onBlur?: (e: FocusEvent) => void
  /** Handler that is called when the group's focus status changes. */
  onFocusChange?: (isFocused: boolean) => void
}

export interface RadioGroupAria {
  /** Props for the radio group wrapper element. */
  radioGroupProps: Record<string, any>
  /** Props for the radio group's visible label (if any). */
  labelProps: Record<string, any>
  /** Props for the radio group description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the radio group error message element, if any. */
  errorMessageProps: Record<string, any>
  /** Whether the radio group is invalid. */
  readonly isInvalid: boolean
  validationErrors: string[]
  validationDetails: Record<string, any>
}

/**
 * Provides the behavior and accessibility implementation for a radio group component.
 * Radio groups allow users to select a single item from a list of mutually exclusive options.
 *
 * @param props - Props for the radio group.
 * @param state - State for the radio group, as returned by `useRadioGroupState`.
 */
export function useRadioGroup(
  props: AriaRadioGroupProps,
  state: RadioGroupState,
): RadioGroupAria {
  const isReadOnly = () => Boolean(toValue(props.isReadOnly))
  const isDisabled = () => Boolean(toValue(props.isDisabled))
  const isRequired = () => Boolean(toValue(props.isRequired))
  const orientation = () => toValue(props.orientation) ?? 'vertical'
  const validationBehavior = () =>
    (toValue(props.validationBehavior) ?? 'aria') as 'aria' | 'native'

  // `useLocale()` returns live getters — keep the object and read
  // `direction` at event time so RTL switches apply without remounting.
  const locale = useLocale()

  const isInvalid = () => state.displayValidation.isInvalid
  const validationErrors = () => state.displayValidation.validationErrors
  const validationDetails = () => state.displayValidation.validationDetails as any

  const {labelProps, fieldProps, descriptionProps, errorMessageProps} = useField({
    // Live getters only — never spread the reactive props object.
    id: () => toValue(props.id),
    label: () => toValue(props.label),
    'aria-labelledby': () => toValue(props['aria-labelledby']),
    'aria-label': () => toValue(props['aria-label']),
    // Radio group is not an HTML input element so it
    // shouldn't be labeled by a <label> element.
    labelElementType: 'span',
    description: () => toValue(props.description),
    errorMessage: () => toValue(props.errorMessage) ?? validationErrors(),
    isInvalid: () => state.isInvalid,
    'aria-describedby': () => toValue(props['aria-describedby']),
  } as any)

  const domProps = filterDOMProps(props, {labelable: true})

  // When the radio group loses focus, reset the focusable radio to null if
  // there is no selection. This allows tabbing into the group from either
  // direction to go to the first or last radio.
  const {focusWithinProps} = useFocusWithin({
    onBlurWithin(e: FocusEvent) {
      props.onBlur?.(e)
      if (!state.selectedValue) {
        state.setLastFocusedValue(null)
      }
    },
    onFocusWithin: props.onFocus,
    onFocusWithinChange: (props as any).onFocusChange,
  })

  const getNextElement = (nextDir: 'next' | 'prev', e: Event): boolean => {
    // Official walker options: `from: getEventTarget(e)`. Emulate `from` by
    // setting `currentNode`; `firstChild` is emulated with `nextNode()` from
    // the container itself and `lastChild` with the walker's `lastChild()`.
    const walker = getFocusableTreeWalker(e.currentTarget as HTMLElement, {
      accept: (node) =>
        node instanceof (getOwnerWindow(node) as any).HTMLInputElement &&
        (node as HTMLInputElement).type === 'radio',
    })
    let nextElem: HTMLElement | null
    if (nextDir === 'next') {
      walker.currentNode = (getEventTarget(e) as HTMLElement) ?? (e.currentTarget as HTMLElement)
      nextElem = walker.nextNode()
      if (!nextElem) {
        walker.currentNode = e.currentTarget as HTMLElement
        nextElem = walker.nextNode()
      }
    } else {
      walker.currentNode = (getEventTarget(e) as HTMLElement) ?? (e.currentTarget as HTMLElement)
      nextElem = walker.previousNode()
      if (!nextElem) {
        walker.currentNode = e.currentTarget as HTMLElement
        nextElem = walker.lastChild()
      }
    }

    if (nextElem) {
      // Call focus on nextElem so that keyboard navigation scrolls the radio into view
      nextElem.focus()
      state.setSelectedValue((nextElem as HTMLInputElement).value)
      return true
    }
    return false
  }

  const {keyboardProps} = useKeyboard({
    shortcuts: {
      ArrowRight: (e: KeyboardEvent) => {
        const nextDir: 'next' | 'prev' =
          locale.direction === 'rtl' && orientation() !== 'vertical' ? 'prev' : 'next'
        return getNextElement(nextDir, e)
      },
      ArrowLeft: (e: KeyboardEvent) => {
        const nextDir: 'next' | 'prev' =
          locale.direction === 'rtl' && orientation() !== 'vertical' ? 'next' : 'prev'
        return getNextElement(nextDir, e)
      },
      ArrowDown: (e: KeyboardEvent) => getNextElement('next', e),
      ArrowUp: (e: KeyboardEvent) => getNextElement('prev', e),
    },
    allowRepeats: true,
  })

  // Official `useId(name)`: the prop name when provided, otherwise generated.
  const fallbackName = useId('vue-aria-radio-group')
  radioGroupData.set(state, {
    name: () => toValue(props.name) ?? fallbackName.value,
    form: () => toValue(props.form),
    descriptionId: () => (descriptionProps as any).id,
    errorMessageId: () => (errorMessageProps as any).id,
    validationBehavior,
  })

  const radioGroupProps = mergeProps(domProps, keyboardProps, fieldProps, focusWithinProps)
  Object.defineProperties(radioGroupProps, {
    // https://www.w3.org/TR/wai-aria-1.2/#radiogroup
    role: {value: 'radiogroup', enumerable: true, configurable: true},
    'aria-invalid': {
      get: () => state.isInvalid || undefined,
      enumerable: true,
      configurable: true,
    },
    'aria-errormessage': {
      get: () => toValue(props['aria-errormessage']),
      enumerable: true,
      configurable: true,
    },
    'aria-readonly': {get: () => isReadOnly() || undefined, enumerable: true, configurable: true},
    'aria-required': {get: () => isRequired() || undefined, enumerable: true, configurable: true},
    'aria-disabled': {get: () => isDisabled() || undefined, enumerable: true, configurable: true},
    'aria-orientation': {get: () => orientation(), enumerable: true, configurable: true},
  })

  const out = {
    radioGroupProps,
    labelProps,
    descriptionProps,
    errorMessageProps,
  } as RadioGroupAria
  Object.defineProperties(out, {
    isInvalid: {get: () => isInvalid(), enumerable: true, configurable: true},
    validationErrors: {get: () => validationErrors(), enumerable: true, configurable: true},
    validationDetails: {get: () => validationDetails(), enumerable: true, configurable: true},
  })
  return out
}
