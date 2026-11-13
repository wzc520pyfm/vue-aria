/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

export interface KeyboardProps {
  /** Whether the keyboard events should be disabled. */
  isDisabled?: boolean
  onKeyDown?: (e: KeyboardEvent) => void
  onKeyUp?: (e: KeyboardEvent) => void
}

export interface KeyboardResult {
  /** Props to spread onto the target element. Plain object. */
  keyboardProps: Record<string, any>
}

/**
 * Handles keyboard interactions for a focusable element.
 * Minimal port of official `useKeyboard` (react-aria@3.53.1).
 */
export function useKeyboard(props: KeyboardProps): KeyboardResult {
  if (props.isDisabled) {
    return {keyboardProps: {}}
  }
  const keyboardProps: Record<string, any> = {}
  if (props.onKeyDown) keyboardProps.onKeyDown = props.onKeyDown
  if (props.onKeyUp) keyboardProps.onKeyUp = props.onKeyUp
  return {keyboardProps}
}
