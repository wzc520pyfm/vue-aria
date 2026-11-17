import type {SliderState} from 'vue-stately/useSliderState'

interface SliderData {
  id: string
  'aria-describedby'?: string
  'aria-details'?: string
}

/** Private association from a slider state object to its label id. Not exported. */
export const sliderData: WeakMap<SliderState, SliderData> = new WeakMap()

export function getSliderThumbId(state: SliderState, index: number): string {
  const data = sliderData.get(state)
  if (!data) throw new Error('Unknown slider state')
  return `${data.id}-${index}`
}
