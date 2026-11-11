import {defineComponent} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {useFocusVisible} from '../use-focus-visible'

function mountInDoc(...args: Parameters<typeof mount>) {
  const [component, options] = args
  return mount(component, {...options, attachTo: document.body})
}

const Focusable = defineComponent({
  setup() {
    const {isFocused, isFocusVisible, focusProps} = useFocusVisible()
    return {isFocused, isFocusVisible, focusProps}
  },
  template:
    '<button type="button" v-bind="focusProps">{{ isFocused }}|{{ isFocusVisible }}</button>',
})

describe('useFocusVisible', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('returns the stable { isFocused, isFocusVisible, focusProps: { onFocus, onBlur } } signature', () => {
    const wrapper = mountInDoc(Focusable)
    expect(wrapper.text()).toBe('false|false')
  })

  it('marks keyboard focus as focus-visible', async () => {
    const wrapper = mountInDoc(Focusable)
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}))
    wrapper.element.dispatchEvent(new FocusEvent('focus', {bubbles: true}))
    await flushPromises()
    expect(wrapper.text()).toBe('true|true')

    wrapper.element.dispatchEvent(new FocusEvent('blur', {bubbles: true}))
    await flushPromises()
    expect(wrapper.text()).toBe('false|false')
  })

  it('does not mark pointer-initiated focus as focus-visible', async () => {
    const wrapper = mountInDoc(Focusable)
    document.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerType: 'mouse'}))
    wrapper.element.dispatchEvent(new FocusEvent('focus', {bubbles: true}))
    await flushPromises()
    expect(wrapper.text()).toBe('true|false')
  })
})
