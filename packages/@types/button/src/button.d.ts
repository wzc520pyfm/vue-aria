import type {ElementType, PressEvents} from '@nev-ui/types-shared'

export interface AriaBaseButtonProps {
  /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
  'aria-expanded'?: boolean | 'true' | 'false'
  /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | 'true' | 'false'
  /** Identifies the element (or elements) whose contents or presence are controlled by the current element. */
  'aria-controls'?: string
  /** Indicates the current "pressed" state of toggle buttons. */
  'aria-pressed'?: boolean | 'true' | 'false' | 'mixed'
  /**
   * The behavior of the button when used in an HTML form.
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset'
}

export interface AriaButtonElementTypeProps<T extends ElementType = 'button'> {
  /**
   * The HTML element or vue component used to render the button, e.g. 'div', 'a'.
   * @default 'button'
   */
  elementType?: T
}

export interface LinkButtonProps<T extends ElementType = 'button'>
  extends AriaButtonElementTypeProps<T> {
  /** A URL to link to if elementType="a". */
  href?: string
  /** The target window for the link. */
  target?: string
  /** The relationship between the linked resource and the current page. See [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel). */
  rel?: string
}

export interface AriaButtonProps<T extends ElementType = 'button'>
  extends PressEvents,
    AriaBaseButtonProps,
    LinkButtonProps<T> {}

export interface AriaButtonEvents extends PressEvents {}
