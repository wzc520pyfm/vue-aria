/**
 * Public surface of `vue-stately`, aligned with `react-stately@3.51.0`
 * (`packages/react-stately/exports` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 *
 * This batch adds collection and selection state: `useMultipleSelectionState`,
 * `useListState`, the `Selection` class, the `SelectionManager`, `ListCollection`,
 * and `equalSets`. Menu / Select / ComboBox / Tree / date state hooks remain
 * deferred.
 */
export {useOverlayTriggerState} from './overlays/useOverlayTriggerState'
export type {
  OverlayTriggerProps,
  OverlayTriggerState,
  Point,
} from './overlays/useOverlayTriggerState'

export {useTooltipTriggerState, TOOLTIP_DELAY, TOOLTIP_COOLDOWN} from './tooltip/useTooltipTriggerState'
export type {TooltipTriggerProps, TooltipTriggerState} from './tooltip/useTooltipTriggerState'

export {useMultipleSelectionState} from './selection/useMultipleSelectionState'
export type {
  UseMultipleSelectionStateProps,
  MultipleSelectionStateProps,
  MultipleSelectionState,
  MultipleSelectionManager,
  FocusState,
  FocusStateRefs,
  Selection,
  SelectionMode,
  SelectionBehavior,
  DisabledBehavior,
  FocusStrategy,
} from './selection/types'
export {Selection as SelectionClass} from './selection/Selection'
export {SelectionManager} from './selection/SelectionManager'
export {equalSets} from './selection/equalSets'

export {ListCollection} from './collections/ListCollection'
export {useListState} from './list/useListState'
export type {ListProps, ListState} from './selection/types'
