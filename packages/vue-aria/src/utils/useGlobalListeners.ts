/*
 * Port of `react-aria@3.53.1` `useGlobalListeners`
 * (`packages/react-aria/src/utils/useGlobalListeners.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported.
 *
 * Records are keyed by target + type + callback + options. The same callback
 * registered for mouseup, touchend, and pointerup is removed independently.
 */

import {onScopeDispose} from 'vue'

interface ListenerEntry {
  eventTarget: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
  fn: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
}

function optionBag(options?: boolean | AddEventListenerOptions): AddEventListenerOptions | undefined {
  return typeof options === 'object' && options ? options : undefined
}

function sameOptions(a?: boolean | AddEventListenerOptions, b?: boolean | AddEventListenerOptions) {
  if (a === b) return true
  const aObj = optionBag(a)
  const bObj = optionBag(b)
  if (!aObj || !bObj) return false
  return aObj.capture === bObj.capture && aObj.passive === bObj.passive && aObj.signal === bObj.signal
}

export function useGlobalListeners() {
  const entries: ListenerEntry[] = []

  function find(eventTarget: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
    return entries.findIndex(
      (entry) =>
        entry.eventTarget === eventTarget &&
        entry.type === type &&
        entry.listener === listener &&
        sameOptions(entry.options, options),
    )
  }

  function addGlobalListener(
    eventTarget: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    const once = typeof options === 'object' && options?.once
    const fn: EventListener = once
      ? ((...args: unknown[]) => {
          const index = find(eventTarget, type, listener, options)
          if (index >= 0) entries.splice(index, 1)
          if (typeof listener === 'function') listener(args[0] as Event)
        }) as EventListener
      : (listener as EventListener)
    const existing = find(eventTarget, type, listener, options)
    if (existing >= 0) {
      const previous = entries[existing]
      previous.eventTarget.removeEventListener(previous.type, previous.fn, previous.options)
      entries.splice(existing, 1)
    }
    entries.push({eventTarget, type, listener, fn, options})
    eventTarget.addEventListener(type, fn, options)
  }

  function removeGlobalListener(
    eventTarget: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) {
    const index = find(eventTarget, type, listener, options)
    const fn = index >= 0 ? entries[index].fn : listener
    eventTarget.removeEventListener(type, fn, options)
    if (index >= 0) entries.splice(index, 1)
  }

  function removeAllGlobalListeners() {
    for (const entry of entries.splice(0)) {
      entry.eventTarget.removeEventListener(entry.type, entry.fn, entry.options)
    }
  }

  onScopeDispose(removeAllGlobalListeners)

  return {addGlobalListener, removeGlobalListener, removeAllGlobalListeners}
}
