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

export interface SeparatorProps {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'
  /** The HTML element type that will be used to render the separator. */
  elementType?: string
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export interface SeparatorAria {
  /** Props for the separator element. Plain object, not a ComputedRef. */
  separatorProps: Record<string, any>
}

/**
 * Provides the accessibility implementation for a separator.
 * Port of official `useSeparator` (react-aria@3.53.1).
 */
export function useSeparator(props: SeparatorProps): SeparatorAria {
  const separatorProps: Record<string, any> = {}
  if (props.id != null) separatorProps.id = props.id
  if (props['aria-label'] != null) separatorProps['aria-label'] = props['aria-label']
  if (props['aria-labelledby'] != null) separatorProps['aria-labelledby'] = props['aria-labelledby']

  const ariaOrientation = props.orientation === 'vertical' ? 'vertical' : undefined
  // hr elements implicitly have role = separator and a horizontal orientation
  if (props.elementType !== 'hr') {
    separatorProps.role = 'separator'
    if (ariaOrientation) separatorProps['aria-orientation'] = ariaOrientation
  }
  return {separatorProps}
}
