import {defineComponent, isRef} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchClick, dispatchKey, dispatchPointer} from '../../../../../test/dom-events'
import {usePress} from '../use-press'
import type {PressProps} from '../use-press'
import type {PressEvent} from '@nev-ui/types-shared'

const Pressable = defineComponent({
  name: 'Pressable',
  props: {
    isDisabled: {type: Boolean, default: false},
    isPending: {type: Boolean, default: false},
    shouldCancelOnPointerExit: {type: Boolean, default: false},
  },
  emits: ['press', 'pressstart', 'pressend', 'pressup', 'presschange', 'click'],
  setup(props, {emit, expose}) {
    const {isPressed, pressProps} = usePress({
      isDisabled: () => props.isDisabled,
      isPending: () => props.isPending,
      shouldCancelOnPointerExit: () => props.shouldCancelOnPointerExit,
      onPress: (e) => emit('press', e),
      onPressStart: (e) => emit('pressstart', e),
      onPressEnd: (e) => emit('pressend', e),
      onPressUp: (e) => emit('pressup', e),
      onPressChange: (value) => emit('presschange', value),
      onClick: (e) => emit('click', e),
    } satisfies PressProps)
    expose({isPressed})
    return {isPressed, pressProps}
  },
  template:
    '<button type="button" v-bind="pressProps">{{ isPressed ? "pressed" : "idle" }}</button>',
})

function typesOf(calls: unknown[][] | undefined) {
  return (calls ?? []).map(([event]) => (event as PressEvent).type)
}

function pointerTypesOf(calls: unknown[][] | undefined) {
  return (calls ?? []).map(([event]) => (event as PressEvent).pointerType)
}

function mountInDoc(...args: Parameters<typeof mount>) {
  const [component, options] = args
  return mount(component, {...options, attachTo: document.body})
}

describe('usePress', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  describe('pointer', () => {
    it('sets isPressed on pointerdown and fires onPress on pointerup', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchPointer(wrapper.element, 'pointerdown')
      await flushPromises()

      expect(wrapper.text()).toBe('pressed')
      expect(wrapper.emitted('pressstart')).toHaveLength(1)
      expect(wrapper.emitted('presschange')?.[0]).toEqual([true])
      expect(wrapper.emitted('press')).toBeUndefined()

      dispatchPointer(wrapper.element, 'pointerup')
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(typesOf(wrapper.emitted('pressstart'))).toEqual(['pressstart'])
      expect(typesOf(wrapper.emitted('pressup'))).toEqual(['pressup'])
      expect(typesOf(wrapper.emitted('pressend'))).toEqual(['pressend'])
      expect(typesOf(wrapper.emitted('press'))).toEqual(['press'])
      expect(pointerTypesOf(wrapper.emitted('press'))).toEqual(['mouse'])
      expect(wrapper.emitted('presschange')?.map(([value]) => value)).toEqual([true, false])
    })

    it('returns a plain pressProps object whose handlers are direct properties', () => {
      let pressProps: ReturnType<typeof usePress>['pressProps'] | undefined
      const Probe = defineComponent({
        setup() {
          const result = usePress()
          pressProps = result.pressProps
          return result
        },
        template: '<button type="button" v-bind="pressProps">idle</button>',
      })
      mountInDoc(Probe)

      expect(isRef(pressProps)).toBe(false)
      expect(pressProps).toBeTypeOf('object')
      expect(typeof pressProps?.onPointerdown).toBe('function')
      expect(Object.hasOwn(pressProps!, 'onPointerdown')).toBe(true)
      for (const key of [
        'onPointerdown',
        'onPointerup',
        'onPointercancel',
        'onLostpointercapture',
        'onKeydown',
        'onKeyup',
        'onBlur',
      ] as const) {
        expect(typeof pressProps?.[key]).toBe('function')
      }
    })

    it('exposes the stable pressProps event names from the behavior contract', () => {
      const wrapper = mountInDoc(Pressable)
      const el = wrapper.element
      // Bound Vue listeners correspond to the lowercase contract keys.
      for (const type of [
        'pointerdown',
        'pointerup',
        'pointercancel',
        'lostpointercapture',
        'keydown',
        'keyup',
        'blur',
      ]) {
        expect(typeof el).toBe('object')
        expect(() => el.dispatchEvent(new Event(type, {bubbles: type !== 'blur'}))).not.toThrow()
      }
    })

    it('ignores non-primary pointer buttons', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchPointer(wrapper.element, 'pointerdown', {button: 1})
      await flushPromises()
      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('pressstart')).toBeUndefined()
    })

    it('does not fire onPress when the pointer is released outside the target', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchPointer(wrapper.element, 'pointerdown')
      await flushPromises()
      expect(wrapper.text()).toBe('pressed')

      // Leave first so isOverTarget is false; captured pointerup then ends without onPress.
      dispatchPointer(wrapper.element, 'pointerleave')
      dispatchPointer(wrapper.element, 'pointerup')
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('press')).toBeUndefined()
      expect(typesOf(wrapper.emitted('pressend'))).toEqual(['pressend'])
    })

    it('clears the pressed state when the pointer leaves, and restarts if it re-enters', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchPointer(wrapper.element, 'pointerdown')
      dispatchPointer(wrapper.element, 'pointerleave')
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('press')).toBeUndefined()
      expect(typesOf(wrapper.emitted('pressend'))).toEqual(['pressend'])

      dispatchPointer(wrapper.element, 'pointerenter')
      await flushPromises()
      expect(wrapper.text()).toBe('pressed')
      expect(wrapper.emitted('pressstart')).toHaveLength(2)
    })

    it('cancels the press on pointercancel', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchPointer(wrapper.element, 'pointerdown')
      dispatchPointer(wrapper.element, 'pointercancel')
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('press')).toBeUndefined()
      expect(wrapper.emitted('pressend')).toHaveLength(1)
    })

    it('does not restart after leave when shouldCancelOnPointerExit is set', async () => {
      const wrapper = mountInDoc(Pressable, {props: {shouldCancelOnPointerExit: true}})
      dispatchPointer(wrapper.element, 'pointerdown')
      dispatchPointer(wrapper.element, 'pointerleave')
      dispatchPointer(wrapper.element, 'pointerenter')
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('pressstart')).toHaveLength(1)
    })
  })

  describe('keyboard', () => {
    it.each([
      {key: 'Enter', code: 'Enter'},
      {key: ' ', code: 'Space'},
    ])('fires a keyboard press for $code', async ({key, code}) => {
      const wrapper = mountInDoc(Pressable)
      dispatchKey(wrapper.element, 'keydown', {key, code})
      await flushPromises()
      expect(wrapper.text()).toBe('pressed')
      expect(pointerTypesOf(wrapper.emitted('pressstart'))).toEqual(['keyboard'])

      dispatchKey(wrapper.element, 'keyup', {key, code})
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(typesOf(wrapper.emitted('pressup'))).toEqual(['pressup'])
      expect(typesOf(wrapper.emitted('press'))).toEqual(['press'])
      expect(pointerTypesOf(wrapper.emitted('press'))).toEqual(['keyboard'])
    })

    it('ignores other keys', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchKey(wrapper.element, 'keydown', {key: 'Tab', code: 'Tab'})
      await flushPromises()
      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('pressstart')).toBeUndefined()
    })

    it('ignores repeating keydown events when already pressed', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchKey(wrapper.element, 'keydown', {key: ' ', code: 'Space'})
      dispatchKey(wrapper.element, 'keydown', {key: ' ', code: 'Space', repeat: true})
      await flushPromises()
      expect(wrapper.emitted('pressstart')).toHaveLength(1)
    })
  })

  describe('virtual click', () => {
    it('treats element.click() / screen-reader clicks as a virtual press', async () => {
      const wrapper = mountInDoc(Pressable)
      dispatchClick(wrapper.element, {detail: 0})
      await flushPromises()

      expect(typesOf(wrapper.emitted('pressstart'))).toEqual(['pressstart'])
      expect(typesOf(wrapper.emitted('pressup'))).toEqual(['pressup'])
      expect(typesOf(wrapper.emitted('pressend'))).toEqual(['pressend'])
      expect(typesOf(wrapper.emitted('press'))).toEqual(['press'])
      expect(pointerTypesOf(wrapper.emitted('press'))).toEqual(['virtual'])
    })
  })

  describe('disabled', () => {
    it('does not start a press when disabled', async () => {
      const wrapper = mountInDoc(Pressable, {props: {isDisabled: true}})
      dispatchPointer(wrapper.element, 'pointerdown')
      dispatchClick(wrapper.element, {detail: 0})
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('pressstart')).toBeUndefined()
      expect(wrapper.emitted('press')).toBeUndefined()
    })

    it('does not start a press when pending', async () => {
      const wrapper = mountInDoc(Pressable, {props: {isPending: true}})
      dispatchPointer(wrapper.element, 'pointerdown')
      dispatchKey(wrapper.element, 'keydown', {key: ' ', code: 'Space'})
      await flushPromises()

      expect(wrapper.text()).toBe('idle')
      expect(wrapper.emitted('pressstart')).toBeUndefined()
      expect(wrapper.emitted('press')).toBeUndefined()
    })
  })

  describe('continuePropagation', () => {
    it('stops pointerdown propagation by default and allows opt-out', async () => {
      const stop = vi.spyOn(Event.prototype, 'stopPropagation')
      const wrapper = mountInDoc(Pressable)
      dispatchPointer(wrapper.element, 'pointerdown')
      await flushPromises()
      expect(stop).toHaveBeenCalled()
      stop.mockReset()

      const OptOut = defineComponent({
        setup() {
          const {isPressed, pressProps} = usePress({
            onPressStart: (event) => event.continuePropagation(),
          })
          return {isPressed, pressProps}
        },
        template: '<button type="button" v-bind="pressProps">idle</button>',
      })
      const optOut = mountInDoc(OptOut)
      dispatchPointer(optOut.element, 'pointerdown')
      await flushPromises()
      expect(stop).not.toHaveBeenCalled()
      stop.mockRestore()
    })
  })

  it('supports a controlled isPressed prop', async () => {
    const Controlled = defineComponent({
      setup() {
        const {pressProps, isPressed} = usePress({isPressed: true})
        return {pressProps, isPressed}
      },
      template:
        '<button type="button" v-bind="pressProps">{{ isPressed ? "pressed" : "idle" }}</button>',
    })

    const wrapper = mountInDoc(Controlled)
    expect(wrapper.text()).toBe('pressed')
  })
})
