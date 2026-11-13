/*
 * Port of `react-aria@3.53.1` `useDateSegment`
 * (`packages/react-aria/src/datepicker/useDateSegment.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: the segment is read through a live getter (the state
 * replaces segment objects on every update), beforeinput/input/selectionchange
 * listeners are attached directly to the segment element, and `segmentProps`
 * is a plain object backed by live getters. Internal — not publicly exported
 * beyond `exports/useDateField`.
 */

import {CalendarDate, toCalendar} from '@internationalized/date'
import {NumberParser} from '@internationalized/number'
import type {DateFieldState, DateSegment} from 'vue-stately/useDateFieldState'
import {getScrollParent, scrollIntoViewport} from '../datepicker/scrollIntoView'
import {hookData} from './useDateField'
import {isIOS} from '../utils/platform'
import {mergeProps} from '../utils/mergeProps'
import {useDateFormatter} from '../i18n/useDateFormatter'
import {useDisplayNames} from './useDisplayNames'
import {useFilter} from '../i18n/useFilter'
import {useId} from '../utils/useId'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocale} from '../i18n/I18nProvider'
import {useSpinButton} from '../spinbutton/useSpinButton'
import {computed, onBeforeUnmount, onMounted, toValue, type MaybeRefOrGetter, type Ref} from 'vue'

export interface DateSegmentAria {
  /** Props for the segment element. Plain object. */
  segmentProps: Record<string, any>
}

/**
 * Provides the behavior and accessibility implementation for a segment in a date field.
 * A date segment displays an individual unit of a date and time, and allows users to edit
 * the value by typing or using the arrow keys to increment and decrement.
 */
export function useDateSegment(
  segment: MaybeRefOrGetter<DateSegment>,
  state: DateFieldState,
  ref: Ref<HTMLElement | null>,
): DateSegmentAria {
  const enteredKeys = {current: ''}
  const seg = () => toValue(segment)
  const {locale, direction} = useLocale()
  const displayNames = useDisplayNames()
  const hookDataValue = hookData.get(state)
  if (!hookDataValue) {
    throw new Error('useDateSegment must be used within a field (DateField/TimeField)')
  }
  const {ariaLabel, ariaLabelledBy, ariaDescribedBy, focusManager} = {
    get ariaLabel() {
      return hookData.get(state)?.ariaLabel
    },
    get ariaLabelledBy() {
      return hookData.get(state)?.ariaLabelledBy
    },
    get ariaDescribedBy() {
      return hookData.get(state)?.ariaDescribedBy
    },
    focusManager: hookDataValue.focusManager,
  }

  // Formatters are created eagerly in setup (hooks/inject only run there) with
  // live options so the time zone and locale stay current (official useMemo).
  const options = () => state.dateFormatter.resolvedOptions()
  const monthDateFormatter = useDateFormatter(() => ({month: 'long', timeZone: options().timeZone}))
  const hourDateFormatter = useDateFormatter(() => ({
    hour: 'numeric',
    hour12: options().hour12,
    timeZone: options().timeZone,
  }))

  const textValue = () => {
    const s = seg()
    let value = s.isPlaceholder ? '' : s.text
    if (s.type === 'month' && !s.isPlaceholder) {
      const monthTextValue = monthDateFormatter.format(state.dateValue)
      value = monthTextValue !== value ? `${value} – ${monthTextValue}` : monthTextValue
    } else if (s.type === 'hour' && !s.isPlaceholder) {
      value = hourDateFormatter.format(state.dateValue)
    }
    return value
  }

  const {spinButtonProps} = useSpinButton({
    // The ARIA spec says aria-valuenow is optional if there's no value, but aXe seems to require it.
    // This doesn't seem to have any negative effects with real AT since we also use aria-valuetext.
    // https://github.com/dequelabs/axe-core/issues/3505
    value: () => seg().value ?? undefined,
    textValue,
    minValue: () => seg().minValue,
    maxValue: () => seg().maxValue,
    isDisabled: () => state.isDisabled,
    isReadOnly: () => state.isReadOnly || !seg().isEditable,
    isRequired: () => state.isRequired,
    onIncrement: () => {
      enteredKeys.current = ''
      state.increment(seg().type)
    },
    onDecrement: () => {
      enteredKeys.current = ''
      state.decrement(seg().type)
    },
    onIncrementPage: () => {
      enteredKeys.current = ''
      state.incrementPage(seg().type)
    },
    onDecrementPage: () => {
      enteredKeys.current = ''
      state.decrementPage(seg().type)
    },
    onIncrementToMax: () => {
      enteredKeys.current = ''
      state.incrementToMax(seg().type)
    },
    onDecrementToMin: () => {
      enteredKeys.current = ''
      state.decrementToMin(seg().type)
    },
  })

  const parser = new NumberParser(locale, {maximumFractionDigits: 0})

  const backspace = () => {
    const s = seg()
    if (s.text === s.placeholder) {
      focusManager.focusPrevious()
    }
    if (parser.isValidPartialNumber(s.text) && !state.isReadOnly && !s.isPlaceholder) {
      let newValue = s.text.slice(0, -1)
      const parsed = parser.parse(newValue)
      newValue = parsed === 0 ? '' : newValue
      if (newValue.length === 0 || parsed === 0) {
        state.clearSegment(s.type)
      } else {
        state.setSegment(s.type, parsed)
      }
      enteredKeys.current = newValue
    } else if (s.type === 'dayPeriod' || s.type === 'era') {
      state.clearSegment(s.type)
    }
  }

  const {keyboardProps} = useKeyboard({
    shortcuts: {
      Backspace: () => {
        backspace()
      },
      Delete: () => {
        backspace()
      },
      'Mod+a': () => {
        // Firefox does not fire selectstart for Ctrl/Cmd + A
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1742153
      },
    },
    allowRepeats: true,
  })

  // Safari dayPeriod option doesn't work...
  const {startsWith} = useFilter({sensitivity: 'base'})
  const amPmFormatter = useDateFormatter({hour: 'numeric', hour12: true})
  const am = computed(() => {
    const date = new Date()
    date.setHours(0)
    return (
      amPmFormatter.formatToParts(date).find((part) => part.type === 'dayPeriod')?.value ?? ''
    )
  })

  const pm = computed(() => {
    const date = new Date()
    date.setHours(12)
    return (
      amPmFormatter.formatToParts(date).find((part) => part.type === 'dayPeriod')?.value ?? ''
    )
  })

  // Get a list of formatted era names so users can type the first character to choose one.
  const eraFormatter = useDateFormatter({year: 'numeric', era: 'narrow', timeZone: 'UTC'})
  const eras = computed(() => {
    const s = seg()
    if (s.type !== 'era') {
      return []
    }

    const date = toCalendar(new CalendarDate(1, 1, 1), state.calendar)
    const eraList = state.calendar.getEras().map((era: string) => {
      const eraDate = date.set({year: 1, month: 1, day: 1, era} as any).toDate('UTC')
      const parts = eraFormatter.formatToParts(eraDate)
      // Some eras have no localized name in CLDR (e.g. the Coptic 'BCE' era), in which case
      // Intl omits the era part entirely. Fall back to the era identifier so it stays typeable.
      const formatted = parts.find((p) => p.type === 'era')?.value ?? era
      return {era, formatted}
    })

    // Remove the common prefix from formatted values. This is so that in calendars with eras like
    // ERA0 and ERA1 (e.g. Ethiopic), users can press "0" and "1" to select an era. In other cases,
    // the first letter is used.
    const prefixLength = commonPrefixLength(eraList.map((era) => era.formatted))
    if (prefixLength) {
      for (const era of eraList) {
        era.formatted = era.formatted.slice(prefixLength)
      }
    }

    return eraList
  })

  const onInput = (key: string) => {
    if (state.isDisabled || state.isReadOnly) {
      return
    }

    const s = seg()
    const newValue = enteredKeys.current + key

    switch (s.type) {
      case 'dayPeriod':
        if (startsWith(am.value, key)) {
          state.setSegment('dayPeriod', 0)
        } else if (startsWith(pm.value, key)) {
          state.setSegment('dayPeriod', 1)
        } else {
          break
        }
        focusManager.focusNext()
        break
      case 'era': {
        const matched = eras.value.find((e) => startsWith(e.formatted, key))
        if (matched) {
          state.setSegment('era', matched.era)
          focusManager.focusNext()
        }
        break
      }
      case 'day':
      case 'hour':
      case 'minute':
      case 'second':
      case 'month':
      case 'year': {
        if (!parser.isValidPartialNumber(newValue)) {
          return
        }

        const numberValue = parser.parse(newValue)
        let segmentValue = numberValue
        if (s.maxValue !== undefined && numberValue > s.maxValue) {
          segmentValue = parser.parse(key)
        }

        if (isNaN(numberValue)) {
          return
        }

        state.setSegment(s.type, segmentValue)

        if (
          s.maxValue !== undefined &&
          (Number(numberValue + '0') > s.maxValue ||
            newValue.length >= String(s.maxValue).length)
        ) {
          enteredKeys.current = ''
          focusManager.focusNext()
        } else {
          enteredKeys.current = newValue
        }
        break
      }
    }
  }

  const onFocus = () => {
    enteredKeys.current = ''
    const el = ref.value
    if (el) {
      scrollIntoViewport(el, {containingElement: getScrollParent(el)})
    }

    // Collapse selection to start or Chrome won't fire input events.
    const selection = window.getSelection()
    selection?.collapse(el as Node)
  }

  const onSelectionChange = () => {
    // Enforce that the selection is collapsed when inside a date segment.
    // Otherwise, when tapping on a segment in Android Chrome and then entering text,
    // composition events will be fired that break the DOM structure and crash the page.
    const selection = window.getSelection()
    // Only collapse while focused, otherwise a stale anchor left in the segment (e.g. on Firefox)
    // steals focus back into it on selectionchange. See #10259.
    const el = ref.value
    if (
      selection?.anchorNode &&
      el &&
      el.contains(selection.anchorNode) &&
      document.activeElement === el
    ) {
      selection.collapse(el)
    }
  }

  const onBeforeInput = (e: Event) => {
    const el = ref.value
    if (!el) {
      return
    }
    const event = e as InputEvent
    event.preventDefault()
    const s = seg()

    switch (event.inputType) {
      case 'deleteContentBackward':
      case 'deleteContentForward':
        if (parser.isValidPartialNumber(s.text) && !state.isReadOnly) {
          backspace()
        }
        break
      case 'insertCompositionText': {
        // insertCompositionText cannot be canceled.
        // Record the current state of the element so we can restore it in the `input` event below.
        compositionRef.current = el.textContent

        // Safari gets stuck in a composition state unless we also assign to the value here.
        el.textContent = el.textContent
        break
      }
      default:
        if (event.data != null) {
          onInput(event.data)
        }
        break
    }
  }

  const compositionRef = {current: '' as string | null}
  const onInputEvent = (e: Event) => {
    const event = e as InputEvent
    const {inputType, data} = event
    switch (inputType) {
      case 'insertCompositionText': {
        // Reset the DOM to how it was in the beforeinput event.
        if (ref.value) {
          ref.value.textContent = compositionRef.current
        }

        // Android sometimes fires key presses of letters as composition events. Need to handle am/pm keys here too.
        // Can also happen e.g. with Pinyin keyboard on iOS.
        if (data != null && (startsWith(am.value, data) || startsWith(pm.value, data))) {
          onInput(data)
        }
        break
      }
    }
  }

  onMounted(() => {
    const el = ref.value
    if (!el) {
      return
    }
    document.addEventListener('selectionchange', onSelectionChange)
    el.addEventListener('beforeinput', onBeforeInput)
    el.addEventListener('input', onInputEvent)
  })

  onBeforeUnmount(() => {
    const el = ref.value
    document.removeEventListener('selectionchange', onSelectionChange)
    if (el) {
      el.removeEventListener('beforeinput', onBeforeInput)
      el.removeEventListener('input', onInputEvent)

      // If the focused segment is removed, focus the previous one, or the next one if there was no previous one.
      if (document.activeElement === el) {
        const prev = focusManager.focusPrevious()
        if (!prev) {
          focusManager.focusNext()
        }
      }
    }
  })

  // spinbuttons cannot be focused with VoiceOver on iOS.
  const useTouchPropOverrides = isIOS() || seg().type === 'timeZoneName'

  const id = useId()
  const isEditable = () => !state.isDisabled && !state.isReadOnly && seg().isEditable

  // Prepend the label passed from the field to each segment name.
  // This is needed because VoiceOver on iOS does not announce groups.
  // Mirrors official `useLabels`, evaluated lazily so changes to the field's
  // labels after mount stay live (hookData getters are live).
  const labelProps: Record<string, any> = {}
  Object.defineProperties(labelProps, {
    id: {get: () => id.value, enumerable: true, configurable: true},
    'aria-label': {
      get: () => {
        const s = seg()
        const name = s.type === 'literal' ? '' : displayNames.of(s.type)
        const composedLabel = `${name}${ariaLabel ? `, ${ariaLabel}` : ''}${
          ariaLabelledBy ? ', ' : ''
        }`
        return composedLabel
      },
      enumerable: true,
      configurable: true,
    },
    'aria-labelledby': {
      get: () => {
        let resolvedLabelledBy = ariaLabelledBy?.trim()
        if (resolvedLabelledBy) {
          resolvedLabelledBy = resolvedLabelledBy.split(/\s+/).filter(Boolean).join(' ')
        }
        return resolvedLabelledBy || undefined
      },
      enumerable: true,
      configurable: true,
    },
  })

  // Literal segments should not be visible to screen readers.
  if (seg().type === 'literal') {
    return {
      segmentProps: {
        'aria-hidden': true,
      },
    }
  }

  const segmentStyle = (): Record<string, string> => {
    const style: Record<string, string> = {caretColor: 'transparent'}
    if (direction === 'rtl') {
      // While the bidirectional algorithm seems to work properly on inline elements with actual values, it returns different results for placeholder strings.
      // To ensure placeholder render in correct format, we apply the CSS equivalent of LRE (left-to-right embedding). See https://www.unicode.org/reports/tr9/#Explicit_Directional_Embeddings.
      // However, we apply this to both placeholders and date segments with an actual value because the date segments will shift around when deleting otherwise.
      style.unicodeBidi = 'embed'
      const s = seg()
      const format = (options() as any)[s.type]
      if (format === 'numeric' || format === '2-digit') {
        style.direction = 'ltr'
      }
    }
    return style
  }

  // Live attr accessors for the vnode props object (Vue reads them at render
  // time; plain function values would be stringified into the DOM).
  const liveAttrs: Record<string, any> = {}
  Object.defineProperties(liveAttrs, {
    id: {get: () => id.value, enumerable: true, configurable: true},
    'aria-invalid': {
      get: () => (state.isInvalid ? 'true' : undefined),
      enumerable: true,
      configurable: true,
    },
    'aria-describedby': {
      get: () => {
        // Only apply aria-describedby to the first segment, unless the field is invalid. This avoids it being
        // read every time the user navigates to a new segment.
        const firstSegment = state.segments.find((s) => s.isEditable)
        const described = seg() === firstSegment || state.isInvalid
        return described ? ariaDescribedBy : undefined
      },
      enumerable: true,
      configurable: true,
    },
    'aria-readonly': {
      get: () => (state.isReadOnly || !seg().isEditable ? 'true' : undefined),
      enumerable: true,
      configurable: true,
    },
    'data-placeholder': {
      get: () => (seg().isPlaceholder ? 'true' : undefined),
      enumerable: true,
      configurable: true,
    },
    contentEditable: {
      get: () => (isEditable() ? true : undefined),
      enumerable: true,
      configurable: true,
    },
    spellcheck: {
      get: () => (isEditable() ? 'false' : undefined),
      enumerable: true,
      configurable: true,
    },
    autoCorrect: {
      get: () => (isEditable() ? 'off' : undefined),
      enumerable: true,
      configurable: true,
    },
    enterKeyHint: {
      get: () => (isEditable() ? 'next' : undefined),
      enumerable: true,
      configurable: true,
    },
    inputMode: {
      get: () =>
        state.isDisabled || seg().type === 'dayPeriod' || seg().type === 'era' || !isEditable()
          ? undefined
          : 'numeric',
      enumerable: true,
      configurable: true,
    },
    tabindex: {
      get: () => (state.isDisabled ? undefined : 0),
      enumerable: true,
      configurable: true,
    },
  })

  const segmentProps = mergeProps(
    spinButtonProps,
    liveAttrs,
    labelProps,
    {
      // touch prop overrides (iOS textbox mode)
      ...(useTouchPropOverrides
        ? {
            role: 'textbox',
            'aria-valuemax': null,
            'aria-valuemin': null,
            'aria-valuetext': null,
            'aria-valuenow': null,
          }
        : {}),
      ...keyboardProps,
      onFocus,
      style: segmentStyle(),
      // Prevent pointer events from reaching useDatePickerGroup, and allow native browser behavior to focus the segment.
      onPointerdown: (e: Event) => {
        e.stopPropagation()
      },
      onMousedown: (e: Event) => {
        e.stopPropagation()
      },
    },
  )

  return {segmentProps}
}

function commonPrefixLength(strings: string[]): number {
  // Sort the strings, and compare the characters in the first and last to find the common prefix.
  strings.sort()
  const first = strings[0]
  const last = strings[strings.length - 1]
  for (let i = 0; i < first.length; i++) {
    if (first[i] !== last[i]) {
      return i
    }
  }
  return 0
}
