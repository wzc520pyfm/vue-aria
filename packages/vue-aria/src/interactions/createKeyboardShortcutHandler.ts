/*
 * Port of `react-aria@3.53.1` `createKeyboardShortcutHandler`
 * (`packages/react-aria/src/interactions/createKeyboardShortcutHandler.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for native DOM KeyboardEvents: there is no React synthetic
 * `continuePropagation` — non-matching keys simply propagate natively, and
 * handlers preventDefault per the official result semantics. Internal.
 */

import {isMac} from '../utils/platform'

export type KeyboardShortcutAction = (
  e: KeyboardEvent,
) =>
  | void
  | boolean
  | Partial<{shouldContinuePropagation?: boolean; shouldPreventDefault?: boolean}>

/** Maps shortcut strings (e.g. `"Mod+s"`, `"Control+Shift+a"`) to handlers. */
export type KeyboardShortcutBindings = Record<string, KeyboardShortcutAction>

/** Modifier names in shortcut strings (case-insensitive). Order in the string does not matter. */
const MODIFIER_NAMES = new Set([
  'shift',
  'alt',
  'control',
  'meta',
  'mod', // OS dependent - Cmd on Mac, Control on Windows/Linux
])

/** Canonical modifier order for stable keys (sorted, fixed order). */
const CANONICAL_MODIFIER_ORDER = ['Alt', 'Control', 'Meta', 'Shift'] as const

export interface ParsedKeyboardShortcut {
  shift: boolean
  alt: boolean
  ctrl: boolean
  meta: boolean
  /**
   * Platform primary: Cmd on Mac, Control on Windows/Linux — expands to Meta or Control in
   * canonical form.
   */
  mod: boolean
  key: string
}

/**
 * Builds the set of canonical modifier tokens for a binding.
 * `Mod` contributes Meta (Mac) or Ctrl (non-Mac); explicit Ctrl/Meta add those keys too.
 */
export function modifierSetFromParsed(parsed: ParsedKeyboardShortcut): Set<string> {
  const set = new Set<string>()
  if (parsed.alt) {
    set.add('Alt')
  }
  if (parsed.shift) {
    set.add('Shift')
  }
  if (parsed.ctrl) {
    set.add('Control')
  }
  if (parsed.meta) {
    set.add('Meta')
  }
  if (parsed.mod) {
    set.add(isMac() ? 'Meta' : 'Control')
  }
  return set
}

/** Modifier set from a keydown event (native flags only). */
export function modifierSetFromEvent(e: KeyboardEvent): Set<string> {
  const set = new Set<string>()
  if (e.altKey) {
    set.add('Alt')
  }
  if (e.ctrlKey) {
    set.add('Control')
  }
  if (e.metaKey) {
    set.add('Meta')
  }
  if (e.shiftKey) {
    set.add('Shift')
  }
  return set
}

function sortedModifierTokens(set: Set<string>): string[] {
  return CANONICAL_MODIFIER_ORDER.filter((name) => set.has(name))
}

/**
 * Parses a shortcut like `"Mod+Shift+z"`, `"Ctrl+Alt+Enter"`, or `"Escape"`.
 * Modifiers are case-insensitive; order does not matter. `control` is an alias for `ctrl`.
 */
export function parseKeyboardShortcut(spec: string): ParsedKeyboardShortcut {
  const parts = spec.split('+').reduce<ParsedKeyboardShortcut>(
    (prev, part) => {
      const lower = part.toLowerCase()
      if (MODIFIER_NAMES.has(lower)) {
        if (lower === 'shift') {
          prev.shift = true
        } else if (lower === 'alt') {
          prev.alt = true
        } else if (lower === 'control') {
          prev.ctrl = true
        } else if (lower === 'meta') {
          prev.meta = true
        } else if (lower === 'mod') {
          prev.mod = true
        }
      } else {
        prev.key = part
      }
      return prev
    },
    {shift: false, alt: false, ctrl: false, meta: false, mod: false, key: ''},
  )
  if (parts.key === '') {
    throw new Error(
      `Invalid keyboard shortcut: "${spec}". Must include exactly one non-modifier key (e.g. "a", "Enter", "ArrowDown"). Combine any of Shift, Alt, Ctrl, Meta, and Mod.`,
    )
  }
  return parts
}

function normalizeEventKey(key: string): string {
  return key.toLowerCase()
}

/** Short aliases for common keys (shortcut side, before match). */
const KEY_ALIASES: Record<string, string> = {
  space: ' ',
  esc: 'escape',
  del: 'delete',
  ins: 'insert',
  left: 'arrowleft',
  right: 'arrowright',
  up: 'arrowup',
  down: 'arrowdown',
  pageup: 'pageup',
  pagedown: 'pagedown',
}

/** Canonical key segment (lowercase); aliases like `down` → `arrowdown`. */
function canonicalKeyFromSpecKey(specKey: string): string {
  const k = normalizeEventKey(specKey)
  const aliased = KEY_ALIASES[k]
  return aliased != null ? aliased : k
}

/** Canonical shortcut string for a binding (modifiers sorted: Alt, Ctrl, Meta, Shift, then key). */
export function canonicalKeyboardShortcut(parsed: ParsedKeyboardShortcut): string {
  const mods = sortedModifierTokens(modifierSetFromParsed(parsed))
  const key = canonicalKeyFromSpecKey(parsed.key)
  return mods.length > 0 ? `${mods.join('+')}+${key}` : key
}

/** Canonical shortcut string for a keydown event. */
export function keyboardEventToCanonicalShortcut(e: KeyboardEvent): string {
  const mods = sortedModifierTokens(modifierSetFromEvent(e))
  const key = normalizeEventKey(e.key)
  const prefix = mods.length > 0 ? `${mods.join('+')}+` : ''
  return prefix + key
}

/**
 * Returns a keydown handler that runs the action only for an exact modifier+key match.
 * Modifier order in the string does not matter (`Shift+Mod+a` ≡ `Mod+Shift+a`).
 * Any combination of **Shift**, **Alt**, **Ctrl**, **Meta**, and **Mod** is allowed; **Mod** means
 * Cmd on Apple platforms and Ctrl on Windows/Linux. **control** aliases **ctrl**.
 *
 * Result semantics match the official handler:
 * - `undefined` → preventDefault (stop further handling of this key)
 * - `true` → preventDefault; `false` → no preventDefault
 * - object → honor `shouldPreventDefault` / `shouldContinuePropagation`
 */
export function createKeyboardShortcutHandler(
  bindings: KeyboardShortcutBindings,
): (e: KeyboardEvent) => void {
  const map = new Map<string, KeyboardShortcutAction>()
  for (const [spec, action] of Object.entries(bindings)) {
    const parsed = parseKeyboardShortcut(spec)
    map.set(canonicalKeyboardShortcut(parsed), action)
  }

  return (e: KeyboardEvent) => {
    const canonical = keyboardEventToCanonicalShortcut(e)
    const action = map.get(canonical)
    let result = action?.(e)
    if (result === undefined && action !== undefined) {
      result = {shouldContinuePropagation: false, shouldPreventDefault: true}
    } else if (typeof result === 'boolean') {
      result = {shouldContinuePropagation: !result, shouldPreventDefault: result}
    }
    if (result?.shouldPreventDefault) {
      e.preventDefault()
    }
    // Native DOM events propagate on their own; `shouldContinuePropagation` is
    // meaningful only when an outer handler chains through `chain()`, which reads
    // the returned value itself. Nothing further is required here.
  }
}
