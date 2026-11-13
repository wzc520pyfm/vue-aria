import {reactive, watch, toValue, type CSSProperties, type MaybeRefOrGetter, type Ref} from 'vue'
import type {OverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import {mergeProps} from '../utils/mergeProps'
import {useOverlay, type OverlayPropsEl} from './useOverlay'
import {usePreventScroll} from './usePreventScroll'
import {ariaHideOutside} from './ariaHideOutside'
import {computePosition, type Placement, type PlacementAxis} from './placement'

export interface AriaPopoverProps {
  /** The ref for the element which the popover positions itself with respect to. */
  triggerRef: Ref<Element | null | undefined>
  /** The ref for the popover element. */
  popoverRef: Ref<HTMLElement | null | undefined>
  /** A ref for the popover arrow element. */
  arrowRef?: Ref<HTMLElement | null | undefined>
  /**
   * Whether the popover is non-modal, i.e. elements outside the popover may be
   * interacted with by assistive technologies.
   */
  isNonModal?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether pressing the escape key to close the popover should be disabled.
   *
   * @default false
   */
  isKeyboardDismissDisabled?: MaybeRefOrGetter<boolean | undefined>
  shouldCloseOnInteractOutside?: (element: Element) => boolean
  /**
   * The placement of the popover with respect to the trigger.
   *
   * @default 'bottom'
   */
  placement?: MaybeRefOrGetter<Placement | undefined>
  /**
   * Additional offset along the main axis.
   *
   * @default 8 for vue-aria-components Popover, 0 at the hook level (official hook default)
   */
  offset?: MaybeRefOrGetter<number | undefined>
  /** Whether to flip on viewport overflow. @default true */
  shouldFlip?: MaybeRefOrGetter<boolean | undefined>
  /** Trigger type (e.g. SubmenuTrigger) for submenu-specific behavior. */
  trigger?: string
  isSubmenu?: boolean
}

export interface PopoverPropsEl extends OverlayPropsEl {
  style?: CSSProperties
}

export interface PopoverAria {
  /** Props for the popover element. Plain object, not a ComputedRef. */
  popoverProps: PopoverPropsEl
  /** Props for the popover tip arrow if any. */
  arrowProps: Record<string, unknown>
  /** Props to apply to the underlay element, if any. */
  underlayProps: Record<string, unknown>
  /** Placement of the popover with respect to the trigger (main axis). */
  placement: {value: PlacementAxis}
}

/**
 * Behavior and accessibility for a popover: position relative to the trigger,
 * Escape and outside-click close by default, and `aria-hidden` on the rest of
 * the page unless `isNonModal`.
 *
 * Port of official `usePopover`
 * (`packages/react-aria/src/overlays/usePopover.ts`):
 * `isDismissable` is `!isNonModal` (true by default), so outside click and
 * Escape close unless keyboard dismiss is disabled.
 *
 * Positioning is a minimal in-tree implementation (see `placement.ts`), not
 * the full official `calculatePosition`.
 */
export function usePopover(props: AriaPopoverProps, state: OverlayTriggerState): PopoverAria {
  const isSubmenu = (props as any).trigger === 'SubmenuTrigger' || !!(props as any).isSubmenu
  const {overlayProps, underlayProps} = useOverlay(
    {
      isOpen: () => state.isOpen.value,
      onClose: () => state.close(),
      // Official: isDismissable: !isNonModal || isSubmenu.
      isDismissable: () => !toValue(props.isNonModal) || isSubmenu,
      isKeyboardDismissDisabled: () => Boolean(toValue(props.isKeyboardDismissDisabled)),
      shouldCloseOnInteractOutside: props.shouldCloseOnInteractOutside,
    },
    props.popoverRef,
  )

  usePreventScroll({
    isDisabled: () => Boolean(toValue(props.isNonModal)) || isSubmenu || !state.isOpen.value,
  })

  const placement = reactive({value: parseAxis(toValue(props.placement) || 'bottom')})
  const popoverProps = reactive<PopoverPropsEl>({
    onKeydown: overlayProps.onKeydown,
    style: undefined,
  }) as PopoverPropsEl
  const arrowProps = reactive<Record<string, unknown>>({})

  watch(
    () =>
      [
        state.isOpen.value,
        props.triggerRef.value,
        props.popoverRef.value,
        toValue(props.placement),
        toValue(props.offset),
        toValue(props.shouldFlip),
        toValue(props.isNonModal),
      ] as const,
    ([isOpen, trigger, popover, requested, offset, shouldFlip, isNonModal], _prev, onCleanup) => {
      popoverProps.onKeydown = overlayProps.onKeydown
      if (!isOpen || !trigger || !popover) return

      const result = computePosition({
        trigger,
        overlay: popover,
        placement: requested || 'bottom',
        offset: offset ?? 0,
        shouldFlip: shouldFlip !== false,
      })
      placement.value = result.placement
      popoverProps.style = result.style

      if (!isNonModal && !isSubmenu) {
        const restore = ariaHideOutside([popover])
        onCleanup(() => restore())
      }
    },
    {immediate: true, flush: 'post'},
  )

  return {popoverProps, arrowProps, underlayProps, placement}
}

function parseAxis(placement: string): PlacementAxis {
  const token = placement.trim().replace(/-/g, ' ').split(/\s+/)[0]
  if (token === 'top' || token === 'bottom' || token === 'left' || token === 'right') return token
  if (token === 'start') return 'left'
  if (token === 'end') return 'right'
  return 'bottom'
}
