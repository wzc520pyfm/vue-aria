/*
 * Public surface of `vue-aria` slider behavior, aligned with
 * `react-aria@3.53.1` (`packages/react-aria/exports/useSlider.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * `useSlider` and `useSliderThumb` share this entry. There is no
 * `useSliderThumb` subpath.
 */

export {useSlider} from '../src/slider/useSlider'
export {useSliderThumb} from '../src/slider/useSliderThumb'
export type {AriaSliderProps, SliderAria, Orientation} from '../src/slider/useSlider'
export type {
  SliderThumbProps,
  AriaSliderThumbProps,
  AriaSliderThumbOptions,
  SliderThumbAria,
} from '../src/slider/useSliderThumb'
