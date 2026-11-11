/**
 * Hero UI CSS-recognized interaction / structure attributes.
 * Boolean flags are omitted when false, and set to the string "true" when on
 * (matching official selectors such as [data-pressed="true"]).
 */
export interface HeroDataAttrs {
  'data-slot'?: string
  'data-pressed'?: 'true'
  'data-hovered'?: 'true'
  'data-focused'?: 'true'
  'data-focus-visible'?: 'true'
  'data-focus-within'?: 'true'
  'data-disabled'?: 'true'
  'data-pending'?: 'true'
  'data-selected'?: 'true'
  'data-entering'?: 'true'
  'data-exiting'?: 'true'
  'data-placement'?: string
  'data-invalid'?: 'true'
}

export interface InteractionState {
  slot?: string | null
  pressed?: boolean
  hovered?: boolean
  focused?: boolean
  focusVisible?: boolean
  focusWithin?: boolean
  disabled?: boolean
  pending?: boolean
  selected?: boolean
  entering?: boolean
  exiting?: boolean
  invalid?: boolean
  placement?: string | null
}

/**
 * Boolean-like data attribute: `"true"` when the condition is on, otherwise omitted.
 */
export const dataAttr = (condition: boolean | undefined) => (condition ? 'true' : undefined)

/**
 * String data attribute (e.g. `data-slot`, `data-placement`).
 * Omitted when the value is empty, null, or undefined.
 */
export const dataAttrValue = (value: string | number | null | undefined) =>
  value === undefined || value === null || value === '' ? undefined : String(value)

/**
 * Build Hero UI data-* attributes, emitting a key only when the state is active.
 * Boolean attribute values are the string `"true"`. False flags, an empty slot,
 * and a null/empty placement are omitted.
 */
export function toHeroDataAttrs(state: InteractionState): HeroDataAttrs {
  const attrs: HeroDataAttrs = {}

  if (state.slot) attrs['data-slot'] = state.slot
  if (state.pressed) attrs['data-pressed'] = 'true'
  if (state.hovered) attrs['data-hovered'] = 'true'
  if (state.focused) attrs['data-focused'] = 'true'
  if (state.focusVisible) attrs['data-focus-visible'] = 'true'
  if (state.focusWithin) attrs['data-focus-within'] = 'true'
  if (state.disabled) attrs['data-disabled'] = 'true'
  if (state.pending) attrs['data-pending'] = 'true'
  if (state.selected) attrs['data-selected'] = 'true'
  if (state.entering) attrs['data-entering'] = 'true'
  if (state.exiting) attrs['data-exiting'] = 'true'
  if (state.invalid) attrs['data-invalid'] = 'true'
  if (state.placement) attrs['data-placement'] = state.placement

  return attrs
}
