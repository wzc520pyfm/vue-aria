import {computed, toValue, type ComputedRef, type MaybeRefOrGetter} from 'vue'
import {useHover} from '../interactions/hover'
import {useFocusVisible} from '../interactions/focusVisible'
import {usePress, type PressEvents} from '../interactions/press'
import {mergeProps} from '../utils/mergeProps'
import {dataAttr, toHeroDataAttrs} from '../utils/toHeroDataAttrs'

export interface UseButtonProps extends PressEvents {
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Pending/loading. Disables press while leaving the button focusable. */
  isPending?: MaybeRefOrGetter<boolean | undefined>
  /** Native button type. Defaults to `"button"`. */
  type?: MaybeRefOrGetter<'button' | 'submit' | 'reset' | undefined>
  /** Rendered element. Defaults to `"button"`. */
  elementType?: MaybeRefOrGetter<string | undefined>
  /**
   * Slot name for compound components and Hero UI `[data-slot]` selectors.
   * @default 'button'
   */
  'data-slot'?: MaybeRefOrGetter<string | undefined>
  /** Camel-case alias of `data-slot` for Vue prop fallthrough. */
  dataSlot?: MaybeRefOrGetter<string | undefined>
  /**
   * The native button click event handler.
   * @deprecated use `onPress` instead.
   */
  onClick?: (e: MouseEvent) => void
  'aria-pressed'?: MaybeRefOrGetter<boolean | 'true' | 'false' | undefined>
  'aria-haspopup'?: MaybeRefOrGetter<string | boolean | undefined>
  'aria-expanded'?: MaybeRefOrGetter<boolean | 'true' | 'false' | undefined>
  'aria-controls'?: MaybeRefOrGetter<string | undefined>
}

export interface UseButtonReturn {
  isPressed: ComputedRef<boolean>
  isHovered: ComputedRef<boolean>
  isFocused: ComputedRef<boolean>
  isFocusVisible: ComputedRef<boolean>
  isDisabled: ComputedRef<boolean>
  isPending: ComputedRef<boolean>
  /** Props to bind on the button element, including Hero UI data-* attributes. */
  buttonProps: ComputedRef<Record<string, unknown>>
}

const BUTTON_DEFAULT = {
  elementType: 'button',
  type: 'button',
} as const

/**
 * Hook for an accessible, unstyled button.
 * Composes {@link usePress}, {@link useHover}, and {@link useFocusVisible},
 * and emits Hero UI data-* attributes. Does not attach later helpers
 * (`data-selected`, `data-invalid`, `data-placement`, presence).
 */
export function useButton(props: UseButtonProps = {}): UseButtonReturn {
  const {
    isDisabled = false,
    isPending = false,
    type = BUTTON_DEFAULT.type,
    elementType = BUTTON_DEFAULT.elementType,
    onPress,
    onPressStart,
    onPressEnd,
    onPressUp,
    onPressChange,
    onClick,
  } = props

  const isPressDisabled = computed(() => Boolean(toValue(isDisabled) || toValue(isPending)))
  const {isHovered, hoverProps} = useHover({isDisabled: isPressDisabled})
  const {isFocused, isFocusVisible, focusProps} = useFocusVisible({isDisabled})
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
  const resolvedDisabled = computed(() => Boolean(toValue(isDisabled)))
  const resolvedPending = computed(() => Boolean(toValue(isPending)))
  const resolvedSlot = computed(
    () => toValue(props['data-slot']) ?? toValue(props.dataSlot) ?? 'button',
  )

  const additionalProps = computed(() => {
    if (resolvedElementType.value === 'button') {
      return {
        type: resolvedType.value,
        // Native disabled only for isDisabled — not for isPending.
        disabled: resolvedDisabled.value ? true : undefined,
      }
    }
    return {
      role: 'button',
      tabIndex: resolvedDisabled.value ? undefined : 0,
      type: resolvedElementType.value === 'input' ? resolvedType.value : undefined,
      disabled: resolvedElementType.value === 'input' && resolvedDisabled.value ? true : undefined,
    }
  })

  const buttonProps = computed(() =>
    mergeProps(hoverProps, pressProps, focusProps, additionalProps.value, {
      'aria-disabled': dataAttr(resolvedDisabled.value || resolvedPending.value),
      'aria-pressed': toValue(props['aria-pressed']),
      'aria-haspopup': toValue(props['aria-haspopup']),
      'aria-expanded': toValue(props['aria-expanded']),
      'aria-controls': toValue(props['aria-controls']),
    }, toHeroDataAttrs({
      slot: resolvedSlot.value,
      disabled: resolvedDisabled.value,
      hovered: isHovered.value,
      pressed: isPressed.value,
      focused: isFocused.value,
      focusVisible: isFocusVisible.value,
      pending: resolvedPending.value,
    })),
  )

  return {
    isHovered: computed(() => isHovered.value),
    isPressed,
    isFocused: computed(() => isFocused.value),
    isFocusVisible: computed(() => isFocusVisible.value),
    isDisabled: resolvedDisabled,
    isPending: resolvedPending,
    buttonProps,
  }
}
