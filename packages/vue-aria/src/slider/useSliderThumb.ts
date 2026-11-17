/*
 * Port of `react-aria@3.53.1` `useSliderThumb`
 * (`packages/react-aria/src/slider/useSliderThumb.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. `thumbProps`, `inputProps`, and `labelProps` are plain
 * objects with live getters. There is no `isReadOnly`.
 */

import {toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import type {SliderState} from 'vue-stately/useSliderState'
import {useFocusable} from '../interactions/useFocusable'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocale} from '../i18n/I18nProvider'
import {useMove} from '../interactions/useMove'
import {useLabel} from '../label/useLabel'
import {useFormReset} from '../utils/useFormReset'
import {useGlobalListeners} from '../utils/useGlobalListeners'
import {mergeProps} from '../utils/mergeProps'
import {getSliderThumbId, sliderData} from './utils'
import type {Orientation} from './useSlider'

export interface SliderThumbProps {
  /** @deprecated Pass orientation to the slider instead. */
  orientation?: MaybeRefOrGetter<Orientation | undefined>
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** @default 0 */
  index?: MaybeRefOrGetter<number | undefined>
  /** @deprecated */
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  /** @deprecated */
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  /** @deprecated */
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  name?: MaybeRefOrGetter<string | undefined>
  form?: MaybeRefOrGetter<string | undefined>
  label?: MaybeRefOrGetter<unknown>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-details'?: MaybeRefOrGetter<string | undefined>
  'aria-errormessage'?: MaybeRefOrGetter<string | undefined>
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
}

export interface AriaSliderThumbProps extends SliderThumbProps {}

export interface AriaSliderThumbOptions extends AriaSliderThumbProps {
  trackRef: Ref<Element | null>
  inputRef: Ref<HTMLInputElement | null>
}

export interface SliderThumbAria {
  thumbProps: Record<string, any>
  inputProps: Record<string, any>
  labelProps: Record<string, any>
  isDragging: boolean
  isFocused: boolean
  isDisabled: boolean
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
}

function clamp(value: number, min = -Infinity, max = Infinity) {
  return Math.min(Math.max(value, min), max)
}

function focusWithoutScrolling(element: HTMLElement) {
  element.focus({preventScroll: true})
}

export function useSliderThumb(opts: AriaSliderThumbOptions, state: SliderState): SliderThumbAria {
  const index = () => toValue(opts.index) ?? 0
  const orientation = () => toValue(opts.orientation) ?? state.orientation
  const isDisabled = () => Boolean(toValue(opts.isDisabled)) || state.isDisabled
  const isVertical = () => orientation() === 'vertical'

  const locale = useLocale()
  const {addGlobalListener, removeGlobalListener} = useGlobalListeners()
  const data = sliderData.get(state)
  if (!data) throw new Error('Unknown slider state')

  const {labelProps, fieldProps} = useLabel({
    ...opts,
    id: () => getSliderThumbId(state, index()),
    label: () => toValue(opts.label),
    'aria-label': () => toValue(opts['aria-label']),
    'aria-labelledby': () => `${data.id} ${toValue(opts['aria-labelledby']) ?? ''}`.trim(),
  })

  const focusInput = () => {
    const input = opts.inputRef.value
    if (input) focusWithoutScrolling(input)
  }

  watch(
    () => state.focusedThumb === index(),
    (focused) => {
      if (focused) focusInput()
    },
    {flush: 'post'},
  )

  let currentPosition: number | null = null
  const keyboardUpdate = (cb: () => void) => {
    state.setThumbDragging(index(), true)
    cb()
    state.setThumbDragging(index(), false)
  }

  const {keyboardProps} = useKeyboard({
    shortcuts: {
      PageUp: () => keyboardUpdate(() => state.incrementThumb(index(), state.pageSize)),
      PageDown: () => keyboardUpdate(() => state.decrementThumb(index(), state.pageSize)),
      Home: () => keyboardUpdate(() => state.setThumbValue(index(), state.getThumbMinValue(index()))),
      End: () => keyboardUpdate(() => state.setThumbValue(index(), state.getThumbMaxValue(index()))),
    },
    allowRepeats: true,
    isDisabled: () => isDisabled(),
  })

  const {moveProps} = useMove({
    onMoveStart() {
      currentPosition = null
      state.setThumbDragging(index(), true)
    },
    onMove({deltaX, deltaY, pointerType, shiftKey}) {
      const track = opts.trackRef.value
      if (!track) return
      const {width, height} = track.getBoundingClientRect()
      const vertical = isVertical()
      const size = vertical ? height : width
      const reverseX = locale.direction === 'rtl'
      if (currentPosition == null) currentPosition = state.getThumbPercent(index()) * size
      if (pointerType === 'keyboard') {
        if (((deltaX ?? 0) > 0 && reverseX) || ((deltaX ?? 0) < 0 && !reverseX) || (deltaY ?? 0) > 0) {
          state.decrementThumb(index(), shiftKey ? state.pageSize : state.step)
        } else {
          state.incrementThumb(index(), shiftKey ? state.pageSize : state.step)
        }
        return
      }
      let delta = vertical ? deltaY! : deltaX!
      if (vertical || reverseX) delta = -delta
      currentPosition += delta
      state.setThumbPercent(index(), clamp(currentPosition / size, 0, 1))
    },
    onMoveEnd() {
      state.setThumbDragging(index(), false)
    },
  })

  watch(
    () => [index(), isDisabled()] as const,
    ([thumbIndex, disabled]) => {
      state.setThumbEditable(thumbIndex, !disabled)
    },
    {immediate: true},
  )

  const {focusableProps} = useFocusable(
    {
      onFocus: (event: FocusEvent) => {
        opts.onFocus?.(event)
        state.setFocusedThumb(index())
      },
      onBlur: (event: FocusEvent) => {
        opts.onBlur?.(event)
        state.setFocusedThumb(undefined)
      },
      onFocusChange: opts.onFocusChange,
      isDisabled: () => isDisabled(),
    },
    opts.inputRef,
  )

  let currentPointer: number | undefined
  const onUp = (e: Event) => {
    const pointerEvent = e as PointerEvent
    const touchEvent = e as TouchEvent
    const id = pointerEvent.pointerId ?? touchEvent.changedTouches?.[0]?.identifier
    if (id === currentPointer) {
      focusInput()
      state.setThumbDragging(index(), false)
      removeGlobalListener(window, 'mouseup', onUp, false)
      removeGlobalListener(window, 'touchend', onUp, false)
      removeGlobalListener(window, 'pointerup', onUp, false)
    }
  }
  const onDown = (id?: number) => {
    focusInput()
    currentPointer = id
    state.setThumbDragging(index(), true)
    addGlobalListener(window, 'mouseup', onUp, false)
    addGlobalListener(window, 'touchend', onUp, false)
    addGlobalListener(window, 'pointerup', onUp, false)
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey) return
    onDown()
  }
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey) return
    onDown(e.pointerId)
  }
  const onTouchStart = (e: TouchEvent) => {
    onDown(e.changedTouches[0]?.identifier)
  }

  const interactions = mergeProps(keyboardProps, moveProps, {
    onMousedown: onMouseDown,
    onMouseDown: onMouseDown,
    onPointerdown: onPointerDown,
    onPointerDown: onPointerDown,
    onTouchstart: onTouchStart,
    onTouchStart: onTouchStart,
  })

  useFormReset(opts.inputRef, () => state.defaultValues[index()], (value) => {
    state.setThumbValue(index(), Number(value))
  })

  const describedBy = () =>
    [data['aria-describedby'], toValue(opts['aria-describedby'])].filter(Boolean).join(' ') || undefined
  const details = () => [data['aria-details'], toValue(opts['aria-details'])].filter(Boolean).join(' ') || undefined

  const applyInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    if (!target) return
    state.setThumbValue(index(), parseFloat(target.value))
  }

  const inputProps = mergeProps(focusableProps, {
    onInput: applyInput,
    onChange: applyInput,
  })
  defineLive(inputProps, 'type', () => 'range')
  defineLive(inputProps, 'tabIndex', () => (isDisabled() ? undefined : 0))
  defineLive(inputProps, 'min', () => state.getThumbMinValue(index()))
  defineLive(inputProps, 'max', () => state.getThumbMaxValue(index()))
  defineLive(inputProps, 'step', () => state.step)
  defineLive(inputProps, 'value', () => state.values[index()])
  defineLive(inputProps, 'name', () => toValue(opts.name))
  defineLive(inputProps, 'form', () => toValue(opts.form))
  defineLive(inputProps, 'disabled', () => isDisabled() || undefined)
  defineLive(inputProps, 'id', () => fieldProps.value.id)
  defineLive(inputProps, 'aria-label', () => fieldProps.value['aria-label'])
  defineLive(inputProps, 'aria-labelledby', () => fieldProps.value['aria-labelledby'])
  defineLive(inputProps, 'aria-orientation', () => orientation())
  defineLive(inputProps, 'aria-valuetext', () => state.getThumbValueLabel(index()))
  defineLive(inputProps, 'aria-required', () => toValue(opts.isRequired) || undefined)
  defineLive(inputProps, 'aria-invalid', () => toValue(opts.isInvalid) || toValue(opts.validationState) === 'invalid' || undefined)
  defineLive(inputProps, 'aria-errormessage', () => toValue(opts['aria-errormessage']))
  defineLive(inputProps, 'aria-describedby', describedBy)
  defineLive(inputProps, 'aria-details', details)

  const thumbProps: Record<string, any> = {}
  for (const key of Object.keys(interactions)) {
    Object.defineProperty(thumbProps, key, {
      enumerable: true,
      configurable: true,
      get: () => (isDisabled() ? undefined : interactions[key]),
    })
  }
  defineLive(thumbProps, 'style', () => {
    let position = state.getThumbPercent(index())
    if (isVertical() || locale.direction === 'rtl') position = 1 - position
    return {
      position: 'absolute',
      [isVertical() ? 'top' : 'left']: `${position * 100}%`,
      transform: 'translate(-50%, -50%)',
      touchAction: 'none',
    }
  })

  const labelOut: Record<string, any> = {}
  defineLive(labelOut, 'id', () => labelProps.value.id)
  defineLive(labelOut, 'htmlFor', () => labelProps.value.htmlFor)
  defineLive(labelOut, 'for', () => labelProps.value.htmlFor)

  const result: Record<string, any> = {
    thumbProps,
    inputProps,
    labelProps: labelOut,
  }
  defineLive(result, 'isDragging', () => state.isThumbDragging(index()))
  defineLive(result, 'isDisabled', () => isDisabled())
  defineLive(result, 'isFocused', () => state.focusedThumb === index())
  return result as SliderThumbAria
}
