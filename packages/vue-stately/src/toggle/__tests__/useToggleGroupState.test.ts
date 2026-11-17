/**
 * `useToggleGroupState` against `react-stately` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc.
 * Setters do not normalize, do not consult `isDisabled`, and do not mutate
 * the caller's Set. A controlled parent that ignores updates stays on the
 * public controlled base for the next operation.
 */

import {effectScope, ref} from 'vue'
import {describe, expect, it} from 'vitest'
import {useToggleGroupState} from '../useToggleGroupState'
import type {Key, ToggleGroupState} from '../useToggleGroupState'

function harness(props: Parameters<typeof useToggleGroupState>[0] = {}) {
  let state!: ToggleGroupState
  const scope = effectScope()
  scope.run(() => {
    state = useToggleGroupState(props)
  })
  return {
    get state() {
      return state
    },
    stop() {
      scope.stop()
    },
  }
}

describe('useToggleGroupState', () => {
  it('defaults to single selection and an empty set', () => {
    const {state, stop} = harness()
    expect(state.selectionMode).toBe('single')
    expect(state.isDisabled).toBe(false)
    expect(state.selectedKeys).toBeInstanceOf(Set)
    expect(state.selectedKeys.size).toBe(0)
    stop()
  })

  it('toggles a single key off when empty selection is allowed', () => {
    const seen: Set<Key>[] = []
    const {state, stop} = harness({onSelectionChange: (keys) => seen.push(keys)})
    const before = state.selectedKeys
    state.toggleKey('a')
    expect([...state.selectedKeys]).toEqual(['a'])
    expect(seen).toHaveLength(1)
    expect(seen[0]).not.toBe(before)
    expect(seen[0]).toBe(state.selectedKeys)
    expect([...seen[0]]).toEqual(['a'])
    state.toggleKey('a')
    expect(state.selectedKeys.size).toBe(0)
    expect([...seen[1]]).toEqual([])
    stop()
  })

  it('replaces the single selection and keeps string and numeric keys distinct', () => {
    const {state, stop} = harness({selectionMode: 'single'})
    state.toggleKey(1)
    state.toggleKey('1')
    expect([...state.selectedKeys]).toEqual(['1'])
    expect(state.selectedKeys.has(1)).toBe(false)
    state.toggleKey(1)
    expect([...state.selectedKeys]).toEqual([1])
    stop()
  })

  it('adds and removes multiple keys without mutating the previous set', () => {
    const seen: Set<Key>[] = []
    const {state, stop} = harness({
      selectionMode: 'multiple',
      defaultSelectedKeys: ['a'],
      onSelectionChange: (keys) => seen.push(keys),
    })
    const before = state.selectedKeys
    state.toggleKey('b')
    expect([...before]).toEqual(['a'])
    expect([...state.selectedKeys].sort()).toEqual(['a', 'b'])
    expect(seen[0]).not.toBe(before)
    state.toggleKey('a')
    expect([...state.selectedKeys]).toEqual(['b'])
    stop()
  })

  it('keeps the last key when multiple selection disallows empty', () => {
    const {state, stop} = harness({
      selectionMode: 'multiple',
      disallowEmptySelection: true,
      defaultSelectedKeys: ['a', 'b'],
    })
    state.toggleKey('a')
    expect([...state.selectedKeys]).toEqual(['b'])
    stop()
  })

  it('does not drop the only multiple key when empty selection is disallowed, but still emits the new set', () => {
    const seen: Set<Key>[] = []
    const {state, stop} = harness({
      selectionMode: () => 'multiple' as const,
      disallowEmptySelection: () => true,
      defaultSelectedKeys: ['only'],
      onSelectionChange: (keys) => seen.push(keys),
    })
    const before = state.selectedKeys
    state.toggleKey('only')
    expect([...state.selectedKeys]).toEqual(['only'])
    expect(seen).toHaveLength(1)
    expect([...seen[0]]).toEqual(['only'])
    expect(seen[0]).not.toBe(before)
    expect(seen[0]).toBe(state.selectedKeys)
    stop()
  })

  it('keeps a single key selected when empty selection is disallowed', () => {
    const {state, stop} = harness({
      disallowEmptySelection: true,
      defaultSelectedKeys: ['a'],
    })
    state.toggleKey('a')
    expect([...state.selectedKeys]).toEqual(['a'])
    state.toggleKey('b')
    expect([...state.selectedKeys]).toEqual(['b'])
    stop()
  })

  it('lets setSelectedKeys replace the selection even when empty selection is disallowed', () => {
    const input = new Set<Key>(['a'])
    const {state, stop} = harness({
      disallowEmptySelection: true,
      defaultSelectedKeys: ['a', 'b'],
    })
    state.setSelectedKeys(input)
    expect(state.selectedKeys).toBe(input)
    expect([...input]).toEqual(['a'])
    state.setSelectedKeys(new Set())
    expect(state.selectedKeys.size).toBe(0)
    stop()
  })

  it('does not mutate the controlled input set or the default input set', () => {
    const controlled = new Set<Key>(['a'])
    const defaults = new Set<Key>(['a'])
    const controlledState = harness({
      selectionMode: 'multiple',
      selectedKeys: () => controlled,
      onSelectionChange: () => {},
    })
    controlledState.state.toggleKey('b')
    expect([...controlled]).toEqual(['a'])
    controlledState.stop()

    const uncontrolled = harness({
      selectionMode: 'multiple',
      defaultSelectedKeys: defaults,
    })
    uncontrolled.state.toggleKey('b')
    expect([...defaults]).toEqual(['a'])
    uncontrolled.stop()
  })

  it('uses the public controlled base when the parent rejects repeated updates', () => {
    const selected = ref<Iterable<Key>>(new Set<Key>())
    const seen: string[][] = []
    let latest = new Set<Key>()
    const {state, stop} = harness({
      selectionMode: 'multiple',
      selectedKeys: () => selected.value,
      onSelectionChange: (keys) => {
        latest = keys
        seen.push([...keys].map(String).sort())
      },
    })
    state.toggleKey('a')
    state.toggleKey('b')
    expect(seen).toEqual([['a'], ['b']])
    expect([...state.selectedKeys]).toEqual([])

    selected.value = new Set(['a'])
    state.toggleKey('a')
    expect(seen.at(-1)).toEqual([])
    expect([...state.selectedKeys]).toEqual(['a'])
    state.toggleKey('b')
    selected.value = latest
    expect([...state.selectedKeys].sort()).toEqual(['a', 'b'])
    stop()
  })

  it('does not toggle a controlled key twice from one rejected base in single mode', () => {
    const selected = ref<Iterable<Key>>(new Set<Key>())
    const seen: string[][] = []
    const {state, stop} = harness({
      selectedKeys: () => selected.value,
      onSelectionChange: (keys) => seen.push([...keys].map(String)),
    })
    state.toggleKey('a')
    state.toggleKey('a')
    expect(seen).toEqual([['a'], ['a']])
    expect([...state.selectedKeys]).toEqual([])
    stop()
  })

  it('setSelected toggles only when the boolean differs and still ignores disabled', () => {
    const seen: string[][] = []
    const {state, stop} = harness({
      selectionMode: 'multiple',
      isDisabled: true,
      onSelectionChange: (keys) => seen.push([...keys].map(String).sort()),
    })
    expect(state.isDisabled).toBe(true)
    state.setSelected('a', false)
    expect(seen).toEqual([])
    expect(state.selectedKeys.size).toBe(0)
    state.setSelected('a', true)
    expect(seen).toEqual([['a']])
    state.setSelected('a', true)
    expect(seen).toEqual([['a']])
    state.toggleKey('b')
    expect([...state.selectedKeys].sort()).toEqual(['a', 'b'])
    state.setSelectedKeys(new Set(['z']))
    expect([...state.selectedKeys]).toEqual(['z'])
    stop()
  })

  it('reads live selection mode and disabled without rewriting keys', () => {
    const mode = ref<'single' | 'multiple'>('single')
    const disabled = ref(false)
    const {state, stop} = harness({
      selectionMode: () => mode.value,
      isDisabled: () => disabled.value,
      defaultSelectedKeys: ['a', 'b'],
    })
    expect([...state.selectedKeys].sort()).toEqual(['a', 'b'])
    mode.value = 'multiple'
    disabled.value = true
    expect(state.selectionMode).toBe('multiple')
    expect(state.isDisabled).toBe(true)
    expect([...state.selectedKeys].sort()).toEqual(['a', 'b'])
    state.toggleKey('a')
    expect([...state.selectedKeys]).toEqual(['b'])
    stop()
  })

  it('calls the current onSelectionChange after the handler is replaced', () => {
    const seen: string[] = []
    let current = (keys: Set<Key>) => seen.push('first:' + [...keys].join(','))
    const {state, stop} = harness({
      get onSelectionChange() {
        return current
      },
    })
    state.toggleKey('a')
    current = (keys) => seen.push('second:' + [...keys].join(','))
    state.toggleKey('b')
    expect(seen).toEqual(['first:a', 'second:b'])
    stop()
  })

  it('retries defaultSelectedKeys when the first read throws', () => {
    let fail = true
    const {state, stop} = harness({
      get defaultSelectedKeys() {
        if (fail) throw new Error('slot')
        return ['a']
      },
    })
    expect(() => state.selectedKeys).toThrow('slot')
    fail = false
    expect([...state.selectedKeys]).toEqual(['a'])
    stop()
  })

  it('keeps the cached controlled set when the parent mutates that same iterable', () => {
    const selected = new Set<Key>(['a'])
    const {state, stop} = harness({selectedKeys: () => selected})
    const base = state.selectedKeys
    selected.add('b')
    expect(state.selectedKeys).toBe(base)
    expect([...state.selectedKeys]).toEqual(['a'])
    expect([...selected].sort()).toEqual(['a', 'b'])
    stop()
  })

  it('does not call onSelectionChange when setSelectedKeys receives the same set', () => {
    const seen: number[] = []
    const {state, stop} = harness({onSelectionChange: () => seen.push(1)})
    state.toggleKey('a')
    const current = state.selectedKeys
    state.setSelectedKeys(current)
    expect(seen).toEqual([1])
    stop()
  })
})
