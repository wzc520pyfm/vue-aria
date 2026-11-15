// Portions of the code in this file are based on code from react.
// Original licensing for the following can be found in the
// NOTICE file in the root directory of this source tree.
// See https://github.com/facebook/react/tree/cc7c1aece46a6b69b41958d731e0fd27c94bfc6c/packages/react-interactions

/*
 * Port of `react-aria@3.53.1` `useFocus`
 * (`packages/react-aria/src/interactions/useFocus.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue and native DOM events. Official `useSyntheticBlurEvent`
 * exists because React does not fire blur on an element that becomes disabled
 * while focused; native `focusout`/`blur` behave differently, and this batch's
 * fields read `isDisabled` live at event time, so the React-specific MutationObserver
 * workaround is not ported. The contract is otherwise identical: focus events
 * on the immediate target only (children are ignored), with an `onFocusChange`
 * callback and an `isDisabled` opt-out. Public.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'

export interface FocusEvents<Target = Element> {
  /** Handler that is called when the element receives focus. */
  onFocus?: (e: FocusEvent) => void
  /** Handler that is called when the element loses focus. */
  onBlur?: (e: FocusEvent) => void
  /** Handler that is called when the element's focus status changes. */
  onFocusChange?: (isFocused: boolean) => void
}

export interface FocusProps<Target extends Element = Element> extends FocusEvents<Target> {
  /** Whether the focus events should be disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
}

export interface FocusResult<Target extends Element = Element> {
  /** Props to spread onto the target element. Plain object with live handlers. */
  focusProps: {
    onFocus?: (e: FocusEvent) => void
    onBlur?: (e: FocusEvent) => void
  }
}

function getEventTarget(e: Event): Element | null {
  return (e.target as Element | null) ?? null
}

function getCurrentTarget(e: Event): Element | null {
  return (e.currentTarget as Element | null) ?? null
}

function getOwnerDocument(target: Element | null): Document {
  return target?.ownerDocument ?? document
}

/**
 * Handles focus events for the immediate target.
 * Focus events on child elements will be ignored.
 */
export function useFocus<Target extends Element = Element>(
  props: FocusProps<Target> = {},
): FocusResult<Target> {
  const {onFocus: onFocusProp, onBlur: onBlurProp, onFocusChange} = props
  const isDisabled = () => Boolean(toValue(props.isDisabled))

  const onBlur = (e: FocusEvent) => {
    if (isDisabled()) {
      return
    }
    if (getEventTarget(e) === getCurrentTarget(e)) {
      // Focus events on child elements will be ignored.
      if (onBlurProp) {
        onBlurProp(e)
      }

      if (onFocusChange) {
        onFocusChange(false)
      }

      return true
    }
  }

  const onFocus = (e: FocusEvent) => {
    if (isDisabled()) {
      return
    }
    // Double check that document.activeElement actually matches e.target in case a previously chained
    // focus handler already moved focus somewhere else.
    const eventTarget = getEventTarget(e)
    const ownerDocument = eventTarget ? getOwnerDocument(eventTarget) : null
    const activeElement = ownerDocument ? ownerDocument.activeElement : null
    if (eventTarget === getCurrentTarget(e) && eventTarget === activeElement) {
      if (onFocusProp) {
        onFocusProp(e)
      }

      if (onFocusChange) {
        onFocusChange(true)
      }
    }
  }

  const focusProps: FocusResult<Target>['focusProps'] = {}
  if (onFocusProp || onFocusChange || onBlurProp) {
    focusProps.onFocus = onFocus
  }
  if (onBlurProp || onFocusChange) {
    focusProps.onBlur = onBlur
  }

  return {
    focusProps,
  }
}
