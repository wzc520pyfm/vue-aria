import {defineComponent, isRef} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey} from '../../../../../test/dom-events'
import {useFocusVisible} from 'vue-aria/useFocusVisible'

function mountInDoc(...args: Parameters<typeof mount>) {
  const [component, options] = args
  return mount(component, {...options, attachTo: document.body})
}

describe('useFocusVisible', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('returns a plain focusProps object whose handlers are direct properties', () => {
    let focusProps: ReturnType<typeof useFocusVisible>['focusProps'] | undefined
    const Probe = defineComponent({
      setup() {
        const result = useFocusVisible()
        focusProps = result.focusProps
        return result
      },
      template: '<button type="button" v-bind="focusProps">probe</button>',
    })
    mountInDoc(Probe)
    expect(focusProps).toBeDefined()
    expect(isRef(focusProps)).toBe(false)
    expect(typeof focusProps).toBe('object')
    expect(typeof focusProps!.onFocus).toBe('function')
    expect(typeof focusProps!.onBlur).toBe('function')
  })

  it('sets isFocused and isFocusVisible on keyboard focus', async () => {
    const Focusable = defineComponent({
      setup() {
        const {isFocused, isFocusVisible, focusProps} = useFocusVisible()
        return {isFocused, isFocusVisible, focusProps}
      },
      template:
        '<button type="button" v-bind="focusProps">{{ isFocused }}:{{ isFocusVisible }}</button>',
    })
    const wrapper = mountInDoc(Focusable)
    dispatchKey(document, 'keydown', {key: 'Tab', code: 'Tab'})
    wrapper.element.dispatchEvent(new FocusEvent('focus', {bubbles: true}))
    await flushPromises()
    expect(wrapper.text()).toBe('true:true')

    wrapper.element.dispatchEvent(new FocusEvent('blur', {bubbles: true}))
    await flushPromises()
    expect(wrapper.text()).toBe('false:false')
  })
})
