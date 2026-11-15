/*
 * Port of `react-aria@3.53.1` `useSpinButton`
 * (`packages/react-aria/src/spinbutton/useSpinButton.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported (matches official).
 *
 * The press-and-hold behavior is a faithful port: mouse increments immediately
 * on press start and then repeats after an initial 400 ms delay every 60 ms;
 * touch holds wait 600 ms before repeating and only increment on `onPressEnd`
 * when the control is not already spinning and an `onPressUp` happened first.
 * Global `pointercancel` and `contextmenu` listeners are tracked and removed
 * on press up / scope dispose. The official `useEffectEvent` is replaced with
 * ordinary live callbacks.
 */

import {computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import spinbuttonStrings from '../i18n/spinbuttonStrings'
import {announce, clearAnnouncer} from '../live-announcer/LiveAnnouncer'

export interface SpinButtonProps {
  value?: MaybeRefOrGetter<number | undefined>
  textValue?: MaybeRefOrGetter<string | undefined>
  minValue?: MaybeRefOrGetter<number | undefined>
  maxValue?: MaybeRefOrGetter<number | undefined>
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  isReadOnly?: MaybeRefOrGetter<boolean | undefined>
  isRequired?: MaybeRefOrGetter<boolean | undefined>
  onIncrement?: () => void
  onIncrementPage?: () => void
  onDecrement?: () => void
  onDecrementPage?: () => void
  onDecrementToMin?: () => void
  onIncrementToMax?: () => void
}

export interface SpinbuttonAria {
  /** Props for the spinbutton element. Plain object with live getters. */
  spinButtonProps: Record<string, any>
  incrementButtonProps: Record<string, any>
  decrementButtonProps: Record<string, any>
}

export function useSpinButton(props: SpinButtonProps): SpinbuttonAria {
  const stringFormatter = useLocalizedStringFormatter(
    spinbuttonStrings as any,
    '@react-aria/spinbutton',
  )

  let isFocused = false

  const onFocus = () => {
    isFocused = true
  }

  const onBlur = () => {
    isFocused = false
  }

  const isDisabled = () => Boolean(toValue(props.isDisabled) || toValue(props.isReadOnly))

  const {keyboardProps} = useKeyboard({
    isDisabled: () => isDisabled(),
    shortcuts: {
      PageUp: () => {
        if (props.onIncrementPage) {
          props.onIncrementPage()
          return
        }
        if (props.onIncrement) {
          props.onIncrement()
          return
        }
        return false
      },
      ArrowUp: () => {
        if (props.onIncrement) {
          props.onIncrement()
          return
        }
        return false
      },
      PageDown: () => {
        if (props.onDecrementPage) {
          props.onDecrementPage()
          return
        }
        if (props.onDecrement) {
          props.onDecrement()
          return
        }
        return false
      },
      ArrowDown: () => {
        if (props.onDecrement) {
          props.onDecrement()
          return
        }
        return false
      },
      Home: () => {
        if (props.onDecrementToMin) {
          props.onDecrementToMin()
          return
        }
        return false
      },
      End: () => {
        if (props.onIncrementToMax) {
          props.onIncrementToMax()
          return
        }
        return false
      },
    },
    allowRepeats: true,
  })

  // Replace Unicode hyphen-minus (U+002D) with minus sign (U+2212).
  // This ensures that macOS VoiceOver announces it as "minus" even with other characters between the minus sign
  // and the number (e.g. currency symbol). Otherwise it announces nothing because it assumes the character is a hyphen.
  // In addition, replace the empty string with the word "Empty" so that iOS VoiceOver does not read "50%" for an empty field.
  const ariaTextValue = computed(() => {
    const textValue = toValue(props.textValue)
    const value = toValue(props.value)
    return textValue === ''
      ? stringFormatter.format('Empty')
      : (textValue || `${value}`).replace('-', '\u2212')
  })

  // Announce the value when it changes while focused (official effect).
  watch(ariaTextValue, (next) => {
    if (isFocused) {
      clearAnnouncer('assertive')
      announce(next, 'assertive')
    }
  })

  // Plain (non-getter) props live in a normal object literal so handlers
  // keep normal enumerable descriptors; the aria-* props are defined as
  // accessors below. (Spreading functions into `Object.defineProperties`
  // would treat each handler as a descriptor object and hide it.)
  const spinButtonProps: Record<string, any> = {
    ...keyboardProps,
    onFocus,
    onBlur,
  }
  Object.defineProperties(spinButtonProps, {
    role: {value: 'spinbutton', enumerable: true},
    'aria-valuenow': {
      get: () => {
        const value = toValue(props.value)
        return value !== undefined && !isNaN(value) ? value : undefined
      },
      enumerable: true,
      configurable: true,
    },
    'aria-valuetext': {
      get: () => ariaTextValue.value,
      enumerable: true,
      configurable: true,
    },
    'aria-valuemin': {get: () => toValue(props.minValue), enumerable: true, configurable: true},
    'aria-valuemax': {get: () => toValue(props.maxValue), enumerable: true, configurable: true},
    'aria-disabled': {
      get: () => (toValue(props.isDisabled) ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-readonly': {
      get: () => (toValue(props.isReadOnly) ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-required': {
      get: () => (toValue(props.isRequired) ? true : undefined),
      enumerable: true,
      configurable: true,
    },
  })

  // ---------------------------------------------------------------------------
  // Press-and-hold (long press) behavior for the increment/decrement buttons.
  // ---------------------------------------------------------------------------

  const timeoutId: {current: number | undefined} = {current: undefined}
  let isSpinning = false

  const clearAsync = () => {
    window.clearTimeout(timeoutId.current)
    timeoutId.current = undefined
    isSpinning = false
  }

  const stepUp = () => {
    const value = toValue(props.value)
    const max = toValue(props.maxValue)
    if (
      max === undefined ||
      isNaN(max) ||
      value === undefined ||
      isNaN(value) ||
      value < max
    ) {
      props.onIncrement?.()
      onIncrementPressStart(60)
    }
  }

  const onIncrementPressStart = (initialStepDelay: number) => {
    clearAsync()
    isSpinning = true
    // Start spinning after initial delay
    timeoutId.current = window.setTimeout(stepUp, initialStepDelay)
  }

  const stepDown = () => {
    const value = toValue(props.value)
    const min = toValue(props.minValue)
    if (
      min === undefined ||
      isNaN(min) ||
      value === undefined ||
      isNaN(value) ||
      value > min
    ) {
      props.onDecrement?.()
      onDecrementPressStart(60)
    }
  }

  const onDecrementPressStart = (initialStepDelay: number) => {
    clearAsync()
    isSpinning = true
    // Start spinning after initial delay
    timeoutId.current = window.setTimeout(stepDown, initialStepDelay)
  }

  // Tracked global listeners (official `useGlobalListeners`).
  const globalListeners: Array<{
    target: EventTarget
    type: string
    listener: EventListener
    options?: AddEventListenerOptions
  }> = []
  const addGlobalListener = (
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, listener, options)
    globalListeners.push({target, type, listener, options})
  }
  const removeAllGlobalListeners = () => {
    for (const {target, type, listener, options} of globalListeners.splice(0)) {
      target.removeEventListener(type, listener, options)
    }
  }

  // For touch users, if they move their finger like they're scrolling, we don't want to trigger a spin.
  const onPointerCancel = () => {
    clearAsync()
  }

  const cancelContextMenu = (e: Event) => {
    e.preventDefault()
  }

  // Tracks in touch if the press end event was preceded by a press up.
  // If it wasn't, then we know the finger left the button while still in contact with the screen.
  // This means that the user is trying to scroll or interact in some way that shouldn't trigger
  // an increment or decrement.
  let isUp = false

  const incrementPressed = ref<'touch' | 'mouse' | null>(null)
  watch(incrementPressed, (next) => {
    if (next === 'touch') {
      onIncrementPressStart(600)
    } else if (next) {
      onIncrementPressStart(400)
    } else {
      clearAsync()
    }
  })

  const decrementPressed = ref<'touch' | 'mouse' | null>(null)
  watch(decrementPressed, (next) => {
    if (next === 'touch') {
      onDecrementPressStart(600)
    } else if (next) {
      onDecrementPressStart(400)
    } else {
      clearAsync()
    }
  })

  onScopeDispose(() => {
    clearAsync()
    removeAllGlobalListeners()
  })

  return {
    spinButtonProps,
    incrementButtonProps: {
      onPressStart: (e: {pointerType: string}) => {
        clearAsync()
        if (e.pointerType !== 'touch') {
          props.onIncrement?.()
          incrementPressed.value = 'mouse'
        } else {
          addGlobalListener(window, 'pointercancel', onPointerCancel as unknown as EventListener, {
            capture: true,
          })
          isUp = false
          // For touch users, don't trigger an increment on press start, we'll wait for the press end to trigger it if
          // the control isn't spinning.
          incrementPressed.value = 'touch'
        }
        addGlobalListener(window, 'contextmenu', cancelContextMenu as unknown as EventListener)
      },
      onPressUp: (e: {pointerType: string}) => {
        clearAsync()
        if (e.pointerType === 'touch') {
          isUp = true
        }
        removeAllGlobalListeners()
        incrementPressed.value = null
      },
      onPressEnd: (e: {pointerType: string}) => {
        const wasSpinning = isSpinning
        clearAsync()
        if (e.pointerType === 'touch') {
          if (!wasSpinning && isUp) {
            props.onIncrement?.()
          }
        }
        isUp = false
        incrementPressed.value = null
      },
      onFocus,
      onBlur,
    },
    decrementButtonProps: {
      onPressStart: (e: {pointerType: string}) => {
        clearAsync()
        if (e.pointerType !== 'touch') {
          props.onDecrement?.()
          decrementPressed.value = 'mouse'
        } else {
          addGlobalListener(window, 'pointercancel', onPointerCancel as unknown as EventListener, {
            capture: true,
          })
          isUp = false
          // For touch users, don't trigger a decrement on press start, we'll wait for the press end to trigger it if
          // the control isn't spinning.
          decrementPressed.value = 'touch'
        }
      },
      onPressUp: (e: {pointerType: string}) => {
        clearAsync()
        if (e.pointerType === 'touch') {
          isUp = true
        }
        removeAllGlobalListeners()
        decrementPressed.value = null
      },
      onPressEnd: (e: {pointerType: string}) => {
        const wasSpinning = isSpinning
        clearAsync()
        if (e.pointerType === 'touch') {
          if (!wasSpinning && isUp) {
            props.onDecrement?.()
          }
        }
        isUp = false
        decrementPressed.value = null
      },
      onFocus,
      onBlur,
    },
  }
}
