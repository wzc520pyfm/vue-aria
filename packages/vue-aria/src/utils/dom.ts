export function getOwnerDocument(target: Element | null | undefined): Document {
  return target?.ownerDocument ?? document
}

export function getOwnerWindow(target: Element | null | undefined): Window {
  return getOwnerDocument(target).defaultView ?? window
}

export function containsEventTarget(
  currentTarget: EventTarget | null,
  eventTarget: EventTarget | null,
) {
  return currentTarget instanceof Element && eventTarget instanceof Node
    ? currentTarget.contains(eventTarget)
    : currentTarget === eventTarget
}
