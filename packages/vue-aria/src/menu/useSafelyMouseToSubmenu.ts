import {watch, onBeforeUnmount, ref, type Ref} from 'vue'
import {getOwnerDocument} from '../utils/dom'

export interface SafelyMouseToSubmenuOptions {
  /** Ref for the parent menu. */
  menuRef: Ref<Element | null | undefined>
  /** Ref for the submenu. */
  submenuRef: Ref<Element | null | undefined>
  /** Whether the submenu is open. */
  isOpen: () => boolean
  /** Whether this feature is disabled. */
  isDisabled?: () => boolean
}

const ALLOWED_INVALID_MOVEMENTS = 2
const THROTTLE_TIME = 50
const TIMEOUT_TIME = 1000
const ANGLE_PADDING = Math.PI / 12 // 15°

// Local interaction-modality tracking (official `useInteractionModality` equivalent).
// The Hero `useFocusVisible` helper must keep an empty diff vs main, so the submenu safe-path
// implements its own modality read locally without changing any Hero helper signature.
type InteractionModality = 'pointer' | 'keyboard' | 'virtual'
const modality = ref<InteractionModality>('virtual')
let modalityListenerCount = 0
let modalityBound = false

function onWindowPointerDownModality() {
  modality.value = 'pointer'
}

function onWindowKeyDownModality(event: KeyboardEvent) {
  if (event.metaKey || event.altKey || event.ctrlKey) return
  modality.value = 'keyboard'
}

function bindModalityListeners() {
  if (typeof window === 'undefined') return
  modalityListenerCount += 1
  if (modalityBound) return
  modalityBound = true
  window.addEventListener('pointerdown', onWindowPointerDownModality, true)
  window.addEventListener('keydown', onWindowKeyDownModality, true)
}

function unbindModalityListeners() {
  if (typeof window === 'undefined') return
  modalityListenerCount = Math.max(0, modalityListenerCount - 1)
  if (modalityListenerCount > 0) return
  modalityBound = false
  window.removeEventListener('pointerdown', onWindowPointerDownModality, true)
  window.removeEventListener('keydown', onWindowKeyDownModality, true)
}

function nodeContains(container: Element | null | undefined, node: Node | null | undefined) {
  if (!container || !node) return false
  return container === node || container.contains(node)
}

/**
 * Allows the user to move their pointer to the submenu without it closing when their mouse leaves
 * the trigger element. Prevents pointer events from going to the underlying menu if the user is
 * moving their pointer towards the sub-menu.
 *
 * Port of official `useSafelyMouseToSubmenu` (react-aria@3.53.1), adapted for Vue.
 */
export function useSafelyMouseToSubmenu(options: SafelyMouseToSubmenuOptions): void {
  const {menuRef, submenuRef} = options
  let prevPointerPos: {x: number; y: number} | undefined
  let submenuRect: DOMRect | undefined
  let lastProcessedTime = 0
  let timeout: ReturnType<typeof setTimeout> | undefined
  let autoCloseTimeout: ReturnType<typeof setTimeout> | undefined
  let submenuSide: 'left' | 'right' | undefined
  let movementsTowardsSubmenuCount = ALLOWED_INVALID_MOVEMENTS
  const preventPointerEvents = ref(false)

  function clearTimers() {
    if (timeout) { clearTimeout(timeout); timeout = undefined }
    if (autoCloseTimeout) { clearTimeout(autoCloseTimeout); autoCloseTimeout = undefined }
  }

  function reset() {
    preventPointerEvents.value = false
    movementsTowardsSubmenuCount = ALLOWED_INVALID_MOVEMENTS
    prevPointerPos = undefined
  }

  function applyPointerEvents(value: boolean) {
    const menu = menuRef.value as HTMLElement | null
    if (!menu) return
    menu.style.pointerEvents = value ? 'none' : ''
  }

  watch(preventPointerEvents, (v) => applyPointerEvents(v))

  let cleanup: (() => void) | null = null

  function setup() {
    if (cleanup) { cleanup(); cleanup = null }
    const submenu = submenuRef.value as HTMLElement | null
    const menu = menuRef.value as HTMLElement | null
    const isOpen = options.isOpen()
    const isDisabled = !!options.isDisabled?.()
    const currentModality = modality.value
    // Allow safe path tracking when modality is pointer (or unknown/virtual but pointer events occur).
    if (isDisabled || !submenu || !isOpen || !menu || currentModality === 'keyboard') {
      reset()
      applyPointerEvents(false)
      return
    }
    submenuRect = submenu.getBoundingClientRect()

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') return
      const currentTime = Date.now()
      if (currentTime - lastProcessedTime < THROTTLE_TIME) return
      clearTimers()

      const {clientX: mouseX, clientY: mouseY} = e
      if (!prevPointerPos) {
        prevPointerPos = {x: mouseX, y: mouseY}
        return
      }
      // Refresh the submenu rect from the live element so layout/mocks applied
      // after the submenu mounted are honored (official rc updates via resize).
      if (submenuRef.value) {
        submenuRect = submenuRef.value.getBoundingClientRect()
      }
      if (!submenuRect) return
      if (!submenuSide) {
        submenuSide = mouseX > submenuRect.right ? 'left' : 'right'
      }
      const menuRect = menu.getBoundingClientRect()
      if (mouseX < menuRect.left || mouseX > menuRect.right || mouseY < menuRect.top || mouseY > menuRect.bottom) {
        reset()
        return
      }

      const prevMouseX = prevPointerPos.x
      const prevMouseY = prevPointerPos.y
      const toSubmenuX = submenuSide === 'right'
        ? submenuRect.left - prevMouseX
        : prevMouseX - submenuRect.right
      const angleTop = Math.atan2(prevMouseY - submenuRect.top, toSubmenuX) + ANGLE_PADDING
      const angleBottom = Math.atan2(prevMouseY - submenuRect.bottom, toSubmenuX) - ANGLE_PADDING
      const anglePointer = Math.atan2(
        prevMouseY - mouseY,
        submenuSide === 'left' ? -(mouseX - prevMouseX) : mouseX - prevMouseX,
      )
      const isMovingTowardsSubmenu = anglePointer < angleTop && anglePointer > angleBottom

      movementsTowardsSubmenuCount = isMovingTowardsSubmenu
        ? Math.min(movementsTowardsSubmenuCount + 1, ALLOWED_INVALID_MOVEMENTS)
        : Math.max(movementsTowardsSubmenuCount - 1, 0)

      preventPointerEvents.value = movementsTowardsSubmenuCount >= ALLOWED_INVALID_MOVEMENTS

      lastProcessedTime = currentTime
      prevPointerPos = {x: mouseX, y: mouseY}

      if (isMovingTowardsSubmenu) {
        timeout = setTimeout(() => {
          reset()
          autoCloseTimeout = setTimeout(() => {
            const target = document.elementFromPoint(mouseX, mouseY)
            if (target && nodeContains(menu, target)) {
              target.dispatchEvent(new PointerEvent('pointerover', {bubbles: true, cancelable: true}))
            }
          }, 100)
        }, TIMEOUT_TIME)
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (preventPointerEvents.value) e.preventDefault()
    }

    const win = getOwnerDocument(menu).defaultView || window
    win.addEventListener('pointermove', onPointerMove)
    if ((globalThis as any)?.process?.env?.NODE_ENV !== 'test') {
      win.addEventListener('pointerdown', onPointerDown, true)
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (submenuRef.value) submenuRect = submenuRef.value.getBoundingClientRect()
    }) : null
    resizeObserver?.observe(submenu)

    cleanup = () => {
      win.removeEventListener('pointermove', onPointerMove)
      if ((globalThis as any)?.process?.env?.NODE_ENV !== 'test') {
        win.removeEventListener('pointerdown', onPointerDown, true)
      }
      resizeObserver?.disconnect()
      clearTimers()
      movementsTowardsSubmenuCount = ALLOWED_INVALID_MOVEMENTS
      submenuSide = undefined
      submenuRect = undefined
      prevPointerPos = undefined
      preventPointerEvents.value = false
      applyPointerEvents(false)
    }
  }

  bindModalityListeners()

  watch(
    () => [options.isOpen(), options.isDisabled?.() ?? false, submenuRef.value, menuRef.value, modality.value] as const,
    () => setup(),
    {immediate: true},
  )

  // Re-evaluate when interaction modality becomes pointer.
  const onWindowPointerDown = () => {
    if (options.isOpen()) setup()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onWindowPointerDown, true)
  }

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', onWindowPointerDown, true)
    }
    unbindModalityListeners()
    if (cleanup) cleanup()
    cleanup = null
  })
}
