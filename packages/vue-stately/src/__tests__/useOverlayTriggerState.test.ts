import {defineComponent, isRef, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {useOverlayTriggerState} from 'vue-stately/useOverlayTriggerState'

function mountState(options?: Parameters<typeof useOverlayTriggerState>[0]) {
  let state: ReturnType<typeof useOverlayTriggerState> | undefined
  const Probe = defineComponent({
    setup() {
      state = useOverlayTriggerState(options)
      return () => null
    },
  })
  const wrapper = mount(Probe)
  return {state: state!, wrapper}
}

describe('useOverlayTriggerState', () => {
  it('is closed by default and isOpen is a ref/computed', () => {
    const {state, wrapper} = mountState()
    expect(isRef(state.isOpen)).toBe(true)
    expect(state.isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('supports uncontrolled defaultOpen, open, close, and toggle', () => {
    const onOpenChange = vi.fn()
    const {state, wrapper} = mountState({defaultOpen: true, onOpenChange})
    expect(state.isOpen.value).toBe(true)

    state.close()
    expect(state.isOpen.value).toBe(false)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    state.open()
    expect(state.isOpen.value).toBe(true)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)

    state.toggle()
    expect(state.isOpen.value).toBe(false)

    state.setOpen(true)
    expect(state.isOpen.value).toBe(true)
    wrapper.unmount()
  })

  it('supports a controlled isOpen ref', async () => {
    const isOpen = ref(false)
    const onOpenChange = vi.fn((next: boolean) => {
      isOpen.value = next
    })
    const {state, wrapper} = mountState({isOpen, onOpenChange})
    expect(state.isOpen.value).toBe(false)

    state.open()
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(isOpen.value).toBe(true)
    expect(state.isOpen.value).toBe(true)

    isOpen.value = false
    await wrapper.vm.$nextTick()
    expect(state.isOpen.value).toBe(false)
    wrapper.unmount()
  })
})
