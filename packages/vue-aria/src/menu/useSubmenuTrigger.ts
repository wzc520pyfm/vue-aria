import {computed, nextTick, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import type {FocusStrategy} from 'vue-stately/useMenuTriggerState'
import type {SubmenuTriggerState} from 'vue-stately/useSubmenuTriggerState'
import type {AriaMenuItemProps} from './useMenuItem'
import type {AriaMenuOptions} from './useMenu'
import {useId} from '../utils/useId'
import {useSafelyMouseToSubmenu} from './useSafelyMouseToSubmenu'

export interface AriaSubmenuTriggerProps {
  /**
   * An object representing the submenu trigger menu item.
   * @deprecated
   */
  node?: unknown
  /** Whether the submenu trigger is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** The type of the contents that the submenu trigger opens. */
  type?: 'dialog' | 'menu'
  /** Ref of the menu that contains the submenu trigger. */
  parentMenuRef: Ref<HTMLElement | null>
  /** Ref of the submenu opened by the submenu trigger. */
  submenuRef: Ref<HTMLElement | null>
  /**
   * The delay time in milliseconds for the submenu to appear after hovering over the trigger.
   *
   * @default 200
   */
  delay?: MaybeRefOrGetter<number | undefined>
  /** Whether the submenu trigger uses virtual focus. */
  shouldUseVirtualFocus?: MaybeRefOrGetter<boolean | undefined>
}

export interface SubmenuTriggerAria<T = unknown> {
  /** Props for the submenu trigger menu item. */
  submenuTriggerProps: Record<string, any>
  /** Props for the submenu controlled by the submenu trigger menu item. */
  submenuProps: Record<string, any>
  /** Props for the submenu's popover container. */
  popoverProps: Record<string, any>
}

function focusWithoutScrolling(el: Element | null | undefined) {
  if (!el || !(el instanceof HTMLElement)) return
  try { el.focus({preventScroll: true}) } catch { el.focus() }
}

function restoreFocusToTrigger(el: Element | null | undefined) {
  if (!el || !(el instanceof HTMLElement)) return
  const tryFocus = () => {
    if (!el.isConnected) return
    if (document.activeElement !== el) focusWithoutScrolling(el)
  }
  // Attempt across flush/unmount timing boundaries.
  tryFocus()
  void nextTick().then(tryFocus)
  if (typeof queueMicrotask === 'function') queueMicrotask(tryFocus)
  setTimeout(tryFocus, 0)
  setTimeout(tryFocus, 10)
  setTimeout(tryFocus, 20)
  setTimeout(tryFocus, 40)
  setTimeout(tryFocus, 80)
  const onFocusOut = () => {
    setTimeout(tryFocus, 0)
  }
  document.addEventListener('focusout', onFocusOut, true)
  setTimeout(() => document.removeEventListener('focusout', onFocusOut, true), 150)
}

function nodeContains(container: Element | null | undefined, node: Node | null | undefined) {
  if (!container || !node) return false
  return container === node || container.contains(node)
}

function getActiveElement(el: Element | null | undefined): Element | null {
  try {
    const doc = el?.ownerDocument || document
    return (doc as any).activeElement ?? document.activeElement
  } catch {
    return document.activeElement
  }
}

function getDirection(el: Element | null | undefined): 'ltr' | 'rtl' {
  if (!el) return 'ltr'
  try {
    // Teleported popovers (document.body) lose their original wrapper's direction,
    // so walk the attached ancestor chain looking for an explicit dir first.
    let node: Element | null = el
    while (node) {
      const dir = node.getAttribute?.('dir')
      if (dir === 'rtl') return 'rtl'
      if (dir === 'ltr') return 'ltr'
      node = node.parentElement
    }
    const docDir = el.ownerDocument?.documentElement?.getAttribute('dir') || el.ownerDocument?.documentElement?.dir || el.ownerDocument?.dir
    if (docDir === 'rtl') return 'rtl'
    const computed = getComputedStyle(el as HTMLElement).direction
    if (computed === 'rtl') return 'rtl'
  } catch {}
  return 'ltr'
}

/**
 * Provides the behavior and accessibility implementation for a submenu trigger and its associated
 * submenu.
 *
 * Port of official `useSubmenuTrigger` (react-aria@3.53.1), adapted for Vue.
 */
export function useSubmenuTrigger<T = unknown>(
  props: AriaSubmenuTriggerProps,
  state: SubmenuTriggerState,
  ref: Ref<Element | null>,
): SubmenuTriggerAria<T> {
  const type = props.type ?? 'menu'
  const isDisabled = computed(() => !!toValue(props.isDisabled))
  const delay = computed(() => (toValue(props.delay) ?? 200) as number)
  const shouldUseVirtualFocus = computed(() => !!toValue(props.shouldUseVirtualFocus))
  const submenuTriggerId = useId('vue-aria-submenu-trigger')
  const overlayId = useId('vue-aria-submenu')
  let openTimeout: ReturnType<typeof setTimeout> | undefined
  let shouldRestoreFocusToTrigger = false

  const cancelOpenTimeout = () => {
    if (openTimeout) {
      clearTimeout(openTimeout)
      openTimeout = undefined
    }
  }

  const onSubmenuOpen = (focusStrategy?: FocusStrategy | null) => {
    shouldRestoreFocusToTrigger = false
    cancelOpenTimeout()
    state.open(focusStrategy ?? null)
  }

  const onSubmenuClose = () => {
    cancelOpenTimeout()
    state.close()
  }

  watch(
    () => state.isOpen.value,
    (isOpen, wasOpen) => {
      if (wasOpen && !isOpen && shouldRestoreFocusToTrigger) {
        shouldRestoreFocusToTrigger = false
        if (!shouldUseVirtualFocus.value) restoreFocusToTrigger(ref.value)
      }
    },
    {flush: 'post'},
  )

  onBeforeUnmount(() => cancelOpenTimeout())

  const submenuKeyboardProps: Record<string, any> = {
    onKeyDown: (e: KeyboardEvent) => {
      if (type !== 'menu') return
      const direction = getDirection(props.parentMenuRef.value || ref.value)
      const target = e.target as Element | null
      const submenuEl = props.submenuRef.value
      const parentEl = props.parentMenuRef.value
      // Focus within checks
      const active = getActiveElement(submenuEl)
      const focusInSubmenu = nodeContains(submenuEl, active) || nodeContains(submenuEl, target)
      const focusInParentOrTrigger = nodeContains(parentEl, active) || active === ref.value
      switch (e.key) {
        case 'ArrowLeft': {
          if (!focusInSubmenu && !focusInParentOrTrigger) return
          if (direction === 'ltr' && nodeContains(submenuEl, target)) {
            e.preventDefault()
            e.stopPropagation()
            shouldRestoreFocusToTrigger = true
            onSubmenuClose()
            return
          }
          return
        }
        case 'ArrowRight': {
          if (!focusInSubmenu && !focusInParentOrTrigger) return
          if (direction === 'rtl' && nodeContains(submenuEl, target)) {
            e.preventDefault()
            e.stopPropagation()
            shouldRestoreFocusToTrigger = true
            onSubmenuClose()
            return
          }
          return
        }
        case 'Escape': {
          if (nodeContains(submenuEl, target)) {
            e.preventDefault()
            e.stopPropagation()
            shouldRestoreFocusToTrigger = true
            onSubmenuClose()
          }
          return
        }
      }
    },
  }

  const submenuProps: Record<string, any> = {
    submenuLevel: state.submenuLevel,
  }
  Object.defineProperties(submenuProps, {
    id: {get: () => overlayId.value, enumerable: true},
    'aria-labelledby': {get: () => submenuTriggerId.value, enumerable: true},
  })
  if (type === 'menu') {
    submenuProps.onClose = state.closeAll
    Object.defineProperty(submenuProps, 'autoFocus', {get: () => state.focusStrategy.value ?? undefined, enumerable: true})
    submenuProps.onKeyDown = submenuKeyboardProps.onKeyDown
  }

  const submenuTriggerProps: Record<string, any> = {
    id: submenuTriggerId.value,
  }
  Object.defineProperties(submenuTriggerProps, {
    'aria-controls': {get: () => (state.isOpen.value ? overlayId.value : undefined), enumerable: true},
    'aria-haspopup': {get: () => (!isDisabled.value ? type : undefined), enumerable: true},
    'aria-expanded': {get: () => (state.isOpen.value ? 'true' : 'false'), enumerable: true},
    isOpen: {get: () => state.isOpen.value, enumerable: true},
  })

  submenuTriggerProps.onKeyDown = (e: KeyboardEvent) => {
    if (isDisabled.value) return
    const direction = getDirection(ref.value || props.parentMenuRef.value)
    switch (e.key) {
      case 'ArrowRight': {
        if (direction === 'ltr') {
          if (!state.isOpen.value) onSubmenuOpen('first')
          if (type === 'menu' && props.submenuRef.value && getActiveElement(ref.value) === ref.value) {
            // focus moves into submenu by autoFocus/manager when mounted; try now too
            focusWithoutScrolling(props.submenuRef.value)
          }
          e.preventDefault()
          e.stopPropagation()
        } else if (state.isOpen.value) {
          onSubmenuClose()
          e.preventDefault()
          e.stopPropagation()
        }
        break
      }
      case 'ArrowLeft': {
        if (direction === 'rtl') {
          if (!state.isOpen.value) onSubmenuOpen('first')
          if (type === 'menu' && props.submenuRef.value && getActiveElement(ref.value) === ref.value) {
            focusWithoutScrolling(props.submenuRef.value)
          }
          e.preventDefault()
          e.stopPropagation()
        } else if (state.isOpen.value) {
          onSubmenuClose()
          e.preventDefault()
          e.stopPropagation()
        }
        break
      }
    }
  }

  submenuTriggerProps.onPressStart = (e: any) => {
    if (isDisabled.value) return
    if (e?.pointerType === 'virtual' || e?.pointerType === 'keyboard') {
      onSubmenuOpen('first')
    }
  }

  submenuTriggerProps.onPress = (e: any) => {
    if (isDisabled.value) return
    if (e?.pointerType === 'touch' || e?.pointerType === 'mouse') {
      onSubmenuOpen()
    }
  }

  submenuTriggerProps.onHoverChange = (isHovered: boolean) => {
    if (isDisabled.value) return
    if (isHovered && !state.isOpen.value) {
      if (!openTimeout) {
        openTimeout = setTimeout(() => {
          openTimeout = undefined
          onSubmenuOpen()
        }, delay.value)
      }
    } else if (!isHovered) {
      cancelOpenTimeout()
    }
  }

  // Close submenu when focus moves to a different item in the same parent menu.
  const onParentFocusIn = (e: FocusEvent) => {
    if (!state.isOpen.value) return
    const target = e.target as Element | null
    if (nodeContains(props.parentMenuRef.value, target) && target !== ref.value) {
      onSubmenuClose()
    }
  }

  watch(
    () => [props.parentMenuRef.value, state.isOpen.value] as const,
    ([parent], _prev, onCleanup) => {
      if (!parent) return
      parent.addEventListener('focusin', onParentFocusIn as any)
      onCleanup(() => parent.removeEventListener('focusin', onParentFocusIn as any))
    },
    {immediate: true},
  )

  useSafelyMouseToSubmenu({
    menuRef: props.parentMenuRef,
    submenuRef: props.submenuRef,
    isOpen: () => state.isOpen.value,
    isDisabled: () => isDisabled.value,
  })

  const popoverProps: Record<string, any> = {
    isNonModal: true,
    shouldCloseOnInteractOutside: (target: Element) => target !== ref.value,
  }

  return {submenuTriggerProps, submenuProps, popoverProps}
}
