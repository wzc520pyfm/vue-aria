import type {Component, HTMLAttributes} from 'vue'
import type {AriaRole} from './aria'

export type As = ElementType | Component

/** All html element and vue component. */
export type ElementType = keyof HTMLElementTagNameMap | Component

/** Any focusable element, including both HTML and SVG elements. */
export interface FocusableElement extends HTMLElement, SVGElement {}

/** override attribute from dom. */
export interface DOMAttributes extends HTMLAttributes {
  /** the role value should be limit. */
  role?: AriaRole | undefined
}
