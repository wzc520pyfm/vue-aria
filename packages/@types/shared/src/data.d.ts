/**
 * Hero UI CSS-recognized interaction / structure attributes.
 * Boolean flags are omitted when false, and set to the string "true" when on.
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

/** @deprecated Use HeroDataAttrs keys instead. Kept as a union of official names. */
export type DataStateAttrName = keyof HeroDataAttrs
