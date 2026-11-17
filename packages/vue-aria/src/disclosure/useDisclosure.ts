/*
 * Port of `react-aria@3.53.1` `useDisclosure`
 * (`packages/react-aria/src/disclosure/useDisclosure.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. `buttonProps` and `panelProps` are plain objects with
 * live getters — not ComputedRefs and not setup-time snapshots.
 * `buttonProps` are behavior options for `Button` / `useButton`
 * (`onPress` / `onPressStart` / `isDisabled`), not DOM `onPress` bindings.
 *
 * `hidden="until-found"` is applied on the client by this hook (no-WAAPI
 * fallback, measure-then-auto, hidden after collapse, RAF cleanup). During
 * SSR (`window` undefined) `panelProps.hidden` is the boolean
 * `!isExpanded`, matching official `useIsSSR`.
 */

import {onBeforeUnmount, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import type {DisclosureState} from 'vue-stately/useDisclosureState'
import type {PressEvent} from '../interactions/press'
import {useId} from '../utils/useId'

export interface AriaDisclosureProps {
  /** Whether the disclosure is disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** Handler that is called when the disclosure's expanded state changes. */
  onExpandedChange?: (isExpanded: boolean) => void
  /** Whether the disclosure is expanded (controlled). */
  isExpanded?: MaybeRefOrGetter<boolean | undefined>
  /** Whether the disclosure is expanded by default (uncontrolled). */
  defaultExpanded?: MaybeRefOrGetter<boolean | undefined>
}

export interface DisclosureAria {
  /**
   * Props for the disclosure button. Behavior options for `Button` /
   * `useButton`, not a DOM prop bag to `v-bind` as native `onPress`.
   */
  buttonProps: {
    id?: string
    'aria-expanded'?: boolean
    'aria-controls'?: string
    isDisabled?: boolean
    onPress?: (e: PressEvent) => void
    onPressStart?: (e: PressEvent) => void
  }
  /** Props for the disclosure panel. */
  panelProps: {
    id?: string
    role?: string
    'aria-labelledby'?: string
    'aria-hidden'?: boolean
    hidden?: boolean
  }
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {
    get,
    enumerable: true,
    configurable: true,
  })
}

/**
 * Provides the behavior and accessibility implementation for a disclosure component.
 *
 * @param props - Props for the disclosure.
 * @param state - State for the disclosure, as returned by `useDisclosureState`.
 * @param ref - A ref for the disclosure panel.
 */
export function useDisclosure(
  props: AriaDisclosureProps,
  state: DisclosureState,
  ref: Ref<HTMLElement | null>,
): DisclosureAria {
  const triggerId = useId()
  const panelId = useId()
  let rafId: number | null = null
  let isExpandedRef: boolean | null = null
  let bound: HTMLElement | null = null
  let appliedNode: HTMLElement | null = null

  const disabled = () => Boolean(toValue(props.isDisabled))

  function cancelRaf() {
    if (rafId != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId)
    }
    rafId = null
  }

  function handleBeforeMatch() {
    // Wait a frame so a find-in-page removal of `hidden` can be reverted if
    // the disclosure stays collapsed. The layout pass below cancels this when
    // the toggle actually expands the panel.
    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(() => {
        rafId = null
        const panel = ref.value
        if (panel) panel.setAttribute('hidden', 'until-found')
      })
    }
    state.toggle()
  }

  function applyPanel(panel: HTMLElement) {
    cancelRaf()
    if (typeof window === 'undefined') return
    // A replaced panel node (key / v-if) must be initialized even when
    // `isExpanded` did not change. Otherwise a collapsed remount stays visible
    // once `getAnimations` exists.
    if (appliedNode !== panel) {
      isExpandedRef = null
      appliedNode = panel
    }
    const expanded = state.isExpanded
    const canAnimate = typeof panel.getAnimations === 'function'
    if (isExpandedRef == null || !canAnimate) {
      // Initial render and environments without WAAPI (including jsdom).
      if (expanded) {
        panel.removeAttribute('hidden')
        panel.style.setProperty('--disclosure-panel-width', 'auto')
        panel.style.setProperty('--disclosure-panel-height', 'auto')
      } else {
        panel.setAttribute('hidden', 'until-found')
        panel.style.setProperty('--disclosure-panel-width', '0px')
        panel.style.setProperty('--disclosure-panel-height', '0px')
      }
    } else if (expanded !== isExpandedRef) {
      if (expanded) {
        panel.removeAttribute('hidden')
        panel.style.setProperty('--disclosure-panel-width', panel.scrollWidth + 'px')
        panel.style.setProperty('--disclosure-panel-height', panel.scrollHeight + 'px')
        Promise.all(panel.getAnimations().map((animation) => animation.finished))
          .then(() => {
            panel.style.setProperty('--disclosure-panel-width', 'auto')
            panel.style.setProperty('--disclosure-panel-height', 'auto')
          })
          .catch(() => {})
      } else {
        panel.style.setProperty('--disclosure-panel-width', panel.scrollWidth + 'px')
        panel.style.setProperty('--disclosure-panel-height', panel.scrollHeight + 'px')
        // Force style re-calculation so the subsequent 0px write can animate.
        window.getComputedStyle(panel).height
        panel.style.setProperty('--disclosure-panel-width', '0px')
        panel.style.setProperty('--disclosure-panel-height', '0px')
        Promise.all(panel.getAnimations().map((animation) => animation.finished))
          .then(() => {
            panel.setAttribute('hidden', 'until-found')
          })
          .catch(() => {})
      }
    }
    isExpandedRef = expanded
  }

  function bind(panel: HTMLElement | null) {
    if (bound === panel) return
    if (bound) bound.removeEventListener('beforematch', handleBeforeMatch)
    bound = panel
    if (panel) panel.addEventListener('beforematch', handleBeforeMatch)
  }

  watch(
    () => [disabled(), state.isExpanded, ref.value] as const,
    () => {
      const panel = ref.value
      bind(panel)
      if (panel) applyPanel(panel)
      else {
        isExpandedRef = null
        appliedNode = null
      }
    },
    {flush: 'post', immediate: true},
  )

  onBeforeUnmount(() => {
    cancelRaf()
    bind(null)
  })

  const buttonProps = {}
  defineLive(buttonProps, 'id', () => triggerId.value)
  defineLive(buttonProps, 'aria-expanded', () => state.isExpanded)
  defineLive(buttonProps, 'aria-controls', () => panelId.value)
  defineLive(buttonProps, 'isDisabled', () => disabled())
  Object.defineProperty(buttonProps, 'onPress', {
    enumerable: true,
    configurable: true,
    writable: true,
    value(event: PressEvent) {
      // Pointer, touch, and virtual presses toggle on press (release).
      // Keyboard toggles on press start so key repeat / keyup cannot double-fire.
      if (!disabled() && event.pointerType !== 'keyboard') {
        state.toggle()
      }
    },
  })
  Object.defineProperty(buttonProps, 'onPressStart', {
    enumerable: true,
    configurable: true,
    writable: true,
    value(event: PressEvent) {
      if (event.pointerType === 'keyboard' && !disabled()) {
        state.toggle()
      }
    },
  })

  const panelProps = {}
  defineLive(panelProps, 'id', () => panelId.value)
  defineLive(panelProps, 'role', () => 'group')
  defineLive(panelProps, 'aria-labelledby', () => triggerId.value)
  defineLive(panelProps, 'aria-hidden', () => !state.isExpanded)
  // Client: `undefined` so Vue does not own the attribute (the layout pass does).
  // SSR: boolean hidden, matching official `useIsSSR` server snapshot.
  defineLive(panelProps, 'hidden', () => (typeof window === 'undefined' ? !state.isExpanded : undefined))

  return {
    buttonProps: buttonProps as DisclosureAria['buttonProps'],
    panelProps: panelProps as DisclosureAria['panelProps'],
  }
}
