import {defineComponent, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {I18nProvider, Label} from 'vue-aria-components'
import {
  Slider,
  SliderContext,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  type SliderRenderProps,
  type SliderThumbRenderProps,
} from '../Slider'
import * as stately from 'vue-stately'
import * as aria from 'vue-aria'
import * as components from 'vue-aria-components'
import type {AriaSliderProps, AriaSliderThumbOptions, Orientation, SliderAria, SliderThumbAria} from 'vue-aria'
import type {SliderProps as StatelySliderProps, SliderState, SliderStateOptions} from 'vue-stately'
import type {LabelProps, SliderFillProps, SliderOutputProps, SliderProps, SliderThumbProps, SliderTrackProps} from 'vue-aria-components'

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
      _orientation: Orientation | null,
      _component: SliderProps | null,
      _output: SliderOutputProps | null,
      _track: SliderTrackProps | null,
      _thumb: SliderThumbProps | null,
      _fill: SliderFillProps | null,
      _label: LabelProps | null,
    ) => _props ?? _options ?? _state ?? _ariaProps ?? _aria ?? _thumbOptions ?? _thumbAria ?? _orientation ?? _component ?? _output ?? _track ?? _thumb ?? _fill ?? _label
    expect(typeof typeProbe).toBe('function')
  })
})
