import {defineComponent} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../../test/dom-events'
import {useButton} from '../use-button'
import type {PressEvent} from '@nev-ui/types-shared'

const HookButton = defineComponent({
  name: 'HookButton',
  props: {
    isDisabled: {type: Boolean, default: false},
    dataSlot: {type: String, default: undefined},
  },
  emits: ['press', 'pressstart', 'pressend', 'pressup', 'presschange', 'click'],
  setup(props, {emit}) {
    const {Component, getButtonProps} = useButton(
      {
        isDisabled: () => props.isDisabled,
        'data-slot': props.dataSlot,
        onPress: (e: PressEvent) => emit('press', e),
      },
      emit as never,
    )
    return {Component, getButtonProps}
  },
  template: '<component :is="Component" v-bind="getButtonProps()">Button</component>',
})

function mountInDoc(...args: Parameters<typeof mount>) {
  const [component, options] = args
  return mount(component, {...options, attachTo: document.body})
}

describe('useButton', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })
  it('emits Hero UI data-* attributes in the idle state (slot only)', () => {
    const wrapper = mountInDoc(HookButton)
    expect(wrapper.attributes('data-slot')).toBe('button')
    expect(wrapper.attributes('data-pressed')).toBeUndefined()
    expect(wrapper.attributes('data-hovered')).toBeUndefined()
    expect(wrapper.attributes('data-hover')).toBeUndefined()
    expect(wrapper.attributes('data-disabled')).toBeUndefined()
    expect(wrapper.attributes('data-focused')).toBeUndefined()
    expect(wrapper.attributes('data-focus-visible')).toBeUndefined()
    expect(wrapper.attributes('data-pending')).toBeUndefined()
    expect(wrapper.attributes('data-selected')).toBeUndefined()
    expect(wrapper.attributes('data-invalid')).toBeUndefined()
  })

  it('allows overriding data-slot', () => {
    const wrapper = mountInDoc(HookButton, {props: {dataSlot: 'trigger'}})
    expect(wrapper.attributes('data-slot')).toBe('trigger')
  })

  it('sets data-pressed="true" while pressed and clears it after click', async () => {
    const wrapper = mountInDoc(HookButton)
    dispatchPointer(wrapper.element, 'pointerdown')
    await flushPromises()
    expect(wrapper.attributes('data-pressed')).toBe('true')

    dispatchPointer(wrapper.element, 'pointerup')
    await flushPromises()

    expect(wrapper.attributes('data-pressed')).toBeUndefined()
    expect(wrapper.emitted('press')).toHaveLength(1)
  })

  it('sets data-disabled="true" when disabled and does not press', async () => {
    const wrapper = mountInDoc(HookButton, {props: {isDisabled: true}})
    expect(wrapper.attributes('data-disabled')).toBe('true')
    expect(wrapper.attributes('disabled')).toBeDefined()

    dispatchPointer(wrapper.element, 'pointerdown')
    await flushPromises()
    expect(wrapper.attributes('data-pressed')).toBeUndefined()
    expect(wrapper.emitted('press')).toBeUndefined()
  })

  it('sets data-hovered on pointer hover, without a legacy data-hover alias', async () => {
    const wrapper = mountInDoc(HookButton)
    dispatchPointer(wrapper.element, 'pointerenter', {pointerType: 'mouse'})
    await flushPromises()
    expect(wrapper.attributes('data-hovered')).toBe('true')
    expect(wrapper.attributes('data-hover')).toBeUndefined()

    dispatchPointer(wrapper.element, 'pointerleave', {pointerType: 'mouse'})
    await flushPromises()
    expect(wrapper.attributes('data-hovered')).toBeUndefined()
  })

  it('sets data-pending="true" when pending and does not press', async () => {
    const Pending = defineComponent({
      setup() {
        const {Component, getButtonProps} = useButton({isPending: true}, (() => undefined) as never)
        return {Component, getButtonProps}
      },
      template: '<component :is="Component" v-bind="getButtonProps()">Button</component>',
    })
    const wrapper = mountInDoc(Pending)
    expect(wrapper.attributes('data-pending')).toBe('true')
    expect(wrapper.attributes('disabled')).toBeUndefined()
    dispatchPointer(wrapper.element, 'pointerdown')
    await flushPromises()
    expect(wrapper.attributes('data-pressed')).toBeUndefined()
  })

  it('sets data-focused and data-focus-visible on keyboard focus', async () => {
    const wrapper = mountInDoc(HookButton)
    dispatchKey(document, 'keydown', {key: 'Tab', code: 'Tab'})
    wrapper.element.dispatchEvent(new FocusEvent('focus', {bubbles: true}))
    await flushPromises()
    expect(wrapper.attributes('data-focused')).toBe('true')
    expect(wrapper.attributes('data-focus-visible')).toBe('true')
  })
})
