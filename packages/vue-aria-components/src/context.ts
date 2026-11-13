import type {ListState} from 'vue-stately/useListState'
import type {Key} from 'vue-stately/useListState'
import type {InjectionKey, Ref} from 'vue'
import type {OverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import type {TooltipTriggerState} from 'vue-stately/useTooltipTriggerState'
import type {TitlePropsEl} from 'vue-aria/useDialog'
import type {PlacementAxis} from 'vue-aria/usePopover'

export const OverlayTriggerStateKey: InjectionKey<OverlayTriggerState> = Symbol('OverlayTriggerState')
export const TriggerRefKey: InjectionKey<Ref<Element | null>> = Symbol('TriggerRef')
export const OverlayTriggerButtonKey: InjectionKey<{
  onPress?: () => void
  'aria-expanded'?: boolean
  'aria-haspopup'?: boolean | string
  'aria-controls'?: string
}> = Symbol('OverlayTriggerButton')
export const DialogOverlayPropsKey: InjectionKey<{id?: string; 'aria-labelledby'?: string}> = Symbol('DialogOverlayProps')

export interface DialogTitleContext extends TitlePropsEl {
  hasTitle: {value: boolean}
  registeredId: {value: string | undefined}
  registerTitle: (id: string) => () => void
}
export const DialogTitlePropsKey: InjectionKey<DialogTitleContext> = Symbol('DialogTitleProps')
export const ButtonCloseKey: InjectionKey<() => void> = Symbol('ButtonClose')
export const InModalKey: InjectionKey<boolean> = Symbol('InModal')
export interface PopoverContextValue {
  triggerRef: Ref<Element | null>
  id?: string
  'aria-labelledby'?: string
  trigger?: string
  placement?: string
  offset?: number
  scrollRef?: Ref<HTMLElement | null>
}
export const PopoverContextKey: InjectionKey<PopoverContextValue> = Symbol('PopoverContext')
export const OverlayArrowContextKey: InjectionKey<{placement: Ref<PlacementAxis | undefined>}> = Symbol('OverlayArrow')
export const TooltipTriggerStateKey: InjectionKey<TooltipTriggerState> = Symbol('TooltipTriggerState')
export const TooltipContextKey: InjectionKey<{id?: string; triggerRef: Ref<Element | null>}> = Symbol('TooltipContext')

export const OVERLAY_COMPONENT_NAMES = new Set(['Modal', 'ModalOverlay', 'Popover', 'Dialog', 'Tooltip', 'OverlayArrow'])

// Collections
export const ListBoxContextKey: InjectionKey<Record<string, any> | undefined> = Symbol('ListBoxContext')
export const ListStateContextKey: InjectionKey<ListState<unknown> | null> = Symbol('ListStateContext')
export const CollectionContextKey: InjectionKey<{items: import('vue').ComputedRef<unknown[] | undefined>; dependencies: import('vue').ComputedRef<unknown[]>} | undefined> = Symbol('CollectionContext')
export const ListBoxSectionContextKey: InjectionKey<{key: Key | null} | undefined> = Symbol('ListBoxSectionContext')
export const HeaderContextKey: InjectionKey<Record<string, any> | undefined> = Symbol('HeaderContext')
export interface ListBoxItemContextValue {
  labelProps?: {id?: string}
  descriptionProps?: {id?: string}
}
export const ListBoxItemContextKey: InjectionKey<ListBoxItemContextValue | null> = Symbol('ListBoxItemContext')
export const TextContextKey: InjectionKey<{slots?: Record<string, {id?: string}>} | undefined> = Symbol('TextContext')


import type {RootMenuTriggerState} from 'vue-stately/useMenuTriggerState'

export const MenuContextKey: InjectionKey<Record<string, any> | null> = Symbol('MenuContext')
export const MenuStateContextKey: InjectionKey<any | null> = Symbol('MenuStateContext')
export const RootMenuTriggerStateContextKey: InjectionKey<RootMenuTriggerState | null> = Symbol('RootMenuTriggerStateContext')
export const SeparatorContextKey: InjectionKey<{elementType?: string} | undefined> = Symbol('SeparatorContext')
export const KeyboardContextKey: InjectionKey<Record<string, any> | undefined> = Symbol('KeyboardContext')
export const MenuItemContextKey: InjectionKey<Record<string, any> | null> = Symbol('MenuItemContext')
