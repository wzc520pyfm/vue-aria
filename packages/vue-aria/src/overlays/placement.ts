/**
 * Official `Placement` strings from react-aria@3.53.1
 * (`packages/react-aria/src/overlays/useOverlayPosition.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 *
 * Official uses space-separated values (`'top start'`), not hyphens.
 * Hyphenated aliases (`'top-start'`) are also accepted as a convenience.
 */
export type Placement =
  | 'bottom'
  | 'bottom left'
  | 'bottom right'
  | 'bottom start'
  | 'bottom end'
  | 'top'
  | 'top left'
  | 'top right'
  | 'top start'
  | 'top end'
  | 'left'
  | 'left top'
  | 'left bottom'
  | 'start'
  | 'start top'
  | 'start bottom'
  | 'right'
  | 'right top'
  | 'right bottom'
  | 'end'
  | 'end top'
  | 'end bottom'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end'

export type Axis = 'top' | 'bottom' | 'left' | 'right'
export type PlacementAxis = Axis | 'center'

export interface PlacementResult {
  /** Resolved main-axis placement, used for `data-placement`. */
  placement: PlacementAxis
  style: {
    position: 'fixed'
    top: string
    left: string
  }
}

interface ParsedPlacement {
  axis: Axis
  cross: 'center' | 'start' | 'end'
}

function normalizePlacement(placement: string): string {
  return placement.trim().replace(/-/g, ' ')
}

function mapStartEnd(token: string): 'start' | 'end' | 'center' | Axis | 'left' | 'right' {
  return token as 'start' | 'end' | Axis
}

export function parsePlacement(placement: string, direction: 'ltr' | 'rtl' = 'ltr'): ParsedPlacement {
  const tokens = normalizePlacement(placement).split(/\s+/).filter(Boolean)
  let main = tokens[0] || 'bottom'
  let crossToken = tokens[1]

  if (main === 'start') main = direction === 'rtl' ? 'right' : 'left'
  if (main === 'end') main = direction === 'rtl' ? 'left' : 'right'

  const axis: Axis =
    main === 'top' || main === 'bottom' || main === 'left' || main === 'right' ? main : 'bottom'

  let cross: 'center' | 'start' | 'end' = 'center'
  if (crossToken === 'start' || crossToken === 'end') {
    cross = crossToken
  } else if (crossToken === 'left' || crossToken === 'top') {
    cross = 'start'
  } else if (crossToken === 'right' || crossToken === 'bottom') {
    cross = 'end'
  }
  void mapStartEnd
  return {axis, cross}
}

function flipAxis(axis: Axis): Axis {
  switch (axis) {
    case 'top':
      return 'bottom'
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
  }
}

/**
 * Minimal in-tree placement (no `@floating-ui/dom`, no Reka). Positions the
 * overlay with `position: fixed` relative to the trigger's viewport rect.
 * Flip is a simple viewport overflow check on the main axis only; collision
 * avoidance on the cross axis is not a full official `calculatePosition` port
 * (no arrow mid-point clamping, no scroll-parent containers).
 */
export function computePosition(options: {
  trigger: Element
  overlay: HTMLElement
  placement?: string
  offset?: number
  shouldFlip?: boolean
}): PlacementResult {
  const {trigger, overlay, offset = 0, shouldFlip = true} = options
  const parsed = parsePlacement(options.placement || 'bottom')
  const triggerRect = trigger.getBoundingClientRect()
  const overlayRect = overlay.getBoundingClientRect()
  const width = overlayRect.width || overlay.offsetWidth || 0
  const height = overlayRect.height || overlay.offsetHeight || 0

  function coords(axis: Axis): {top: number; left: number} {
    let top = 0
    let left = 0
    if (axis === 'bottom') {
      top = triggerRect.bottom + offset
    } else if (axis === 'top') {
      top = triggerRect.top - height - offset
    } else if (axis === 'left') {
      left = triggerRect.left - width - offset
    } else {
      left = triggerRect.right + offset
    }

    if (axis === 'top' || axis === 'bottom') {
      if (parsed.cross === 'start') {
        left = triggerRect.left
      } else if (parsed.cross === 'end') {
        left = triggerRect.right - width
      } else {
        left = triggerRect.left + triggerRect.width / 2 - width / 2
      }
    } else {
      if (parsed.cross === 'start') {
        top = triggerRect.top
      } else if (parsed.cross === 'end') {
        top = triggerRect.bottom - height
      } else {
        top = triggerRect.top + triggerRect.height / 2 - height / 2
      }
    }
    return {top, left}
  }

  let axis = parsed.axis
  let {top, left} = coords(axis)

  if (shouldFlip) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0
    const overflows =
      (axis === 'bottom' && top + height > vh) ||
      (axis === 'top' && top < 0) ||
      (axis === 'right' && left + width > vw) ||
      (axis === 'left' && left < 0)
    if (overflows && (vw > 0 || vh > 0)) {
      const flipped = flipAxis(axis)
      const next = coords(flipped)
      const flippedOverflows =
        (flipped === 'bottom' && next.top + height > vh) ||
        (flipped === 'top' && next.top < 0) ||
        (flipped === 'right' && next.left + width > vw) ||
        (flipped === 'left' && next.left < 0)
      if (!flippedOverflows || isLessOverflow(next, flipped, width, height, vw, vh, {top, left}, axis)) {
        axis = flipped
        top = next.top
        left = next.left
      }
    }
  }

  return {
    placement: axis,
    style: {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
    },
  }
}

function isLessOverflow(
  next: {top: number; left: number},
  flipped: Axis,
  width: number,
  height: number,
  vw: number,
  vh: number,
  current: {top: number; left: number},
  axis: Axis,
) {
  const overflow = (t: number, l: number, a: Axis) => {
    if (a === 'bottom') return Math.max(0, t + height - vh)
    if (a === 'top') return Math.max(0, -t)
    if (a === 'right') return Math.max(0, l + width - vw)
    return Math.max(0, -l)
  }
  return overflow(next.top, next.left, flipped) < overflow(current.top, current.left, axis)
}
