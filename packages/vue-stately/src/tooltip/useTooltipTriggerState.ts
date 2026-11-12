import {onBeforeUnmount, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import {
  useOverlayTriggerState,
  type OverlayTriggerProps,
} from '../overlays/useOverlayTriggerState'

export interface TooltipTriggerProps extends OverlayTriggerProps {
  /**
   * Whether the tooltip should be disabled, independent from the trigger.
   */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>

  /**
   * The delay time for the tooltip to show up.
   *
   * @default 1500
   */
  delay?: MaybeRefOrGetter<number | undefined>

  /**
   * The delay time for the tooltip to close.
   *
   * @default 500
   */
  closeDelay?: MaybeRefOrGetter<number | undefined>

  /**
   * By default, opens for both focus and hover. Can be made to open only for focus.
   *
   * @default 'hover'
   */
  trigger?: MaybeRefOrGetter<'hover' | 'focus' | undefined>

  /**
   * Whether the tooltip should close when the trigger is pressed.
   *
   * @default true
   */
  shouldCloseOnPress?: MaybeRefOrGetter<boolean | undefined>
}

/** Official default open delay from react-stately 3.51.0 (`TOOLTIP_DELAY`). */
export const TOOLTIP_DELAY = 1500
/** Official default close delay / cooldown from react-stately 3.51.0 (`TOOLTIP_COOLDOWN`). */
export const TOOLTIP_COOLDOWN = 500

export interface TooltipTriggerState {
  /** Whether the tooltip is currently showing. */
  isOpen: ComputedRef<boolean>
  /**
   * Whether the tooltip is being shown or hidden without an animation. This is
   * true while the global warmup timer is active, i.e. when quickly moving
   * between tooltips.
   */
  shouldSkipAnimation: Ref<boolean>
  /**
   * Shows the tooltip. By default, the tooltip becomes visible after a delay
   * depending on a global warmup timer. The `immediate` option shows the
   * tooltip immediately instead.
   */
  open: (immediate?: boolean) => void
  /** Hides the tooltip. */
  close: (immediate?: boolean) => void
}

const tooltips: Record<string, (immediate?: boolean, instant?: boolean) => void> = {}
let tooltipId = 0
let globalWarmedUp = false
let globalWarmUpTimeout: ReturnType<typeof setTimeout> | null = null
let globalCooldownTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Manages state for a tooltip trigger. Ensures only one tooltip is open at a
 * time and controls the delay for showing a tooltip.
 *
 * Port of `react-stately@3.51.0` `useTooltipTriggerState`
 * (`packages/react-stately/src/tooltip/useTooltipTriggerState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Official defaults: delay 1500ms, closeDelay 500ms.
 */
export function useTooltipTriggerState(props: TooltipTriggerProps = {}): TooltipTriggerState {
  const {isOpen, open: openOverlay, close: closeOverlay} = useOverlayTriggerState(props)
  const shouldSkipAnimation = ref(false)
  const id = `${++tooltipId}`
  let closeTimeout: ReturnType<typeof setTimeout> | null = null
  // Close must call the latest closeOverlay (controlled onOpenChange may change).
  let closeCallback = () => closeOverlay()

  function delayMs() {
    const value = toValue(props.delay)
    return value === undefined ? TOOLTIP_DELAY : value
  }

  function closeDelayMs() {
    const value = toValue(props.closeDelay)
    return value === undefined ? TOOLTIP_COOLDOWN : value
  }

  function ensureTooltipEntry() {
    tooltips[id] = hideTooltip
  }

  function closeOpenTooltips() {
    for (const hideTooltipId of Object.keys(tooltips)) {
      if (hideTooltipId !== id) {
        tooltips[hideTooltipId](true, true)
        delete tooltips[hideTooltipId]
      }
    }
  }

  function showTooltip(instant?: boolean) {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
    }
    closeTimeout = null
    closeOpenTooltips()
    ensureTooltipEntry()
    shouldSkipAnimation.value = Boolean(instant)
    globalWarmedUp = true
    openOverlay()
    if (globalWarmUpTimeout) {
      clearTimeout(globalWarmUpTimeout)
      globalWarmUpTimeout = null
    }
    if (globalCooldownTimeout) {
      clearTimeout(globalCooldownTimeout)
      globalCooldownTimeout = null
    }
  }

  function hideTooltip(immediate?: boolean, instant?: boolean) {
    shouldSkipAnimation.value = Boolean(instant)
    const closeDelay = closeDelayMs()
    if (immediate || closeDelay <= 0) {
      if (closeTimeout) {
        clearTimeout(closeTimeout)
      }
      closeTimeout = null
      closeCallback()
    } else if (!closeTimeout) {
      closeTimeout = setTimeout(() => {
        closeTimeout = null
        closeCallback()
      }, closeDelay)
    }

    if (globalWarmUpTimeout) {
      clearTimeout(globalWarmUpTimeout)
      globalWarmUpTimeout = null
    }
    if (globalWarmedUp) {
      if (globalCooldownTimeout) {
        clearTimeout(globalCooldownTimeout)
      }
      globalCooldownTimeout = setTimeout(
        () => {
          delete tooltips[id]
          globalCooldownTimeout = null
          globalWarmedUp = false
        },
        Math.max(TOOLTIP_COOLDOWN, closeDelay),
      )
    }
  }

  function warmupTooltip() {
    closeOpenTooltips()
    ensureTooltipEntry()
    const delay = delayMs()
    if (!isOpen.value && !globalWarmedUp) {
      if (globalWarmUpTimeout) {
        clearTimeout(globalWarmUpTimeout)
      }
      globalWarmUpTimeout = setTimeout(() => {
        globalWarmUpTimeout = null
        globalWarmedUp = true
        showTooltip(false)
      }, delay)
    } else if (!isOpen.value) {
      showTooltip(true)
    }
  }

  function open(immediate?: boolean) {
    closeCallback = () => closeOverlay()
    if (!immediate && delayMs() > 0 && !closeTimeout) {
      warmupTooltip()
    } else {
      showTooltip(globalWarmedUp)
    }
  }

  onBeforeUnmount(() => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
    }
    if (tooltips[id]) {
      delete tooltips[id]
    }
  })

  return {
    isOpen,
    shouldSkipAnimation,
    open,
    close: hideTooltip,
  }
}

/** Test-only helper to reset process-wide tooltip cooldown state. */
export function __resetTooltipTriggerGlobalState() {
  for (const id of Object.keys(tooltips)) {
    delete tooltips[id]
  }
  tooltipId = 0
  globalWarmedUp = false
  if (globalWarmUpTimeout) {
    clearTimeout(globalWarmUpTimeout)
    globalWarmUpTimeout = null
  }
  if (globalCooldownTimeout) {
    clearTimeout(globalCooldownTimeout)
    globalCooldownTimeout = null
  }
}
