/*
 * Port of `react-aria@3.53.1` `useMove`
 * (`packages/react-aria/src/interactions/useMove.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported.
 *
 * DOM listeners use the Vue event names that actually fire (`onPointerdown`,
 * `onKeydown`). When `PointerEvent` exists, mouse compatibility listeners are
 * not installed. Selection styles are restored on pointerup, pointercancel,
 * unmount, and when the drag target changes. `cancel` drops a live session
 * without `onMoveEnd`, so a same-hook host swap can finish the gesture once.
 */

import {onScopeDispose} from 'vue'
import {getEventTarget, getOwnerWindow} from '../utils/dom'
import {useGlobalListeners} from '../utils/useGlobalListeners'
import {disableTextSelection, restoreTextSelection} from './textSelection'

export interface MoveEvent {
  type: 'movestart' | 'move' | 'moveend'
  pointerType: string
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  deltaX?: number
  deltaY?: number
}

export interface MoveEvents {
  onMoveStart?: (e: MoveEvent) => void
  onMove?: (e: MoveEvent) => void
  onMoveEnd?: (e: MoveEvent) => void
}

interface EventBase {
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

function pagePoint(event: {pageX?: number; pageY?: number; clientX?: number; clientY?: number}) {
  return {
    pageX: event.pageX ?? event.clientX ?? 0,
    pageY: event.pageY ?? event.clientY ?? 0,
  }
}

export function useMove(props: MoveEvents) {
  const state = {
    didMove: false,
    lastPosition: null as {pageX: number; pageY: number} | null,
    id: null as number | null,
  }
  let selectionTarget: Element | undefined
  let detachSession: (() => void) | null = null
  const {addGlobalListener, removeGlobalListener} = useGlobalListeners()

  function cancel() {
    restoreTextSelection(selectionTarget)
    selectionTarget = undefined
    detachSession?.()
    detachSession = null
    state.didMove = false
    state.lastPosition = null
    state.id = null
  }

  function move(originalEvent: EventBase, pointerType: string, deltaX: number, deltaY: number) {
    if (deltaX === 0 && deltaY === 0) return
    if (!state.didMove) {
      state.didMove = true
      props.onMoveStart?.({
        type: 'movestart',
        pointerType,
        shiftKey: originalEvent.shiftKey,
        metaKey: originalEvent.metaKey,
        ctrlKey: originalEvent.ctrlKey,
        altKey: originalEvent.altKey,
      })
    }
    props.onMove?.({
      type: 'move',
      pointerType,
      deltaX,
      deltaY,
      shiftKey: originalEvent.shiftKey,
      metaKey: originalEvent.metaKey,
      ctrlKey: originalEvent.ctrlKey,
      altKey: originalEvent.altKey,
    })
  }

  function end(originalEvent: EventBase, pointerType: string) {
    restoreTextSelection(selectionTarget)
    selectionTarget = undefined
    if (state.didMove) {
      state.didMove = false
      props.onMoveEnd?.({
        type: 'moveend',
        pointerType,
        shiftKey: originalEvent.shiftKey,
        metaKey: originalEvent.metaKey,
        ctrlKey: originalEvent.ctrlKey,
        altKey: originalEvent.altKey,
      })
    }
  }

  function beginSelection(target?: Element) {
    if (selectionTarget && selectionTarget !== target) restoreTextSelection(selectionTarget)
    selectionTarget = target
    disableTextSelection(target)
    state.didMove = false
  }

  const moveProps: Record<string, any> = {}

  if (typeof PointerEvent === 'undefined') {
    const onMouseMove = (e: MouseEvent) => {
      if (e.button !== 0) return
      const point = pagePoint(e)
      move(e, 'mouse', point.pageX - (state.lastPosition?.pageX ?? 0), point.pageY - (state.lastPosition?.pageY ?? 0))
      state.lastPosition = point
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return
      end(e, 'mouse')
      detachSession?.()
      detachSession = null
      state.id = null
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      beginSelection((e.currentTarget as Element) ?? undefined)
      e.stopPropagation()
      e.preventDefault()
      state.lastPosition = pagePoint(e)
      const ownerWindow = getOwnerWindow(getEventTarget(e) as Element)
      detachSession = () => {
        removeGlobalListener(ownerWindow, 'mousemove', onMouseMove as EventListener, false)
        removeGlobalListener(ownerWindow, 'mouseup', onMouseUp as EventListener, false)
      }
      addGlobalListener(ownerWindow, 'mousemove', onMouseMove as EventListener, false)
      addGlobalListener(ownerWindow, 'mouseup', onMouseUp as EventListener, false)
    }
    moveProps.onMousedown = onMouseDown
    moveProps.onMouseDown = onMouseDown

    const onTouchMove = (e: TouchEvent) => {
      const touch = [...e.changedTouches].findIndex(({identifier}) => identifier === state.id)
      if (touch < 0) return
      const point = pagePoint(e.changedTouches[touch])
      move(e, 'touch', point.pageX - (state.lastPosition?.pageX ?? 0), point.pageY - (state.lastPosition?.pageY ?? 0))
      state.lastPosition = point
    }
    const onTouchEnd = (e: TouchEvent) => {
      const touch = [...e.changedTouches].findIndex(({identifier}) => identifier === state.id)
      if (touch < 0) return
      end(e, 'touch')
      detachSession?.()
      detachSession = null
      state.id = null
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.changedTouches.length === 0 || state.id != null) return
      const touch = e.changedTouches[0]
      beginSelection((e.currentTarget as Element) ?? undefined)
      e.stopPropagation()
      e.preventDefault()
      state.lastPosition = pagePoint(touch)
      state.id = touch.identifier
      const ownerWindow = getOwnerWindow(getEventTarget(e) as Element)
      detachSession = () => {
        removeGlobalListener(ownerWindow, 'touchmove', onTouchMove as EventListener, false)
        removeGlobalListener(ownerWindow, 'touchend', onTouchEnd as EventListener, false)
        removeGlobalListener(ownerWindow, 'touchcancel', onTouchEnd as EventListener, false)
      }
      addGlobalListener(ownerWindow, 'touchmove', onTouchMove as EventListener, false)
      addGlobalListener(ownerWindow, 'touchend', onTouchEnd as EventListener, false)
      addGlobalListener(ownerWindow, 'touchcancel', onTouchEnd as EventListener, false)
    }
    moveProps.onTouchstart = onTouchStart
    moveProps.onTouchStart = onTouchStart
  } else {
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== state.id) return
      const pointerType = e.pointerType || 'mouse'
      const point = pagePoint(e)
      move(e, pointerType, point.pageX - (state.lastPosition?.pageX ?? 0), point.pageY - (state.lastPosition?.pageY ?? 0))
      state.lastPosition = point
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== state.id) return
      end(e, e.pointerType || 'mouse')
      detachSession?.()
      detachSession = null
      state.id = null
    }
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || state.id != null) return
      beginSelection((e.currentTarget as Element) ?? undefined)
      e.stopPropagation()
      e.preventDefault()
      state.lastPosition = pagePoint(e)
      state.id = e.pointerId
      const ownerWindow = getOwnerWindow(getEventTarget(e) as Element)
      detachSession = () => {
        removeGlobalListener(ownerWindow, 'pointermove', onPointerMove as EventListener, false)
        removeGlobalListener(ownerWindow, 'pointerup', onPointerUp as EventListener, false)
        removeGlobalListener(ownerWindow, 'pointercancel', onPointerUp as EventListener, false)
      }
      addGlobalListener(ownerWindow, 'pointermove', onPointerMove as EventListener, false)
      addGlobalListener(ownerWindow, 'pointerup', onPointerUp as EventListener, false)
      addGlobalListener(ownerWindow, 'pointercancel', onPointerUp as EventListener, false)
    }
    moveProps.onPointerdown = onPointerDown
    moveProps.onPointerDown = onPointerDown
  }

  function triggerKeyboardMove(e: EventBase, deltaX: number, deltaY: number) {
    beginSelection()
    move(e, 'keyboard', deltaX, deltaY)
    end(e, 'keyboard')
  }

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Left':
      case 'ArrowLeft':
        e.preventDefault()
        e.stopPropagation()
        triggerKeyboardMove(e, -1, 0)
        break
      case 'Right':
      case 'ArrowRight':
        e.preventDefault()
        e.stopPropagation()
        triggerKeyboardMove(e, 1, 0)
        break
      case 'Up':
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        triggerKeyboardMove(e, 0, -1)
        break
      case 'Down':
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        triggerKeyboardMove(e, 0, 1)
        break
      default:
        break
    }
  }
  moveProps.onKeydown = onKeyDown
  moveProps.onKeyDown = onKeyDown

  onScopeDispose(cancel)

  return {moveProps, cancel}
}
