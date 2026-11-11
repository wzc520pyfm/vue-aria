import {defineComponent, isRef} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {
  BehaviorElement,
  behaviorAdapter,
  chain,
  mergeProps,
  toHeroDataAttrs,
  useButton,
  useFocusVisible,
  useHover,
  useInvalid,
  usePlacement,
  usePresenceState,
  usePress,
  useSelectable,
} from 'vue-aria'

describe('vue-aria main entry', () => {
  it('re-exports the first-batch public surface', () => {
    expect(typeof usePress).toBe('function')
    expect(typeof useHover).toBe('function')
    expect(typeof useFocusVisible).toBe('function')
    expect(typeof useButton).toBe('function')
    expect(typeof useSelectable).toBe('function')
    expect(typeof usePresenceState).toBe('function')
    expect(typeof useInvalid).toBe('function')
    expect(typeof usePlacement).toBe('function')
    expect(typeof toHeroDataAttrs).toBe('function')
    expect(typeof mergeProps).toBe('function')
    expect(typeof chain).toBe('function')
    expect(BehaviorElement).toBeDefined()
    expect(behaviorAdapter.name).toBe('vue-aria')
  })

  it('keeps all three interaction *Props objects unwrapped', () => {
    let pressProps: ReturnType<typeof usePress>['pressProps'] | undefined
    let hoverProps: ReturnType<typeof useHover>['hoverProps'] | undefined
    let focusProps: ReturnType<typeof useFocusVisible>['focusProps'] | undefined

    const Probe = defineComponent({
      setup() {
        pressProps = usePress().pressProps
        hoverProps = useHover().hoverProps
        focusProps = useFocusVisible().focusProps
        return () => null
      },
    })
    mount(Probe)

    expect(isRef(pressProps)).toBe(false)
    expect(isRef(hoverProps)).toBe(false)
    expect(isRef(focusProps)).toBe(false)
    expect(typeof pressProps?.onPointerdown).toBe('function')
    expect(typeof hoverProps?.onPointerenter).toBe('function')
    expect(typeof focusProps?.onFocus).toBe('function')
  })
})
