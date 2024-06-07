import {onBeforeUnmount, reactive} from 'vue'

export class SyntheticFocusEvent extends FocusEvent {
  nativeEvent: FocusEvent
  target: EventTarget
  currentTarget: EventTarget
  relatedTarget: Element
  bubbles: boolean
  cancelable: boolean
  defaultPrevented: boolean
  eventPhase: number
  isTrusted: boolean
  timeStamp: number
  type: string

  constructor(type: string, nativeEvent: FocusEvent) {
    super(type, nativeEvent)
    this.nativeEvent = nativeEvent
    this.target = nativeEvent.target as EventTarget
    this.currentTarget = nativeEvent.currentTarget as EventTarget
    this.relatedTarget = nativeEvent.relatedTarget as Element
    this.bubbles = nativeEvent.bubbles
    this.cancelable = nativeEvent.cancelable
    this.defaultPrevented = nativeEvent.defaultPrevented
    this.eventPhase = nativeEvent.eventPhase
    this.isTrusted = nativeEvent.isTrusted
    this.timeStamp = nativeEvent.timeStamp
    this.type = type
  }

  isDefaultPrevented(): boolean {
    return this.nativeEvent.defaultPrevented
  }

  preventDefault(): void {
    this.defaultPrevented = true
    this.nativeEvent.preventDefault()
  }

  stopPropagation(): void {
    this.nativeEvent.stopPropagation()
    this.isPropagationStopped = () => true
  }

  isPropagationStopped(): boolean {
    return false
  }

  persist() {}
}

export function useSyntheticBlurEvent(onBlur: (e: FocusEvent) => void) {
  const state = reactive({
    isFocused: false,
    observer: null as MutationObserver | null,
  })

  // Clean up MutationObserver on unmount. See below.
  onBeforeUnmount(() => {
    return () => {
      if (state.observer) {
        state.observer.disconnect()
        state.observer = null
      }
    }
  })

  const dispatchBlur = (e: SyntheticFocusEvent) => {
    onBlur?.(e)
  }

  // This function is called during a onFocus event.
  return (e: FocusEvent) => {
    // OnBlur should not be fired when an element is disabled.
    // Most browsers fire a native focusout event in this case, except for Firefox. In that case, we use a
    // MutationObserver to watch for the disabled attribute, and dispatch these events ourselves.
    // For browsers that do, focusout fires before the MutationObserver, so onBlur should not fire twice.
    if (
      e.target instanceof HTMLButtonElement ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      state.isFocused = true

      const target = e.target
      const onBlurHandler: EventListenerOrEventListenerObject | null = (e) => {
        state.isFocused = false

        if (target.disabled) {
          // TODO: For backward compatibility, dispatch a (fake) synthetic event.(can be remove?)
          dispatchBlur(new SyntheticFocusEvent('blur', e as FocusEvent))
        }

        // We no longer need the MutationObserver once the target is blurred.
        if (state.observer) {
          state.observer.disconnect()
          state.observer = null
        }
      }

      target.addEventListener('focusout', onBlurHandler, {once: true})

      state.observer = new MutationObserver(() => {
        if (state.isFocused && target.disabled) {
          state.observer?.disconnect()
          const relatedTargetEl = target === document.activeElement ? null : document.activeElement
          target.dispatchEvent(new FocusEvent('blur', {relatedTarget: relatedTargetEl}))
          target.dispatchEvent(
            new FocusEvent('focusout', {bubbles: true, relatedTarget: relatedTargetEl}),
          )
        }
      })

      state.observer.observe(target, {attributes: true, attributeFilter: ['disabled']})
    }
  }
}
