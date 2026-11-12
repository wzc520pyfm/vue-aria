import {reactive, watchEffect} from 'vue'
import type {OverlayTriggerState} from 'vue-stately/useOverlayTriggerState'
import {useId} from '../utils/useId'

export interface OverlayTriggerProps {
  /** Type of overlay that is opened by the trigger. */
  type: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid'
}

export interface OverlayTriggerPropsEl {
  'aria-haspopup'?: boolean | 'listbox' | 'menu' | 'dialog' | 'tree' | 'grid'
  'aria-expanded'?: boolean
  'aria-controls'?: string
  onPress?: () => void
}

export interface OverlayPropsEl {
  id: string
}

export interface OverlayTriggerAria {
  /** Props for the trigger element. Plain object, not a ComputedRef. */
  triggerProps: OverlayTriggerPropsEl
  /** Props for the overlay container element. Plain object, not a ComputedRef. */
  overlayProps: OverlayPropsEl
}

/**
 * Handles the behavior and accessibility for an overlay trigger.
 *
 * Port of official `useOverlayTrigger`
 * (`packages/react-aria/src/overlays/useOverlayTrigger.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 *
 * Official `aria-haspopup` is set only for `menu` (`true`) and `listbox`
 * (`'listbox'`). `dialog` / `tree` / `grid` are accepted as `type` but do
 * not set `aria-haspopup`, matching official (screen readers often announce
 * "menu" for other values).
 */
export function useOverlayTrigger(
  props: OverlayTriggerProps,
  state: OverlayTriggerState,
): OverlayTriggerAria {
  const overlayId = useId('vue-aria-overlay')

  const ariaHasPopup = (): OverlayTriggerPropsEl['aria-haspopup'] => {
    if (props.type === 'menu') return true
    if (props.type === 'listbox') return 'listbox'
    return undefined
  }

  const triggerProps = reactive<OverlayTriggerPropsEl>({
    onPress: () => state.toggle(),
  }) as OverlayTriggerPropsEl

  const overlayProps = reactive<OverlayPropsEl>({
    id: overlayId.value,
  }) as OverlayPropsEl

  watchEffect(() => {
    const isOpen = state.isOpen.value
    const hasPopup = ariaHasPopup()
    if (hasPopup === undefined) {
      delete triggerProps['aria-haspopup']
    } else {
      triggerProps['aria-haspopup'] = hasPopup
    }
    triggerProps['aria-expanded'] = isOpen
    if (isOpen) {
      triggerProps['aria-controls'] = overlayId.value
    } else {
      delete triggerProps['aria-controls']
    }
    overlayProps.id = overlayId.value
    triggerProps.onPress = () => state.toggle()
  })

  return {triggerProps, overlayProps}
}

