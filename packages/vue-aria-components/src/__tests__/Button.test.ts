import {defineComponent} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {Button} from 'vue-aria-components/Button'

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
