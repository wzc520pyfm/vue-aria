/*
 * Port of `react-aria@3.53.1` `filterDOMProps`
 * (`packages/react-aria/src/utils/filterDOMProps.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported. Event names match both
 * React-style camelCase (`onMouseDown`) and Vue-style casing (`onMousedown`)
 * by comparing case-insensitively after the `on` prefix.
 */

const DOMPropNames = new Set(['id'])

const labelablePropNames = new Set([
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-details',
])

const globalAttrs = new Set([
  'dir',
  'lang',
  'hidden',
  'inert',
  'translate',
])

const globalEventNames = new Set([
  'click',
  'auxclick',
  'contextmenu',
  'dblclick',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'touchcancel',
  'touchend',
  'touchmove',
  'touchstart',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'pointerenter',
  'pointerleave',
  'pointerover',
  'pointerout',
  'gotpointercapture',
  'lostpointercapture',
  'scroll',
  'wheel',
  'animationstart',
  'animationend',
  'animationiteration',
  'transitioncancel',
  'transitionend',
  'transitionrun',
  'transitionstart',
])

interface Options {
  /**
   * If labelling associated aria properties should be included in the filter.
   */
  labelable?: boolean
  /**
   * Whether to include global DOM attributes.
   */
  global?: boolean
  /** Whether to include DOM events. Defaults to the `global` option. */
  events?: boolean
  /**
   * A Set of other property names that should be included in the filter.
   */
  propNames?: Set<string>
}

const propRe = /^(data-.*)$/

/**
 * Filters out all props that aren't valid DOM props or defined via override prop obj.
 *
 * @param props - The component props to be filtered.
 * @param opts - Props to override.
 */
export function filterDOMProps(
  props: Record<string, any>,
  opts: Options = {},
): Record<string, any> {
  const {labelable, global, events = global, propNames} = opts
  const filteredProps: Record<string, any> = {}

  for (const prop in props) {
    if (
      Object.prototype.hasOwnProperty.call(props, prop) &&
      (DOMPropNames.has(prop) ||
        (labelable && labelablePropNames.has(prop)) ||
        (global && globalAttrs.has(prop)) ||
        (events &&
          ((prop.startsWith('on') && globalEventNames.has(prop.slice(2).toLowerCase())) ||
            (prop.endsWith('Capture') &&
              prop.startsWith('on') &&
              globalEventNames.has(prop.slice(2, -7).toLowerCase())))) ||
        propNames?.has(prop) ||
        propRe.test(prop))
    ) {
      const value = props[prop]
      // Live getter convention: hook props carry getters for DOM values.
      // Event handlers stay functions; any other function under a DOM prop
      // key is a getter and must be evaluated (never stringified).
      const isEvent =
        (prop.startsWith('on') && globalEventNames.has(prop.slice(2).toLowerCase())) ||
        (prop.endsWith('Capture') &&
          prop.startsWith('on') &&
          globalEventNames.has(prop.slice(2, -7).toLowerCase()))
      filteredProps[prop] = typeof value === 'function' && !isEvent ? value() : value
    }
  }

  return filteredProps
}
