/*
 * Port of `react-aria@3.53.1` `useFormattedTextField`
 * (`packages/react-aria/src/textfield/useFormattedTextField.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported. The official React-only
 * `useEffectEvent` wrapper is replaced with ordinary live callbacks over the
 * passed `state` object.
 */

import {onScopeDispose, watch, type Ref} from 'vue'
import {mergeProps} from '../utils/mergeProps'
import {useTextField, type AriaTextFieldOptions, type TextFieldAria} from './useTextField'

interface FormattedTextFieldState {
  validate: (val: string) => boolean
  setInputValue: (val: string) => void
}

function supportsNativeBeforeInputEvent() {
  return (
    typeof window !== 'undefined' &&
    (window as any).InputEvent &&
    typeof (window as any).InputEvent.prototype?.getTargetRanges === 'function'
  )
}

function getEventTarget(e: Event): any {
  return e.target
}

export function useFormattedTextField(
  props: AriaTextFieldOptions,
  state: FormattedTextFieldState,
  inputRef: Ref<HTMLInputElement | null>,
): TextFieldAria {
  // All browsers implement the 'beforeinput' event natively except Firefox
  // (currently behind a flag as of Firefox 84). React's polyfill does not
  // run in all cases that the native event fires, e.g. when deleting text.
  // Use the native event if available so that we can prevent invalid deletions.
  const onBeforeInputFallback = (e: InputEvent) => {
    const input = inputRef.value
    if (!input) {
      return
    }

    // Compute the next value of the input if the event is allowed to proceed.
    // See https://www.w3.org/TR/input-events-2/#interface-InputEvent-Attributes for a full list of input types.
    let nextValue: string | null = null
    switch (e.inputType) {
      case 'historyUndo':
      case 'historyRedo':
        // Explicitly allow undo/redo. e.data is null in this case, but there's no need to validate,
        // because presumably the input would have already been validated previously.
        return
      case 'insertLineBreak':
        // Explicitly allow "insertLineBreak" event, to allow onSubmit for "enter" key. e.data is null in this case.
        return
      case 'deleteContent':
      case 'deleteByCut':
      case 'deleteByDrag':
        nextValue =
          input.value.slice(0, input.selectionStart!) + input.value.slice(input.selectionEnd!)
        break
      case 'deleteContentForward':
        // This is potentially incorrect, since the browser may actually delete more than a single UTF-16
        // character. In reality, a full Unicode grapheme cluster consisting of multiple UTF-16 characters
        // or code points may be deleted. However, in our currently supported locales, there are no such cases.
        // If we support additional locales in the future, this may need to change.
        nextValue =
          input.selectionEnd === input.selectionStart
            ? input.value.slice(0, input.selectionStart!) +
              input.value.slice(input.selectionEnd! + 1)
            : input.value.slice(0, input.selectionStart!) + input.value.slice(input.selectionEnd!)
        break
      case 'deleteContentBackward':
        nextValue =
          input.selectionEnd === input.selectionStart
            ? input.value.slice(0, input.selectionStart! - 1) +
              input.value.slice(input.selectionStart!)
            : input.value.slice(0, input.selectionStart!) + input.value.slice(input.selectionEnd!)
        break
      case 'deleteSoftLineBackward':
      case 'deleteHardLineBackward':
        nextValue = input.value.slice(input.selectionStart!)
        break
      default:
        if (e.data != null) {
          nextValue =
            input.value.slice(0, input.selectionStart!) +
            e.data +
            input.value.slice(input.selectionEnd!)
        }
        break
    }

    // If we did not compute a value, or the new value is invalid, prevent the event
    // so that the browser does not update the input text, move the selection, or add to
    // the undo/redo stack.
    if (nextValue == null || !state.validate(nextValue)) {
      e.preventDefault()
    }
  }

  const useNativeBeforeInput = supportsNativeBeforeInputEvent()
  let removeBeforeInput: (() => void) | null = null
  if (useNativeBeforeInput) {
    const handler = (e: Event) => onBeforeInputFallback(e as InputEvent)
    const stop = watch(
      inputRef,
      (el) => {
        if (removeBeforeInput) {
          removeBeforeInput()
          removeBeforeInput = null
        }
        if (!el) {
          return
        }
        el.addEventListener('beforeinput', handler, false)
        removeBeforeInput = () => el.removeEventListener('beforeinput', handler, false)
      },
      {immediate: true, flush: 'post'},
    )
    onScopeDispose(() => {
      stop()
      if (removeBeforeInput) {
        removeBeforeInput()
        removeBeforeInput = null
      }
    })
  }

  const onBeforeInput: ((e: InputEvent) => void) | null = !useNativeBeforeInput
    ? (e: InputEvent) => {
        const target = getEventTarget(e)
        const nextValue =
          target.value.slice(0, target.selectionStart!) +
          (e as any).data +
          target.value.slice(target.selectionEnd!)

        if (!state.validate(nextValue)) {
          e.preventDefault()
        }
      }
    : null

  const {
    labelProps,
    inputProps: textFieldProps,
    descriptionProps,
    errorMessageProps,
    ...validation
  } = useTextField(props, inputRef)

  const compositionStartState: {
    current: {
      value: string
      selectionStart: number | null
      selectionEnd: number | null
    } | null
  } = {current: null}

  return {
    // Vue boundary: `onBeforeInput` is only set when the native event is not
    // available (Firefox); otherwise the native listener above handles it.
    inputProps: mergeProps(textFieldProps, {
      ...(onBeforeInput ? {onBeforeInput} : {}),
      onCompositionStart() {
        // Chrome does not implement Input Events Level 2, which specifies the insertFromComposition
        // and deleteByComposition inputType values for the beforeinput event. These are meant to occur
        // at the end of a composition (e.g. Pinyin IME, Android auto correct, etc.), and crucially, are
        // cancelable. The insertCompositionText and deleteCompositionText input types are not cancelable,
        // nor would we want to cancel them because the input from the user is incomplete at that point.
        // In Safari, insertFromComposition/deleteFromComposition will fire, however, allowing us to cancel
        // the final composition result if it is invalid. As a fallback for Chrome and Firefox, which either
        // don't support Input Events Level 2, or beforeinput at all, we store the state of the input when
        // the compositionstart event fires, and undo the changes in compositionend (below) if it is invalid.
        // Unfortunately, this messes up the undo/redo stack, but until insertFromComposition/deleteByComposition
        // are implemented, there is no other way to prevent composed input.
        // See https://bugs.chromium.org/p/chromium/issues/detail?id=1022204
        if (!inputRef.value) {
          return
        }
        const {value, selectionStart, selectionEnd} = inputRef.value
        compositionStartState.current = {value, selectionStart, selectionEnd}
      },
      onCompositionEnd() {
        if (inputRef.value && !state.validate(inputRef.value.value)) {
          // Restore the input value in the DOM immediately so we can synchronously update the selection position.
          // But also update the value in state as well so it is correct for future updates.
          const saved = compositionStartState.current
          if (!saved) {
            return
          }
          const {value, selectionStart, selectionEnd} = saved
          inputRef.value.value = value
          inputRef.value.setSelectionRange(selectionStart ?? 0, selectionEnd ?? 0)
          state.setInputValue(value)
        }
      },
    }),
    labelProps,
    descriptionProps,
    errorMessageProps,
    ...validation,
  }
}
