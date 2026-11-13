/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 * for the specific language governing permissions and limitations under the License.
 */

import {computed, toValue, type ComputedRef, type MaybeRefOrGetter} from 'vue'
import {useId} from '../utils/useId'

export interface UseLabelProps {
  /** The id of the element being labeled. */
  id?: MaybeRefOrGetter<string | undefined>
  /** The label text or node for the element. */
  label?: MaybeRefOrGetter<unknown>
  /** The `aria-labelledby` value of the element being labeled. */
  'aria-labelledby'?: MaybeRefOrGetter<string | undefined>
  /** The `aria-label` value of the element being labeled. */
  'aria-label'?: MaybeRefOrGetter<string | undefined>
  /**
   * The HTML element used to render the label, e.g. 'label', or 'span'.
   *
   * @default 'label'
   */
  labelElementType?: 'label' | 'span' | 'div' | 'p' | string
}

export interface LabelAria {
  /** Props to apply to the label container element. */
  labelProps: ComputedRef<Record<string, any>>
  /** Props to apply to the field container element being labeled. */
  fieldProps: ComputedRef<Record<string, any>>
}

/**
 * Merges aria-label and aria-labelledby into aria-labelledby when both exist.
 *
 * Port of official `useLabels`
 * (`packages/react-aria/src/utils/useLabels.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */
export function useLabels(props: {
  id?: string
  'aria-label'?: string | undefined
  'aria-labelledby'?: string | undefined
}): Record<string, any> {
  const {id, 'aria-label': label, 'aria-labelledby': labelledBy} = props
  let resolvedLabelledBy = labelledBy?.trim()
  if (label && resolvedLabelledBy) {
    const ids = new Set([id, ...resolvedLabelledBy.split(/\s+/).filter(Boolean)])
    resolvedLabelledBy = [...ids].join(' ')
  } else if (resolvedLabelledBy) {
    resolvedLabelledBy = resolvedLabelledBy.split(/\s+/).join(' ')
  }
  return {
    id,
    'aria-label': label,
    'aria-labelledby': resolvedLabelledBy || undefined,
  }
}

/**
 * Provides the accessibility implementation for labels and their associated
 * elements. Labels provide context for user inputs.
 *
 * Port of official `useLabel`
 * (`packages/react-aria/src/label/useLabel.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 */
export function useLabel(props: UseLabelProps = {}): LabelAria {
  const {
    id: idProp,
    label,
    'aria-labelledby': ariaLabelledby,
    'aria-label': ariaLabel,
    labelElementType = 'label',
  } = props

  const generatedId = useId()
  const id = computed(() => toValue(idProp) ?? generatedId.value)
  const labelId = useId('vue-aria-label')
  const labelValue = computed(() => toValue(label))
  const labelledBy = computed(() => toValue(props['aria-labelledby']) as string | undefined)
  const ariaLabelValue = computed(() => (toValue(ariaLabel) as string | undefined) ?? undefined)

  // The label id is referenced by the field via aria-labelledby.
  const resolvedLabelledBy = computed(() => {
    if (labelValue.value != null) {
      // The listbox is not an HTML input element, so it should not be labeled
      // by a <label> element: point aria-labelledby at the generated label id.
      return labelledBy.value ? `${labelId.value} ${labelledBy.value}` : labelId.value
    }
    return labelledBy.value
  })

  const labelProps = computed<Record<string, any>>(() => {
    const out: Record<string, any> = {}
    if (labelValue.value != null) {
      out.id = labelId.value
      out.htmlFor = labelElementType === 'label' ? id.value || undefined : undefined
    }
    return out
  })

  const fieldProps = computed<Record<string, any>>(() =>
    useLabels({
      id: id.value,
      'aria-label': ariaLabelValue.value,
      'aria-labelledby': resolvedLabelledBy.value,
    }),
  )

  return {labelProps, fieldProps}
}
