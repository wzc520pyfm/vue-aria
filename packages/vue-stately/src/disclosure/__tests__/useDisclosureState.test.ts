import {defineComponent, h, isRef, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {useDisclosureGroupState} from '../useDisclosureGroupState'
import {useDisclosureState} from '../useDisclosureState'
import type {Key} from '../../collections/types'

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
}

function mountDisclosure(props: Record<string, any> = {}) {
  let state: ReturnType<typeof useDisclosureState> | undefined
  const changes: boolean[] = []
  const Probe = defineComponent({
    setup() {
      state = useDisclosureState({
        ...props,
        onExpandedChange(value) {
          changes.push(value)
          props.onExpandedChange?.(value)
        },
      })
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  return {wrapper, state: state!, changes}
}

function mountGroup(props: Record<string, any> = {}) {
  let state: ReturnType<typeof useDisclosureGroupState> | undefined
  const changes: Array<Set<Key>> = []
  const Probe = defineComponent({
    setup() {
      state = useDisclosureGroupState({
        ...props,
        onExpandedChange(keys) {
          changes.push(keys)
          props.onExpandedChange?.(keys)
        },
      })
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  return {wrapper, state: state!, changes}
}

describe('useDisclosureState', () => {
  it('is uncontrolled by default and does not notify when the value is repeated', () => {
    const {wrapper, state, changes} = mountDisclosure()
    expect(isRef(state)).toBe(false)
    expect(state.isExpanded).toBe(false)
    expect(typeof Object.getOwnPropertyDescriptor(state, 'isExpanded')?.get).toBe('function')

    state.setExpanded(false)
    expect(changes).toEqual([])
    state.expand()
    expect(state.isExpanded).toBe(true)
    expect(changes).toEqual([true])
    state.expand()
    expect(changes).toEqual([true])
    state.collapse()
    expect(state.isExpanded).toBe(false)
    expect(changes).toEqual([true, false])
    state.toggle()
    expect(state.isExpanded).toBe(true)
    expect(changes).toEqual([true, false, true])
    wrapper.unmount()
  })

  it('honors defaultExpanded and a controlled isExpanded without double notification', async () => {
    const uncontrolled = mountDisclosure({defaultExpanded: true})
    expect(uncontrolled.state.isExpanded).toBe(true)
    uncontrolled.wrapper.unmount()

    const expanded = ref(true)
    const {wrapper, state, changes} = mountDisclosure({isExpanded: () => expanded.value})
    expect(state.isExpanded).toBe(true)
    state.toggle()
    expect(changes).toEqual([false])
    expect(state.isExpanded).toBe(true)
    state.setExpanded(true)
    expect(changes).toEqual([false])
    expanded.value = false
    await tick()
    expect(state.isExpanded).toBe(false)
    state.expand()
    expect(changes).toEqual([false, true])
    expect(state.isExpanded).toBe(false)
    wrapper.unmount()
  })
})

describe('useDisclosureGroupState', () => {
  it('exposes live getters and lets a single-expand group collapse fully', () => {
    const disabled = ref(false)
    const allows = ref(false)
    const {wrapper, state, changes} = mountGroup({
      allowsMultipleExpanded: () => allows.value,
      isDisabled: () => disabled.value,
    })
    expect(isRef(state)).toBe(false)
    expect(isRef(state.expandedKeys)).toBe(false)
    expect(typeof Object.getOwnPropertyDescriptor(state, 'expandedKeys')?.get).toBe('function')
    expect(typeof Object.getOwnPropertyDescriptor(state, 'allowsMultipleExpanded')?.get).toBe('function')
    expect(typeof Object.getOwnPropertyDescriptor(state, 'isDisabled')?.get).toBe('function')
    expect(state.allowsMultipleExpanded).toBe(false)
    expect(state.isDisabled).toBe(false)
    expect(state.expandedKeys.size).toBe(0)

    state.toggleKey('a')
    expect(state.expandedKeys.has('a')).toBe(true)
    state.toggleKey('b')
    expect([...state.expandedKeys]).toEqual(['b'])
    state.toggleKey('b')
    expect(state.expandedKeys.size).toBe(0)
    expect(changes).toHaveLength(3)

    const current = state.expandedKeys
    state.setExpandedKeys(current)
    expect(changes).toHaveLength(3)

    disabled.value = true
    allows.value = true
    expect(state.isDisabled).toBe(true)
    expect(state.allowsMultipleExpanded).toBe(true)
    state.toggleKey('a')
    state.toggleKey('b')
    expect(state.expandedKeys.has('a')).toBe(true)
    expect(state.expandedKeys.has('b')).toBe(true)
    wrapper.unmount()
  })

  it('accepts controlled Iterable and Set values, numeric keys, and keeps the first key when multiple expansion turns off', async () => {
    const keys = ref<Iterable<Key> | undefined>(new Set<Key>([1, 2]))
    const allows = ref(true)
    const {wrapper, state, changes} = mountGroup({
      allowsMultipleExpanded: () => allows.value,
      expandedKeys: () => keys.value,
      onExpandedChange(next: Set<Key>) {
        keys.value = next
      },
    })
    expect(state.expandedKeys.has(1)).toBe(true)
    expect(state.expandedKeys.has(2)).toBe(true)
    expect(state.expandedKeys.has('1')).toBe(false)

    state.toggleKey(3)
    expect(changes).toHaveLength(1)
    expect(changes[0].has(1)).toBe(true)
    expect(changes[0].has(3)).toBe(true)
    await tick()
    expect(state.expandedKeys.has(3)).toBe(true)
    expect(state.expandedKeys.has('3')).toBe(false)

    keys.value = [2, 1]
    await tick()
    allows.value = false
    await tick()
    expect([...state.expandedKeys]).toEqual([2])
    expect(changes.at(-1) && [...changes.at(-1)!]).toEqual([2])
    wrapper.unmount()

    const arrayControlled = mountGroup({expandedKeys: () => ['x'] as Iterable<Key>})
    expect(arrayControlled.state.expandedKeys.has('x')).toBe(true)
    arrayControlled.wrapper.unmount()
  })

  it('collapses an uncontrolled multi-key default down to the first key', async () => {
    const {wrapper, state, changes} = mountGroup({
      defaultExpandedKeys: ['b', 'a'],
    })
    await tick()
    expect([...state.expandedKeys]).toEqual(['b'])
    expect(changes.some((keys) => keys.size === 1 && keys.has('b'))).toBe(true)
    wrapper.unmount()
  })

  it('does not let isDisabled block direct setExpandedKeys', () => {
    const {wrapper, state} = mountGroup({isDisabled: true})
    state.setExpandedKeys(new Set(['a']))
    expect(state.expandedKeys.has('a')).toBe(true)
    state.toggleKey('b')
    expect([...state.expandedKeys]).toEqual(['b'])
    wrapper.unmount()
  })
})
