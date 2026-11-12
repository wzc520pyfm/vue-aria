import {ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import {useControlledState} from '../utils/useControlledState'

export interface OverlayTriggerProps {
  /** Whether the overlay is open (controlled). */
  isOpen?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the overlay is open by default (uncontrolled). */
  defaultOpen?: MaybeRefOrGetter<boolean | undefined>
  /** Handler that is called when the overlay's open state changes. */
  onOpenChange?: (isOpen: boolean) => void
}

export interface Point {
  x: number
  y: number
}

export interface OverlayTriggerState {
  /** Whether the overlay is currently open. */
  isOpen: ComputedRef<boolean>
  /** Sets whether the overlay is open. */
  setOpen: (isOpen: boolean) => void
  /** Opens the overlay. */
  open: () => void
  /** Closes the overlay. */
  close: () => void
  /** Toggles the overlay's visibility. */
  toggle: () => void
  /**
   * The cursor position when the overlay was triggered, relative to the window
   * viewport. Official field from react-stately 3.51.0; this batch stores it
   * but does not require callers to use it for positioning.
   */
  point: Ref<Point | null>
  /** Sets the cursor position relative to the window viewport. */
  setPoint: (point: Point | null) => void
}

/**
 * Manages state for an overlay trigger. Tracks whether the overlay is open, and
 * provides methods to toggle this state.
 *
 * Port of `react-stately@3.51.0` `useOverlayTriggerState`
 * (`packages/react-stately/src/overlays/useOverlayTriggerState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */
export function useOverlayTriggerState(props: OverlayTriggerProps = {}): OverlayTriggerState {
  const [isOpen, setOpen] = useControlledState(
    props.isOpen,
    () => Boolean(toValue(props.defaultOpen)),
    props.onOpenChange,
  )
  const point = ref<Point | null>(null)

  function open() {
    setOpen(true)
  }

  function close() {
    setOpen(false)
  }

  function toggle() {
    setOpen(!isOpen.value)
  }

  function setPoint(next: Point | null) {
    point.value = next
  }

  return {
    isOpen,
    setOpen,
    open,
    close,
    toggle,
    point,
    setPoint,
  }
}
