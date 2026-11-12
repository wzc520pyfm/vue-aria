/**
 * Public surface of `vue-stately`, aligned with `react-stately@3.51.0`
 * (`packages/react-stately/exports` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 *
 * This batch adds overlay and tooltip trigger state. Collection, selection,
 * and date state hooks remain deferred.
 */
export {useOverlayTriggerState} from './useOverlayTriggerState'
export type {
  OverlayTriggerProps,
  OverlayTriggerState,
  Point,
} from './useOverlayTriggerState'

export {useTooltipTriggerState, TOOLTIP_DELAY, TOOLTIP_COOLDOWN} from './useTooltipTriggerState'
export type {TooltipTriggerProps, TooltipTriggerState} from './useTooltipTriggerState'
