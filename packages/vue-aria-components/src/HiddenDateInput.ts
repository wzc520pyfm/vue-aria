/*
 * Port of `react-aria-components@1.22.1` `HiddenDateInput`
 * (`packages/react-aria-components/src/HiddenDateInput.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Internal — deliberately NOT part of the public surface
 * (no subpath export). Only rendered by `DateField`, not `TimeField`.
 */

import {
  parseDate,
  parseDateTime,
  toCalendarDate,
  toCalendarDateTime,
  toLocalTimeZone,
} from '@internationalized/date'
import {defineComponent, h, type PropType} from 'vue'
import {useVisuallyHidden} from 'vue-aria/VisuallyHidden'
import type {DateFieldState, DateSegmentType} from 'vue-stately/useDateFieldState'

const dateSegments = ['day', 'month', 'year']
const granularityMap: Record<string, number> = {hour: 1, minute: 2, second: 3}

interface HiddenDateInputProps {
  /** Describes the type of autocomplete functionality the input should provide if any. */
  autoComplete?: string
  /** HTML form input name. */
  name?: string
  /** Sets the disabled state of the input. */
  isDisabled?: boolean
  /** State for the input. */
  state: DateFieldState
}

export const HiddenDateInput = defineComponent({
  name: 'HiddenDateInput',
  props: {
    autoComplete: {type: String, default: undefined},
    name: {type: String, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    state: {type: Object as PropType<DateFieldState>, required: true},
  },
  setup(props: HiddenDateInputProps) {
    const {visuallyHiddenProps} = useVisuallyHidden({
      style: {
        // Prevent page scrolling.
        position: 'fixed',
        top: '0',
        left: '0',
      },
    })

    const inputStep = () => {
      if (props.state.granularity === 'second') {
        return 1
      }
      if (props.state.granularity === 'hour') {
        return 3600
      }
      return 60
    }

    const dateValue = () => {
      const value = props.state.value
      if (!value) {
        return ''
      }
      if (props.state.granularity === 'day') {
        return toCalendarDate(value as any).toString()
      }
      return toCalendarDateTime(
        'timeZone' in value ? (toLocalTimeZone(value as any) as any) : value,
      ).toString()
    }

    const inputType = () => (props.state.granularity === 'day' ? 'date' : 'datetime-local')

    let timeSegments = ['hour', 'minute', 'second']
    // Depending on the granularity, we only want to validate certain time segments
    const getTimeSegments = () => {
      timeSegments = ['hour', 'minute', 'second']
      let end = 0
      if (timeSegments.includes(props.state.granularity)) {
        end = granularityMap[props.state.granularity]
        return timeSegments.slice(0, end)
      }
      return timeSegments
    }

    const onChange = (e: Event) => {
      const targetString = (e.target as HTMLInputElement).value?.toString() ?? ''
      if (targetString) {
        try {
          let targetValue = parseDateTime(targetString)
          if (props.state.granularity === 'day') {
            targetValue = parseDate(targetString) as any
          }
          // The setValue method first checks to make sure each segment is filled before
          // committing the new value, so we first set each segment to validate it before
          // committing the new value.
          const activeTimeSegments = getTimeSegments()
          for (const type in targetValue as any) {
            if (dateSegments.includes(type)) {
              props.state.setSegment(type as DateSegmentType, (targetValue as any)[type])
            }
            if (activeTimeSegments.includes(type)) {
              props.state.setSegment(type as DateSegmentType, (targetValue as any)[type])
            }
          }
          props.state.setValue(targetValue)
        } catch {
          // ignore
        }
      }
    }

    return () => {
      const containerProps: Record<string, any> = {
        ...visuallyHiddenProps,
        'aria-hidden': 'true',
        'data-react-aria-prevent-focus': 'true',
        'data-a11y-ignore': 'aria-hidden-focus',
        'data-testid': 'hidden-dateinput-container',
      }
      const inputProps: Record<string, any> = {
        tabindex: -1,
        autoComplete: props.autoComplete,
        disabled: props.isDisabled || undefined,
        type: inputType(),
        // We set the form prop to an empty string to prevent the hidden date input's value from being submitted
        form: '',
        name: props.name,
        step: inputStep(),
        value: dateValue(),
        onChange,
        // React's onChange fires on input events; keep the same live behavior.
        onInput: onChange,
      }
      return h('div', containerProps, [h('input', inputProps)])
    }
  },
})
