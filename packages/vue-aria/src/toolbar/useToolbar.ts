/**
 * Port of `react-aria` `useToolbar`
 * (`packages/react-aria/src/toolbar/useToolbar.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. `toolbarProps` is a plain object with live getters.
 * Nested role detection waits until mount so server markup matches the
 * first client render. Traversal is toolbar-private.
 */

import {onMounted, onScopeDispose, onUpdated, ref, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import {useLocale} from '../i18n/I18nProvider'
import {focusableFirst, focusableLast, focusableNext, focusablePrevious} from './toolbarFocus'

export interface AriaToolbarProps {
  /**
   * The orientation of the entire toolbar.
   * @default 'horizontal'
   */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical' | undefined>
  id?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | null | undefined>
  'aria-labelledby'?: MaybeRefOrGetter<string | null | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | null | undefined>
  'aria-details'?: MaybeRefOrGetter<string | null | undefined>
  [key: `data-${string}`]: MaybeRefOrGetter<string | number | boolean | null | undefined> | undefined
}

export interface ToolbarAria {
  /** Props for the toolbar container. */
  toolbarProps: {
    role: 'toolbar' | 'group'
    'aria-orientation': 'horizontal' | 'vertical'
    'aria-label'?: string | null
    'aria-labelledby'?: string | null
    'aria-describedby'?: string | null
    'aria-details'?: string | null
    id?: string
    onKeydownCapture?: (event: KeyboardEvent) => void
    onFocusCapture?: (event: FocusEvent) => void
    onBlurCapture?: (event: FocusEvent) => void
    [key: string]: unknown
  }
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
}

function isDomNode(value: EventTarget | null): value is Node {
  return !!value && typeof value === 'object' && 'nodeType' in value && typeof (value as Node).nodeType === 'number'
}

function contained(root: Element | null, node: EventTarget | null): boolean {
  return !!root && isDomNode(node) && root.contains(node)
}

function isOwnedElement(root: Node, node: EventTarget | null): node is HTMLElement {
  if (!isDomNode(node) || node.nodeType !== 1 || !root.contains(node)) return false
  return true
}

/**
 * Provides the behavior and accessibility implementation for a toolbar.
 * A toolbar is a container for a set of interactive controls with arrow key navigation.
 */
export function useToolbar(props: AriaToolbarProps, toolbarRef: Ref<HTMLElement | null>): ToolbarAria {
  const locale = useLocale()
  const isInToolbar = ref(false)
  let currentRoot: HTMLElement | null = null
  let observer: MutationObserver | null = null
  let observedChain: Element[] = []
  let lastFocused: HTMLElement | null = null
  let internalMove = false
  let alive = true
  const listening = new WeakSet<EventTarget>()

  function orientation(): 'horizontal' | 'vertical' {
    return toValue(props.orientation) === 'vertical' ? 'vertical' : 'horizontal'
  }

  function labelValue() {
    return toValue(props['aria-label'])
  }

  function nested(el: HTMLElement): boolean {
    return !!el.parentElement?.closest('[role="toolbar"]')
  }

  function moveFocus(node: HTMLElement | null) {
    if (!node) return
    internalMove = true
    try {
      node.focus()
    } finally {
      internalMove = false
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    const root = currentRoot
    if (!root || event.currentTarget !== root || isInToolbar.value) return
    if ((event as KeyboardEvent & {__vueAriaToolbarKey?: EventTarget}).__vueAriaToolbarKey === root) return
    if (!contained(root, event.target)) return
    ;(event as KeyboardEvent & {__vueAriaToolbarKey?: EventTarget}).__vueAriaToolbarKey = root

    const key = event.key
    const orient = orientation()
    const reverse = locale.direction === 'rtl' && orient === 'horizontal'
    const nextKey = orient === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const previousKey = orient === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    if (key === nextKey || key === previousKey) {
      const forward = key === nextKey ? !reverse : reverse
      moveFocus(forward ? focusableNext(root) : focusablePrevious(root))
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (key === 'Tab') {
      const active = root.ownerDocument.activeElement
      if (isOwnedElement(root, active) && root.contains(active)) lastFocused = active
      moveFocus(event.shiftKey ? focusableFirst(root) : focusableLast(root))
    }
  }

  function onBlur(event: FocusEvent) {
    const root = currentRoot
    if (!root || event.currentTarget !== root || isInToolbar.value || internalMove) return
    if ((event as FocusEvent & {__vueAriaToolbarBlur?: EventTarget}).__vueAriaToolbarBlur === root) return
    ;(event as FocusEvent & {__vueAriaToolbarBlur?: EventTarget}).__vueAriaToolbarBlur = root
    if (lastFocused || contained(root, event.relatedTarget)) return
    if (isOwnedElement(root, event.target) && root.contains(event.target)) lastFocused = event.target
  }

  function onFocus(event: FocusEvent) {
    const root = currentRoot
    if (!root || event.currentTarget !== root || isInToolbar.value || internalMove) return
    if ((event as FocusEvent & {__vueAriaToolbarFocus?: EventTarget}).__vueAriaToolbarFocus === root) return
    ;(event as FocusEvent & {__vueAriaToolbarFocus?: EventTarget}).__vueAriaToolbarFocus = root
    const remembered = lastFocused
    if (!remembered || contained(root, event.relatedTarget) || !contained(root, event.target)) return
    lastFocused = null
    if (remembered.isConnected && root.contains(remembered)) moveFocus(remembered)
  }

  function addListeners(el: HTMLElement) {
    if (listening.has(el)) return
    el.addEventListener('keydown', onKeyDown, true)
    el.addEventListener('focus', onFocus, true)
    el.addEventListener('blur', onBlur, true)
    listening.add(el)
  }

  function removeListeners(el: HTMLElement) {
    if (!listening.has(el)) return
    el.removeEventListener('keydown', onKeyDown, true)
    el.removeEventListener('focus', onFocus, true)
    el.removeEventListener('blur', onBlur, true)
    listening.delete(el)
  }

  function ancestorChain(el: HTMLElement): Element[] {
    const chain: Element[] = []
    let node: Element | null = el.parentElement
    while (node) {
      chain.push(node)
      node = node.parentElement
    }
    return chain
  }

  function sameChain(left: Element[], right: Element[]) {
    return left.length === right.length && left.every((node, index) => node === right[index])
  }

  function disconnectObserver() {
    observer?.disconnect()
    observer = null
    observedChain = []
  }

  function bindObserver(el: HTMLElement) {
    disconnectObserver()
    if (typeof MutationObserver === 'undefined') return
    const chain = ancestorChain(el)
    observedChain = chain
    if (!chain.length) return
    const next = new MutationObserver(() => {
      if (alive && currentRoot === el) refresh(el)
    })
    observer = next
    for (const node of chain) {
      next.observe(node, {attributes: true, attributeFilter: ['role'], childList: true})
    }
  }

  function refresh(el: HTMLElement) {
    if (!alive || currentRoot !== el) return
    if (!sameChain(ancestorChain(el), observedChain)) bindObserver(el)
    const inside = nested(el)
    if (isInToolbar.value !== inside) isInToolbar.value = inside
    if (inside) removeListeners(el)
    else addListeners(el)
  }

  function detach(el: HTMLElement | null) {
    if (el) removeListeners(el)
    if (!el || currentRoot === el) {
      disconnectObserver()
      currentRoot = null
    }
    if (el && lastFocused && el.contains(lastFocused)) lastFocused = null
  }

  function attach(el: HTMLElement) {
    if (!alive) return
    if (currentRoot === el) {
      refresh(el)
      return
    }
    if (currentRoot) detach(currentRoot)
    currentRoot = el
    lastFocused = null
    bindObserver(el)
    refresh(el)
  }

  watch(toolbarRef, (el, prev) => {
    if (prev && prev !== el) detach(prev)
    if (el) attach(el)
  }, {flush: 'post'})

  onMounted(() => {
    if (toolbarRef.value) attach(toolbarRef.value)
  })
  onUpdated(() => {
    if (toolbarRef.value) refresh(toolbarRef.value)
  })

  onScopeDispose(() => {
    alive = false
    detach(currentRoot)
    lastFocused = null
  })

  const toolbarProps = {
    onKeydownCapture: onKeyDown,
    onFocusCapture: onFocus,
    onBlurCapture: onBlur,
  } as ToolbarAria['toolbarProps']
  defineLive(toolbarProps, 'role', () => (isInToolbar.value ? 'group' : 'toolbar'))
  defineLive(toolbarProps, 'aria-orientation', () => orientation())
  defineLive(toolbarProps, 'aria-label', () => {
    const label = labelValue()
    return label == null ? undefined : label
  })
  defineLive(toolbarProps, 'aria-labelledby', () => (labelValue() == null ? toValue(props['aria-labelledby']) ?? undefined : undefined))
  defineLive(toolbarProps, 'aria-describedby', () => toValue(props['aria-describedby']) ?? undefined)
  defineLive(toolbarProps, 'aria-details', () => toValue(props['aria-details']) ?? undefined)
  defineLive(toolbarProps, 'id', () => toValue(props.id) ?? undefined)

  for (const key of Object.keys(props)) {
    if (key.startsWith('data-')) {
      defineLive(toolbarProps, key, () => toValue(props[key as `data-${string}`]))
    }
  }

  return {toolbarProps}
}
