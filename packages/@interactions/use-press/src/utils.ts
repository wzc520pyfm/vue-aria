import {getOwnerDocument} from '@nev-ui/shared'

const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'range',
  'color',
  'file',
  'image',
  'button',
  'submit',
  'reset',
])

export function isHTMLAnchorLink(target: Element): target is HTMLAnchorElement {
  return target.tagName === 'A' && target.hasAttribute('href')
}

export function containsEventTarget(
  currentTarget: EventTarget | null,
  eventTarget: EventTarget | null,
) {
  return currentTarget instanceof Element && eventTarget instanceof Node
    ? currentTarget.contains(eventTarget)
    : currentTarget === eventTarget
}

function isValidInputKey(target: HTMLInputElement, key: string) {
  // Only space should toggle checkboxes and radios, not enter.
  return target.type === 'checkbox' || target.type === 'radio'
    ? key === ' '
    : NON_TEXT_INPUT_TYPES.has(target.type)
}

/**
 * Accessibility for keyboards: Space and Enter only.
 * Links should only trigger with Enter. Text inputs are ignored.
 */
export function isValidKeyboardEvent(event: KeyboardEvent, currentTarget: Element): boolean {
  const {key, code} = event
  const element = currentTarget as HTMLElement
  const role = element.getAttribute('role')

  return (
    (key === 'Enter' || key === ' ' || key === 'Spacebar' || code === 'Space') &&
    !(
      (element instanceof HTMLInputElement && !isValidInputKey(element, key)) ||
      element instanceof HTMLTextAreaElement ||
      element.isContentEditable
    ) &&
    !((role === 'link' || (!role && isHTMLAnchorLink(element))) && key !== 'Enter')
  )
}

function shouldPreventDefaultUp(target: Element) {
  if (target instanceof HTMLInputElement) {
    return false
  }

  if (target instanceof HTMLButtonElement) {
    return target.type !== 'submit' && target.type !== 'reset'
  }

  if (isHTMLAnchorLink(target)) {
    return false
  }

  return true
}

export function shouldPreventDefaultKeyboard(target: EventTarget | null, key: string) {
  if (!(target instanceof Element)) {
    return false
  }

  if (target instanceof HTMLInputElement) {
    if (key === 'Enter' && (target.type === 'checkbox' || target.type === 'radio')) {
      return false
    }
    return !isValidInputKey(target, key)
  }

  return shouldPreventDefaultUp(target)
}

/**
 * Keyboards, assistive technologies, and `element.click()` all produce a "virtual" click.
 * @see https://github.com/adobe/react-spectrum (isVirtualClick)
 */
export function isVirtualClick(event: MouseEvent): boolean {
  const pointerEvent = event as PointerEvent
  if (pointerEvent.pointerType === '' && event.isTrusted) {
    return true
  }

  return event.detail === 0 && !pointerEvent.pointerType
}

export function createEventBase(
  target: EventTarget | null,
  event: {
    shiftKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    clientX?: number
    clientY?: number
    key?: string
  },
) {
  return {
    currentTarget: target,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    clientX: event.clientX,
    clientY: event.clientY,
    key: event.key,
  }
}

export function getOwnerWindow(target: Element | null | undefined): Window {
  return getOwnerDocument(target).defaultView ?? window
}
