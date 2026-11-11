import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {BehaviorElement} from '../behavior-element'

describe('BehaviorElement', () => {
  it('renders a div by default and does not leak Reka asChild / data-state', () => {
    const wrapper = mount(BehaviorElement, {slots: {default: 'host'}})
    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.attributes('data-state')).toBeUndefined()
    expect(wrapper.text()).toBe('host')
  })

  it('defaults type to button when as is button', () => {
    const wrapper = mount(BehaviorElement, {props: {as: 'button'}, slots: {default: 'Go'}})
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('allows overriding type on a button host', () => {
    const wrapper = mount(BehaviorElement, {
      props: {as: 'button', type: 'submit'},
      slots: {default: 'Save'},
    })
    expect(wrapper.attributes('type')).toBe('submit')
  })
})
