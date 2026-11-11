// jsdom may not implement PointerEvent. Polyfill it so usePress / useHover
// take the same pointer path that browsers rely on.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    pointerType: string
    isPrimary: boolean
    width: number
    height: number
    pressure: number
    tiltX: number
    tiltY: number
    twist: number

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? ''
      this.isPrimary = params.isPrimary ?? true
      this.width = params.width ?? 0
      this.height = params.height ?? 0
      this.pressure = params.pressure ?? 0
      this.tiltX = params.tiltX ?? 0
      this.tiltY = params.tiltY ?? 0
      this.twist = params.twist ?? 0
    }
  }

  Object.defineProperty(globalThis, 'PointerEvent', {
    value: PointerEventPolyfill,
    writable: true,
    configurable: true,
  })
}
