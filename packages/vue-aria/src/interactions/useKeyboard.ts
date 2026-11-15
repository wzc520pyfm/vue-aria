/*
 * Copyright 2020 Adobe. All rights reserved. This file is licensed to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {toValue, type MaybeRefOrGetter} from 'vue'
import {chain} from '../utils/chain'
import {
  createKeyboardShortcutHandler,
  KeyboardShortcutBindings,
} from './createKeyboardShortcutHandler'

export interface KeyboardProps {
  /** Whether the keyboard events should be disabled. May be a live getter/ref. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
  /** Keyboard shortcuts to handle. Compatible extension of the existing hook. */
  shortcuts?: KeyboardShortcutBindings
  /** Whether to allow repeating keys. Only affects shortcuts. */
  allowRepeats?: boolean
  /** Whether to allow composing keys. Only affects shortcuts. */
  allowComposing?: boolean
}

export interface KeyboardResult {
  /** Props to spread onto the target element. Plain object. */
  keyboardProps: Record<string, any>
}

/**
 * Handles keyboard interactions for a focusable element.
 *
 * Vue port of official `useKeyboard` (react-aria@3.53.1): events are native DOM
 * KeyboardEvents attached directly to the element, so the official React-portal
 * `nodeContains(currentTarget, target)` guard and synthetic
 * `continuePropagation` mechanics do not apply — non-matching keys propagate
 * natively. Shortcut handlers run through `createKeyboardShortcutHandler`.
 * `isDisabled` is read live at event time (a boolean, ref, or getter is accepted)
 * so a field that becomes disabled after setup stops handling keys without a
 * remount — existing static boolean callers keep the same behavior.
 */
export function useKeyboard(props: KeyboardProps): KeyboardResult {
  // Live disabled check — never snapshot at setup. Early returning `{keyboardProps: {}}`
  // would freeze the setup-time disabled state, so handlers are always returned and the
  // flag is honored when the event fires instead.
  const isDisabled = () => Boolean(toValue(props.isDisabled))

  const {shortcuts, allowRepeats = false, allowComposing = false} = props

  let onKeyDown
  let onKeyUp
  if (shortcuts) {
    const shortcutHandler = createKeyboardShortcutHandler(shortcuts)
    const shortcutOnKeyDown = (e: KeyboardEvent) => {
      if (isDisabled()) {
        return
      }
      if (
        (e.repeat && !allowRepeats) ||
        (e.isComposing && !allowComposing)
      ) {
        return
      }
      shortcutHandler(e)
    }
    // Shortcuts only act on keydown; keyup handlers chain through unchanged.
    const shortcutOnKeyUp = props.onKeyUp ? props.onKeyUp : undefined
    onKeyDown = props.onKeyDown ? chain(props.onKeyDown, shortcutOnKeyDown) : shortcutOnKeyDown
    onKeyUp = shortcutOnKeyUp
  } else {
    onKeyDown = props.onKeyDown
    onKeyUp = props.onKeyUp
  }

  // Wrap so plain (non-shortcut) handlers respect a live disabled flag too —
  // mirrors the official early return, evaluated at event time instead of setup time.
  if (onKeyDown) {
    const userOnKeyDown = onKeyDown
    onKeyDown = (e: KeyboardEvent) => {
      if (isDisabled()) {
        return
      }
      userOnKeyDown(e)
    }
  }
  if (onKeyUp) {
    const userOnKeyUp = onKeyUp
    onKeyUp = (e: KeyboardEvent) => {
      if (isDisabled()) {
        return
      }
      userOnKeyUp(e)
    }
  }

  const keyboardProps: Record<string, any> = {}
  if (onKeyDown) {
    keyboardProps.onKeyDown = onKeyDown
    // Vue hyphenates `onKeyDown` to the non-existent `key-down` event; the
    // native DOM event is `keydown`. The codebase binds both (see
    // useCalendarGrid / useComboBox), and each real event fires exactly once.
    keyboardProps.onKeydown = onKeyDown
  }
  if (onKeyUp) {
    keyboardProps.onKeyUp = onKeyUp
    keyboardProps.onKeyup = onKeyUp
  }
  return {keyboardProps}
}
