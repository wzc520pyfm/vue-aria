import {computed, toValue} from 'vue'
import {useHover} from '@nev-ui/use-hover'
import {usePress} from '@nev-ui/use-press'
import {useFocusVisible} from '@nev-ui/use-focus'
import {chainPre, dataAttr, mergeProps} from '@nev-ui/shared'
import type {
  ElementType,
  EventHandlers,
  EventsToEmits,
  PressEvent,
  ToMaybeRefOrGettersForNonFunction,
} from '@nev-ui/types-shared'
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  Events,
  HTMLAttributes,
  InputHTMLAttributes,
  ToRefs,
} from 'vue'
import type {AriaButtonEvents, AriaButtonProps} from '@nev-ui/types-aria-button'

export interface UseAriaButtonProps<T extends ElementType = 'button'> extends AriaButtonProps<T> {
  isDisabled?: boolean
  /** Pending/loading. Disables press while leaving the button focusable. */
  isPending?: boolean
  /**
   * The native button click event handler.
   * @deprecated use `onPress` instead.
   */
  onClick?: EventHandlers<Events>['onClick']
}

export interface UseAriaButtonEvents extends AriaButtonEvents {
  /**
   * The native button click event handler.
   * @deprecated use `onPress` instead.
   */
  onClick?: EventHandlers<Events>['onClick']
}

export interface UseAriaButtonEmits extends EventsToEmits<AriaButtonEvents> {
  /**
   * The native button click event handler.
   * @deprecated use `press` instead.
   */
  (eventname: 'click', e: MouseEvent): void
}

export interface ButtonAria<T> {
  /** Props for the button element. */
  buttonProps: T
  /** Whether the button is currently pressed. */
  isPressed: boolean
  /** Whether the button is currently hovered. */
  isHovered: boolean
  /** Whether the button is focused. */
  isFocused: boolean
  /** Whether the button is keyboard-focused (focus-visible). */
  isFocusVisible: boolean
  /** Whether the button is in a pending/loading state. */
  isPending: boolean
}

const BUTTON_DEFAULT = {
  elementType: 'button',
  type: 'button',
} as const

// Order with overrides is important: 'button' should be default
export function useAriaButton(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaButtonProps<'button'>>,
  emits: UseAriaButtonEmits,
): ToRefs<ButtonAria<ButtonHTMLAttributes>>
export function useAriaButton(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaButtonProps<'a'>>,
  emits: UseAriaButtonEmits,
): ToRefs<ButtonAria<AnchorHTMLAttributes>>
export function useAriaButton(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaButtonProps<'div'>>,
  emits: UseAriaButtonEmits,
): ToRefs<ButtonAria<HTMLAttributes>>
export function useAriaButton(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaButtonProps<'input'>>,
  emits: UseAriaButtonEmits,
): ToRefs<ButtonAria<InputHTMLAttributes>>
export function useAriaButton(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaButtonProps<'span'>>,
  emits: UseAriaButtonEmits,
): ToRefs<ButtonAria<HTMLAttributes>>
export function useAriaButton(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaButtonProps<ElementType>>,
  emits: UseAriaButtonEmits,
): ToRefs<ButtonAria<HTMLAttributes>>
/**
 * Hook for headless aria button
 * @param props - Button props
 * @param emits - Button emits
 */
export function useAriaButton(
  props: ToMaybeRefOrGettersForNonFunction<UseAriaButtonProps<ElementType>> = {},
  emits: UseAriaButtonEmits,
): ToRefs<ButtonAria<HTMLAttributes>> {
  const {
    elementType = BUTTON_DEFAULT.elementType,
    type = BUTTON_DEFAULT.type,
    isDisabled = false,
    isPending = false,
    onPress: onPressProp,
    onPressStart: onPressStartProp,
    onPressEnd: onPressEndProp,
    onPressUp: onPressUpProp,
    onPressChange: onPressChangeProp,
    onClick: deprecatedOnClick,
  } = props

  const onClick = chainPre(deprecatedOnClick, (e: MouseEvent) => emits('click', e))

  const onPress = chainPre(onPressProp, (e: PressEvent) => emits('press', e))
  const onPressStart = chainPre(onPressStartProp, (e: PressEvent) => emits('pressstart', e))
  const onPressEnd = chainPre(onPressEndProp, (e: PressEvent) => emits('pressend', e))
  const onPressUp = chainPre(onPressUpProp, (e: PressEvent) => emits('pressup', e))
  const onPressChange = chainPre(onPressChangeProp, (isPressedState: boolean) =>
    emits('presschange', isPressedState),
  )

  const isPressDisabled = computed(() => Boolean(toValue(isDisabled) || toValue(isPending)))
  const {isHovered, hoverProps} = useHover({isDisabled: isPressDisabled})
  const {isFocused, isFocusVisible, focusProps} = useFocusVisible({isDisabled})
  // `onClick` is passed into usePress so the hook's click path (virtual press)
  // is not overwritten by mergeProps below.
  const {isPressed, pressProps} = usePress({
    isDisabled,
    isPending,
    onPress,
    onPressStart,
    onPressEnd,
    onPressUp,
    onPressChange,
    onClick,
  })
  const resolvedType = computed(() => toValue(type) ?? BUTTON_DEFAULT.type)
  const resolvedElementType = computed(() => toValue(elementType) ?? BUTTON_DEFAULT.elementType)

  const additionalProps = computed(() =>
    resolvedElementType.value === 'button'
      ? {
          type: resolvedType.value,
          disabled: toValue(isDisabled),
        }
      : {
          role: 'button',
          tabIndex: toValue(isDisabled) ? undefined : 0,
          // href: toValue(elementType) === 'a' && toValue(isDisabled) ? undefined : href,
          // target: toValue(elementType) === 'a' ? target : undefined,
          type: resolvedElementType.value === 'input' ? resolvedType.value : undefined,
          disabled: resolvedElementType.value === 'input' ? toValue(isDisabled) : undefined,
          'aria-disabled':
            !toValue(isDisabled) || resolvedElementType.value === 'input'
              ? undefined
              : toValue(isDisabled),
          // rel: toValue(elementType) === 'a' ? rel : undefined,
        },
  )

  const buttonProps = computed(() =>
    mergeProps(toValue(hoverProps), pressProps, toValue(focusProps), toValue(additionalProps), {
      'aria-disabled': dataAttr(Boolean(toValue(isDisabled) || toValue(isPending))),
      // Non-standard. Retained so existing useAriaButton consumers keep receiving an aria-* hover
      // flag (NOTE.md documents this hook as the aria-* layer). Prefer `data-hovered` from useButton.
      'aria-hover': dataAttr(toValue(isHovered)),
      'aria-pressed': toValue(props['aria-pressed']),
      'aria-haspopup': toValue(props['aria-haspopup']),
      'aria-expanded': toValue(props['aria-expanded']),
      'aria-controls': toValue(props['aria-controls']),
    }),
  )

  return {
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    isPending: computed(() => toValue(isPending)),
    buttonProps,
  }
}
