/** Dispatch a real PointerEvent. Vue Test Utils cannot assign read-only MouseEvent fields. */
export function dispatchPointer(el: EventTarget, type: string, init: PointerEventInit = {}) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    ...init,
  })
  el.dispatchEvent(event)
  return event
}

export function dispatchKey(el: EventTarget, type: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  el.dispatchEvent(event)
  return event
}

export function dispatchClick(el: EventTarget, init: MouseEventInit = {}) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  })
  el.dispatchEvent(event)
  return event
}
