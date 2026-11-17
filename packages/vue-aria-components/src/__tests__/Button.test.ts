import {defineComponent, h} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {Button} from 'vue-aria-components/Button'
import type {ButtonProps} from 'vue-aria-components/Button'

type Assert<T extends true> = T
type _LowercasePressListeners = [
  Assert<'onPressstart' extends keyof ButtonProps ? true : false>,
  Assert<'onPressend' extends keyof ButtonProps ? true : false>,
  Assert<'onPressup' extends keyof ButtonProps ? true : false>,
  Assert<'onPresschange' extends keyof ButtonProps ? true : false>,
  Assert<'onPressStart' extends keyof ButtonProps ? false : true>,
  Assert<'onPressEnd' extends keyof ButtonProps ? false : true>,
  Assert<'onPressUp' extends keyof ButtonProps ? false : true>,
  Assert<'onPressChange' extends keyof ButtonProps ? false : true>,
]

function mountInDoc(...args: Parameters<typeof mount>) {
  const [component, options] = args
  return mount(component, {...options, attachTo: document.body})
}

describe('Button', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('renders an unstyled button with default data-slot="button"', () => {
    const wrapper = mountInDoc(Button, {slots: {default: 'Press me'}})
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.attributes('data-slot')).toBe('button')
    expect(wrapper.text()).toBe('Press me')
    expect(wrapper.attributes('data-pressed')).toBeUndefined()
    expect(wrapper.attributes('data-hovered')).toBeUndefined()
    expect(wrapper.attributes('data-hover')).toBeUndefined()
    expect(wrapper.attributes('data-disabled')).toBeUndefined()
    expect(wrapper.attributes('data-pending')).toBeUndefined()
  })

  it('emits data-pressed during a pointer press and fires the press event', async () => {
    const wrapper = mountInDoc(Button, {slots: {default: 'Press me'}})
    dispatchPointer(wrapper.element, 'pointerdown')
    await flushPromises()
    expect(wrapper.attributes('data-pressed')).toBe('true')

    dispatchPointer(wrapper.element, 'pointerup')
    await flushPromises()

    expect(wrapper.attributes('data-pressed')).toBeUndefined()
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  it('completes a keyboard press with Space', async () => {
    const wrapper = mountInDoc(Button, {slots: {default: 'Press me'}})
    dispatchKey(wrapper.element, 'keydown', {key: ' ', code: 'Space'})
    await flushPromises()
    expect(wrapper.attributes('data-pressed')).toBe('true')

    dispatchKey(wrapper.element, 'keyup', {key: ' ', code: 'Space'})
    await flushPromises()

    expect(wrapper.attributes('data-pressed')).toBeUndefined()
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  it('sets aria-disabled="true" when pending and does not set native disabled', () => {
    const wrapper = mountInDoc(Button, {props: {isPending: true}, slots: {default: 'Press me'}})
    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('disabled')).toBeUndefined()
    expect((wrapper.element as HTMLButtonElement).disabled).toBe(false)
    expect(wrapper.attributes('data-pending')).toBe('true')
  })

  it('delivers lowercase press listeners and ignores camelCase onPressStart', async () => {
    const heard: string[] = []
    const camel: string[] = []
    const onPressstart: ButtonProps['onPressstart'] = () => heard.push('pressstart')
    const onPressend: ButtonProps['onPressend'] = () => heard.push('pressend')
    const onPressup: ButtonProps['onPressup'] = () => heard.push('pressup')
    const onPresschange: ButtonProps['onPresschange'] = (pressed) => heard.push(pressed ? 'presschange:true' : 'presschange:false')
    const onPress: ButtonProps['onPress'] = () => heard.push('press')
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Button, {
          onPress,
          onPressstart,
          onPressend,
          onPressup,
          onPresschange,
          onPressStart: () => camel.push('pressstart'),
          onPressEnd: () => camel.push('pressend'),
          onPressUp: () => camel.push('pressup'),
          onPressChange: () => camel.push('presschange'),
        }, () => 'Press me')
      },
    }))
    dispatchPointer(wrapper.get('button').element, 'pointerdown')
    await flushPromises()
    dispatchPointer(wrapper.get('button').element, 'pointerup')
    await flushPromises()
    expect(heard).toEqual([
      'pressstart',
      'presschange:true',
      'pressup',
      'pressend',
      'presschange:false',
      'press',
    ])
    expect(camel).toEqual([])
    expect(wrapper.findComponent(Button).emitted('pressstart')).toHaveLength(1)
    expect(wrapper.findComponent(Button).emitted('pressend')).toHaveLength(1)
    expect(wrapper.findComponent(Button).emitted('pressup')).toHaveLength(1)
    expect(wrapper.findComponent(Button).emitted('presschange')).toHaveLength(2)
    expect(wrapper.findComponent(Button).emitted('press')).toHaveLength(1)
    wrapper.unmount()
  })

  it('accepts a custom data-slot and keeps it during press', async () => {
    const Wrapper = defineComponent({
      components: {AriaButton: Button},
      template: '<AriaButton data-slot="trigger">Press me</AriaButton>',
    })
    const wrapper = mountInDoc(Wrapper)
    const button = wrapper.find('button')
    expect(button.attributes('data-slot')).toBe('trigger')
    dispatchPointer(button.element, 'pointerdown')
    await flushPromises()
    expect(button.attributes('data-slot')).toBe('trigger')
    expect(button.attributes('data-pressed')).toBe('true')
  })
})
