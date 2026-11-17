/**
 * Port of `react-aria@3.53.1` `useToggleButtonGroup`
 * (`packages/react-aria/src/button/useToggleButtonGroup.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Single selection reports radiogroup/radio. Multiple
 * selection keeps `useToolbar` roles. Item `id` is a selection key, not a DOM id.
 * Group disabled wins over a local `false`. Arrow keys come from `useToolbar`
 * and do not change selection.
 */

import {toValue, type MaybeRefOrGetter, type Ref} from 'vue'
import type {Key, ToggleGroupProps, ToggleGroupState} from '../../../vue-stately/src/toggle/useToggleGroupState'
import type {ToggleState} from '../../../vue-stately/src/toggle/useToggleState'
import {useToolbar} from '../toolbar/useToolbar'
import {
  useToggleButton,
  type AriaToggleButtonProps,
  type ToggleButtonAria,
} from './useToggleButton'

export interface AriaToggleButtonGroupProps extends ToggleGroupProps {
  /**
   * The orientation of the toggle button group.
   * @default 'horizontal'
   */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical' | undefined>
  id?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | null | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | null | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | null | undefined>
  'aria-details'?: MaybeRefOrGetter<string | null | undefined>
}

export interface ToggleButtonGroupAria {
  /** Props for the toggle button group container. */
  groupProps: Record<string, any>
}

export interface AriaToggleButtonGroupItemProps extends Omit<AriaToggleButtonProps, 'id' | 'isSelected' | 'defaultSelected' | 'onChange'> {
  /** An identifier for the item in the `selectedKeys` of a ToggleButtonGroup. */
  id: MaybeRefOrGetter<Key>
}

export interface AriaToggleButtonGroupItemOptions extends AriaToggleButtonGroupItemProps {}

function readDesc(desc: PropertyDescriptor | undefined) {
  if (!desc) return undefined
  if (typeof desc.get === 'function') return desc.get()
  return desc.value
}

/**
 * Provides the behavior and accessibility implementation for a toggle button group component.
 * Toggle button groups allow users to select one or more options from a group.
 */
export function useToggleButtonGroup(
  props: AriaToggleButtonGroupProps,
  state: ToggleGroupState,
  ref: Ref<Element | null>,
): ToggleButtonGroupAria {
  const {toolbarProps} = useToolbar({
    orientation: () => (toValue(props.orientation) === 'vertical' ? 'vertical' : 'horizontal'),
    id: () => {
      const id = toValue(props.id)
      return id == null || id === '' ? undefined : String(id)
    },
    'aria-label': () => toValue(props['aria-label']),
    'aria-labelledby': () => toValue(props['aria-labelledby']),
    'aria-describedby': () => toValue(props['aria-describedby']),
    'aria-details': () => toValue(props['aria-details']),
  }, ref as Ref<HTMLElement | null>)

  const groupProps: Record<string, any> = {}
  for (const key of Object.keys(toolbarProps)) {
    const desc = Object.getOwnPropertyDescriptor(toolbarProps, key)
    if (desc) Object.defineProperty(groupProps, key, desc)
  }
  Object.defineProperty(groupProps, 'role', {
    configurable: true,
    enumerable: true,
    get() {
      return state.selectionMode === 'single' ? 'radiogroup' : toolbarProps.role
    },
  })
  Object.defineProperty(groupProps, 'aria-disabled', {
    configurable: true,
    enumerable: true,
    get() {
      const value = toValue(props.isDisabled)
      return value == null ? undefined : Boolean(value)
    },
  })

  return {groupProps}
}

/**
 * Provides the behavior and accessibility implementation for a toggle button inside a group.
 */
export function useToggleButtonGroupItem(
  props: AriaToggleButtonGroupItemOptions,
  state: ToggleGroupState,
  ref: Ref<Element | null>,
): ToggleButtonAria {
  const id = () => toValue(props.id)
  const toggleState: ToggleState = {
    get isSelected() {
      return state.selectedKeys.has(id())
    },
    get defaultSelected() {
      return false
    },
    setSelected(isSelected) {
      state.setSelected(id(), isSelected)
    },
    toggle() {
      state.toggleKey(id())
    },
  }

  const read = <T>(key: keyof AriaToggleButtonGroupItemOptions) =>
    toValue(props[key] as MaybeRefOrGetter<T | undefined>)
  const result = useToggleButton({
    elementType: () => read<string>('elementType'),
    autoFocus: () => read<boolean>('autoFocus'),
    excludeFromTabOrder: () => read<boolean>('excludeFromTabOrder'),
    preventFocusOnPress: () => read<boolean>('preventFocusOnPress'),
    href: () => read<string>('href'),
    target: () => read<string>('target'),
    rel: () => read<string>('rel'),
    'aria-label': () => read<string>('aria-label'),
    'aria-labelledby': () => read<string>('aria-labelledby'),
    'aria-describedby': () => read<string>('aria-describedby'),
    'aria-details': () => read<string>('aria-details'),
    'aria-haspopup': () => read<boolean | string>('aria-haspopup'),
    'aria-expanded': () => read<boolean | 'true' | 'false'>('aria-expanded'),
    'aria-controls': () => read<string>('aria-controls'),
    'aria-current': () => read<boolean | string>('aria-current'),
    'aria-disabled': () => read<boolean | 'true' | 'false'>('aria-disabled'),
    onPress: (event) => props.onPress?.(event),
    onPressStart: (event) => props.onPressStart?.(event),
    onPressEnd: (event) => props.onPressEnd?.(event),
    onPressUp: (event) => props.onPressUp?.(event),
    onPressChange: (value) => props.onPressChange?.(value),
    onClick: (event) => props.onClick?.(event),
    onFocus: (event) => props.onFocus?.(event),
    onBlur: (event) => props.onBlur?.(event),
    onFocusChange: (value) => props.onFocusChange?.(value),
    onKeyDown: (event) => props.onKeyDown?.(event),
    onKeyUp: (event) => props.onKeyUp?.(event),
    id: undefined,
    isDisabled: () => Boolean(toValue(props.isDisabled) || state.isDisabled),
  }, toggleState, ref)

  const roleDesc = Object.getOwnPropertyDescriptor(result.buttonProps, 'role')
  const pressedDesc = Object.getOwnPropertyDescriptor(result.buttonProps, 'aria-pressed')
  Object.defineProperty(result.buttonProps, 'role', {
    configurable: true,
    enumerable: true,
    get() {
      return state.selectionMode === 'single' ? 'radio' : readDesc(roleDesc)
    },
  })
  Object.defineProperty(result.buttonProps, 'aria-checked', {
    configurable: true,
    enumerable: true,
    get() {
      return state.selectionMode === 'single' ? toggleState.isSelected : undefined
    },
  })
  Object.defineProperty(result.buttonProps, 'aria-pressed', {
    configurable: true,
    enumerable: true,
    get() {
      return state.selectionMode === 'single' ? undefined : readDesc(pressedDesc)
    },
  })

  return result
}
