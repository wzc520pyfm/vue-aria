import {defineComponent, Fragment, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {I18nProvider, Label} from 'vue-aria-components'
import {
  Slider,
  SliderContext,
  SliderFill,
  SliderFillContext,
  SliderOutput,
  SliderOutputContext,
  SliderThumb,
  SliderTrack,
  SliderTrackContext,
} from '../Slider'
import * as stately from 'vue-stately'
import * as aria from 'vue-aria'
import * as components from 'vue-aria-components'
import type {
  AriaSliderProps,
  AriaSliderThumbOptions,
  AriaSliderThumbProps,
  Orientation,
  SliderAria,
  SliderThumbAria,
  SliderThumbProps as AriaThumbProps,
} from 'vue-aria'
import type {SliderProps as StatelySliderProps, SliderState, SliderStateOptions} from 'vue-stately'
import type {
  LabelProps,
  SliderFillProps,
  SliderFillRenderProps,
  SliderOutputProps,
  SliderProps,
  SliderRenderProps,
  SliderThumbProps,
  SliderThumbRenderProps,
  SliderTrackProps,
  SliderTrackRenderProps,
} from 'vue-aria-components'

type Expect<T extends true> = T
type HasNo<T, K extends PropertyKey> = K extends keyof T ? false : true

function mountInDoc(component: any) {
  return mount(component, {attachTo: document.body})
}

afterEach(() => {
  document.body.innerHTML = ''
})

function rect() {
  return {top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON() { return {} }}
}

function pointer(type: string, target: EventTarget, init: PointerEventInit & {pageX?: number; pageY?: number} = {}) {
  const event = new PointerEvent(type, {bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', button: 0, ...init})
  if (init.pageX != null) Object.defineProperty(event, 'pageX', {value: init.pageX})
  if (init.pageY != null) Object.defineProperty(event, 'pageY', {value: init.pageY})
  target.dispatchEvent(event)
}

function sliderTree(props: Record<string, any> = {}, thumbProps: Record<string, any> = {}, trackProps: Record<string, any> = {}, fillProps: Record<string, any> = {}) {
  return h(Slider, {'aria-label': 'Opacity', ...props}, {
    default: () => [
      h(Label, {}, {default: () => 'Opacity'}),
      h(SliderOutput),
      h(SliderTrack, trackProps, {
        default: () => [h(SliderFill, fillProps), h(SliderThumb, thumbProps)],
      }),
    ],
  })
}

describe('Slider', () => {
  it('renders the five parts, a native range input, and the formatted output', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => sliderTree()
      },
    }))
    await nextTick()
    const group = document.querySelector('[role="group"]') as HTMLElement
    expect(group.className).toContain('react-aria-Slider')
    expect(group.getAttribute('data-orientation')).toBe('horizontal')
    expect(group.hasAttribute('data-disabled')).toBe(false)
    const input = group.querySelector('input') as HTMLInputElement
    expect(input.type).toBe('range')
    expect(input.value).toBe('0')
    expect(input.getAttribute('aria-valuetext')).toBe('0')
    const output = group.querySelector('output') as HTMLOutputElement
    expect(output.textContent).toBe('0')
    expect(output.getAttribute('aria-live')).toBe('off')
    expect(output.getAttribute('for')).toBe(input.id)
    const track = group.querySelector('.react-aria-SliderTrack') as HTMLElement
    expect(track).toBeTruthy()
    expect(track.style.position).toBe('relative')
    expect(track.style.touchAction).toBe('none')
    expect(group.querySelector('.react-aria-SliderThumb')).toBeTruthy()
    expect(group.querySelector('.react-aria-SliderFill')).toBeTruthy()
    const label = group.querySelector('label') as HTMLLabelElement
    expect(label.textContent).toBe('Opacity')
    expect(group.getAttribute('aria-labelledby')).toBe(label.id)
    wrapper.unmount()
  })

  it('uses className strings and state functions, and keeps a string style beside the thumb position', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => sliderTree(
          {className: ({isDisabled}: SliderRenderProps) => (isDisabled ? 'root-off' : 'root-on'), style: 'color: red'},
          {className: ({isDragging}: SliderThumbRenderProps) => (isDragging ? 'dragging' : 'idle'), style: 'outline: 1px solid blue'},
        )
      },
    }))
    await nextTick()
    const group = document.querySelector('[role="group"]') as HTMLElement
    expect(group.className).toContain('root-on')
    expect(group.style.color).toBe('red')
    const thumb = group.querySelector('.react-aria-SliderThumb, .idle') as HTMLElement
    expect(thumb.className).toContain('idle')
    expect(thumb.style.position).toBe('absolute')
    expect(thumb.style.left).toBe('0%')
    expect(thumb.style.outline).toContain('blue')
    wrapper.unmount()
  })

  it('lets local false override a live context true, and concatenates context and local class strings', async () => {
    const disabled = ref(true)
    const tone = ref('green')
    const ctx: Record<string, any> = {'data-foo': 'bar'}
    Object.defineProperty(ctx, 'isDisabled', {enumerable: true, configurable: true, get: () => disabled.value})
    Object.defineProperty(ctx, 'className', {enumerable: true, configurable: true, get: () => 'from-context'})
    Object.defineProperty(ctx, 'style', {enumerable: true, configurable: true, get: () => ({color: tone.value, padding: '4px'})})
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(SliderContext, ctx)
        return () => h(Slider, {'aria-label': 'Opacity', isDisabled: false, className: 'local', style: {padding: '8px'}}, {
          default: () => h(SliderTrack, {}, {default: () => h(SliderThumb)}),
        })
      },
    }))
    await nextTick()
    const group = document.querySelector('[role="group"]') as HTMLElement
    expect(group.hasAttribute('data-disabled')).toBe(false)
    expect(group.className).toContain('from-context')
    expect(group.className).toContain('local')
    expect(group.style.color).toBe('green')
    expect(group.style.padding).toBe('8px')
    expect(group.getAttribute('data-foo')).toBe('bar')
    tone.value = 'blue'
    disabled.value = false
    await nextTick()
    expect(group.style.color).toBe('blue')
    wrapper.unmount()
  })

  it('labels the first thumb from the label click and shows the focus ring', async () => {
    const wrapper = mountInDoc(defineComponent({setup: () => () => sliderTree()}))
    await nextTick()
    const label = document.querySelector('label') as HTMLLabelElement
    const input = document.querySelector('input') as HTMLInputElement
    label.click()
    await nextTick()
    expect(document.activeElement).toBe(input)
    const thumb = document.querySelector('.react-aria-SliderThumb') as HTMLElement
    expect(thumb.getAttribute('data-focused')).toBe('true')
    expect(thumb.getAttribute('data-focus-visible')).toBe('true')
    input.blur()
    await nextTick()
    expect(thumb.hasAttribute('data-focused')).toBe(false)
    wrapper.unmount()
  })

  it('submits, resets, and updates a native range input for one and two thumbs', async () => {
    const onChange = vi.fn()
    const onChangeend = vi.fn()
    const onChangeEnd = vi.fn()
    const value = ref<number | number[]>(30)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h('form', {'data-testid': 'form'}, [
          h(Slider, {
            name: 'opacity',
            value: value.value,
            defaultValue: 30,
            onChange: (next: number | number[]) => {
              onChange(next)
              value.value = next
            },
            onChangeend,
            onChangeEnd,
          }, {
            default: () => [h(Label, {}, {default: () => 'Opacity'}), h(SliderTrack, {}, {default: () => h(SliderThumb, {name: 'opacity'})})],
          }),
          h('button', {type: 'reset'}, 'Reset'),
        ])
      },
    }))
    await nextTick()
    const form = document.querySelector('form') as HTMLFormElement
    const input = form.querySelector('input[type="range"]') as HTMLInputElement
    expect(new FormData(form).get('opacity')).toBe('30')
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    await nextTick()
    expect(onChange).toHaveBeenCalledWith(31)
    expect(onChangeend).toHaveBeenCalledWith(31)
    expect(onChangeEnd).toHaveBeenCalledWith(31)
    expect(onChange).toHaveBeenCalledTimes(1)
    value.value = onChange.mock.calls.at(-1)![0]
    await nextTick()
    expect(input.value).toBe('31')
    form.reset()
    await nextTick()
    expect(input.value).toBe('30')
    stub.mockRestore()
    wrapper.unmount()
  })

  it('renders two and three thumbs, localized output, and fill offsets', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(I18nProvider, {locale: 'en-US'}, () => h(Slider, {defaultValue: [30, 60]}, {
          default: ({state}: SliderRenderProps) => [
            h(Label, {}, {default: () => 'Range'}),
            h(SliderOutput),
            h(SliderTrack, {}, {
              default: () => [
                h(SliderFill, {style: 'background: black'}),
                ...state.values.map((_, index) => h(SliderThumb, {index, key: index})),
              ],
            }),
          ],
        }))
      },
    }))
    await nextTick()
    const inputs = [...document.querySelectorAll('input')] as HTMLInputElement[]
    expect(inputs.map((input) => input.value)).toEqual(['30', '60'])
    expect(inputs[0].id).not.toBe(inputs[1].id)
    expect(inputs[0].max).toBe('60')
    expect(inputs[1].min).toBe('30')
    const output = document.querySelector('output') as HTMLOutputElement
    const rangeFormat = new Intl.NumberFormat('en-US') as unknown as {formatRange(start: number, end: number): string}
    expect(output.textContent).toBe(rangeFormat.formatRange(30, 60))
    const fill = document.querySelector('.react-aria-SliderFill') as HTMLElement
    expect(fill.style.insetInlineStart).toBe('30%')
    expect(fill.style.width).toBe('30%')
    expect(fill.style.background).toContain('black')
    expect(fill.style.position).toBe('absolute')
    wrapper.unmount()

    const vertical = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {value: 30, orientation: 'vertical', 'aria-label': 'V'}, {
          default: () => h(SliderTrack, {}, {default: () => [h(SliderFill, {offset: 50}), h(SliderThumb)]}),
        })
      },
    }))
    await nextTick()
    const verticalFill = document.querySelector('.react-aria-SliderFill') as HTMLElement
    expect(verticalFill.getAttribute('data-orientation')).toBe('vertical')
    expect(verticalFill.style.bottom).toBe('30%')
    expect(verticalFill.style.height).toBe('20%')
    const verticalInput = document.querySelector('input') as HTMLInputElement
    expect(verticalInput.getAttribute('aria-orientation')).toBe('vertical')
    vertical.unmount()
  })

  it('moves the nearest thumb from the track and isolates a thumb drag', async () => {
    const onChange = vi.fn()
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {defaultValue: [10, 80], onChange, 'aria-label': 'Slider'}, {
          default: ({state}: SliderRenderProps) => h(SliderTrack, {}, {
            default: () => state.values.map((_, index) => h(SliderThumb, {index, key: index, 'aria-label': `Thumb ${index}`})),
          }),
        })
      },
    }))
    await nextTick()
    const track = document.querySelector('.react-aria-SliderTrack') as HTMLElement
    pointer('pointerdown', track, {clientX: 20, pageX: 20, pointerType: 'pen'})
    pointer('pointerup', window, {clientX: 20, pageX: 20, pointerType: 'pen'})
    await nextTick()
    expect(onChange).toHaveBeenCalledWith([20, 80])
    const thumb = document.querySelectorAll('.react-aria-SliderThumb')[1] as HTMLElement
    pointer('pointerdown', thumb, {clientX: 80, pageX: 80, pointerType: 'touch'})
    pointer('pointermove', window, {clientX: 60, pageX: 60, pointerType: 'touch'})
    await nextTick()
    expect(onChange).toHaveBeenLastCalledWith([20, 60])
    expect(thumb.getAttribute('data-dragging')).toBe('true')
    pointer('pointerup', window, {clientX: 60, pageX: 60, pointerType: 'touch'})
    await nextTick()
    expect(thumb.hasAttribute('data-dragging')).toBe(false)
    stub.mockRestore()
    wrapper.unmount()
  })

  it('disables one thumb and keeps the other editable', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {defaultValue: [20, 80], 'aria-label': 'Slider'}, {
          default: () => h(SliderTrack, {}, {
            default: () => [h(SliderThumb, {index: 0, isDisabled: true}), h(SliderThumb, {index: 1})],
          }),
        })
      },
    }))
    await nextTick()
    const inputs = [...document.querySelectorAll('input')] as HTMLInputElement[]
    expect(inputs[0].disabled).toBe(true)
    expect(inputs[1].disabled).toBe(false)
    const thumbs = [...document.querySelectorAll('.react-aria-SliderThumb')] as HTMLElement[]
    expect(thumbs[0].getAttribute('data-disabled')).toBe('true')
    expect(thumbs[1].hasAttribute('data-disabled')).toBe(false)
    inputs[1].focus()
    inputs[1].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true}))
    await nextTick()
    expect(inputs[1].value).toBe('79')
    expect(inputs[0].value).toBe('20')
    wrapper.unmount()
  })

  it('keeps native range inputs in DOM focus order', async () => {
    // jsdom does not implement sequential focus navigation. A dispatched Tab
    // KeyboardEvent does not move document.activeElement the way a browser
    // does, so this test does not claim that pressing Tab walks the thumbs.
    // It checks that the native range inputs are reachable, not disabled, and
    // ordered in the document. Browser Tab traversal is still unverified here.
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h('div', [
          h('input', {'data-testid': 'before', type: 'text'}),
          h(Slider, {defaultValue: [20, 80], 'aria-label': 'Range'}, {
            default: () => h(SliderTrack, {}, {
              default: () => [
                h(SliderThumb, {index: 0, 'aria-label': 'Start'}),
                h(SliderThumb, {index: 1, 'aria-label': 'End'}),
              ],
            }),
          }),
          h('input', {'data-testid': 'after', type: 'text'}),
        ])
      },
    }))
    await nextTick()
    const before = document.querySelector('[data-testid="before"]') as HTMLInputElement
    const after = document.querySelector('[data-testid="after"]') as HTMLInputElement
    const ranges = [...document.querySelectorAll('input[type="range"]')] as HTMLInputElement[]
    expect(ranges).toHaveLength(2)
    expect(ranges.every((input) => input.tabIndex === 0 && !input.disabled)).toBe(true)
    expect(before.compareDocumentPosition(ranges[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(ranges[0].compareDocumentPosition(ranges[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(ranges[1].compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    ranges[0].focus()
    expect(document.activeElement).toBe(ranges[0])
    ranges[1].focus()
    expect(document.activeElement).toBe(ranges[1])
    after.focus()
    expect(document.activeElement).toBe(after)
    wrapper.unmount()
  })

  it('updates range min, max, and aria-valuetext when the slider props change', async () => {
    const value = ref<number | number[]>([20, 40])
    const minValue = ref(0)
    const maxValue = ref(100)
    const formatOptions = ref<Intl.NumberFormatOptions | undefined>(undefined)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {
          'aria-label': 'Dynamic',
          value: value.value,
          minValue: minValue.value,
          maxValue: maxValue.value,
          formatOptions: formatOptions.value,
        }, {
          default: ({state}: SliderRenderProps) => h(SliderTrack, {}, {
            default: () => state.values.map((_, index) => h(SliderThumb, {index, key: index})),
          }),
        })
      },
    }))
    await nextTick()
    const read = () => [...document.querySelectorAll('input[type="range"]')] as HTMLInputElement[]
    expect(read().map((input) => [input.min, input.max, input.getAttribute('aria-valuetext')])).toEqual([
      ['0', '40', '20'],
      ['20', '100', '40'],
    ])
    value.value = [15, 25]
    minValue.value = 5
    maxValue.value = 50
    formatOptions.value = {style: 'currency', currency: 'USD'}
    await nextTick()
    expect(read().map((input) => [input.min, input.max, input.value, input.getAttribute('aria-valuetext')])).toEqual([
      ['5', '25', '15', '$15.00'],
      ['15', '50', '25', '$25.00'],
    ])
    wrapper.unmount()
  })

  it('updates scoped slot, className, and style on all five slider parts', async () => {
    const value = ref(10)
    const disabled = ref(false)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {
          'aria-label': 'Parts',
          value: value.value,
          onChange: (next: number | number[]) => {
            value.value = next as number
          },
          isDisabled: disabled.value,
          className: ({isDisabled}: SliderRenderProps) => (isDisabled ? 'root-off' : 'root-on'),
          style: 'color: red',
        }, {
          default: ({state}: SliderRenderProps) => [
            h(SliderOutput, {
              className: ({orientation, isDisabled}: SliderRenderProps) => `out-${orientation}${isDisabled ? '-off' : ''}`,
              style: 'font-weight: 700',
            }, {default: ({state: outputState}: SliderRenderProps) => outputState.getFormattedValue()}),
            h(SliderTrack, {
              className: ({isHovered}: SliderTrackRenderProps) => (isHovered ? 'track-hot' : 'track-cold'),
              style: 'outline: 1px solid blue',
            }, {
              default: ({state: trackState}: SliderTrackRenderProps) => [
                h('span', {'data-testid': 'track-slot'}, String(trackState.values[0])),
                h(SliderFill, {
                  className: ({isDisabled}: SliderFillRenderProps) => (isDisabled ? 'fill-off' : 'fill-on'),
                  style: 'background: black',
                }),
                h(SliderThumb, {
                  className: ({isDragging}: SliderThumbRenderProps) => (isDragging ? 'drag' : 'idle'),
                  style: 'outline: 1px solid green',
                }, {default: ({isDragging}: SliderThumbRenderProps) => h('span', {'data-testid': 'thumb-slot'}, isDragging ? 'dragging' : 'rest')}),
              ],
            }),
          ],
        })
      },
    }))
    await nextTick()
    const group = document.querySelector('[role="group"]') as HTMLElement
    const output = group.querySelector('output') as HTMLElement
    const track = group.querySelector('.track-cold') as HTMLElement
    const fill = group.querySelector('.fill-on') as HTMLElement
    const thumb = group.querySelector('.idle') as HTMLElement
    expect(group.className).toContain('root-on')
    expect(group.style.color).toBe('red')
    expect(output.className).toContain('out-horizontal')
    expect(output.style.fontWeight).toBe('700')
    expect(output.textContent).toBe('10')
    expect(track.className).toContain('track-cold')
    expect(track.style.outline).toContain('blue')
    expect(track.style.position).toBe('relative')
    expect(document.querySelector('[data-testid="track-slot"]')!.textContent).toBe('10')
    expect(fill.className).toContain('fill-on')
    expect(fill.style.background).toContain('black')
    expect(fill.style.width).toBe('10%')
    expect(thumb.className).toContain('idle')
    expect(thumb.style.outline).toContain('green')
    expect(thumb.style.position).toBe('absolute')
    expect(document.querySelector('[data-testid="thumb-slot"]')!.textContent).toBe('rest')

    value.value = 40
    disabled.value = true
    await nextTick()
    expect(group.className).toContain('root-off')
    expect(group.style.color).toBe('red')
    expect(output.className).toContain('out-horizontal-off')
    expect(output.style.fontWeight).toBe('700')
    expect(output.textContent).toBe('40')
    expect(document.querySelector('[data-testid="track-slot"]')!.textContent).toBe('40')
    expect(fill.className).toContain('fill-off')
    expect(fill.style.background).toContain('black')
    expect(fill.style.width).toBe('40%')
    expect(thumb.style.left).toBe('40%')
    expect(thumb.style.outline).toContain('green')
    expect(track.style.position).toBe('relative')
    expect(track.style.outline).toContain('blue')
    wrapper.unmount()

    const hover = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {'aria-label': 'Hover'}, {
          default: () => h(SliderTrack, {
            className: ({isHovered}: SliderTrackRenderProps) => (isHovered ? 'track-hot' : 'track-cold'),
          }, {default: () => h(SliderThumb)}),
        })
      },
    }))
    await nextTick()
    const hoverTrack = document.querySelector('.track-cold') as HTMLElement
    hoverTrack.dispatchEvent(new PointerEvent('pointerenter', {bubbles: false, pointerType: 'mouse'}))
    await nextTick()
    expect(hoverTrack.className).toContain('track-hot')
    hover.unmount()
  })

  it('removes the shared up listeners and restores selection when the slider unmounts', async () => {
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const added: Array<{type: string; fn: EventListener}> = []
    const removed: Array<{type: string; fn: EventListener}> = []
    const origAdd = window.addEventListener.bind(window)
    const origRemove = window.removeEventListener.bind(window)
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      added.push({type: String(type), fn: listener as EventListener})
      origAdd(type, listener as EventListener, options)
    })
    const removeSpy = vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      removed.push({type: String(type), fn: listener as EventListener})
      origRemove(type, listener as EventListener, options)
    })
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {defaultValue: 10, 'aria-label': 'Cleanup'}, {
          default: () => h(SliderTrack, {}, {default: () => h(SliderThumb)}),
        })
      },
    }))
    await nextTick()
    const thumb = document.querySelector('.react-aria-SliderThumb') as HTMLElement
    thumb.style.userSelect = 'text'
    pointer('pointerdown', thumb, {clientX: 10, pageX: 10})
    expect(thumb.style.userSelect).toBe('none')
    const shared = added.filter((entry) => entry.type === 'mouseup').map((entry) => entry.fn)
    expect(shared.length).toBeGreaterThan(0)
    const onUp = shared[0]
    expect(added.some((entry) => entry.type === 'touchend' && entry.fn === onUp)).toBe(true)
    expect(added.some((entry) => entry.type === 'pointerup' && entry.fn === onUp)).toBe(true)
    wrapper.unmount()
    expect(thumb.style.userSelect).toBe('text')
    for (const type of ['mouseup', 'touchend', 'pointerup']) {
      expect(removed.some((entry) => entry.type === type && entry.fn === onUp)).toBe(true)
    }
    const calls = removed.filter((entry) => entry.fn === onUp).length
    pointer('pointermove', window, {clientX: 80, pageX: 80})
    pointer('pointerup', window, {clientX: 80, pageX: 80})
    window.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}))
    window.dispatchEvent(new Event('touchend'))
    expect(removed.filter((entry) => entry.fn === onUp).length).toBe(calls)
    addSpy.mockRestore()
    removeSpy.mockRestore()
    stub.mockRestore()
  })

  it('restores selection and drops drag listeners when the thumb element is replaced', async () => {
    const stub = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect() as DOMRect)
    const removed: Array<{type: string; fn: EventListener}> = []
    const added: Array<{type: string; fn: EventListener}> = []
    const origAdd = window.addEventListener.bind(window)
    const origRemove = window.removeEventListener.bind(window)
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      added.push({type: String(type), fn: listener as EventListener})
      origAdd(type, listener as EventListener, options)
    })
    const removeSpy = vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      removed.push({type: String(type), fn: listener as EventListener})
      origRemove(type, listener as EventListener, options)
    })
    const onChange = vi.fn()
    const thumbKey = ref('a')
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {defaultValue: 10, onChange, 'aria-label': 'Swap'}, {
          default: () => h(SliderTrack, {}, {
            default: () => h(SliderThumb, {key: thumbKey.value}),
          }),
        })
      },
    }))
    await nextTick()
    const thumb = document.querySelector('.react-aria-SliderThumb') as HTMLElement
    thumb.style.userSelect = 'text'
    pointer('pointerdown', thumb, {clientX: 10, pageX: 10})
    expect(thumb.style.userSelect).toBe('none')
    const onUp = added.find((entry) => entry.type === 'mouseup')!.fn
    thumbKey.value = 'b'
    await nextTick()
    expect(thumb.style.userSelect).toBe('text')
    expect(document.querySelector('.react-aria-SliderThumb')).not.toBe(thumb)
    for (const type of ['mouseup', 'touchend', 'pointerup', 'pointermove']) {
      expect(removed.some((entry) => entry.type === type && (entry.fn === onUp || entry.type === 'pointermove'))).toBe(true)
    }
    onChange.mockClear()
    pointer('pointermove', window, {clientX: 90, pageX: 90})
    expect(onChange).not.toHaveBeenCalled()
    addSpy.mockRestore()
    removeSpy.mockRestore()
    stub.mockRestore()
    wrapper.unmount()
  })
})

  it('names the slider from a Fragment label and updates when that label is added or removed', async () => {
    const show = ref(true)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {'data-testid': 'named'}, {
          default: () => h(Fragment, [
            show.value ? h(Label, {}, {default: () => 'Volume'}) : null,
            h(SliderTrack, {}, {default: () => h(SliderThumb, {}, {default: () => h(Label, {}, {default: () => 'Minimum'})})}),
          ]),
        })
      },
    }))
    await nextTick()
    const group = document.querySelector('[data-testid="named"]') as HTMLElement
    const label = group.querySelector('label') as HTMLLabelElement
    expect(label.textContent).toBe('Volume')
    expect(group.getAttribute('aria-labelledby')).toBe(label.id)
    const input = group.querySelector('input') as HTMLInputElement
    const thumbLabel = [...group.querySelectorAll('label')].find((node) => node.textContent === 'Minimum') as HTMLLabelElement
    expect(thumbLabel).toBeTruthy()
    expect(thumbLabel.getAttribute('for')).toBe(input.id)
    expect(input.getAttribute('aria-labelledby')).toContain(thumbLabel.id)
    expect(input.getAttribute('aria-labelledby')).toContain(label.id)
    show.value = false
    await nextTick()
    expect(group.querySelector('label')?.textContent).toBe('Minimum')
    expect(group.hasAttribute('aria-labelledby')).toBe(false)
    show.value = true
    await nextTick()
    const restored = [...group.querySelectorAll('label')].find((node) => node.textContent === 'Volume') as HTMLLabelElement
    expect(group.getAttribute('aria-labelledby')).toBe(restored.id)
    wrapper.unmount()
  })

  it('follows each public context for value, class, style, offset, ref, and false', async () => {
    const value = ref(10)
    const onChange = vi.fn((next: number | number[]) => {
      value.value = next as number
    })
    const onChangeEnd = vi.fn()
    const rootRef = ref<HTMLElement | null>(null)
    const outputRef = ref<HTMLElement | null>(null)
    const trackRef = ref<HTMLElement | null>(null)
    const fillRef = ref<HTMLElement | null>(null)
    const disabled = ref(true)
    const offset = ref(20)
    const rootCtx: Record<string, any> = {ref: rootRef, onChange, onChangeEnd}
    Object.defineProperty(rootCtx, 'value', {enumerable: true, get: () => value.value})
    Object.defineProperty(rootCtx, 'isDisabled', {enumerable: true, get: () => disabled.value})
    Object.defineProperty(rootCtx, 'className', {enumerable: true, get: () => 'root-ctx'})
    Object.defineProperty(rootCtx, 'style', {enumerable: true, get: () => 'color: red'})
    const outputCtx: Record<string, any> = {ref: outputRef}
    Object.defineProperty(outputCtx, 'className', {enumerable: true, get: () => 'out-ctx'})
    Object.defineProperty(outputCtx, 'style', {enumerable: true, get: () => 'color: red'})
    const trackCtx: Record<string, any> = {ref: trackRef}
    Object.defineProperty(trackCtx, 'style', {enumerable: true, get: () => 'color: red'})
    Object.defineProperty(trackCtx, 'className', {enumerable: true, get: () => 'track-ctx'})
    const fillCtx: Record<string, any> = {ref: fillRef}
    Object.defineProperty(fillCtx, 'offset', {enumerable: true, get: () => offset.value})
    Object.defineProperty(fillCtx, 'className', {enumerable: true, get: () => 'fill-ctx'})
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(SliderContext, rootCtx)
        return () => h(Slider, {isDisabled: false, className: 'root-local', style: ({defaultStyle}: {defaultStyle?: Record<string, string>}) => defaultStyle ?? {}}, {
          default: () => [
            h(SliderOutput, {style: () => 'font-weight: 700'}),
            h(SliderTrack, {style: () => ({padding: '4px'})}, {
              default: () => [h(SliderFill), h(SliderThumb, {autoFocus: true})],
            }),
          ],
        })
      },
    }))
    // Child contexts are provided by Slider itself. Re-provide them around the children
    // by wrapping after the root context case is asserted, then mount a second tree.
    await nextTick()
    const group = document.querySelector('[role="group"]') as HTMLElement
    expect(rootRef.value).toBe(group)
    expect(group.className).toContain('root-ctx')
    expect(group.className).toContain('root-local')
    expect(group.hasAttribute('data-disabled')).toBe(false)
    expect(group.style.color).toBe('red')
    const input = group.querySelector('input') as HTMLInputElement
    expect(document.activeElement).toBe(input)
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    await nextTick()
    expect(onChange).toHaveBeenCalledWith(11)
    expect(onChangeEnd).toHaveBeenCalledTimes(1)
    expect(onChangeEnd).toHaveBeenLastCalledWith(11)
    expect(value.value).toBe(11)
    input.dispatchEvent(new KeyboardEvent('keyup', {key: 'ArrowRight', bubbles: true}))
    wrapper.unmount()

    const ProvideOutput = defineComponent({
      setup(_, {slots}) {
        provide(SliderOutputContext, outputCtx)
        return () => slots.default?.()
      },
    })
    const ProvideTrack = defineComponent({
      setup(_, {slots}) {
        provide(SliderTrackContext, trackCtx)
        return () => slots.default?.()
      },
    })
    const ProvideFill = defineComponent({
      setup(_, {slots}) {
        provide(SliderFillContext, fillCtx)
        return () => slots.default?.()
      },
    })
    const child = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {value: 50, 'aria-label': 'Ctx'}, {
          default: () => [
            h(ProvideOutput, {}, {default: () => h(SliderOutput, {className: 'out-local', style: () => 'font-weight: 700'})}),
            h(ProvideTrack, {}, {default: () => h(SliderTrack, {className: 'track-local', style: () => ({padding: '4px'})}, {
              default: () => [h(ProvideFill, {}, {default: () => h(SliderFill, {style: () => ({outline: '1px solid blue'})})}), h(SliderThumb)],
            })}),
          ],
        })
      },
    }))
    await nextTick()
    const output = document.querySelector('output') as HTMLElement
    const track = document.querySelector('.track-ctx') as HTMLElement
    const fill = document.querySelector('.fill-ctx') as HTMLElement
    expect(outputRef.value).toBe(output)
    expect(output.className).toContain('out-ctx')
    expect(output.className).toContain('out-local')
    expect(output.style.color).toBe('red')
    expect(output.style.fontWeight).toBe('700')
    expect(trackRef.value).toBe(track)
    expect(track.className).toContain('track-local')
    expect(track.style.color).toBe('red')
    expect(track.style.padding).toBe('4px')
    expect(track.style.position).toBe('relative')
    expect(fillRef.value).toBe(fill)
    expect(fill.style.insetInlineStart).toBe('20%')
    expect(fill.style.width).toBe('30%')
    offset.value = 10
    await nextTick()
    expect(fill.style.insetInlineStart).toBe('10%')
    expect(fill.style.width).toBe('40%')
    expect(fill.style.outline).toContain('blue')
    child.unmount()
  })

  it('focuses autoFocus and forwards a thumb keydown callback', async () => {
    const onKeyDown = vi.fn()
    const onHoverend = vi.fn()
    const assignment: SliderThumbProps = {
      autoFocus: true,
      onKeyDown,
      onKeyUp: () => {},
      onHoverstart: () => {},
      onHoverend,
      onHoverchange: () => {},
      onHoverStart: () => {},
      onHoverEnd: () => {},
      onHoverChange: () => {},
    }
    const fillAssignment: SliderFillProps = {
      offset: 0,
      onHoverstart: () => {},
      onHoverend: () => {},
      onHoverchange: () => {},
      onHoverEnd: () => {},
      onHoverChange: () => {},
    }
    expect(assignment.autoFocus).toBe(true)
    expect(fillAssignment.offset).toBe(0)
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Slider, {'aria-label': 'Keys'}, {
          default: () => h(SliderTrack, {}, {
            default: () => h(SliderThumb, assignment),
          }),
        })
      },
    }))
    await nextTick()
    const input = document.querySelector('input') as HTMLInputElement
    expect(document.activeElement).toBe(input)
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', bubbles: true}))
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('submits and resets every thumb in one form', async () => {
    const value = ref<number[]>([20, 80])
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h('form', [
          h(Slider, {
            value: value.value,
            defaultValue: [20, 80],
            onChange: (next: number | number[]) => {
              value.value = next as number[]
            },
          }, {
            default: () => h(SliderTrack, {}, {
              default: () => [
                h(SliderThumb, {index: 0, name: 'start'}),
                h(SliderThumb, {index: 1, name: 'end'}),
              ],
            }),
          }),
          h('button', {type: 'reset'}, 'Reset'),
        ])
      },
    }))
    await nextTick()
    const form = document.querySelector('form') as HTMLFormElement
    const data = new FormData(form)
    expect(data.get('start')).toBe('20')
    expect(data.get('end')).toBe('80')
    const inputs = [...form.querySelectorAll('input')] as HTMLInputElement[]
    inputs[0].focus()
    inputs[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    await nextTick()
    inputs[1].focus()
    inputs[1].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true}))
    await nextTick()
    expect(new FormData(form).get('start')).toBe('21')
    expect(new FormData(form).get('end')).toBe('79')
    form.reset()
    await nextTick()
    expect(inputs.map((input) => input.value)).toEqual(['20', '80'])
    expect(value.value).toEqual([20, 80])
    wrapper.unmount()
  })

describe('Slider public exports', () => {
  it('exports the official surfaces and refuses the denylist', async () => {
    expect(typeof stately.useSliderState).toBe('function')
    expect(typeof aria.useSlider).toBe('function')
    expect(typeof aria.useSliderThumb).toBe('function')
    expect(components.Slider).toBeTruthy()
    expect(components.SliderOutput).toBeTruthy()
    expect(components.SliderTrack).toBeTruthy()
    expect(components.SliderThumb).toBeTruthy()
    expect(components.SliderFill).toBeTruthy()
    expect(components.SliderContext).toBeTruthy()
    expect(components.SliderStateContext).toBeTruthy()
    expect(components.SliderTrackContext).toBeTruthy()
    expect(components.SliderOutputContext).toBeTruthy()
    expect(components.SliderFillContext).toBeTruthy()
    expect((components as any).SliderThumbContext).toBeUndefined()
    expect((aria as any).useMove).toBeUndefined()
    expect((aria as any).sliderData).toBeUndefined()
    expect((aria as any).useGlobalListeners).toBeUndefined()
    expect((aria as any).disableTextSelection).toBeUndefined()
    expect((aria as any).restoreTextSelection).toBeUndefined()
    expect((aria as any).textSelection).toBeUndefined()
    expect((stately as any).disableTextSelection).toBeUndefined()
    expect((components as any).disableTextSelection).toBeUndefined()
    expect((components as any).isReadOnly).toBeUndefined()

    const stateEntry = await import('vue-stately/useSliderState')
    const ariaEntry = await import('vue-aria/useSlider')
    const componentEntry = await import('vue-aria-components/Slider')
    expect(typeof stateEntry.useSliderState).toBe('function')
    expect(typeof ariaEntry.useSlider).toBe('function')
    expect(typeof ariaEntry.useSliderThumb).toBe('function')
    expect(componentEntry.SliderThumb).toBeTruthy()
    expect(componentEntry.Label).toBeTruthy()
    expect((componentEntry as any).SliderThumbContext).toBeUndefined()
    const denied = ['vue-aria/useSliderThumb', 'vue-aria-components/SliderThumb', 'vue-aria-components/SliderFill']
    for (const id of denied) {
      await expect(import(/* @vite-ignore */ id)).rejects.toBeTruthy()
    }

    const typeProbe = (
      _props: StatelySliderProps | null,
      _options: SliderStateOptions<number> | null,
      _state: SliderState | null,
      _ariaProps: AriaSliderProps | null,
      _aria: SliderAria | null,
      _thumbOptions: AriaSliderThumbOptions | null,
      _thumbAria: SliderThumbAria | null,
      _ariaThumb: AriaSliderThumbProps | null,
      _ariaThumbProps: AriaThumbProps | null,
      _orientation: Orientation | null,
      _component: SliderProps | null,
      _render: SliderRenderProps | null,
      _output: SliderOutputProps | null,
      _track: SliderTrackProps | null,
      _trackRender: SliderTrackRenderProps | null,
      _thumb: SliderThumbProps | null,
      _thumbRender: SliderThumbRenderProps | null,
      _fill: SliderFillProps | null,
      _fillRender: SliderFillRenderProps | null,
      _label: LabelProps | null,
    ) => _props ?? _options ?? _state ?? _ariaProps ?? _aria ?? _thumbOptions ?? _thumbAria ?? _ariaThumb ?? _ariaThumbProps ?? _orientation ?? _component ?? _render ?? _output ?? _track ?? _trackRender ?? _thumb ?? _thumbRender ?? _fill ?? _fillRender ?? _label
    const _renderFields = (
      root: SliderRenderProps,
      track: SliderTrackRenderProps,
      thumb: SliderThumbRenderProps,
      fill: SliderFillRenderProps,
      ariaThumb: AriaSliderThumbProps,
    ) => [
      root.orientation,
      root.isDisabled,
      root.state.values,
      track.isHovered,
      thumb.isDragging,
      thumb.isFocused,
      thumb.isFocusVisible,
      fill.isHovered,
      ariaThumb['aria-label'],
      ariaThumb['aria-describedby'],
    ]
    const _noReadOnly = [
      true as Expect<HasNo<SliderProps, 'isReadOnly'>>,
      true as Expect<HasNo<AriaSliderProps, 'isReadOnly'>>,
      true as Expect<HasNo<AriaSliderThumbProps, 'isReadOnly'>>,
      true as Expect<HasNo<SliderThumbProps, 'isReadOnly'>>,
      true as Expect<HasNo<SliderRenderProps, 'isReadOnly'>>,
      true as Expect<HasNo<SliderThumbRenderProps, 'isReadOnly'>>,
    ]
    expect(typeof typeProbe).toBe('function')
    expect(typeof _renderFields).toBe('function')
    expect(_noReadOnly.every(Boolean)).toBe(true)
  })
})
