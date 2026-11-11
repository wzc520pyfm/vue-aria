import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {behaviorAdapter} from 'vue-aria/behaviorAdapter'
import {BehaviorElement} from 'vue-aria/BehaviorElement'
import {useInvalid} from 'vue-aria/useInvalid'
import {usePlacement} from 'vue-aria/usePlacement'
import {usePresenceState} from 'vue-aria/usePresenceState'
import {useSelectable} from 'vue-aria/useSelectable'

describe('behaviorAdapter', () => {
  it('identifies this implementation as vue-aria', () => {
    expect(behaviorAdapter.name).toBe('vue-aria')
  })
})

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

describe('future-facing helpers', () => {
  it('useSelectable emits data-selected only when selected', () => {
    const {selectedAttrs} = useSelectable({isSelected: true})
    expect(selectedAttrs.value).toEqual({'data-selected': 'true'})
    const off = useSelectable({isSelected: false})
    expect(off.selectedAttrs.value).toEqual({})
  })

  it('usePresenceState emits entering / exiting by phase', () => {
    const {presenceAttrs} = usePresenceState()
    expect(presenceAttrs('entering')).toEqual({'data-entering': 'true'})
    expect(presenceAttrs('exiting')).toEqual({'data-exiting': 'true'})
    expect(presenceAttrs('idle')).toEqual({})
  })

  it('useInvalid and usePlacement emit their attributes', () => {
    expect(useInvalid({isInvalid: true}).invalidAttrs.value).toEqual({
      'data-invalid': 'true',
    })
    expect(usePlacement({placement: 'top start'}).placementAttrs.value).toEqual({
      'data-placement': 'top start',
    })
    expect(usePlacement({placement: null}).placementAttrs.value).toEqual({})
  })
})
