import {defineComponent, isRef} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchPointer} from '../../../../../test/dom-events'
import {useHover} from 'vue-aria/useHover'

function mountInDoc(...args: Parameters<typeof mount>) {
  const [component, options] = args
  return mount(component, {...options, attachTo: document.body})
}

describe('useHover', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('returns a plain hoverProps object whose handlers are direct properties', () => {
    let hoverProps: ReturnType<typeof useHover>['hoverProps'] | undefined
    const Probe = defineComponent({
      setup() {
        const result = useHover()
        hoverProps = result.hoverProps
        return result
      },
      template: '<div v-bind="hoverProps">probe</div>',
    })
    mountInDoc(Probe)
    expect(hoverProps).toBeDefined()
    expect(isRef(hoverProps)).toBe(false)
    expect(typeof hoverProps).toBe('object')
    expect(typeof hoverProps!.onPointerenter).toBe('function')
    expect(typeof hoverProps!.onPointerleave).toBe('function')
  })

  it('sets isHovered on pointer enter and clears it on leave', async () => {
    const Hoverable = defineComponent({
      setup() {
        const {isHovered, hoverProps} = useHover()
        return {isHovered, hoverProps}
      },
      template: '<div v-bind="hoverProps">{{ isHovered ? "hovered" : "idle" }}</div>',
    })
    const wrapper = mountInDoc(Hoverable)
    dispatchPointer(wrapper.element, 'pointerenter', {pointerType: 'mouse'})
    await flushPromises()
    expect(wrapper.text()).toBe('hovered')

    dispatchPointer(wrapper.element, 'pointerleave', {pointerType: 'mouse'})
    await flushPromises()
    expect(wrapper.text()).toBe('idle')
  })

  it('does not hover when disabled or when the pointer is touch', async () => {
    const Hoverable = defineComponent({
      props: {isDisabled: {type: Boolean, default: false}},
      setup(props) {
        const {isHovered, hoverProps} = useHover({isDisabled: () => props.isDisabled})
        return {isHovered, hoverProps}
      },
      template: '<div v-bind="hoverProps">{{ isHovered ? "hovered" : "idle" }}</div>',
    })

    const disabled = mountInDoc(Hoverable, {props: {isDisabled: true}})
    dispatchPointer(disabled.element, 'pointerenter', {pointerType: 'mouse'})
    await flushPromises()
    expect(disabled.text()).toBe('idle')

    const touch = mountInDoc(Hoverable)
    dispatchPointer(touch.element, 'pointerenter', {pointerType: 'touch'})
    await flushPromises()
    expect(touch.text()).toBe('idle')
  })
})
