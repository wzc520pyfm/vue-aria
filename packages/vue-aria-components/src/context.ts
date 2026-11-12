import type {InjectionKey, Ref} from 'vue'
import type {OverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import type {TooltipTriggerState} from 'vue-stately/useTooltipTriggerState'
import type {TitlePropsEl} from 'vue-aria/useDialog'
import type {PlacementAxis} from 'vue-aria/usePopover'

export const OverlayTriggerStateKey: InjectionKey<OverlayTriggerState> = Symbol(
  'OverlayTriggerState',
)

export const TriggerRefKey: InjectionKey<Ref<Element | null>> = Symbol('TriggerRef')

export const OverlayTriggerButtonKey: InjectionKey<{
  onPress?: () => void
  'aria-expanded'?: boolean
  'aria-haspopup'?: boolean | string
  'aria-controls'?: string
}> = Symbol('OverlayTriggerButton')

export const DialogOverlayPropsKey: InjectionKey<{
  id?: string
  'aria-labelledby'?: string
}> = Symbol('DialogOverlayProps')

export const DialogTitlePropsKey: InjectionKey<TitlePropsEl> = Symbol('DialogTitleProps')

export const ButtonCloseKey: InjectionKey<() => void> = Symbol('ButtonClose')

export const InModalKey: InjectionKey<boolean> = Symbol('InModal')

export const PopoverContextKey: InjectionKey<{
  triggerRef: Ref<Element | null>
  id?: string
  'aria-labelledby'?: string
}> = Symbol('PopoverContext')

export const OverlayArrowContextKey: InjectionKey<{
  placement: Ref<PlacementAxis | undefined>
}> = Symbol('OverlayArrow')

export const TooltipTriggerStateKey: InjectionKey<TooltipTriggerState> = Symbol(
  'TooltipTriggerState',
)

export const TooltipContextKey: InjectionKey<{
  id?: string
  triggerRef: Ref<Element | null>
}> = Symbol('TooltipContext')

export const OVERLAY_COMPONENT_NAMES = new Set([
  'Modal',
  'ModalOverlay',
  'Popover',
  'Dialog',
  'Tooltip',
  'OverlayArrow',
])
