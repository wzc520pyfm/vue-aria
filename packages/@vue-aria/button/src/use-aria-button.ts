import {computed, toValue} from 'vue'
import {useHover} from '@nev-ui/use-hover'
import {usePress} from '@nev-ui/use-press'
import {dataAttr, mergeProps} from '@nev-ui/shared'
import type {ElementType, EventHandlers, PressEvent} from '@nev-ui/types-shared'
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  Events,
  HTMLAttributes,
  InputHTMLAttributes,
  MaybeRefOrGetter,
  ToRefs,
} from 'vue'
import type {AriaButtonEvents, AriaButtonProps} from '@nev-ui/types-aria-button'

export interface UseAriaButtonProps<T extends ElementType = 'button'> extends AriaButtonProps<T> {
  isDisabled?: boolean
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
  // TODO: the type maybe change to `(eventname: 'click', e: MouseEvent): void`?
  onClick?: EventHandlers<Events>['onClick']
}

// 受限于Vue defineProps和defineEmits的范型不支持复杂类型推断（如条件类型），此写法不被支持
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
}

const BUTTON_DEFAULT = {
  elementType: 'button',
  type: 'button',
} as const

// TODO: move to type shared
// type ToMaybeRefOrGetters<T> = {
//   [P in keyof T]?: MaybeRefOrGetter<T[P]>
// }
type NonUndefined<T> = T extends undefined ? never : T
type Duplicate<T> = {[P in keyof T]: T[P]}
type OmitNever<T extends object> = Duplicate<T>[keyof T]
type FunctionKeys<T extends object> = OmitNever<
  Required<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: NonUndefined<T[K]> extends Function ? K : never
  }>
>
type ToMaybeRefOrGettersForNonFunction<T extends object> = {
  [P in keyof T]?: P extends FunctionKeys<T> ? T[P] : MaybeRefOrGetter<NonUndefined<T[P]>>
}

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
    onPress: onPressProp,
    onPressStart: onPressStartProp,
    onClick: deprecatedOnClick,
  } = props

  const onClick = chainPre(deprecatedOnClick, (e: MouseEvent) => emits('click', e))

  const onPress = chainPre(onPressProp, (e: PressEvent) => emits('press', e))
  const onPressStart = chainPre(onPressStartProp, (e: PressEvent) => emits('pressstart', e))

  const {isHovered, hoverProps} = useHover({isDisabled})
  const {isPressed, pressProps} = usePress({isDisabled, onPress, onPressStart})
  const additionalProps = computed(() =>
    toValue(elementType) === 'button'
      ? {
          type: toValue(type),
          disabled: toValue(isDisabled),
        }
      : {
          role: 'button',
          tabIndex: toValue(isDisabled) ? undefined : 0,
          // href: toValue(elementType) === 'a' && toValue(isDisabled) ? undefined : href,
          // target: toValue(elementType) === 'a' ? target : undefined,
          type: toValue(elementType) === 'input' ? toValue(type) : undefined,
          disabled: toValue(elementType) === 'input' ? toValue(isDisabled) : undefined,
          'aria-disabled':
            !toValue(isDisabled) || toValue(elementType) === 'input'
              ? undefined
              : toValue(isDisabled),
          // rel: toValue(elementType) === 'a' ? rel : undefined,
        },
  )

  const buttonProps = computed(() =>
    mergeProps(toValue(hoverProps), toValue(pressProps), toValue(additionalProps), {
      'aria-disabled': dataAttr(toValue(isDisabled)),
      'aria-hover': dataAttr(toValue(isHovered)),
      'aria-pressed': toValue(props['aria-pressed']),
      'aria-haspopup': toValue(props['aria-haspopup']),
      'aria-expanded': toValue(props['aria-expanded']),
      'aria-controls': toValue(props['aria-controls']),
      onClick,
    }),
  )

  return {
    isHovered,
    isPressed,
    buttonProps,
  }
}

// TODO: move to shared

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

type RecordToUnion<T extends Record<string, any>> = T[keyof T]

type _EventsToEmits<T extends object> = UnionToIntersection<
  RecordToUnion<{
    [K in keyof T]: K extends `on${infer U}`
      ? T[K] extends (...args: infer E) => infer R
        ? (eventname: Lowercase<U>, ...args: E) => R
        : never
      : never
  }>
>
type EventsToEmits<T extends object> = _EventsToEmits<Required<T>>

/**
 * Executes the first given executable function.
 */
function chainPre<T extends undefined | ((...args: any[]) => any)>(...callbacks: T[]) {
  return (...args: Parameters<NonUndefined<T>>): ReturnType<NonUndefined<T>> | undefined => {
    const canExecCb = callbacks.find((cb) => typeof cb === 'function')
    return canExecCb?.(...args)
  }
}
