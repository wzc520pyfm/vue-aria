import {onBeforeUnmount, watch, toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import {getOwnerDocument} from '../utils/dom'

export interface InteractOutsideProps {
  ref: Ref<Element | null | undefined>
  onInteractOutside?: (e: PointerEvent | MouseEvent) => void
  onInteractOutsideStart?: (e: PointerEvent | MouseEvent) => void
  /** Whether the interact outside events should be disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
}

/**
 * Calls `onInteractOutside` when the user presses outside `ref`.
 *
 * Port of official `useInteractOutside`
 * (`packages/react-aria/src/interactions/useInteractOutside.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Shadow-root closed tree and `[data-react-aria-top-layer]` filtering are
 * simplified to `composedPath` + `[data-vue-aria-top-layer]`.
 */
export function useInteractOutside(props: InteractOutsideProps): void {
  const state = {
    isPointerDown: false,
  }

  function onPointerDown(e: Event) {
    const event = e as PointerEvent
    if (toValue(props.isDisabled) || !props.onInteractOutside) return
    if (isValidEvent(event, props.ref)) {
      props.onInteractOutsideStart?.(event)
      state.isPointerDown = true
    }
  }

  function onClick(e: Event) {
    const event = e as PointerEvent
    if (toValue(props.isDisabled)) return
    if (state.isPointerDown && isValidEvent(event, props.ref)) {
      props.onInteractOutside?.(event)
    }
    state.isPointerDown = false
  }

  let attached: Document | null = null

  watch(
    () => [props.ref.value, Boolean(toValue(props.isDisabled)), Boolean(props.onInteractOutside)] as const,
    ([element, isDisabled, hasHandler], _prev, onCleanup) => {
      if (isDisabled || !hasHandler) return
      const documentObject = getOwnerDocument(element ?? null)
      documentObject.addEventListener('pointerdown', onPointerDown, true)
      documentObject.addEventListener('click', onClick, true)
      attached = documentObject
      onCleanup(() => {
        documentObject.removeEventListener('pointerdown', onPointerDown, true)
        documentObject.removeEventListener('click', onClick, true)
        if (attached === documentObject) attached = null
      })
    },
    {immediate: true, flush: 'post'},
  )

  onBeforeUnmount(() => {
    if (!attached) return
    attached.removeEventListener('pointerdown', onPointerDown, true)
    attached.removeEventListener('click', onClick, true)
    attached = null
  })
}

function isValidEvent(event: Event, ref: Ref<Element | null | undefined>) {
  const pointer = event as PointerEvent
  if (typeof pointer.button === 'number' && pointer.button > 0) {
    return false
  }
  const target = event.target
  if (target instanceof Element) {
    const ownerDocument = target.ownerDocument
    if (!ownerDocument || !ownerDocument.documentElement.contains(target)) {
      return false
    }
    if (target.closest('[data-vue-aria-top-layer]')) {
      return false
    }
  }
  if (!ref.value) {
    return false
  }
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  return !path.includes(ref.value)
}
