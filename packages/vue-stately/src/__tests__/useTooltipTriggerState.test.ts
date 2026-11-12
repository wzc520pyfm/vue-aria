import {defineComponent, isRef, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useTooltipTriggerState, TOOLTIP_DELAY, TOOLTIP_COOLDOWN} from 'vue-stately/useTooltipTriggerState'
import {__resetTooltipTriggerGlobalState} from '../tooltip/useTooltipTriggerState'

function mountState(options?: Parameters<typeof useTooltipTriggerState>[0]) {
  let state: ReturnType<typeof useTooltipTriggerState> | undefined
  const Probe = defineComponent({
    setup() {
      state = useTooltipTriggerState(options)
      return () => null
    },
  })
  const wrapper = mount(Probe)
  return {state: state!, wrapper}
}

describe('useTooltipTriggerState', () => {
  beforeEach(() => {
    __resetTooltipTriggerGlobalState()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    __resetTooltipTriggerGlobalState()
  })

  it('exposes official default delays and a ref/computed isOpen', () => {
    expect(TOOLTIP_DELAY).toBe(1500)
    expect(TOOLTIP_COOLDOWN).toBe(500)
    const {state, wrapper} = mountState()
    expect(isRef(state.isOpen)).toBe(true)
    expect(state.isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('opens after the default 1500ms delay and closes after the default 500ms closeDelay', () => {
    const {state, wrapper} = mountState()
    state.open()
    expect(state.isOpen.value).toBe(false)
    vi.advanceTimersByTime(1499)
    expect(state.isOpen.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(state.isOpen.value).toBe(true)

    state.close()
    expect(state.isOpen.value).toBe(true)
    vi.advanceTimersByTime(499)
    expect(state.isOpen.value).toBe(true)
    vi.advanceTimersByTime(1)
    expect(state.isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('opens immediately when open(true) is called', () => {
    const {state, wrapper} = mountState()
    state.open(true)
    expect(state.isOpen.value).toBe(true)
    wrapper.unmount()
  })

  it('honors custom delay and closeDelay', () => {
    const {state, wrapper} = mountState({delay: 200, closeDelay: 80})
    state.open()
    vi.advanceTimersByTime(199)
    expect(state.isOpen.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(state.isOpen.value).toBe(true)
    state.close()
    vi.advanceTimersByTime(79)
    expect(state.isOpen.value).toBe(true)
    vi.advanceTimersByTime(1)
    expect(state.isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('supports controlled isOpen', () => {
    const isOpen = ref(false)
    const {state, wrapper} = mountState({
      isOpen,
      onOpenChange: (next) => {
        isOpen.value = next
      },
    })
    state.open(true)
    expect(isOpen.value).toBe(true)
    expect(state.isOpen.value).toBe(true)
    state.close(true)
    expect(isOpen.value).toBe(false)
    wrapper.unmount()
  })
})
