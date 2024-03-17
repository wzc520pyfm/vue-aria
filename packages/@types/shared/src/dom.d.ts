import type {HTMLAttributes} from 'vue'
import type {AriaRole} from './aria'

/** All html element. Welcome to add. */
export type ElementType =
  | 'div'
  | 'span'
  | 'p'
  | 'a'
  | 'input'
  | 'button'
  | 'img'
  | 'form'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'ul'
  | 'li'
  | 'table'
  | 'tr'
  | 'td'
  | 'th'
  | 'tbody'
  | 'thead'
  | 'tfoot'

/** Any focusable element, including both HTML and SVG elements. */
export interface FocusableElement extends HTMLElement, SVGElement {}

/** override attribute from dom. */
export interface DOMAttributes extends HTMLAttributes {
  /** the role value should be limit. */
  role?: AriaRole | undefined
}
