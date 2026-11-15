/*
 * Port of `react-stately@3.51.0` internal number utils
 * (`packages/react-stately/src/utils/number.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 * Internal — official does not export these either. Only used by
 * `useNumberFieldState`.
 */

/**
 * Takes a value and forces it to the closest min/max if it's outside. Also forces it to the closest
 * valid step.
 */
export function clamp(value: number, min: number = -Infinity, max: number = Infinity): number {
  const newValue = Math.min(Math.max(value, min), max)
  return newValue
}

export function roundToStepPrecision(value: number, step: number): number {
  let roundedValue = value
  let precision = 0
  const stepString = step.toString()
  // Handle negative exponents in exponential notation (e.g., "1e-7" → precision 8)
  const eIndex = stepString.toLowerCase().indexOf('e-')
  if (eIndex > 0) {
    precision = Math.abs(Math.floor(Math.log10(Math.abs(step)))) + eIndex
  } else {
    const pointIndex = stepString.indexOf('.')
    if (pointIndex >= 0) {
      precision = stepString.length - pointIndex
    }
  }
  if (precision > 0) {
    const pow = Math.pow(10, precision)
    roundedValue = Math.round(roundedValue * pow) / pow
  }
  return roundedValue
}

export function snapValueToStep(
  value: number,
  min: number | undefined,
  max: number | undefined,
  step: number,
): number {
  min = Number(min)
  max = Number(max)
  const remainder = (value - (isNaN(min) ? 0 : min)) % step
  let snappedValue = roundToStepPrecision(
    Math.abs(remainder) * 2 >= step
      ? value + Math.sign(remainder) * (step - Math.abs(remainder))
      : value - remainder,
    step,
  )

  if (!isNaN(min)) {
    if (snappedValue < min) {
      snappedValue = min
    } else if (!isNaN(max) && snappedValue > max) {
      snappedValue = min + Math.floor(roundToStepPrecision((max - min) / step, step)) * step
    }
  } else if (!isNaN(max) && snappedValue > max) {
    snappedValue = Math.floor(roundToStepPrecision(max / step, step)) * step
  }

  // correct floating point behavior by rounding to step precision
  snappedValue = roundToStepPrecision(snappedValue, step)

  return snappedValue
}

/* Takes a value and rounds off to the number of digits. */
export function toFixedNumber(value: number, digits: number, base: number = 10): number {
  const pow = Math.pow(base, digits)

  return Math.round(value * pow) / pow
}
