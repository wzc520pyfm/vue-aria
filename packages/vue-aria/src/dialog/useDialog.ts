import {reactive, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
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
 */
export function useDialog(
  props: AriaDialogProps = {},
  _ref?: Ref<HTMLElement | null | undefined>,
): DialogAria {
  const titleId = useId('vue-aria-title')
  const contentId = useId('vue-aria-content')

  const dialogProps = reactive<DialogPropsEl>({
    role: 'dialog',
    tabIndex: -1,
  }) as DialogPropsEl

  const titleProps = reactive<TitlePropsEl>({}) as TitlePropsEl
  const contentProps = reactive<TitlePropsEl>({}) as TitlePropsEl

  watch(
    () => ({
      role: toValue(props.role) ?? 'dialog',
      ariaLabel: toValue(props['aria-label']),
      ariaLabelledby: toValue(props['aria-labelledby']),
      ariaDescribedby: toValue(props['aria-describedby']),
      titleId: titleId.value,
      contentId: contentId.value,
    }),
    (next) => {
      dialogProps.role = next.role
      dialogProps.tabIndex = -1
      if (next.ariaLabel) {
        dialogProps['aria-label'] = next.ariaLabel
      } else {
        delete dialogProps['aria-label']
      }
      const labelledby = next.ariaLabelledby ?? (next.ariaLabel ? undefined : next.titleId)
      if (labelledby) {
        dialogProps['aria-labelledby'] = labelledby
        titleProps.id = next.titleId
      } else {
        delete dialogProps['aria-labelledby']
        if (next.ariaLabel) {
          delete titleProps.id
        } else {
          titleProps.id = next.titleId
        }
      }
      if (next.role === 'alertdialog' && !next.ariaDescribedby) {
        dialogProps['aria-describedby'] = next.contentId
        contentProps.id = next.contentId
      } else if (next.ariaDescribedby) {
        dialogProps['aria-describedby'] = next.ariaDescribedby
        delete contentProps.id
      } else {
        delete dialogProps['aria-describedby']
        delete contentProps.id
      }
    },
    {immediate: true},
  )

  return {dialogProps, titleProps, contentProps}
}
