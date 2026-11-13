import {toValue, type MaybeRefOrGetter} from 'vue'
import {mergeProps} from '../utils/mergeProps'
import {useId, useSlotId} from '../utils/useId'
import {useLabel} from './useLabel'

export interface AriaFieldProps {
  id?: MaybeRefOrGetter<string | undefined>
  label?: MaybeRefOrGetter<unknown>
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  labelElementType?: 'label' | 'span' | 'div' | 'p' | string
  description?: MaybeRefOrGetter<unknown>
  errorMessage?: MaybeRefOrGetter<unknown>
  isInvalid?: MaybeRefOrGetter<boolean | undefined>
  validationState?: MaybeRefOrGetter<'valid' | 'invalid' | undefined>
  /** Used for aria-describedby passthrough. */
  'aria-describedby'?: MaybeRefOrGetter<string | undefined>
}

export interface FieldAria {
  /** Plain object or getter-backed props for the label element. */
  labelProps: Record<string, any>
  /** Plain object or getter-backed props for the field element. */
  fieldProps: Record<string, any>
  /** Props for the description element, if any. */
  descriptionProps: Record<string, any>
  /** Props for the error message element, if any. */
  errorMessageProps: Record<string, any>
}

/**
 * Provides accessibility for input fields (label, description, error message).
 * Port of official `useField` adapted for Vue: returns plain objects/getters,
 * not ComputedRefs, and unwraps landed `useLabel` ComputedRefs internally.
 */
export function useField(props: AriaFieldProps): FieldAria {
  const {labelProps: labelPropsRef, fieldProps: fieldPropsRef} = useLabel({
    id: props.id,
    label: props.label as any,
    'aria-labelledby': props['aria-labelledby'],
    'aria-label': props['aria-label'],
    labelElementType: props.labelElementType ?? 'label',
  })

  // Official behavior: ids are always reserved via useSlotId (never gated on
  // props.description / props.errorMessage), and are only included in
  // aria-describedby when the corresponding element exists in the DOM after mount.
  const descriptionId = useId('vue-aria-description')
  const errorMessageId = useId('vue-aria-error')
  const slotIdDeps = [
    () => toValue(props.description as any) != null,
    () => toValue(props.errorMessage as any) != null,
    () => !!toValue(props.isInvalid as any) || toValue(props.validationState as any) === 'invalid',
    () => toValue(props.validationState as any),
  ]
  const resolvedDescriptionId = useSlotId(descriptionId, slotIdDeps)
  const resolvedErrorMessageId = useSlotId(errorMessageId, slotIdDeps)

  const labelProps: Record<string, any> = {}
  Object.defineProperties(labelProps, {
    id: {get: () => labelPropsRef.value.id, enumerable: true},
    htmlFor: {get: () => labelPropsRef.value.htmlFor, enumerable: true},
    for: {get: () => labelPropsRef.value.htmlFor, enumerable: true},
  })

  const fieldProps: Record<string, any> = {}
  Object.defineProperties(fieldProps, {
    id: {get: () => fieldPropsRef.value.id, enumerable: true},
    'aria-label': {get: () => fieldPropsRef.value['aria-label'], enumerable: true},
    'aria-labelledby': {get: () => fieldPropsRef.value['aria-labelledby'], enumerable: true},
    'aria-describedby': {
      get: () => {
        const parts = [
          resolvedDescriptionId.value,
          // Use aria-describedby for error messages (official behavior).
          resolvedErrorMessageId.value,
          toValue(props['aria-describedby'] as any),
        ].filter(Boolean)
        return parts.length ? parts.join(' ') : undefined
      },
      enumerable: true,
    },
  })

  const descriptionProps: Record<string, any> = {}
  Object.defineProperties(descriptionProps, {
    id: {get: () => resolvedDescriptionId.value, enumerable: true},
  })

  const errorMessageProps: Record<string, any> = {}
  Object.defineProperties(errorMessageProps, {
    id: {get: () => resolvedErrorMessageId.value, enumerable: true},
  })

  // Keep a stable ref for callers that may want the raw ids.
  ;(descriptionProps as any)._id = descriptionId
  ;(errorMessageProps as any)._id = errorMessageId

  return {labelProps, fieldProps, descriptionProps, errorMessageProps}
}
