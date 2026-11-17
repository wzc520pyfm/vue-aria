/*
 * Port of `react-stately@3.51.0` `useDisclosureState`
 * (`packages/react-stately/src/disclosure/useDisclosureState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Props are read through live getters so a controlled
 * `isExpanded` is never snapshotted at setup time. The returned state is a
 * plain object with a live `isExpanded` getter, not a ComputedRef.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'
import {useControlledState} from '../utils/useControlledState'

export interface DisclosureProps {
  /** Whether the disclosure is expanded (controlled). */
  isExpanded?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the disclosure is expanded by default (uncontrolled). */
  defaultExpanded?: MaybeRefOrGetter<boolean | undefined>
  /** Handler that is called when the disclosure expanded state changes. */
  onExpandedChange?: (isExpanded: boolean) => void
}

export interface DisclosureState {
  /** Whether the disclosure is currently expanded. */
  readonly isExpanded: boolean
  /** Sets whether the disclosure is expanded. */
  setExpanded(isExpanded: boolean): void
  /** Expand the disclosure. */
  expand(): void
  /** Collapse the disclosure. */
  collapse(): void
  /** Toggles the disclosure's visibility. */
  toggle(): void
}

/**
 * Manages state for a disclosure widget. Tracks whether the disclosure is expanded, and provides
 * methods to toggle this state.
 */
export function useDisclosureState(props: DisclosureProps = {}): DisclosureState {
  const [isExpanded, setExpanded] = useControlledState<boolean>(
    () => toValue(props.isExpanded),
    () => Boolean(toValue(props.defaultExpanded)),
    props.onExpandedChange,
  )

  const state: DisclosureState = {
    get isExpanded() {
      return isExpanded.value
    },
    setExpanded,
    expand() {
      setExpanded(true)
    },
    collapse() {
      setExpanded(false)
    },
    toggle() {
      setExpanded(!isExpanded.value)
    },
  }
  return state
}
