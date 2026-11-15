/*
 * Port of `react-aria@3.53.1` `focusSafely`
 * (`packages/react-aria/src/interactions/focusSafely.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported.
 */

import {getOwnerDocument} from './dom'
import {getInteractionModality} from '../interactions/focusVisible'

/** Focuses an element without scrolling. Official `focusWithoutScrolling`. */
function focusWithoutScrolling(element: HTMLElement): void {
  element.focus({preventScroll: true})
}

/**
 * A utility function that focuses an element while avoiding undesired side effects such
 * as page scrolling and screen reader issues with CSS transitions.
 */
export function focusSafely(element: HTMLElement): void {
  if (!element.isConnected) {
    return
  }

  // If the user is interacting with a virtual cursor, e.g. screen reader, then
  // wait until after any animated transitions that are currently occurring on
  // the page before shifting focus.
  const ownerDocument = getOwnerDocument(element)
  if (getInteractionModality() === 'virtual') {
    const lastFocusedElement = ownerDocument.activeElement
    runAfterTransition(() => {
      const activeElement = ownerDocument.activeElement
      // If focus did not move and the element is still in the document, focus it.
      if (
        (activeElement === lastFocusedElement || activeElement === ownerDocument.body) &&
        element.isConnected
      ) {
        focusWithoutScrolling(element)
      }
    })
  } else {
    focusWithoutScrolling(element)
  }
}

/** Runs the callback after the CSS transition on the document body ends (official `runAfterTransition`). */
function runAfterTransition(fn: () => void): void {
  const onTransitionEnd = (e: TransitionEvent) => {
    const target = e.target as HTMLElement
    if (transitionTargets.includes(target)) {
      transitionTargets.splice(transitionTargets.indexOf(target), 1)
      if (transitionTargets.length === 0) {
        document.body.removeEventListener('transitionend', onTransitionEnd)
        fn()
      }
    }
  }

  // Collect the currently transitioning elements (official collects transitions
  // and waits until they are all done). When none are running, run immediately.
  const transitionTargets: HTMLElement[] = document.getAnimations
    ? (document.getAnimations() as any[])
        .map((a) => (a.effect?.target as HTMLElement) ?? null)
        .filter((t): t is HTMLElement => !!t)
    : []

  if (transitionTargets.length === 0) {
    fn()
    return
  }

  document.body.addEventListener('transitionend', onTransitionEnd)
}
