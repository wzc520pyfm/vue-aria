/**
 * Port of `react-aria@3.53.1` `useToggleButton`
 * (`packages/react-aria/src/button/useToggleButton.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. The shared Hero `useButton` has no ref, autofocus, or
 * keyboard callbacks, so this path composes `usePress` and `useFocusable`
 * directly and does not modify those modules. A virtual click that follows a
 * keyboard or pointer press in the same task does not toggle again.
 */

import {toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import type {ToggleState} from '../../../vue-stately/src/toggle/useToggleState'
import {useFocusable} from '../interactions/useFocusable'
import {usePress, type PressEvent} from '../interactions/press'
import {mergeProps} from '../utils/mergeProps'

export interface ToggleButtonProps {
  /** Whether the element should be selected (controlled). */
  isSelected?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the element should be selected (uncontrolled). */
  defaultSelected?: MaybeRefOrGetter<boolean | undefined>
  /** Handler that is called when the element's selection state changes. */
  onChange?: (isSelected: boolean) => void
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  autoFocus?: MaybeRefOrGetter<boolean | undefined>
  excludeFromTabOrder?: MaybeRefOrGetter<boolean | undefined>
  preventFocusOnPress?: MaybeRefOrGetter<boolean | undefined>
  id?: MaybeRefOrGetter<string | undefined>
  elementType?: MaybeRefOrGetter<string | undefined>
  href?: MaybeRefOrGetter<string | undefined>
  target?: MaybeRefOrGetter<string | undefined>
  rel?: MaybeRefOrGetter<string | undefined>
  onPress?: (event: PressEvent) => void
  onPressStart?: (event: PressEvent) => void
  onPressEnd?: (event: PressEvent) => void
  onPressUp?: (event: PressEvent) => void
  onPressChange?: (isPressed: boolean) => void
  onClick?: (event: MouseEvent) => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  'aria-details'?: MaybeRefOrGetter<string | undefined>
  'aria-haspopup'?: MaybeRefOrGetter<boolean | string | undefined>
  'aria-expanded'?: MaybeRefOrGetter<boolean | 'true' | 'false' | undefined>
  'aria-controls'?: MaybeRefOrGetter<string | undefined>
  'aria-current'?: MaybeRefOrGetter<boolean | string | undefined>
  'aria-disabled'?: MaybeRefOrGetter<boolean | 'true' | 'false' | undefined>
}

export interface AriaToggleButtonProps extends ToggleButtonProps {}

export interface AriaToggleButtonOptions extends AriaToggleButtonProps {}

export interface ToggleButtonAria<T = Record<string, any>> {
  /** Whether the button is currently pressed. */
  isPressed: boolean
  /** Whether the button is selected. */
  isSelected: boolean
  /** Whether the button is disabled. */
  isDisabled: boolean
  /** Props for the button element. */
  buttonProps: T
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
}

function isForeignNode(node: EventTarget | null): boolean {
  return !!node
    && typeof node === 'object'
    && 'nodeType' in node
    && typeof (node as Node).nodeType === 'number'
    && !(node instanceof Element)
}

function nodeContains(root: EventTarget, node: EventTarget): boolean {
  const contains = (root as Node).contains
  if (typeof contains !== 'function') return false
  try {
    return contains.call(root as Node, node as Node)
  } catch {
    return false
  }
}

function eventTargetInside(event: Event): boolean {
  const root = event.currentTarget
  const target = event.target
  if (!root || !target) return false
  if (root === target) return true
  return nodeContains(root, target)
}

function foreignContainedChild(event: Event): boolean {
  const root = event.currentTarget
  const target = event.target
  return !!(root && target && root !== target && isForeignNode(root) && nodeContains(root, target))
}

function foreignChildRejected(event: Event): boolean {
  const root = event.currentTarget
  const target = event.target
  return !!(root && target && root !== target && isForeignNode(root) && !nodeContains(root, target))
}

function retargetToRoot(event: Event): Event {
  const root = event.currentTarget
  return new Proxy(event, {
    get(obj, key, receiver) {
      if (key === 'target') return root
      const value = Reflect.get(obj, key, receiver)
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(obj) : value
    },
  })
}

/**
 * Provides the behavior and accessibility implementation for a toggle button component.
 * Toggle buttons allow users to toggle a selection on or off, for example switching between two states or modes.
 */
export function useToggleButton(
  props: AriaToggleButtonOptions,
  state: ToggleState,
  domRef: Ref<Element | null>,
): ToggleButtonAria {
  const elementType = () => toValue(props.elementType) || 'button'
  const isDisabled = () => Boolean(toValue(props.isDisabled))

  // A keyboard or pointer press and the click the browser emits for it must
  // select once. A later virtual click (screen reader) still selects.
  let suppressVirtual = false
  const onPress = (event: PressEvent) => {
    if (event.pointerType === 'virtual' && suppressVirtual) return
    if (event.pointerType !== 'virtual') {
      suppressVirtual = true
      queueMicrotask(() => {
        suppressVirtual = false
      })
    }
    state.toggle()
    props.onPress?.(event)
  }

  const {pressProps, isPressed} = usePress({
    isDisabled,
    onPress,
    onPressStart: (event) => props.onPressStart?.(event),
    onPressEnd: (event) => props.onPressEnd?.(event),
    onPressUp: (event) => props.onPressUp?.(event),
    onPressChange: (pressed) => props.onPressChange?.(pressed),
  })

  const {focusableProps} = useFocusable({
    isDisabled,
    autoFocus: () => Boolean(toValue(props.autoFocus)),
    excludeFromTabOrder: () => Boolean(toValue(props.excludeFromTabOrder)),
    onFocus: (event) => props.onFocus?.(event),
    onBlur: (event) => props.onBlur?.(event),
    onFocusChange: (focused) => props.onFocusChange?.(focused),
    onKeyDown: (event) => props.onKeyDown?.(event),
    onKeyUp: (event) => props.onKeyUp?.(event),
  }, domRef as Ref<HTMLElement | null>)

  // Frozen `usePress` rejects a child target when `instanceof Element` uses the
  // main realm. Adapt only the press handlers. Public click, focus, and
  // keyboard callbacks keep the original event and its real target.
  const pressHandlers = pressProps as Record<string, ((event: Event) => void) | undefined>
  for (const key of Object.keys(pressHandlers)) {
    const handler = pressHandlers[key]
    if (typeof handler !== 'function') continue
    pressHandlers[key] = (event: Event) => {
      if (foreignChildRejected(event)) return
      handler(foreignContainedChild(event) ? retargetToRoot(event) : event)
    }
  }

  const buttonProps = mergeProps(focusableProps, pressProps)
  const tabIndex = Object.getOwnPropertyDescriptor(focusableProps, 'tabIndex')
  if (tabIndex && !Object.prototype.hasOwnProperty.call(buttonProps, 'tabIndex')) {
    Object.defineProperty(buttonProps, 'tabIndex', tabIndex)
  }

  const pointerDown = buttonProps.onPointerdown as ((event: PointerEvent) => void) | undefined
  buttonProps.onPointerdown = (event: PointerEvent) => {
    if (toValue(props.preventFocusOnPress)) event.preventDefault()
    pointerDown?.(event)
  }
  const pressClick = buttonProps.onClick as ((event: MouseEvent) => void) | undefined
  buttonProps.onClick = (event: MouseEvent) => {
    if (!eventTargetInside(event)) return
    pressClick?.(event)
    if (isDisabled()) return
    props.onClick?.(event)
  }

  // `isPressed` is only the visible press. Pointer leave ends that flag while
  // the press session stays armed, so host replacement and disable must end
  // the session through press's own blur cancel.
  function endSession(target: EventTarget | null) {
    pressProps.onBlur?.({currentTarget: target, target} as FocusEvent)
  }

  watch(domRef, (el, prev) => {
    if (prev && prev !== el) endSession(prev)
  })
  watch(isDisabled, (disabled, previous) => {
    if (disabled && previous === false) endSession(domRef.value)
  })

  defineLive(buttonProps, 'id', () => {
    const id = toValue(props.id)
    return id == null || id === '' ? undefined : String(id)
  })
  defineLive(buttonProps, 'type', () => {
    const element = elementType()
    return element === 'button' || element === 'input' ? 'button' : undefined
  })
  defineLive(buttonProps, 'disabled', () => {
    const element = elementType()
    if ((element === 'button' || element === 'input') && isDisabled()) return true
    return undefined
  })
  defineLive(buttonProps, 'role', () => (elementType() === 'button' ? undefined : 'button'))
  defineLive(buttonProps, 'href', () => {
    if (elementType() !== 'a' || isDisabled()) return undefined
    return toValue(props.href)
  })
  defineLive(buttonProps, 'target', () => (elementType() === 'a' ? toValue(props.target) : undefined))
  defineLive(buttonProps, 'rel', () => (elementType() === 'a' ? toValue(props.rel) : undefined))
  defineLive(buttonProps, 'aria-disabled', () => {
    const explicit = toValue(props['aria-disabled'])
    if (explicit != null) return explicit
    const element = elementType()
    if (element === 'button' || element === 'input') return undefined
    return isDisabled() ? true : undefined
  })
  defineLive(buttonProps, 'aria-pressed', () => state.isSelected)
  defineLive(buttonProps, 'aria-label', () => toValue(props['aria-label']))
  defineLive(buttonProps, 'aria-labelledby', () => toValue(props['aria-labelledby']))
  defineLive(buttonProps, 'aria-describedby', () => toValue(props['aria-describedby']))
  defineLive(buttonProps, 'aria-details', () => toValue(props['aria-details']))
  defineLive(buttonProps, 'aria-haspopup', () => toValue(props['aria-haspopup']))
  defineLive(buttonProps, 'aria-expanded', () => toValue(props['aria-expanded']))
  defineLive(buttonProps, 'aria-controls', () => toValue(props['aria-controls']))
  defineLive(buttonProps, 'aria-current', () => toValue(props['aria-current']))

  return {
    get isPressed() {
      return isPressed.value
    },
    get isSelected() {
      return state.isSelected
    },
    get isDisabled() {
      return isDisabled()
    },
    buttonProps,
  }
}
