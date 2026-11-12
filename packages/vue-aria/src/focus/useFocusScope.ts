import {onBeforeUnmount, watch, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import {getOwnerDocument} from '../utils/dom'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface UseFocusScopeOptions {
  /** The container to trap focus within. */
  ref: Ref<HTMLElement | null | undefined>
  /** Whether focus should be contained (Tab cycles inside the scope). @default true */
  contain?: MaybeRefOrGetter<boolean | undefined>
  /** Whether to move focus into the scope when it becomes active. @default true */
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  /** Whether to restore focus to the previously focused element on cleanup. @default true */
  restoreFocus?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the scope is currently active. @default true when the ref is mounted */
  isActive?: MaybeRefOrGetter<boolean | undefined>
}

/**
 * Focus trap / auto-focus / restore for Modal and Dialog.
 *
 * Simplified port of official `FocusScope`
 * (`packages/react-aria/src/focus/FocusScope.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Nested scopes, shadow DOM tree walkers, and tabbable-vs-focusable edge
 * cases are not fully ported.
 */
export function useFocusScope(options: UseFocusScopeOptions): void {
  const nodeToRestore: {current: Element | null} = {current: null}

  watch(
    () =>
      [
        options.ref.value,
        toValue(options.isActive) !== false,
        toValue(options.contain) !== false,
        toValue(options.autoFocus) !== false,
        toValue(options.restoreFocus) !== false,
      ] as const,
    ([element, isActive, contain, autoFocus, restoreFocus], _prev, onCleanup) => {
      if (!element || !isActive) return
      const doc = getOwnerDocument(element)
      if (restoreFocus && nodeToRestore.current == null) {
        nodeToRestore.current = doc.activeElement
      }

      if (autoFocus && element && !element.contains(doc.activeElement)) {
        const focusables = getFocusable(element)
        const target = (focusables[0] as HTMLElement | undefined) ?? element
        try {
          target.focus({preventScroll: true})
        } catch {
          target.focus()
        }
      }

      function onKeyDown(event: KeyboardEvent) {
        if (!contain || event.key !== 'Tab' || !options.ref.value) return
        const scope = options.ref.value
        const focusables = getFocusable(scope)
        if (focusables.length === 0) {
          event.preventDefault()
          try {
            scope.focus({preventScroll: true})
          } catch {
            scope.focus()
          }
          return
        }
        const first = focusables[0] as HTMLElement
        const last = focusables[focusables.length - 1] as HTMLElement
        const active = getOwnerDocument(scope).activeElement
        if (event.shiftKey && (active === first || active === scope)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }

      doc.addEventListener('keydown', onKeyDown, true)

      onCleanup(() => {
        doc.removeEventListener('keydown', onKeyDown, true)
        if (restoreFocus && nodeToRestore.current instanceof HTMLElement) {
          const toRestore = nodeToRestore.current
          nodeToRestore.current = null
          try {
            toRestore.focus({preventScroll: true})
          } catch {
            toRestore.focus()
          }
        }
      })
    },
    {immediate: true, flush: 'post'},
  )

  onBeforeUnmount(() => {
    if (nodeToRestore.current instanceof HTMLElement) {
      const toRestore = nodeToRestore.current
      nodeToRestore.current = null
      try {
        toRestore.focus({preventScroll: true})
      } catch {
        toRestore.focus()
      }
    }
  })
}

function getFocusable(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false
    if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false
    if (el.tabIndex < 0 && !el.hasAttribute('contenteditable')) {
      // query already excludes tabindex="-1", keep elements with no tabindex or >= 0
    }
    return el.getClientRects().length > 0 || el === scope.ownerDocument.activeElement || true
  })
}
