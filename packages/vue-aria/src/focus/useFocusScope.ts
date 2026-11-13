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
  /**
   * Optional explicit element to restore focus to on cleanup. When provided it
   * wins over the element that was focused when the scope activated (used by
   * overlays to restore focus to their trigger).
   */
  restoreTo?: MaybeRefOrGetter<Element | null | undefined>
  /** Whether the scope is currently active. @default true when the ref is mounted */
  isActive?: MaybeRefOrGetter<boolean | undefined>
}

/**
 * Minimal focusable-tree walker matching official `getFocusableTreeWalker`
 * (`packages/react-aria/src/focus/FocusScope.tsx`): iterates focusable
 * descendants of `container` in document order. Used by the date field focus
 * manager; the existing simplified focus trap is unchanged.
 */
export interface FocusableTreeWalker {
  currentNode: HTMLElement | null
  nextNode(): HTMLElement | null
  previousNode(): HTMLElement | null
  lastChild(): HTMLElement | null
}

export function getFocusableTreeWalker(
  container: HTMLElement,
  opts: {tabbable?: boolean} = {},
): FocusableTreeWalker {
  const nodes = getFocusable(container)
  let index = -1
  const walker: FocusableTreeWalker = {
    get currentNode() {
      return index >= 0 && index < nodes.length ? nodes[index] : null
    },
    set currentNode(node: HTMLElement | null) {
      index = node ? nodes.indexOf(node) : -1
    },
    nextNode() {
      if (index < nodes.length - 1) {
        return nodes[++index]
      }
      return null
    },
    previousNode() {
      if (index > 0) {
        return nodes[--index]
      }
      // Without a current node, start from the end (official semantics when no
      // element is focused yet).
      if (index === -1 && nodes.length > 0) {
        index = nodes.length - 1
        return nodes[index]
      }
      return null
    },
    lastChild() {
      // Emulate DOM TreeWalker.lastChild: move to the last node unless already
      // there (then null, so the official `do { last = walker.lastChild() }`
      // loop terminates).
      if (nodes.length > 0 && index !== nodes.length - 1) {
        index = nodes.length - 1
        return nodes[index]
      }
      return null
    },
  }
  return walker
}

export interface FocusManagerOptions {
  /** The element to start from. Defaults to the currently focused element. */
  from?: HTMLElement | null
  /** Whether to include only tabbable elements. */
  tabbable?: boolean
}

export interface FocusManager {
  /** Focuses the next focusable element after the current one. Returns it, or null. */
  focusNext(opts?: FocusManagerOptions): HTMLElement | null
  /** Focuses the previous focusable element before the current one. Returns it, or null. */
  focusPrevious(opts?: FocusManagerOptions): HTMLElement | null
  /** Focuses the first focusable element in the container. */
  focusFirst(opts?: FocusManagerOptions): void
  /** Focuses the last focusable element in the container. */
  focusLast(opts?: FocusManagerOptions): void
}

/**
 * Minimal `createFocusManager` port (official
 * `packages/react-aria/src/focus/FocusScope.tsx` `createFocusManager`), scoped
 * to the container ref. Segment arrow navigation for DateField/TimeField is the
 * only consumer in this slice; `focusNext`/`focusPrevious` return whether an
 * element was focused, matching the official contract used by `useDateSegment`.
 */
export function createFocusManager(
  ref: Ref<Element | null | undefined>,
  opts: {tabbable?: boolean} = {},
): FocusManager {
  const getContainer = (): HTMLElement | null => (ref.value as HTMLElement) ?? null

  const focusedElement = (container: HTMLElement): HTMLElement | null => {
    const active = container.ownerDocument.activeElement
    if (active instanceof HTMLElement && container.contains(active)) {
      return active
    }
    return null
  }

  const focusNode = (node: HTMLElement | null): HTMLElement | null => {
    if (node) {
      node.focus({preventScroll: true})
      return node
    }
    return null
  }

  return {
    focusNext(optsNext: FocusManagerOptions = {}) {
      const container = getContainer()
      if (!container) return null
      const walker = getFocusableTreeWalker(container, {tabbable: opts.tabbable ?? true})
      walker.currentNode = optsNext.from ?? focusedElement(container)
      return focusNode(walker.nextNode())
    },
    focusPrevious(optsPrev: FocusManagerOptions = {}) {
      const container = getContainer()
      if (!container) return null
      const walker = getFocusableTreeWalker(container, {tabbable: opts.tabbable ?? true})
      const from = optsPrev.from ?? focusedElement(container)
      if (from) {
        walker.currentNode = from
        return focusNode(walker.previousNode())
      }
      // No focused element: official starts from the end and walks backwards.
      return focusNode(walker.lastChild())
    },
    focusFirst(optsFirst: FocusManagerOptions = {}) {
      const container = getContainer()
      if (!container) return
      const walker = getFocusableTreeWalker(container, {tabbable: opts.tabbable ?? true})
      walker.currentNode = optsFirst.from ?? focusedElement(container)
      focusNode(walker.nextNode() ?? walker.lastChild())
    },
    focusLast(optsLast: FocusManagerOptions = {}) {
      const container = getContainer()
      if (!container) return
      const walker = getFocusableTreeWalker(container, {tabbable: opts.tabbable ?? true})
      focusNode(walker.lastChild())
    },
  }
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
        const explicit = toValue(options.restoreTo) as Element | null | undefined
        nodeToRestore.current = explicit ?? doc.activeElement
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

function isInHiddenSubtree(el: HTMLElement, scope: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node && node !== scope) {
    if (node.getAttribute('aria-hidden') === 'true') return true
    node = node.parentElement
  }
  return false
}

function hasPreventFocusMarker(el: HTMLElement, scope: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node && node !== scope.parentElement) {
    if (node.hasAttribute('data-react-aria-prevent-focus') || node.hasAttribute('data-a11y-ignore')) return true
    if (node === scope) break
    node = node.parentElement
  }
  return false
}

function getFocusable(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false
    if (el.hasAttribute('hidden')) return false
    if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false
    if (isInHiddenSubtree(el, scope)) return false
    if (hasPreventFocusMarker(el, scope)) return false
    if (el.tabIndex < 0 && !el.hasAttribute('contenteditable')) {
      // query already excludes tabindex="-1", keep elements with no tabindex or >= 0
    }
    return el.getClientRects().length > 0 || el === scope.ownerDocument.activeElement || true
  })
}
