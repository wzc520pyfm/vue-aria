/*
 * Port of `react-aria@3.53.1` `useMeter`
 * (`packages/react-aria/src/meter/useMeter.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. The role override forwards live progress getters.
 * Spreading `progressBarProps` would copy the current values once.
 */

import {
  useProgressBar,
  type AriaProgressBarBaseProps,
  type AriaProgressBarProps,
  type ProgressBarBaseProps,
} from '../progress/useProgressBar'

export type MeterProps = ProgressBarBaseProps
export interface AriaMeterProps extends AriaProgressBarBaseProps {}

export interface MeterAria {
  /** Props for the meter container element. */
  meterProps: Record<string, any>
  /** Props for the meter's visual label (if any). */
  labelProps: Record<string, any>
}

function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
}

/**
 * Provides the accessibility implementation for a meter component.
 * Meters represent a quantity within a known range, or a fractional value.
 */
export function useMeter(props: AriaMeterProps = {}): MeterAria {
  const {progressBarProps, labelProps} = useProgressBar(props as AriaProgressBarProps)
  const meterProps: Record<string, any> = {}
  for (const key of Object.keys(progressBarProps)) {
    if (key === 'role') continue
    defineLive(meterProps, key, () => progressBarProps[key])
  }
  defineLive(meterProps, 'role', () => 'meter')
  return {meterProps, labelProps}
}
