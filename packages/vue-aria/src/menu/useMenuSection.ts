/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {useId} from '../utils/useId'

export interface AriaMenuSectionProps {
  /** The heading for the section. */
  heading?: unknown
  /** An accessibility label for the section. Required if `heading` is not present. */
  'aria-label'?: string
}

export interface MenuSectionAria {
  /** Props for the wrapper list item. */
  itemProps: Record<string, any>
  /** Props for the heading element, if any. */
  headingProps: Record<string, any>
  /** Props for the group element. */
  groupProps: Record<string, any>
}

/**
 * Provides the behavior and accessibility implementation for a section in a menu.
 * Port of official `useMenuSection` (react-aria@3.53.1).
 */
export function useMenuSection(props: AriaMenuSectionProps): MenuSectionAria {
  const {heading, 'aria-label': ariaLabel} = props
  const headingId = useId('vue-aria-menu-section-heading')

  return {
    itemProps: {
      role: 'presentation',
    },
    headingProps: heading
      ? {
          id: headingId.value,
          role: 'presentation',
        }
      : {},
    groupProps: {
      role: 'group',
      'aria-label': ariaLabel,
      'aria-labelledby': heading ? headingId.value : undefined,
    },
  }
}
