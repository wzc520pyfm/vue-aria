import {onBeforeUnmount, reactive, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import {getOwnerDocument} from '../utils/dom'
import {useId} from '../utils/useId'

export interface AriaDialogProps {
  /**
   * The accessibility role for the dialog.
   *
   * @default 'dialog'
   */
  role?: MaybeRefOrGetter<'dialog' | 'alertdialog' | undefined>
  /** Accessible name when there is no visible title. */
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  /** Overrides the title element's id. */
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
  /**
   * Whether a title element that uses `titleProps.id` is currently rendered.
   * Official `useSlotId` only keeps the generated title id when that element
   * exists in the DOM. When omitted, the hook checks `document.getElementById`.
   */
  hasTitle?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether an ancestor overlay is still in its enter animation. Focus is
   * deferred until this is false, matching official `useDialog` `isEntering`.
   */
  isEntering?: MaybeRefOrGetter<boolean | undefined>
}

export interface DialogPropsEl {
  role: 'dialog' | 'alertdialog'
  tabIndex: number
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-modal'?: boolean | 'true' | 'false'
}

export interface TitlePropsEl {
  id?: string
}

export interface DialogAria {
  /** Props for the dialog container element. Plain object, not a ComputedRef. */
  dialogProps: DialogPropsEl
  /** Props for the dialog title element. Plain object, not a ComputedRef. */
  titleProps: TitlePropsEl
  /** Props for the dialog content/description element (alertdialog). */
  contentProps: TitlePropsEl
}

/**
 * Provides the behavior and accessibility implementation for a dialog.
 *
 * Port of official `useDialog`
 * (`packages/react-aria/src/dialog/useDialog.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 *
 * Official does not set `aria-modal` (Safari iframe bug). This hook still
 * exposes `aria-modal` when a caller (the RAC Dialog inside a Modal) sets it
 * — see `vue-aria-components` Dialog.
 *
 * Official `useSlotId` only resolves `aria-labelledby` to the generated title
 * id when that element is in the DOM. This hook does the same via `hasTitle`
 * or a `getElementById` check, so a missing Heading does not leave a dangling
 * labelledby.
 */
export function useDialog(
  props: AriaDialogProps = {},
  ref?: Ref<HTMLElement | null | undefined>,
): DialogAria {
  const titleId = useId('vue-aria-title')
  const contentId = useId('vue-aria-content')

  const dialogProps = reactive<DialogPropsEl>({
    role: 'dialog',
    tabIndex: -1,
  }) as DialogPropsEl

  const titleProps = reactive<TitlePropsEl>({}) as TitlePropsEl
  const contentProps = reactive<TitlePropsEl>({}) as TitlePropsEl

  function applyLabels() {
    const role = toValue(props.role) ?? 'dialog'
    const ariaLabel = toValue(props['aria-label'])
    const ariaLabelledby = toValue(props['aria-labelledby'])
    const ariaDescribedby = toValue(props['aria-describedby'])
    const hasTitle = toValue(props.hasTitle)

    dialogProps.role = role
    dialogProps.tabIndex = -1
    if (ariaLabel) {
      dialogProps['aria-label'] = ariaLabel
    } else {
      delete dialogProps['aria-label']
    }

    // Always expose a generated id so a title Heading can attach it, except
    // when the dialog is named only by aria-label (official useSlotId).
    if (ariaLabel && !ariaLabelledby && hasTitle !== true) {
      delete titleProps.id
    } else {
      titleProps.id = titleId.value
    }

    const titleExists =
      hasTitle === true ||
      (hasTitle !== false &&
        typeof document !== 'undefined' &&
        Boolean(document.getElementById(titleId.value)))

    const labelledby = ariaLabelledby ?? (ariaLabel || !titleExists ? undefined : titleId.value)
    if (labelledby) {
      dialogProps['aria-labelledby'] = labelledby
    } else {
      delete dialogProps['aria-labelledby']
    }
    if (role === 'alertdialog' && !ariaDescribedby) {
      dialogProps['aria-describedby'] = contentId.value
      contentProps.id = contentId.value
    } else if (ariaDescribedby) {
      dialogProps['aria-describedby'] = ariaDescribedby
      delete contentProps.id
    } else {
      delete dialogProps['aria-describedby']
      delete contentProps.id
    }
  }

  watch(
    () => ({
      role: toValue(props.role) ?? 'dialog',
      ariaLabel: toValue(props['aria-label']),
      ariaLabelledby: toValue(props['aria-labelledby']),
      ariaDescribedby: toValue(props['aria-describedby']),
      titleId: titleId.value,
      contentId: contentId.value,
      hasTitle: toValue(props.hasTitle),
    }),
    () => applyLabels(),
    {immediate: true},
  )

  // Re-check whether the title node exists after children have mounted
  // (official useSlotId layout effect).
  watch(
    () => [ref?.value, titleId.value, toValue(props.hasTitle)] as const,
    () => applyLabels(),
    {flush: 'post'},
  )

  // Auto-focus the dialog once it is mounted and not entering, unless focus
  // is already inside it. Official useDialog at the same SHA.
  // Capture the previously focused element at setup time (official captures
  // `document.activeElement` during render, before parent focus-scope
  // layout effects run) and restore it on unmount.
  const toRestore: {current: Element | null} = {
    current: typeof document !== 'undefined' ? document.activeElement : null,
  }

  watch(
    () => [ref?.value] as const,
    ([element], _prev, onCleanup) => {
      if (!element) return
      const doc = getOwnerDocument(element)

      let cancelled = false
      const isEnteringNow = () =>
        Boolean(toValue(props.isEntering)) ||
        element.getAttribute('data-entering') === 'true' ||
        Boolean(element.closest('[data-entering="true"]'))

      const tryFocus = () => {
        if (cancelled || !element.isConnected) return true
        // Always re-read entering state. A snapshot from the first post-flush
        // tick stays true for one macrotask and would block the 0ms retry.
        if (isEnteringNow()) return false
        if (!element.contains(doc.activeElement)) {
          try {
            element.focus({preventScroll: true})
          } catch {
            element.focus()
          }
        }
        return true
      }

      if (tryFocus()) return

      const cap = window.setTimeout(() => {
        tryFocus()
      }, 2000)
      let timer: ReturnType<typeof setTimeout> | undefined
      const schedule = () => {
        if (cancelled) return
        timer = window.setTimeout(() => {
          if (!tryFocus()) schedule()
        }, 0)
      }
      const onEnd = () => {
        if (!tryFocus()) schedule()
      }
      element.addEventListener('animationend', onEnd)
      element.addEventListener('transitionend', onEnd)
      schedule()
      onCleanup(() => {
        cancelled = true
        element.removeEventListener('animationend', onEnd)
        element.removeEventListener('transitionend', onEnd)
        clearTimeout(cap)
        if (timer) clearTimeout(timer)
      })
    },
    {flush: 'post'},
  )

  onBeforeUnmount(() => {
    const target = toRestore.current
    toRestore.current = null
    if (target instanceof HTMLElement && target.isConnected) {
      try {
        target.focus({preventScroll: true})
      } catch {
        target.focus()
      }
    }
  })

  return {dialogProps, titleProps, contentProps}
}
