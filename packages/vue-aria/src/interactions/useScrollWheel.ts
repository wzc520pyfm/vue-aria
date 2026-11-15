/*
 * Port of `react-aria@3.53.1` `useScrollWheel`
 * (`packages/react-aria/src/interactions/useScrollWheel.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported. The wheel listener is
 * attached non-passively (so `preventDefault` works) and re-attached when the
 * element appears; `isDisabled` is a live maybe-getter.
 */

import {onScopeDispose, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'

export interface ScrollWheelProps {
  onScroll?: (e: {deltaX: number; deltaY: number}) => void
  /** Whether the scroll listener should be disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
}

// scroll wheel needs to be added not passively so it's cancelable, small helper hook to remember that
export function useScrollWheel(
  props: ScrollWheelProps,
  ref: Ref<HTMLElement | null>,
): void {
  let remove: (() => void) | null = null

  const attach = (el: HTMLElement | null) => {
    if (remove) {
      remove()
      remove = null
    }
    if (!el) {
      return
    }
    const onScrollHandler = (e: WheelEvent) => {
      if (toValue(props.isDisabled)) {
        return
      }
      // If the ctrlKey is pressed, this is a zoom event, do nothing.
      if (e.ctrlKey) {
        return
      }

      // stop scrolling the page
      e.preventDefault()
      e.stopPropagation()

      if (props.onScroll) {
        props.onScroll({deltaX: e.deltaX, deltaY: e.deltaY})
      }
    }
    el.addEventListener('wheel', onScrollHandler, {passive: false})
    remove = () => el.removeEventListener('wheel', onScrollHandler)
  }

  watch(
    ref,
    (el) => attach(el),
    {immediate: true, flush: 'post'},
  )
  onScopeDispose(() => {
    if (remove) {
      remove()
      remove = null
    }
  })
}
