import {defineComponent, h, isRef, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {I18nProvider} from '../../i18n/I18nProvider'
import {useSlider} from '../useSlider'
import {useSliderThumb} from '../useSliderThumb'
import {useSliderState, type SliderState} from 'vue-stately/useSliderState'

const formatter = new Intl.NumberFormat('en-US') as unknown as {
  format(value: number): string
  formatRange(start: number, end: number): string
  resolvedOptions(): {locale: string}
}

function rect(width = 100, height = 100) {
  return {top: 0, left: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON() { return {} }}
}

function mountSlider(props: Record<string, any> = {}) {
  let state!: SliderState
  let aria!: ReturnType<typeof useSlider>
  const trackRef = ref<HTMLElement | null>(null)
  const inputRef = ref<HTMLInputElement | null>(null)
  const wrapper = mount(defineComponent({
    setup() {
      state = useSliderState({numberFormatter: formatter, ...props})
      aria = useSlider(props, state, trackRef)
      return () => h('div', {'data-testid': 'group', ...aria.groupProps}, [
        h('div', {ref: trackRef, 'data-testid': 'track', ...aria.trackProps}),
      ])
    },
  }), {attachTo: document.body})
  return {state, aria: aria!, trackRef, inputRef, wrapper}
}

function pointer(type: string, target: EventTarget, init: PointerEventInit & {pageX?: number; pageY?: number}) {
  const event = new PointerEvent(type, {bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', button: 0, ...init})
  if (init.pageX != null) Object.defineProperty(event, 'pageX', {value: init.pageX})
  if (init.pageY != null) Object.defineProperty(event, 'pageY', {value: init.pageY})
  target.dispatchEvent(event)
  return event
}

describe('useSlider', () => {
  it('returns plain live prop objects and labels the group', () => {
    const {aria, wrapper} = mountSlider({defaultValue: [0], label: 'Volume', 'aria-label': 'Volume'})
    expect(isRef(aria.groupProps)).toBe(false)
    expect(isRef(aria.labelProps)).toBe(false)
    expect(isRef(aria.trackProps)).toBe(false)
    expect(isRef(aria.outputProps)).toBe(false)
    expect(aria.groupProps.role).toBe('group')
    expect(aria.groupProps['aria-label']).toBe('Volume')
    expect(aria.labelProps.htmlFor).toBeUndefined()
    expect(aria.outputProps['aria-live']).toBe('off')
    expect(aria.trackProps.style).toMatchObject({position: 'relative', touchAction: 'none'})
    wrapper.unmount()
  })

  it('moves the nearest thumb from a track click, including an equal distance and a stack', () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const {state, wrapper} = mountSlider({defaultValue: [10, 80], onChange, onChangeEnd, 'aria-label': 'Slider'})
    const track = document.querySelector('[data-testid="track"]') as HTMLElement
    pointer('pointerdown', track, {clientX: 20, pageX: 20})
    pointer('pointerup', window, {clientX: 20, pageX: 20})
    expect(onChange).toHaveBeenLastCalledWith([20, 80])
    expect(onChangeEnd).toHaveBeenLastCalledWith([20, 80])
    expect(state.values).toEqual([20, 80])

    onChange.mockClear()
    pointer('pointerdown', track, {clientX: 50, pageX: 50})
    pointer('pointerup', window, {clientX: 50, pageX: 50})
    // 50 is equally far from 20 and 80; the end thumb wins.
    expect(state.values[1]).toBe(50)
    wrapper.unmount()

    const stacked = mountSlider({defaultValue: [40, 40], 'aria-label': 'Slider'})
    const stackedTrack = document.querySelector('[data-testid="track"]') as HTMLElement
    pointer('pointerdown', stackedTrack, {clientX: 20, pageX: 20})
    expect(stacked.state.values).toEqual([20, 40])
    pointer('pointerup', window, {clientX: 20, pageX: 20})
    pointer('pointerdown', stackedTrack, {clientX: 60, pageX: 60})
    expect(stacked.state.values).toEqual([20, 60])
    stacked.wrapper.unmount()
    stub.mockRestore()
  })

  it('drags the track continuously and ignores a disabled slider', () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const {state, wrapper} = mountSlider({defaultValue: [10, 80], onChange, onChangeEnd, 'aria-label': 'Slider'})
    const track = document.querySelector('[data-testid="track"]') as HTMLElement
    const added: string[] = []
    const original = window.addEventListener.bind(window)
    const spy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      added.push(String(type))
      original(type, listener as EventListener, options)
    })
    pointer('pointerdown', track, {clientX: 20, pageX: 20})
    expect(added.filter((type) => type === 'mousemove')).toEqual([])
    expect(state.values).toEqual([20, 80])
    pointer('pointermove', window, {clientX: 40, pageX: 40})
    expect(state.values).toEqual([40, 80])
    expect(onChangeEnd).not.toHaveBeenCalled()
    pointer('pointerup', window, {clientX: 40, pageX: 40})
    expect(onChangeEnd).toHaveBeenLastCalledWith([40, 80])
    pointer('pointermove', window, {clientX: 70, pageX: 70})
    expect(state.values).toEqual([40, 80])
    wrapper.unmount()

    const disabled = mountSlider({defaultValue: [10, 80], isDisabled: true, 'aria-label': 'Slider'})
    pointer('pointerdown', document.querySelector('[data-testid="track"]') as HTMLElement, {clientX: 20, pageX: 20})
    expect(disabled.state.values).toEqual([10, 80])
    disabled.wrapper.unmount()
    spy.mockRestore()
    stub.mockRestore()
  })

  it('inverts vertical and RTL track clicks', async () => {
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const vertical = mountSlider({defaultValue: [10, 80], orientation: 'vertical', 'aria-label': 'Slider'})
    pointer('pointerdown', document.querySelector('[data-testid="track"]') as HTMLElement, {clientY: 80, pageY: 80})
    expect(vertical.state.values).toEqual([20, 80])
    vertical.wrapper.unmount()

    const RtlSlider = defineComponent({
      setup() {
        const state = useSliderState({numberFormatter: formatter, defaultValue: [10], 'aria-label': 'Slider'})
        const trackRef = ref<HTMLElement | null>(null)
        const aria = useSlider({'aria-label': 'Slider'}, state, trackRef)
        return () => h('div', {ref: trackRef, 'data-testid': 'rtl', ...aria.trackProps}, String(state.values[0]))
      },
    })
    const rtl = mount(defineComponent({
      setup() {
        return () => h(I18nProvider, {locale: 'ar'}, () => h(RtlSlider))
      },
    }), {attachTo: document.body})
    await nextTick()
    const rtlEl = document.querySelector('[data-testid="rtl"]') as HTMLElement
    pointer('pointerdown', rtlEl, {clientX: 20, pageX: 20})
    await nextTick()
    expect(rtlEl.textContent).toBe('80')
    rtl.unmount()
    stub.mockRestore()
  })
})

describe('useSliderThumb', () => {
  it('merges the slider label into each thumb input and keeps values live', async () => {
    const described = ref('hint')
    let inputProps: Record<string, any> | undefined
    const wrapper = mount(defineComponent({
      setup() {
        const state = useSliderState({
          numberFormatter: formatter,
          defaultValue: [50, 70],
          minValue: 10,
          maxValue: 200,
          step: 2,
          label: 'slider',
        })
        const trackRef = ref<HTMLElement | null>(null)
        const inputRef = ref<HTMLInputElement | null>(null)
        const slider = useSlider({label: 'slider', 'aria-describedby': () => described.value}, state, trackRef)
        const thumb = useSliderThumb({index: 0, trackRef, inputRef, 'aria-label': 'Min', 'aria-describedby': 'thumb-hint'}, state)
        inputProps = thumb.inputProps
        return () => h('div', {'data-testid': 'group', ...slider.groupProps})
      },
    }))
    expect(isRef(inputProps)).toBe(false)
    expect(inputProps!.type).toBe('range')
    expect(inputProps!.value).toBe(50)
    expect(inputProps!.min).toBe(10)
    expect(inputProps!.max).toBe(70)
    expect(inputProps!.step).toBe(2)
    expect(inputProps!['aria-label']).toBe('Min')
    expect(String(inputProps!['aria-labelledby'])).toContain(String(inputProps!.id).replace(/-0$/, ''))
    expect(inputProps!['aria-describedby']).toContain('hint')
    expect(inputProps!['aria-describedby']).toContain('thumb-hint')
    expect(inputProps!['aria-orientation']).toBe('horizontal')
    described.value = 'next'
    await nextTick()
    expect(inputProps!['aria-describedby']).toContain('next')
    wrapper.unmount()
  })

  it('drags a thumb without moving the track, including pointercancel cleanup', () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const wrapper = mount(defineComponent({
      setup() {
        const state = useSliderState({numberFormatter: formatter, defaultValue: [10, 80], onChange, onChangeEnd, 'aria-label': 'Slider'})
        const trackRef = ref<HTMLElement | null>(null)
        const input0 = ref<HTMLInputElement | null>(null)
        const input1 = ref<HTMLInputElement | null>(null)
        const slider = useSlider({'aria-label': 'Slider'}, state, trackRef)
        const thumb0 = useSliderThumb({index: 0, trackRef, inputRef: input0, 'aria-label': 'Min'}, state)
        const thumb1 = useSliderThumb({index: 1, trackRef, inputRef: input1, 'aria-label': 'Max'}, state)
        return () => h('div', {ref: trackRef, 'data-testid': 'track', ...slider.trackProps}, [
          h('div', {'data-testid': 'thumb0', ...thumb0.thumbProps}, [h('input', {ref: input0, ...thumb0.inputProps})]),
          h('div', {'data-testid': 'thumb1', ...thumb1.thumbProps}, [h('input', {ref: input1, ...thumb1.inputProps})]),
        ])
      },
    }), {attachTo: document.body})
    const thumb0 = document.querySelector('[data-testid="thumb0"]') as HTMLElement
    thumb0.style.userSelect = 'text'
    pointer('pointerdown', thumb0, {clientX: 10, pageX: 10})
    expect(onChange).not.toHaveBeenCalled()
    expect(thumb0.style.userSelect).toBe('none')
    pointer('pointermove', window, {clientX: 30, pageX: 30})
    expect(onChange).toHaveBeenLastCalledWith([30, 80])
    pointer('pointercancel', window, {clientX: 30, pageX: 30})
    expect(onChangeEnd).toHaveBeenCalled()
    expect(thumb0.style.userSelect).toBe('text')
    onChange.mockClear()
    pointer('pointermove', window, {clientX: 90, pageX: 90})
    expect(onChange).not.toHaveBeenCalled()

    const thumb1 = document.querySelector('[data-testid="thumb1"]') as HTMLElement
    pointer('pointerdown', thumb1, {clientX: 80, pageX: 80})
    pointer('pointermove', window, {clientX: 20, pageX: 20})
    expect(onChange).toHaveBeenLastCalledWith([30, 30])
    pointer('pointerup', window, {clientX: 20, pageX: 20})
    wrapper.unmount()
    stub.mockRestore()
  })

  it('steps with arrows, shift, home, end, and page keys, and mirrors RTL', async () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const wrapper = mount(defineComponent({
      setup() {
        const state = useSliderState({numberFormatter: formatter, defaultValue: [10], onChange, onChangeEnd, 'aria-label': 'Slider'})
        const trackRef = ref<HTMLElement | null>(null)
        const inputRef = ref<HTMLInputElement | null>(null)
        const slider = useSlider({'aria-label': 'Slider'}, state, trackRef)
        const thumb = useSliderThumb({index: 0, trackRef, inputRef}, state)
        return () => h('div', {ref: trackRef, ...slider.trackProps}, [
          h('div', {'data-testid': 'thumb', ...thumb.thumbProps}, [h('input', {ref: inputRef, ...thumb.inputProps})]),
        ])
      },
    }), {attachTo: document.body})
    const input = document.querySelector('input') as HTMLInputElement
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    expect(onChange).toHaveBeenLastCalledWith([11])
    expect(onChangeEnd).toHaveBeenCalledTimes(1)
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true}))
    expect(onChange).toHaveBeenLastCalledWith([21])
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true, cancelable: true}))
    expect(onChange).toHaveBeenLastCalledWith([0])
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'End', bubbles: true, cancelable: true}))
    expect(onChange).toHaveBeenLastCalledWith([100])
    onChange.mockClear()
    onChangeEnd.mockClear()
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    expect(onChange).not.toHaveBeenCalled()
    expect(onChangeEnd).toHaveBeenCalledWith([100])
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageDown', bubbles: true, cancelable: true, repeat: true}))
    expect(onChange).toHaveBeenLastCalledWith([90])
    wrapper.unmount()

    const RtlThumb = defineComponent({
      setup() {
        const state = useSliderState({numberFormatter: formatter, defaultValue: [10], 'aria-label': 'Slider'})
        const trackRef = ref<HTMLElement | null>(null)
        const inputRef = ref<HTMLInputElement | null>(null)
        const slider = useSlider({'aria-label': 'Slider'}, state, trackRef)
        const thumb = useSliderThumb({index: 0, trackRef, inputRef}, state)
        return () => h('div', {ref: trackRef, ...slider.trackProps}, [
          h('div', {...thumb.thumbProps}, [h('input', {'data-testid': 'rtl-input', ref: inputRef, ...thumb.inputProps})]),
        ])
      },
    })
    const rtl = mount(defineComponent({
      setup() {
        return () => h(I18nProvider, {locale: 'ar'}, () => h(RtlThumb))
      },
    }), {attachTo: document.body})
    await nextTick()
    const rtlInput = document.querySelector('[data-testid="rtl-input"]') as HTMLInputElement
    rtlInput.focus()
    rtlInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    await nextTick()
    expect(rtlInput.value).toBe('9')
    rtlInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true}))
    await nextTick()
    expect(rtlInput.value).toBe('10')
    rtl.unmount()
    stub.mockRestore()
  })
})
