/*
 * Port of `react-aria@3.53.1` platform checks
 * (`packages/react-aria/src/utils/platform.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Internal — not part of the public surface.
 */

function testUserAgent(re: RegExp) {
  if (typeof window === 'undefined' || window.navigator == null) {
    return false
  }
  const brands = (window.navigator as any)['userAgentData']?.brands
  return (
    (Array.isArray(brands) &&
      brands.some((brand: {brand: string; version: string}) => re.test(brand.brand))) ||
    re.test(window.navigator.userAgent)
  )
}

function testPlatform(re: RegExp) {
  return typeof window !== 'undefined' && window.navigator != null
    ? re.test((window.navigator as any)['userAgentData']?.platform || window.navigator.platform)
    : false
}

function cached(fn: () => boolean) {
  let res: boolean | null = null
  return () => {
    if (res == null) {
      res = fn()
    }
    return res
  }
}

export const isMac: () => boolean = cached(function () {
  return testPlatform(/^Mac/i)
})

export const isIPhone: () => boolean = cached(function () {
  return testPlatform(/^iPhone/i)
})

export const isIPad: () => boolean = cached(function () {
  return (
    testPlatform(/^iPad/i) ||
    // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
    (isMac() && navigator.maxTouchPoints > 1)
  )
})

export const isIOS: () => boolean = cached(function () {
  return isIPhone() || isIPad()
})
