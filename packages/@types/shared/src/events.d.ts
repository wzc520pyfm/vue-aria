export type PointerType = 'mouse' | 'pen' | 'touch'

export interface HoverEvent {
  /** The type of hover event being fired. */
  type: 'hoverstart' | 'hoverend'
  /** The pointer type that triggered the hover event. */
  pointerType: 'mouse' | 'pen'
  /** The target element of the hover event. */
  target: HTMLElement
}

export interface FocusEvents {
  /** Handler that is called when the element receives focus. */
  onFocus?: (e: FocusEvent) => void
  /** Handler that is called when the element loses focus. */
  onBlur?: (e: FocusEvent) => void
  /** Handler that is called when the element's focus status changes. */
  onFocusChange?: (isFocused: boolean) => void
}

export interface HoverEvents {
  /** Handler that is called when a hover interaction starts. */
  onHoverStart?: (e: HoverEvent) => void
  /** Handler that is called when a hover interaction ends. */
  onHoverEnd?: (e: HoverEvent) => void
  /** Handler that is called when the hover state changes. */
  onHoverChange?: (isHovering: boolean) => void
}
