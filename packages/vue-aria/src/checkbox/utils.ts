/*
 * Port of `react-aria@3.53.1` `checkbox/utils.ts`
 * (`packages/react-aria/src/checkbox/utils.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * The WeakMap stores live getter functions so `name` / `form` /
 * `descriptionId` / `errorMessageId` / `validationBehavior` are re-read on
 * every access instead of being snapshotted at group setup time.
 */

import type {CheckboxGroupState} from '../../../vue-stately/src/checkbox/useCheckboxGroupState'

interface CheckboxGroupData {
  name?: () => string | undefined
  form?: () => string | undefined
  descriptionId?: () => string | undefined
  errorMessageId?: () => string | undefined
  validationBehavior: () => 'aria' | 'native'
}

export const checkboxGroupData: WeakMap<CheckboxGroupState, CheckboxGroupData> = new WeakMap()
