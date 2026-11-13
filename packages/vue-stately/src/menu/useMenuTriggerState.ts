import {ref, type Ref} from 'vue'
import {useOverlayTriggerState, type OverlayTriggerProps, type OverlayTriggerState} from '../overlays/useOverlayTriggerState'

export type FocusStrategy = 'first' | 'last'
export type Key = string | number
export type MenuTriggerType = 'press' | 'longPress' | 'contextMenu'

export interface MenuTriggerProps extends OverlayTriggerProps {
  /**
   * How the menu is triggered.
   * @default 'press'
   */
  trigger?: MenuTriggerType
}

export interface MenuTriggerState extends OverlayTriggerState {
  /** Controls which item will be auto focused when the menu opens. */
  focusStrategy: Ref<FocusStrategy | null>
  /** Opens the menu. */
  open: (focusStrategy?: FocusStrategy | null) => void
  /** Toggles the menu. */
  toggle: (focusStrategy?: FocusStrategy | null) => void
}

export interface RootMenuTriggerState extends MenuTriggerState {
  /** Opens a specific submenu tied to a specific menu item at a specific level. */
  openSubmenu: (triggerKey: Key, level: number) => void
  /** Closes a specific submenu tied to a specific menu item at a specific level. */
  closeSubmenu: (triggerKey: Key, level: number) => void
  /**
   * An array of open submenu trigger keys within the menu tree.
   * The index of key within array matches the submenu level in the tree.
   */
  expandedKeysStack: Ref<Key[]>
  /** Closes the menu and all submenus in the menu tree. */
  close: () => void
}

/**
 * Manages state for a menu trigger. Tracks whether the menu is currently open,
 * and controls which item will receive focus when it opens. Also tracks the open submenus within
 * the menu tree via their trigger keys.
 *
 * Port of `react-stately@3.51.0` `useMenuTriggerState`
 * (`packages/react-stately/src/menu/useMenuTriggerState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */
export function useMenuTriggerState(props: MenuTriggerProps = {}): RootMenuTriggerState {
  const overlayTriggerState = useOverlayTriggerState(props)
  const focusStrategy = ref<FocusStrategy | null>(null)
  const expandedKeysStack = ref<Key[]>([])

  const closeAll = () => {
    expandedKeysStack.value = []
    overlayTriggerState.close()
  }

  const openSubmenu = (triggerKey: Key, level: number) => {
    const oldStack = expandedKeysStack.value
    if (level > oldStack.length) return
    expandedKeysStack.value = [...oldStack.slice(0, level), triggerKey]
  }

  const closeSubmenu = (triggerKey: Key, level: number) => {
    const oldStack = expandedKeysStack.value
    const key = oldStack[level]
    if (key === triggerKey) {
      expandedKeysStack.value = oldStack.slice(0, level)
    }
  }

  const state: RootMenuTriggerState = {
    ...overlayTriggerState,
    focusStrategy,
    open(fs: FocusStrategy | null = null) {
      focusStrategy.value = fs
      overlayTriggerState.open()
    },
    toggle(fs: FocusStrategy | null = null) {
      focusStrategy.value = fs
      overlayTriggerState.toggle()
    },
    close() {
      closeAll()
    },
    expandedKeysStack,
    openSubmenu,
    closeSubmenu,
  }

  return state
}
