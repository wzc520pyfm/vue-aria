import {defineComponent, isRef, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {
  BehaviorElement,
  behaviorAdapter,
  chain,
  mergeProps,
  toHeroDataAttrs,
  useButton,
  useDialog,
  useFocusScope,
  useFocusVisible,
  useHover,
  useInteractOutside,
  useInvalid,
  useModal,
  useModalOverlay,
  useOverlayTrigger,
  usePlacement,
  usePopover,
  usePresenceState,
  usePress,
  usePreventScroll,
  useSelectable,
  useTooltip,
  useTooltipTrigger,
} from 'vue-aria'
import {useOverlayTriggerState, useTooltipTriggerState} from 'vue-stately'

describe('vue-aria main entry', () => {
  it('re-exports the first-batch public surface and overlay hooks', () => {
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
    expect(typeof useOverlayTrigger).toBe('function')
    expect(typeof useDialog).toBe('function')
    expect(typeof useModal).toBe('function')
    expect(typeof useModalOverlay).toBe('function')
    expect(typeof usePopover).toBe('function')
    expect(typeof useTooltip).toBe('function')
    expect(typeof useTooltipTrigger).toBe('function')
    expect(typeof usePreventScroll).toBe('function')
    expect(typeof useFocusScope).toBe('function')
    expect(typeof useInteractOutside).toBe('function')
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

  it('keeps new overlay *Props objects unwrapped (not ComputedRef)', () => {
    let triggerProps: ReturnType<typeof useOverlayTrigger>['triggerProps'] | undefined
    let overlayProps: ReturnType<typeof useOverlayTrigger>['overlayProps'] | undefined
    let dialogProps: ReturnType<typeof useDialog>['dialogProps'] | undefined
    let titleProps: ReturnType<typeof useDialog>['titleProps'] | undefined
    let modalProps: ReturnType<typeof useModal>['modalProps'] | undefined
    let modalOverlayProps: ReturnType<typeof useModalOverlay>['modalProps'] | undefined
    let popoverProps: ReturnType<typeof usePopover>['popoverProps'] | undefined
    let tooltipProps: ReturnType<typeof useTooltip>['tooltipProps'] | undefined
    let tooltipTriggerProps: ReturnType<typeof useTooltipTrigger>['triggerProps'] | undefined

    const Probe = defineComponent({
      setup() {
        const overlayState = useOverlayTriggerState()
        const tooltipState = useTooltipTriggerState()
        const overlayRef = ref<HTMLElement | null>(null)
        const triggerRef = ref<Element | null>(null)
        const popoverRef = ref<HTMLElement | null>(null)
        const overlay = useOverlayTrigger({type: 'dialog'}, overlayState)
        triggerProps = overlay.triggerProps
        overlayProps = overlay.overlayProps
        dialogProps = useDialog({role: 'dialog'}).dialogProps
        titleProps = useDialog({role: 'dialog'}).titleProps
        modalProps = useModal({ref: overlayRef}).modalProps
        modalOverlayProps = useModalOverlay({}, overlayState, overlayRef).modalProps
        popoverProps = usePopover({triggerRef, popoverRef}, overlayState).popoverProps
        tooltipProps = useTooltip({}, tooltipState).tooltipProps
        tooltipTriggerProps = useTooltipTrigger({}, tooltipState, triggerRef).triggerProps
        return () => null
      },
    })
    mount(Probe)

    expect(isRef(triggerProps)).toBe(false)
    expect(isRef(overlayProps)).toBe(false)
    expect(isRef(dialogProps)).toBe(false)
    expect(isRef(titleProps)).toBe(false)
    expect(isRef(modalProps)).toBe(false)
    expect(isRef(modalOverlayProps)).toBe(false)
    expect(isRef(popoverProps)).toBe(false)
    expect(isRef(tooltipProps)).toBe(false)
    expect(isRef(tooltipTriggerProps)).toBe(false)
    expect(typeof triggerProps?.onPress).toBe('function')
    expect(typeof dialogProps?.role).toBe('string')
    expect(tooltipProps?.role).toBe('tooltip')
  })
})
