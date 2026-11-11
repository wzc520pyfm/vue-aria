/**
 * Public surface of `vue-aria`, aligned with `react-aria@3.53.1`
 * (`packages/react-aria/exports`). This batch implements the interaction
 * hooks, Button hook, and Hero UI Vue behavior contract. Remaining official
 * subpaths (overlays, collections, dates, i18n, …) will be added later
 * using the same `exports/<name>.ts` style.
 */
export {usePress} from './usePress'
export type {PressEvent, PressEvents, PressProps, PressPropsEl, UsePressOptions, UsePressReturn, PointerType} from './usePress'

export {useHover} from './useHover'
export type {HoverEvent, HoverProps, HoverPropsEl, UseHoverReturn} from './useHover'

export {useFocusVisible} from './useFocusVisible'
export type {UseFocusVisibleOptions, UseFocusVisibleReturn, FocusPropsEl} from './useFocusVisible'

export {useButton} from './useButton'
export type {UseButtonProps, UseButtonReturn} from './useButton'

export {useSelectable} from './useSelectable'
export type {UseSelectableOptions} from './useSelectable'

export {usePresenceState} from './usePresenceState'
export type {UsePresenceStateOptions, PresencePhase} from './usePresenceState'

export {useInvalid} from './useInvalid'
export type {UseInvalidOptions} from './useInvalid'

export {usePlacement} from './usePlacement'
export type {UsePlacementOptions} from './usePlacement'

export {toHeroDataAttrs, dataAttr, dataAttrValue} from './toHeroDataAttrs'
export type {HeroDataAttrs, InteractionState} from './toHeroDataAttrs'

export {BehaviorElement} from './BehaviorElement'
export {behaviorAdapter} from './behaviorAdapter'
export {mergeProps} from './mergeProps'
export {chain} from './chain'
