/**
 * Simplified port of official `ariaHideOutside`
 * (`packages/react-aria/src/overlays/ariaHideOutside.ts`).
 * Sets `aria-hidden="true"` (and `inert` when supported) on element subtrees
 * that do not contain the visible overlay. Does not implement the official
 * mutation-observer / `keepVisible` walker in full.
 */

const hidden = new WeakMap<Element, {ariaHidden: string | null; inert: boolean}>()

export function ariaHideOutside(targets: Element[]): () => void {
  if (typeof document === 'undefined' || targets.length === 0) {
    return () => {}
  }

  const root = document.body
  const hiddenElements: Element[] = []

  function visit(node: Element) {
    if (targets.some((target) => node === target || node.contains(target) || target.contains(node))) {
      if (node !== targets[0] && !targets.includes(node)) {
        for (const child of Array.from(node.children)) {
          visit(child)
        }
      }
      return
    }
    if (node.hasAttribute('data-vue-aria-top-layer')) return
    if (!hidden.has(node)) {
      hidden.set(node, {
        ariaHidden: node.getAttribute('aria-hidden'),
        inert: (node as HTMLElement).inert ?? false,
      })
      node.setAttribute('aria-hidden', 'true')
      if ('inert' in node) {
        ;(node as HTMLElement).inert = true
      }
      hiddenElements.push(node)
    }
  }

  for (const child of Array.from(root.children)) {
    visit(child)
  }

  return () => {
    for (const node of hiddenElements) {
      const prev = hidden.get(node)
      hidden.delete(node)
      if (!prev) continue
      if (prev.ariaHidden == null) {
        node.removeAttribute('aria-hidden')
      } else {
        node.setAttribute('aria-hidden', prev.ariaHidden)
      }
      if ('inert' in node) {
        ;(node as HTMLElement).inert = prev.inert
      }
    }
  }
}
