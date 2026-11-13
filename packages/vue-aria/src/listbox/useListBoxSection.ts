/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 * for the specific language governing permissions and limitations under the License.
 */

import {useId} from '../utils/useId'
import type {Key} from 'vue-stately/useListState'

export interface AriaListBoxSectionProps {
  /** The heading for the section. */
  heading?: unknown
  /** An accessibility label for the section. Required if `heading` is not present. */
  'aria-label'?: string
}

export interface ListBoxSectionAria {
  /** Props for the wrapper list item. */
  itemProps: {role: 'presentation'}
  /** Props for the heading element, if any. */
  headingProps: {id?: string; role?: string; onMouseDown?: (e: unknown) => void}
  /** Props for the group element. */
  groupProps: {role: string; 'aria-label'?: string; 'aria-labelledby'?: string}
}

/**
 * Provides the behavior and accessibility implementation for a section in a
 * listbox. See `useListBox` for more details about listboxes.
 */
export function useListBoxSection(props: AriaListBoxSectionProps): ListBoxSectionAria {
  const {heading, 'aria-label': ariaLabel} = props
  const headingIdRef = useId('vue-aria-listbox-section-heading')

  const headingId = headingIdRef.value

  const groupProps: {role: string; 'aria-label'?: string; 'aria-labelledby'?: string} = {role: 'group'}
  if (ariaLabel) groupProps['aria-label'] = ariaLabel
  if (heading) groupProps['aria-labelledby'] = headingId

  return {
    itemProps: {
      role: 'presentation',
    },
    headingProps: heading
      ? {
          id: headingId,
          role: 'presentation',
          onMouseDown: (e: unknown) => {
            void e
          },
        }
      : {},
    groupProps,
  }
}
