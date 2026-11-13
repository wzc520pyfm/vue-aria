/*
 * Port of `react-aria@3.53.1` `useFormValidation`
 * (`packages/react-aria/src/form/useFormValidation.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — not publicly exported.
 */

import {onScopeDispose, toValue, watch, type MaybeRefOrGetter} from 'vue'
import {setInteractionModality} from '../interactions/focusVisible'

// Structural subset of vue-stately's internal FormValidationState (kept
// un-exported there), so no public surface is added.
interface ValidationLikeResult {
  isInvalid: boolean
  validationErrors: string[]
  validationDetails: any
}

interface FormValidationLike {
  readonly realtimeValidation: ValidationLikeResult
  readonly displayValidation: ValidationLikeResult
  updateValidation(result: ValidationLikeResult): void
  resetValidation(): void
  commitValidation(): void
}

type ValidatableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

interface FormValidationProps<T> {
  validationBehavior?: MaybeRefOrGetter<'native' | 'aria' | undefined>
  focus?: () => void
}

/**
 * Wires the form validation state to the native input: setCustomValidity,
 * `invalid`/`change` listeners, and form reset handling.
 */
export function useFormValidation<T>(
  props: FormValidationProps<T>,
  state: FormValidationLike,
  ref: {value: ValidatableElement | null} | undefined,
): void {
  // This runs before useFormValidationState commits validation (official
  // useLayoutEffect ordering); in Vue we keep it synchronous via a watch on the
  // realtime validation state.
  const applyNativeValidity = () => {
    const validationBehavior = toValue(props.validationBehavior)
    const input = ref?.value
    if (
      validationBehavior === 'native' &&
      input &&
      'setCustomValidity' in input &&
      !input.disabled
    ) {
      const errorMessage = state.realtimeValidation.isInvalid
        ? state.realtimeValidation.validationErrors.join(' ') || 'Invalid value.'
        : ''
      input.setCustomValidity(errorMessage)

      // Prevent default tooltip for validation message.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=605277
      if (!input.hasAttribute('title')) {
        input.setAttribute('title', '')
      }

      if (!state.realtimeValidation.isInvalid) {
        state.updateValidation(getNativeValidity(input))
      }
    }
  }

  watch(
    () => [state.realtimeValidation.isInvalid, ref?.value, toValue(props.validationBehavior)],
    () => applyNativeValidity(),
    {immediate: true, flush: 'post'},
  )

  let isIgnoredReset = false
  const onReset = () => {
    if (!isIgnoredReset) {
      state.resetValidation()
    }
  }

  const onInvalid = (e: Event) => {
    // Only commit validation if we are not already displaying one.
    // This avoids clearing server errors that the user didn't actually fix.
    if (!state.displayValidation.isInvalid) {
      state.commitValidation()
    }

    // Auto focus the first invalid input in a form, unless the error already had its default prevented.
    const input = ref?.value
    const form = input?.form
    if (!(e as any).defaultPrevented && input && form && getFirstInvalidInput(form) === input) {
      if (props.focus) {
        props.focus()
      } else {
        input.focus()
      }

      // Always show focus ring.
      setInteractionModality('keyboard')
    }

    // Prevent default browser error UI from appearing.
    e.preventDefault()
  }

  const onChange = () => {
    state.commitValidation()
  }

  // Track element attachment for cleanup.
  let currentInput: ValidatableElement | null = null
  let currentForm: HTMLFormElement | null = null
  let originalReset: (() => void) | null = null

  watch(
    () => ref?.value ?? null,
    (input) => {
      // Detach previous listeners.
      if (currentInput) {
        currentInput.removeEventListener('invalid', onInvalid)
        currentInput.removeEventListener('change', onChange)
        if (currentForm) {
          currentForm.removeEventListener('reset', onReset)
          if (originalReset) {
            ;(currentForm as any).reset = originalReset
          }
        }
        currentInput = null
        currentForm = null
        originalReset = null
      }

      if (!input) {
        return
      }

      const form = input.form
      currentInput = input
      currentForm = form ?? null

      if (form) {
        // Try to detect framework automatic form reset behavior so we don't clear
        // validation errors that are returned by server actions.
        // To do this, we ignore programmatic form resets that occur outside a user event.
        // This is best-effort. There may be false positives, e.g. setTimeout.
        const reset = form.reset
        originalReset = reset
        form.reset = () => {
          // Ignore 'message' events (frameworks may use MessageChannel for scheduling).
          isIgnoredReset =
            !(window as any).event ||
            ((window as any).event.type === 'message' &&
              (window as any).event.target instanceof MessagePort)
          reset?.call(form)
          isIgnoredReset = false
        }
      }

      input.addEventListener('invalid', onInvalid)
      input.addEventListener('change', onChange)
      form?.addEventListener('reset', onReset)
    },
    {immediate: true, flush: 'post'},
  )

  onScopeDispose(() => {
    if (currentInput) {
      currentInput.removeEventListener('invalid', onInvalid)
      currentInput.removeEventListener('change', onChange)
    }
    if (currentForm) {
      currentForm.removeEventListener('reset', onReset)
      if (originalReset) {
        ;(currentForm as any).reset = originalReset
      }
    }
  })
}

function getValidity(input: ValidatableElement) {
  // The native ValidityState object is live, meaning each property is a getter that returns the current state.
  // We need to create a snapshot of the validity state at the time this function is called to avoid unpredictable renders.
  const validity = input.validity
  return {
    badInput: validity.badInput,
    customError: validity.customError,
    patternMismatch: validity.patternMismatch,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch,
    tooLong: validity.tooLong,
    tooShort: validity.tooShort,
    typeMismatch: validity.typeMismatch,
    valueMissing: validity.valueMissing,
    valid: validity.valid,
  }
}

function getNativeValidity(input: ValidatableElement) {
  return {
    isInvalid: !input.validity.valid,
    validationDetails: getValidity(input),
    validationErrors: input.validationMessage ? [input.validationMessage] : [],
  }
}

function getFirstInvalidInput(form: HTMLFormElement): ValidatableElement | null {
  for (let i = 0; i < form.elements.length; i++) {
    const element = form.elements[i] as ValidatableElement
    if (element.validity?.valid === false) {
      return element
    }
  }

  return null
}
