import {defineComponent, h, isRef, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useDisclosure} from '../useDisclosure'
import {useDisclosureState} from 'vue-stately/useDisclosureState'
import type {PressEvent} from '../../interactions/press'

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function press(pointerType: PressEvent['pointerType']): PressEvent {
  return {pointerType} as PressEvent
}

function mountDisclosure(options: {isDisabled?: () => boolean; isExpanded?: boolean; defaultExpanded?: boolean} = {}) {
  const panelRef = ref<HTMLElement | null>(null)
  let state: ReturnType<typeof useDisclosureState> | undefined
  let aria: ReturnType<typeof useDisclosure> | undefined
  const changes: boolean[] = []
  const Probe = defineComponent({
    setup() {
      state = useDisclosureState({
        isExpanded: options.isExpanded,
        defaultExpanded: options.defaultExpanded,
        onExpandedChange(value) {
          changes.push(value)
        },
      })
      aria = useDisclosure({isDisabled: options.isDisabled}, state, panelRef)
      return () => h('div', {ref: (el: any) => (panelRef.value = el)})
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, state: state!, aria: aria!, panelRef, changes}
}

describe('useDisclosure', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.unstubAllGlobals()
    delete (HTMLElement.prototype as any).getAnimations
  })

  it('returns plain live buttonProps and panelProps, not ComputedRefs or descriptor snapshots', async () => {
    const disabled = ref(false)
    const {wrapper, state, aria} = mountDisclosure({isDisabled: () => disabled.value})
    await tick()
    expect(isRef(aria.buttonProps)).toBe(false)
    expect(isRef(aria.panelProps)).toBe(false)
    const expandedDesc = Object.getOwnPropertyDescriptor(aria.buttonProps, 'aria-expanded')
    expect(typeof expandedDesc?.get).toBe('function')
    expect(expandedDesc && 'value' in expandedDesc).toBe(false)
    expect(aria.buttonProps['aria-expanded']).toBe(false)
    expect(typeof aria.buttonProps['aria-expanded']).toBe('boolean')
    expect(aria.buttonProps['aria-expanded']).not.toHaveProperty('get')

    const spread = {...aria.buttonProps}
    state.expand()
    await tick()
    expect(aria.buttonProps['aria-expanded']).toBe(true)
    expect(aria.panelProps['aria-hidden']).toBe(false)
    expect(spread['aria-expanded']).toBe(false)

    expect(aria.buttonProps.id).toBeTruthy()
    expect(aria.buttonProps['aria-controls']).toBe(aria.panelProps.id)
    expect(aria.panelProps['aria-labelledby']).toBe(aria.buttonProps.id)
    expect(aria.panelProps.role).toBe('group')
    const id = aria.buttonProps.id
    const panelId = aria.panelProps.id
    state.collapse()
    await tick()
    expect(aria.buttonProps.id).toBe(id)
    expect(aria.panelProps.id).toBe(panelId)

    disabled.value = true
    expect(aria.buttonProps.isDisabled).toBe(true)
    wrapper.unmount()
  })

  it('toggles on pointer, touch, and virtual press, and on keyboard press start only', async () => {
    const {wrapper, state, aria, changes} = mountDisclosure()
    await tick()

    aria.buttonProps.onPressStart?.(press('mouse'))
    expect(state.isExpanded).toBe(false)
    aria.buttonProps.onPress?.(press('mouse'))
    expect(state.isExpanded).toBe(true)
    aria.buttonProps.onPress?.(press('mouse'))
    expect(state.isExpanded).toBe(false)

    aria.buttonProps.onPressStart?.(press('touch'))
    expect(state.isExpanded).toBe(false)
    aria.buttonProps.onPress?.(press('touch'))
    expect(state.isExpanded).toBe(true)

    aria.buttonProps.onPress?.(press('virtual'))
    expect(state.isExpanded).toBe(false)

    aria.buttonProps.onPressStart?.(press('keyboard'))
    expect(state.isExpanded).toBe(true)
    aria.buttonProps.onPress?.(press('keyboard'))
    expect(state.isExpanded).toBe(true)
    aria.buttonProps.onPressStart?.(press('keyboard'))
    expect(changes.filter(Boolean)).toContain(true)
    expect(state.isExpanded).toBe(false)
    wrapper.unmount()
  })

  it('lets disabled block user input without blocking direct state changes', async () => {
    const {wrapper, state, aria} = mountDisclosure({isDisabled: () => true, defaultExpanded: true})
    await tick()
    aria.buttonProps.onPress?.(press('mouse'))
    aria.buttonProps.onPressStart?.(press('keyboard'))
    expect(state.isExpanded).toBe(true)
    state.collapse()
    await tick()
    expect(state.isExpanded).toBe(false)
    expect(aria.buttonProps['aria-expanded']).toBe(false)
    wrapper.unmount()
  })

  it('uses hidden=until-found rather than display:none, including the SSR boolean', async () => {
    const {wrapper, state, aria, panelRef} = mountDisclosure()
    await tick()
    const panel = panelRef.value!
    expect(panel.getAttribute('hidden')).toBe('until-found')
    expect(panel.style.display).not.toBe('none')
    expect(panel.style.getPropertyValue('--disclosure-panel-width')).toBe('0px')
    expect(panel.style.getPropertyValue('--disclosure-panel-height')).toBe('0px')
    expect(aria.panelProps.hidden).toBeUndefined()

    const savedWindow = globalThis.window
    vi.stubGlobal('window', undefined)
    try {
      expect(aria.panelProps.hidden).toBe(true)
      state.expand()
      expect(aria.panelProps.hidden).toBe(false)
    } finally {
      vi.stubGlobal('window', savedWindow)
    }
    wrapper.unmount()
  })

  it('measures expansion then switches to auto when WAAPI exists, and hides only after collapse', async () => {
    let release: Array<() => void> = []
    ;(HTMLElement.prototype as any).getAnimations = function getAnimations() {
      return [
        {
          finished: new Promise<void>((resolve) => {
            release.push(resolve)
          }),
        },
      ]
    }
    const {wrapper, state, panelRef} = mountDisclosure({defaultExpanded: false})
    await tick()
    const panel = panelRef.value!
    Object.defineProperty(panel, 'scrollWidth', {configurable: true, get: () => 120})
    Object.defineProperty(panel, 'scrollHeight', {configurable: true, get: () => 40})
    const writes: string[] = []
    const orig = panel.style.setProperty.bind(panel.style)
    panel.style.setProperty = ((name: string, value: string) => {
      writes.push(`${name}:${value}`)
      return orig(name, value)
    }) as CSSStyleDeclaration['setProperty']

    state.expand()
    await tick()
    expect(panel.hasAttribute('hidden')).toBe(false)
    expect(panel.style.getPropertyValue('--disclosure-panel-width')).toBe('120px')
    expect(panel.style.getPropertyValue('--disclosure-panel-height')).toBe('40px')
    release.forEach((fn) => fn())
    release = []
    await tick()
    expect(panel.style.getPropertyValue('--disclosure-panel-width')).toBe('auto')
    expect(panel.style.getPropertyValue('--disclosure-panel-height')).toBe('auto')

    writes.length = 0
    state.collapse()
    await tick()
    expect(writes).toContain('--disclosure-panel-width:120px')
    expect(writes).toContain('--disclosure-panel-width:0px')
    expect(writes).toContain('--disclosure-panel-height:40px')
    expect(writes).toContain('--disclosure-panel-height:0px')
    expect(panel.hasAttribute('hidden')).toBe(false)
    release.forEach((fn) => fn())
    await tick()
    expect(panel.getAttribute('hidden')).toBe('until-found')
    wrapper.unmount()
  })

  it('falls back without WAAPI and cancels the beforematch animation frame', async () => {
    const cancelled: number[] = []
    let queued: FrameRequestCallback | null = null
    const previousRaf = globalThis.requestAnimationFrame
    const previousCancel = globalThis.cancelAnimationFrame
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      queued = cb
      return 11
    }) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => {
      cancelled.push(id)
    }) as typeof cancelAnimationFrame

    const {wrapper, panelRef, state} = mountDisclosure()
    await tick()
    const panel = panelRef.value!
    expect(panel.getAttribute('hidden')).toBe('until-found')
    expect(typeof panel.getAnimations).not.toBe('function')

    let ran = false
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      queued = () => {
        ran = true
        cb(0)
      }
      return 11
    }) as typeof requestAnimationFrame
    panel.dispatchEvent(new Event('beforematch'))
    await tick()
    expect(state.isExpanded).toBe(true)
    expect(cancelled).toContain(11)
    expect(ran).toBe(false)
    expect(panel.getAttribute('hidden')).not.toBe('until-found')
    wrapper.unmount()

    globalThis.requestAnimationFrame = previousRaf
    globalThis.cancelAnimationFrame = previousCancel
  })
})
