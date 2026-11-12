import {onBeforeUnmount, watchEffect, toValue, type MaybeRefOrGetter} from 'vue'

export interface UsePreventScrollOptions {
  /** Whether the scroll lock is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
}

let preventScrollCount = 0
let restore: (() => void) | null = null

/**
 * Prevents scrolling on the document body while active, and restores it when
 * the last caller releases the lock. Also pads the root to reduce layout shift
 * when the scrollbar disappears.
 *
 * Simplified port of official `usePreventScroll`
 * (`packages/react-aria/src/overlays/usePreventScroll.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * iOS / WebKit-specific touch handling, `focus()` overrides, and visual
 * viewport compensation are deferred.
 */
export function usePreventScroll(options: UsePreventScrollOptions = {}): void {
  watchEffect((onCleanup) => {
    if (toValue(options.isDisabled)) return

    preventScrollCount++
    if (preventScrollCount === 1) {
      restore = preventScrollStandard()
    }

    onCleanup(() => {
      preventScrollCount--
      if (preventScrollCount === 0) {
        restore?.()
        restore = null
      }
    })
  })

  onBeforeUnmount(() => {
    // watchEffect cleanup already runs; this is a safety net if the effect
    // was disabled at unmount time with a stale count — no extra work.
  })
}

function preventScrollStandard() {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  const previousOverflow = root.style.overflow
  const previousPadding = root.style.paddingRight
  const style = root.style as CSSStyleDeclaration & {scrollbarGutter?: string}
  const previousGutter = style.scrollbarGutter
  const scrollbarWidth = window.innerWidth - root.clientWidth
  const supportsGutter = typeof CSSStyleDeclaration !== 'undefined' && 'scrollbarGutter' in document.documentElement.style

  root.style.overflow = 'hidden'
  if (scrollbarWidth > 0) {
    if (supportsGutter) {
      style.scrollbarGutter = 'stable'
    } else {
      style.paddingRight = `${scrollbarWidth}px`
    }
  }

  return () => {
    style.overflow = previousOverflow
    style.paddingRight = previousPadding
    if (supportsGutter) {
      style.scrollbarGutter = previousGutter ?? ''
    }
  }
}
