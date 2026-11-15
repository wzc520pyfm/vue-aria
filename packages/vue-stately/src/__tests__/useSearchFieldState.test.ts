import {defineComponent, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {useSearchFieldState} from 'vue-stately/useSearchFieldState'

function mountState(options?: Parameters<typeof useSearchFieldState>[0]) {
  let state: ReturnType<typeof useSearchFieldState> | undefined
  const Probe = defineComponent({
    setup() {
      state = useSearchFieldState(options as any)
      return () => null
    },
  })
  const wrapper = mount(Probe)
  return {state: state!, wrapper}
}

describe('useSearchFieldState', () => {
  it('should be controlled if props.value is defined', () => {
    const onChange = vi.fn()
    const newValue = 'newValue'
    const {state, wrapper} = mountState({value: 'blah', onChange})
    expect(state.value).toBe('blah')
    state.setValue(newValue)
    expect(state.value).toBe('blah')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(newValue)
    wrapper.unmount()
  })

  it('should start with value = props.defaultValue if props.value is not defined and props.defaultValue is defined', () => {
    const onChange = vi.fn()
    const {state, wrapper} = mountState({defaultValue: 'blah', onChange})
    expect(state.value).toBe('blah')
    state.setValue('newValue')
    expect(state.value).toBe('newValue')
    expect(onChange).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('should default to uncontrolled with value = "" if defaultValue and value aren\'t defined', () => {
    const onChange = vi.fn()
    const {state, wrapper} = mountState({onChange})
    expect(state.value).toBe('')
    state.setValue('newValue')
    expect(state.value).toBe('newValue')
    expect(onChange).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('should convert numeric values to strings (uncontrolled)', () => {
    const {state, wrapper} = mountState({defaultValue: 13 as any})
    expect(state.value).toBe('13')
    wrapper.unmount()
  })

  it('should convert an array of string values to a string (uncontrolled)', () => {
    const {state, wrapper} = mountState({defaultValue: ['hi', 'this', 'is', 'me'] as any})
    expect(state.value).toBe('hi,this,is,me')
    wrapper.unmount()
  })

  it('should convert numeric values to strings (controlled)', () => {
    const {state, wrapper} = mountState({value: 13 as any})
    expect(state.value).toBe('13')
    wrapper.unmount()
  })

  it('should convert an array of string values to a string (controlled)', () => {
    const {state, wrapper} = mountState({value: ['hi', 'this', 'is', 'me'] as any})
    expect(state.value).toBe('hi,this,is,me')
    wrapper.unmount()
  })

  it('should treat null values as undefined via toString', () => {
    const {state, wrapper} = mountState({value: null as any})
    expect(state.value).toBe('')
    wrapper.unmount()
  })

  it('controlled value updates are live, not snapshotted at setup', async () => {
    const value = ref<string | undefined>('a')
    const {state, wrapper} = mountState({value})
    expect(state.value).toBe('a')
    value.value = 'b'
    await wrapper.vm.$nextTick()
    expect(state.value).toBe('b')
    wrapper.unmount()
  })
})
