import {reactive, type MaybeRefOrGetter} from 'vue'
import type {TooltipTriggerState} from 'vue-stately/useTooltipTriggerState'
import {useHover} from '../interactions/hover'

export interface AriaTooltipProps {
  isOpen?: MaybeRefOrGetter<boolean | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
}

export interface TooltipPropsEl {
  role: 'tooltip'
  onPointerenter?: (e: PointerEvent) => void
  onPointerleave?: (e: PointerEvent) => void
  onMouseenter?: (e: MouseEvent) => void
  onMouseleave?: (e: MouseEvent) => void
}

export interface TooltipAria {
  /** Props for the tooltip element. Plain object, not a ComputedRef. */
  tooltipProps: TooltipPropsEl
}

/**
 * Accessibility implementation for a Tooltip (`role="tooltip"`).
 *
 * Port of official `useTooltip`
 * (`packages/react-aria/src/tooltip/useTooltip.ts`). Hovering the tooltip
 * itself keeps it open; leaving starts the close delay.
 */
export function useTooltip(props: AriaTooltipProps = {}, state?: TooltipTriggerState): TooltipAria {
  const {hoverProps} = useHover({
    onHoverStart: () => state?.open(true),
    onHoverEnd: () => state?.close(),
  })

  const tooltipProps = reactive<TooltipPropsEl>({
    role: 'tooltip',
    ...hoverProps,
  }) as TooltipPropsEl

  void props
  return {tooltipProps}
}
