/**
 * Toolbar-private focus traversal.
 *
 * Official `createFocusManager` (`packages/react-aria/src/focus/FocusScope.tsx`
 * at adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc) walks with
 * `isFocusable`, so `tabindex="-1"` is included. The shared `useFocusScope`
 * walker is tabbable-only and is not used here. ShadowTreeWalker stays
 * unported; each call builds an ordinary TreeWalker for the current root.
 */

const FOCUSABLE_SELECTORS = [
  'input:not([disabled]):not([type=hidden])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  'area[href]',
  'summary',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable^="false"])',
  'permission',
]

const FOCUSABLE_ELEMENT_SELECTOR =
  FOCUSABLE_SELECTORS.join(':not([hidden]),') + ',[tabindex]:not([disabled]):not([hidden])'

function realmsOf(node: Node): Array<Window & typeof globalThis> {
  const realms: Array<Window & typeof globalThis> = []
  const owner = node.ownerDocument?.defaultView
  if (owner) realms.push(owner)
  if (typeof window !== 'undefined' && owner !== window) realms.push(window as Window & typeof globalThis)
  return realms
}

function matchingRealm(element: Element): (Window & typeof globalThis) | null {
  for (const view of realmsOf(element)) {
    if (element instanceof view.HTMLElement || element instanceof view.SVGElement) return view
  }
  return null
}

function isInert(element: Element): boolean {
  let node: Element | null = element
  while (node) {
    const view = matchingRealm(node)
    if (view && node instanceof view.HTMLElement && node.inert) return true
    if (node.hasAttribute('inert')) return true
    node = node.parentElement
  }
  return false
}

function isStyleVisible(element: Element): boolean {
  const view = matchingRealm(element)
  if (!view) return false
  const styled = element as HTMLElement
  const {display, visibility} = styled.style
  if (display === 'none' || visibility === 'hidden' || visibility === 'collapse') return false
  const computed = view.getComputedStyle(styled)
  return computed.display !== 'none' && computed.visibility !== 'hidden' && computed.visibility !== 'collapse'
}

function isAttributeVisible(element: Element, childElement?: Element): boolean {
  if (element.hasAttribute('hidden')) return false
  if (element.hasAttribute('data-react-aria-prevent-focus')) return false
  if (element.nodeName === 'DETAILS' && childElement && childElement.nodeName !== 'SUMMARY') {
    return element.hasAttribute('open')
  }
  return true
}

function isElementVisible(element: Element, childElement?: Element): boolean {
  if (element.nodeType !== 1) return false
  if (typeof element.checkVisibility === 'function') {
    try {
      if (!element.checkVisibility({visibilityProperty: true})) return false
    } catch {
      if (!isStyleVisible(element)) return false
    }
  } else if (!isStyleVisible(element)) {
    return false
  }
  if (!isStyleVisible(element)) return false
  if (element.closest('[data-react-aria-prevent-focus]')) return false
  if (!isAttributeVisible(element, childElement)) return false
  if (element.parentElement && !isElementVisible(element.parentElement, element)) return false
  return true
}

function isFocusable(element: Element): boolean {
  let matches = false
  try {
    matches = element.matches(FOCUSABLE_ELEMENT_SELECTOR)
  } catch {
    return false
  }
  return matches && !isInert(element) && isElementVisible(element)
}

function createWalker(root: HTMLElement): TreeWalker {
  const view = matchingRealm(root) ?? root.ownerDocument?.defaultView
  const show = view?.NodeFilter.SHOW_ELEMENT ?? 1
  const accept = view?.NodeFilter.FILTER_ACCEPT ?? 1
  const skip = view?.NodeFilter.FILTER_SKIP ?? 3
  return root.ownerDocument.createTreeWalker(root, show, {
    acceptNode(node) {
      return isFocusable(node as Element) ? accept : skip
    },
  })
}

function lastNode(walker: TreeWalker): HTMLElement | null {
  let found: HTMLElement | null = null
  let last: Node | null
  do {
    last = walker.lastChild()
    if (last) found = last as HTMLElement
  } while (last)
  return found
}

function activeElement(root: HTMLElement): Element | null {
  const active = root.ownerDocument.activeElement
  if (!active || active.nodeType !== 1 || !root.contains(active)) return null
  return active
}

export function focusableNext(root: HTMLElement): HTMLElement | null {
  const walker = createWalker(root)
  const active = activeElement(root)
  if (active) walker.currentNode = active
  const next = walker.nextNode()
  return asOwnedElement(root, next)
}

export function focusablePrevious(root: HTMLElement): HTMLElement | null {
  const walker = createWalker(root)
  const active = activeElement(root)
  if (!active) return lastNode(walker)
  walker.currentNode = active
  return asOwnedElement(root, walker.previousNode())
}

export function focusableFirst(root: HTMLElement): HTMLElement | null {
  const walker = createWalker(root)
  return asOwnedElement(root, walker.nextNode())
}

function asOwnedElement(_root: HTMLElement, node: Node | null): HTMLElement | null {
  if (!node || node.nodeType !== 1) return null
  return node as HTMLElement
}

export function focusableLast(root: HTMLElement): HTMLElement | null {
  return lastNode(createWalker(root))
}
