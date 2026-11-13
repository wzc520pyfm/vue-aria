/*
 * Port of `react-aria@3.53.1` `useDatePickerGroup`
 * (`packages/react-aria/src/datepicker/useDatePickerGroup.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. The `setOpen` branches belong to the deferred DatePicker;
 * they are preserved for parity but no-ops for plain DateFieldState.
 * Internal — not publicly exported.
 */

import type {DateFieldState} from 'vue-stately/useDateFieldState'
import {getFocusableTreeWalker, createFocusManager} from '../focus/useFocusScope'
import {mergeProps} from '../utils/mergeProps'
import {useKeyboard} from '../interactions/useKeyboard'
import {useLocale} from '../i18n/I18nProvider'
import {usePress, type PressEvent} from '../interactions/press'
import type {Ref} from 'vue'

export function useDatePickerGroup(
  state: DateFieldState | any,
  ref: {value: Element | null} | Ref<Element | null>,
  disableArrowNavigation?: boolean,
): Record<string, any> {
  const {direction} = useLocale()
  const focusManager = createFocusManager(ref as Ref<Element | null>)

  const {keyboardProps} = useKeyboard({
    shortcuts: {
      'Alt+ArrowDown': () => {
        if ('setOpen' in state) {
          state.setOpen(true)
          return
        }
        return false
      },
      'Alt+ArrowUp': () => {
        if ('setOpen' in state) {
          state.setOpen(true)
          return
        }
        return false
      },
      ArrowLeft: (e) => {
        if (disableArrowNavigation) {
          return false
        }
        if (direction === 'rtl') {
          if (ref.value) {
            const target = getEventTarget(e) as HTMLElement | null
            const prev = target
              ? findNextSegment(ref.value, target.getBoundingClientRect().left, -1)
              : null

            if (prev) {
              prev.focus()
              return
            }
          }
        } else {
          focusManager.focusPrevious()
          return
        }
        return false
      },
      ArrowRight: (e) => {
        if (disableArrowNavigation) {
          return false
        }
        if (direction === 'rtl') {
          if (ref.value) {
            const target = getEventTarget(e) as HTMLElement | null
            const next = target
              ? findNextSegment(ref.value, target.getBoundingClientRect().left, 1)
              : null

            if (next) {
              next.focus()
              return
            }
          }
        } else {
          focusManager.focusNext()
          return
        }
        return false
      },
    },
    allowRepeats: true,
  })

  // Focus the first placeholder segment from the end on mouse down/touch up in the field.
  const focusLast = (target: Element | null) => {
    if (!ref.value) {
      return
    }
    // Try to find the segment prior to the element that was clicked on.
    const walker = getFocusableTreeWalker(ref.value as HTMLElement, {tabbable: true})
    if (target) {
      walker.currentNode = target as HTMLElement
      target = walker.previousNode()
    }

    // If no target found, find the last element from the end.
    if (!target) {
      let last: HTMLElement | null
      do {
        last = walker.lastChild()
        if (last) {
          target = last
        }
      } while (last)
    }

    // Now go backwards until we find an element that is not a placeholder.
    while (target?.hasAttribute('data-placeholder')) {
      const prev = walker.previousNode()
      if (prev && prev.hasAttribute('data-placeholder')) {
        target = prev
      } else {
        break
      }
    }

    if (target) {
      ;(target as HTMLElement).focus()
    }
  }

  // `preventFocusOnPress` / `allowTextSelectionOnPress` are no-ops in this port's
  // frozen `usePress` (the options are not part of its public options type).
  // They are spread in to match official and the existing `useCalendarCell`
  // call site, which passes the same options.
  const officialPressOptions = {
    preventFocusOnPress: true,
    allowTextSelectionOnPress: true,
  } as any
  const {pressProps} = usePress({
    ...officialPressOptions,
    onPressStart(e: PressEvent) {
      if (e.pointerType === 'mouse') {
        focusLast(e.target as Element | null)
      }
    },
    onPress(e: PressEvent) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        focusLast(e.target as Element | null)
      }
    },
  })

  return mergeProps(pressProps, keyboardProps)
}

function getEventTarget(e: Event): EventTarget | null {
  return e.target
}

function findNextSegment(group: Element, fromX: number, direction: number) {
  const walker = getFocusableTreeWalker(group as HTMLElement, {tabbable: true})
  let node = walker.nextNode()
  let closest: HTMLElement | null = null
  let closestDistance = Infinity
  while (node) {
    const x = (node as HTMLElement).getBoundingClientRect().left
    const distance = x - fromX
    const absoluteDistance = Math.abs(distance)
    if (Math.sign(distance) === direction && absoluteDistance < closestDistance) {
      closest = node
      closestDistance = absoluteDistance
    }
    node = walker.nextNode()
  }
  return closest
}
