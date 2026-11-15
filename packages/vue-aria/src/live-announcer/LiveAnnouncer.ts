/*
 * Minimal live announcer shared by internal ports that need ARIA live regions
 * (`useSpinButton`, `useNumberField`). Internal — not publicly exported.
 *
 * Simplified single-region-per-assertiveness port of official
 * `react-aria/src/live-announcer/LiveAnnouncer.tsx`
 * (adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc);
 * messages replace the region contents after a macrotask so screen readers
 * pick up the change.
 */

export type Assertiveness = 'assertive' | 'polite'

const liveRegions: Record<Assertiveness, HTMLElement | null> = {
  assertive: null,
  polite: null,
}

function getLiveRegion(assertiveness: Assertiveness): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  let region = liveRegions[assertiveness]
  if (region && document.body.contains(region)) {
    return region
  }
  region = document.createElement('div')
  region.setAttribute('aria-live', assertiveness)
  Object.assign(region.style, {
    border: '0',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: '0',
    position: 'absolute',
    width: '1px',
    whiteSpace: 'nowrap',
  })
  document.body.appendChild(region)
  liveRegions[assertiveness] = region
  return region
}

export function announce(
  message: string | {'aria-labelledby': string},
  assertiveness: Assertiveness = 'assertive',
): void {
  if (typeof document === 'undefined') {
    return
  }
  const region = getLiveRegion(assertiveness)
  if (!region) {
    return
  }
  const text = typeof message === 'string' ? message : ''
  if (!text) {
    return
  }
  region.setAttribute('aria-live', assertiveness)
  region.textContent = ''
  setTimeout(() => {
    if (region.isConnected) {
      region.textContent = text
    }
  }, 0)
}

export function clearAnnouncer(assertiveness: Assertiveness): void {
  const region = liveRegions[assertiveness]
  if (region) {
    region.textContent = ''
  }
}
