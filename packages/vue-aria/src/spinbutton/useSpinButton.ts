/*
 * Port of `react-aria@3.53.1` `useSpinButton`
 * (`packages/react-aria/src/spinbutton/useSpinButton.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. The press-and-hold long-press helpers of the official
 * implementation drive the increment/decrement buttons, which this slice does
 * not render (DateField segments only consume `spinButtonProps`), so only the
 * keyboard/live-region paths are ported. Internal — not publicly exported.
 */

import {computed, onScopeDispose, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocalizedStringFormatter} from '../i18n/useLocalizedStringFormatter'
import spinbuttonStrings from '../i18n/spinbuttonStrings'

// Minimal live announcer shared by the internal spinbutton port.
let liveRegion: HTMLElement | null = null

function announceSpin(message: string) {
  if (typeof document === 'undefined' || !message) return
  if (!liveRegion || !document.body.contains(liveRegion)) {
    liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'assertive')
    Object.assign(liveRegion.style, {
      border: '0',
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      height: '1px',
      margin: '-1px',
      overflow: 'hidden',
      padding: '0',
      position: 'absolute',
      width: '1px',
      whiteSpace: 'nowrap',
    })
    document.body.appendChild(liveRegion)
  }
  liveRegion.setAttribute('aria-live', 'assertive')
  liveRegion.textContent = ''
  setTimeout(() => {
    if (liveRegion) liveRegion.textContent = message
  }, 0)
}

function clearAnnouncerSpin() {
  if (liveRegion) liveRegion.textContent = ''
}

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

  const {keyboardProps} = useKeyboard({
    isDisabled: Boolean(toValue(props.isDisabled) || toValue(props.isReadOnly)),
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
      clearAnnouncerSpin()
      announceSpin(next)
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

  return {
    spinButtonProps,
    incrementButtonProps: {},
    decrementButtonProps: {},
  }
}
