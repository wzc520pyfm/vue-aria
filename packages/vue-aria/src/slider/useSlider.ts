/*
 * Port of `react-aria@3.53.1` `useSlider`
 * (`packages/react-aria/src/slider/useSlider.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. `labelProps`, `groupProps`, `trackProps`, and `outputProps`
 * are plain objects with live getters.
 */

import {onScopeDispose, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import type {SliderProps, SliderState} from 'vue-stately/useSliderState'
import {useLabel} from '../label/useLabel'

function clamp(value: number, min = -Infinity, max = Infinity) {
  return Math.min(Math.max(value, min), max)
}
import {useLocale} from '../i18n/I18nProvider'
import {useMove} from '../interactions/useMove'
import {useGlobalListeners} from '../utils/useGlobalListeners'
import {mergeProps} from '../utils/mergeProps'
import {setInteractionModality} from '../interactions/focusVisible'
import {getSliderThumbId, sliderData} from './utils'

export type Orientation = 'horizontal' | 'vertical'

export interface AriaSliderProps<T = number | number[]> extends SliderProps<T> {
  id?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-details'?: MaybeRefOrGetter<string | undefined>
  label?: MaybeRefOrGetter<unknown>
}

export interface SliderAria {
  labelProps: Record<string, any>
  groupProps: Record<string, any>
  trackProps: Record<string, any>
  outputProps: Record<string, any>
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
}

/**
 * Provides the behavior and accessibility implementation for a slider component
 * representing one or more values.
 */
export function useSlider<T extends number | number[]>(
  props: AriaSliderProps<T>,
  state: SliderState,
  trackRef: Ref<Element | null>,
): SliderAria {
  const {labelProps, fieldProps} = useLabel({
    id: () => toValue(props.id),
    label: () => toValue(props.label),
    'aria-label': () => toValue(props['aria-label']),
    'aria-labelledby': () => toValue(props['aria-labelledby']),
  })

  const data = {
    get id() {
      return (labelProps.value.id ?? fieldProps.value.id) as string
    },
    get 'aria-describedby'() {
      return toValue(props['aria-describedby'])
    },
    get 'aria-details'() {
      return toValue(props['aria-details'])
    },
  }
  sliderData.set(state, data)

  const locale = useLocale()
  const {addGlobalListener, removeGlobalListener} = useGlobalListeners()
  let realTimeTrackDraggingIndex: number | null = null
  let currentPosition: number | null = null
  let currentPointer: number | null | undefined = undefined

  const {moveProps, cancel: cancelMove} = useMove({
    onMoveStart() {
      currentPosition = null
    },
    onMove({deltaX, deltaY}) {
      const track = trackRef.value
      if (!track) return
      const {height, width} = track.getBoundingClientRect()
      const isVertical = state.orientation === 'vertical'
      const size = isVertical ? height : width
      if (currentPosition == null && realTimeTrackDraggingIndex != null) {
        currentPosition = state.getThumbPercent(realTimeTrackDraggingIndex) * size
      }
      let delta = isVertical ? deltaY! : deltaX!
      if (isVertical || locale.direction === 'rtl') delta = -delta
      currentPosition = (currentPosition ?? 0) + delta
      if (realTimeTrackDraggingIndex != null && track) {
        state.setThumbPercent(realTimeTrackDraggingIndex, clamp(currentPosition / size, 0, 1))
      }
    },
    onMoveEnd() {
      if (realTimeTrackDraggingIndex != null) {
        state.setThumbDragging(realTimeTrackDraggingIndex, false)
        realTimeTrackDraggingIndex = null
      }
    },
  })

  function releaseId(e: Event): number | undefined {
    if (e.type.startsWith('pointer') && 'pointerId' in e) return (e as PointerEvent).pointerId
    const touches = (e as TouchEvent).changedTouches
    if (!touches || touches.length === 0) return undefined
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === currentPointer) return touches[i].identifier
    }
    return currentPointer == null ? touches[0].identifier : undefined
  }

  function finishTrack() {
    cancelMove()
    if (realTimeTrackDraggingIndex != null) {
      const index = realTimeTrackDraggingIndex
      realTimeTrackDraggingIndex = null
      state.setThumbDragging(index, false)
    }
    removeGlobalListener(window, 'mouseup', onUpTrack, false)
    removeGlobalListener(window, 'touchend', onUpTrack, false)
    removeGlobalListener(window, 'touchcancel', onUpTrack, false)
    removeGlobalListener(window, 'pointerup', onUpTrack, false)
    removeGlobalListener(window, 'pointercancel', onUpTrack, false)
  }

  function onUpTrack(e: Event) {
    if (releaseId(e) === currentPointer) finishTrack()
  }

  function onDownTrack(e: Event, id: number | undefined, clientX: number, clientY: number) {
    const track = trackRef.value
    if (!track || state.isDisabled || state.values.some((_, i) => state.isThumbDragging(i))) return
    const {height, width, top, left} = track.getBoundingClientRect()
    const isVertical = state.orientation === 'vertical'
    const size = isVertical ? height : width
    const trackPosition = isVertical ? top : left
    const clickPosition = isVertical ? clientY : clientX
    const offset = clickPosition - trackPosition
    let percent = offset / size
    if (locale.direction === 'rtl' || isVertical) percent = 1 - percent
    const value = state.getPercentValue(percent)
    const values = state.values
    let closestThumb: number
    const split = values.findIndex((v) => value - v < 0)
    if (split === 0) closestThumb = split
    else if (split === -1) closestThumb = values.length - 1
    else if (Math.abs(values[split - 1] - value) < Math.abs(values[split] - value)) closestThumb = split - 1
    else closestThumb = split

    if (closestThumb >= 0 && state.isThumbEditable(closestThumb)) {
      e.preventDefault()
      realTimeTrackDraggingIndex = closestThumb
      state.setFocusedThumb(closestThumb)
      currentPointer = id
      state.setThumbDragging(closestThumb, true)
      state.setThumbValue(closestThumb, value)
      addGlobalListener(window, 'mouseup', onUpTrack, false)
      addGlobalListener(window, 'touchend', onUpTrack, false)
      addGlobalListener(window, 'touchcancel', onUpTrack, false)
      addGlobalListener(window, 'pointerup', onUpTrack, false)
      addGlobalListener(window, 'pointercancel', onUpTrack, false)
    } else {
      realTimeTrackDraggingIndex = null
    }
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey) return
    onDownTrack(e, undefined, e.clientX, e.clientY)
  }
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey)) return
    onDownTrack(e, e.pointerId, e.clientX, e.clientY)
  }
  const onTouchStart = (e: TouchEvent) => {
    const touch = e.changedTouches[0]
    if (!touch) return
    onDownTrack(e, touch.identifier, touch.clientX, touch.clientY)
  }

  watch(trackRef, (el, prev) => {
    if (prev && el !== prev) finishTrack()
  })
  onScopeDispose(finishTrack)

  const labelOut: Record<string, any> = {}
  defineLive(labelOut, 'id', () => labelProps.value.id)
  const onLabelClick = () => {
    if (!labelProps.value.htmlFor || typeof document === 'undefined') return
    document.getElementById(getSliderThumbId(state, 0))?.focus()
    setInteractionModality('keyboard')
  }
  defineLive(labelOut, 'onClick', () => (labelProps.value.htmlFor ? onLabelClick : undefined))

  const groupProps: Record<string, any> = {}
  defineLive(groupProps, 'role', () => 'group')
  defineLive(groupProps, 'id', () => fieldProps.value.id)
  defineLive(groupProps, 'aria-label', () => fieldProps.value['aria-label'])
  defineLive(groupProps, 'aria-labelledby', () => fieldProps.value['aria-labelledby'])

  const trackProps = mergeProps(
    {
      onMousedown: onMouseDown,
      onMouseDown: onMouseDown,
      onPointerdown: onPointerDown,
      onPointerDown: onPointerDown,
      onTouchstart: onTouchStart,
      onTouchStart: onTouchStart,
    },
    moveProps,
  )
  defineLive(trackProps, 'style', () => ({position: 'relative', touchAction: 'none'}))

  const outputProps: Record<string, any> = {}
  defineLive(outputProps, 'htmlFor', () => state.values.map((_, index) => getSliderThumbId(state, index)).join(' '))
  defineLive(outputProps, 'for', () => outputProps.htmlFor)
  defineLive(outputProps, 'aria-live', () => 'off')

  return {labelProps: labelOut, groupProps, trackProps, outputProps}
}
