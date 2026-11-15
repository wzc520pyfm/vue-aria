/*
 * Port of `react-aria@3.53.1` `radio/utils.ts`
 * (`packages/react-aria/src/radio/utils.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * The WeakMap stores live getter functions so `name` / `form` /
 * `descriptionId` / `errorMessageId` / `validationBehavior` are re-read on
 * every access instead of being snapshotted at group setup time.
 */

import type {RadioGroupState} from '../../../vue-stately/src/radio/useRadioGroupState'

interface RadioGroupData {
  name: () => string
  form?: () => string | undefined
  descriptionId?: () => string | undefined
  errorMessageId?: () => string | undefined
  validationBehavior: () => 'aria' | 'native'
}

export const radioGroupData: WeakMap<RadioGroupState, RadioGroupData> = new WeakMap()
