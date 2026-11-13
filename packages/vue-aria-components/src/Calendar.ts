/*
 * Port of `react-aria-components@1.22.1` Calendar (single-calendar slice only)
 * (`packages/react-aria-components/src/Calendar.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted to Vue. RangeCalendar, month/year pickers, and CalendarHeading are
 * intentionally deferred in this slice.
 */

import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  reactive,
  ref,
  toValue,
  type InjectionKey,
  type PropType,
  type Ref,
} from 'vue'
import {
  createCalendar as createDefaultCalendar,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  type CalendarDate,
  type DateDuration,
} from '@internationalized/date'
import {useCalendarState, type CalendarSelectionMode, type CalendarState, type DateValue} from 'vue-stately/useCalendarState'
import {useCalendar} from 'vue-aria/useCalendar'
import {useCalendarGrid} from 'vue-aria/useCalendarGrid'
import {useCalendarCell} from 'vue-aria/useCalendarCell'
import {useLocale} from 'vue-aria/I18nProvider'
import {VisuallyHidden} from 'vue-aria/VisuallyHidden'
import {mergeProps, useFocusVisible, useHover} from 'vue-aria'
import {ButtonContextKey, HeadingContextKey} from './context'

export interface CalendarRenderProps<M extends CalendarSelectionMode = 'single'> {
  isDisabled: boolean
  state: CalendarState<M>
  isInvalid: boolean
}

export interface CalendarProps<T extends DateValue, M extends CalendarSelectionMode = 'single'> {
  value?: any
  defaultValue?: any
  onChange?: (value: any) => void
  minValue?: DateValue | null
  maxValue?: DateValue | null
  isDisabled?: boolean
  isReadOnly?: boolean
  autoFocus?: boolean
  focusedValue?: DateValue | null
  defaultFocusedValue?: DateValue | null
  onFocusChange?: (date: CalendarDate) => void
  isInvalid?: boolean
  validationState?: 'valid' | 'invalid'
  errorMessage?: unknown
  pageBehavior?: 'single' | 'visible'
  firstDayOfWeek?: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
  selectionAlignment?: 'start' | 'center' | 'end'
  weeksInMonth?: number
  selectionMode?: M
  isDateUnavailable?: (date: DateValue) => boolean
  visibleDuration?: DateDuration
  createCalendar?: (identifier: any) => any
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-details'?: string
  id?: string
  slot?: string
  class?: any
  style?: any
}

export const CalendarContext: InjectionKey<any> = Symbol('CalendarContext')
export const CalendarStateContext: InjectionKey<CalendarState<CalendarSelectionMode> | null> = Symbol('CalendarStateContext')

interface InternalCalendarGridContextValue {
  headerProps: Record<string, any>
  weekDays: string[]
  startDate: {value: CalendarDate}
  weeksInMonth: number
}
const InternalCalendarGridContext: InjectionKey<InternalCalendarGridContextValue | null> = Symbol('InternalCalendarGridContext')

function getRenderProps(renderProps: any, values: any, defaultClassName: string) {
  const className = typeof renderProps.class === 'function' ? renderProps.class(values) : renderProps.class
  const style = typeof renderProps.style === 'function' ? renderProps.style(values) : renderProps.style
  return {class: className ?? defaultClassName, style}
}

export const Calendar = defineComponent({
  name: 'Calendar',
  inheritAttrs: false,
  props: {
    value: {default: undefined},
    defaultValue: {default: undefined},
    minValue: {default: undefined},
    maxValue: {default: undefined},
    isDisabled: {type: Boolean, default: false},
    isReadOnly: {type: Boolean, default: false},
    autoFocus: {type: Boolean, default: false},
    focusedValue: {default: undefined},
    defaultFocusedValue: {default: undefined},
    isInvalid: {type: Boolean, default: undefined},
    validationState: {type: String as PropType<'valid' | 'invalid' | undefined>, default: undefined},
    errorMessage: {default: undefined},
    pageBehavior: {type: String as PropType<'single' | 'visible' | undefined>, default: undefined},
    firstDayOfWeek: {type: String as PropType<any>, default: undefined},
    selectionAlignment: {type: String as PropType<'start' | 'center' | 'end' | undefined>, default: undefined},
    weeksInMonth: {type: Number, default: undefined},
    selectionMode: {type: String as PropType<CalendarSelectionMode>, default: 'single'},
    isDateUnavailable: {type: Function as PropType<(date: DateValue) => boolean>, default: undefined},
    visibleDuration: {type: Object as PropType<DateDuration>, default: undefined},
    createCalendar: {type: Function as PropType<(identifier: any) => any>, default: undefined},
    id: {type: String, default: undefined},
    slot: {type: String, default: undefined},
  },
  emits: ['change', 'focuschange'],
  setup(props, {slots, attrs, emit}) {
    const locale = useLocale()
    // Pass live getters rather than spreading Vue props: spreading snapshots
    // controlled inputs (value/defaultValue/focusedValue/min/max/etc.) at setup,
    // so later parent updates would never reach the state.
    const state = useCalendarState({
      value: () => props.value,
      defaultValue: () => props.defaultValue,
      focusedValue: () => props.focusedValue,
      defaultFocusedValue: () => props.defaultFocusedValue,
      minValue: () => props.minValue,
      maxValue: () => props.maxValue,
      isDisabled: () => props.isDisabled,
      isReadOnly: () => props.isReadOnly,
      isInvalid: () => props.isInvalid,
      validationState: () => props.validationState,
      pageBehavior: () => props.pageBehavior,
      firstDayOfWeek: () => props.firstDayOfWeek,
      selectionAlignment: () => props.selectionAlignment,
      weeksInMonth: () => props.weeksInMonth,
      selectionMode: () => props.selectionMode,
      // `useCalendarState` calls this directly (not via `toValue`), so forward
      // through a function that reads the current prop on every call.
      isDateUnavailable: (date: DateValue) => props.isDateUnavailable?.(date) ?? false,
      visibleDuration: () => props.visibleDuration,
      autoFocus: () => props.autoFocus,
      errorMessage: () => props.errorMessage,
      locale: () => locale.locale,
      createCalendar: () => props.createCalendar || createDefaultCalendar,
      onChange: (value: any) => emit('change', value),
      onFocusChange: (date: CalendarDate) => emit('focuschange', date),
    } as any)

    const ariaProps = {
      ...props,
      get id() { return (attrs.id ?? props.id) as string | undefined },
      get 'aria-label'() { return (attrs['aria-label'] ?? (props as any)['aria-label']) as string | undefined },
      get 'aria-labelledby'() { return (attrs['aria-labelledby'] ?? (props as any)['aria-labelledby']) as string | undefined },
      get 'aria-describedby'() { return (attrs['aria-describedby'] ?? (props as any)['aria-describedby']) as string | undefined },
      get 'aria-details'() { return (attrs['aria-details'] ?? (props as any)['aria-details']) as string | undefined },
      get errorMessage() { return props.errorMessage },
      isDisabled: () => props.isDisabled,
      isInvalid: () => props.isInvalid,
      validationState: () => props.validationState,
      minValue: () => props.minValue,
      maxValue: () => props.maxValue,
    }

    const calendarAria = useCalendar(ariaProps as any, state as any)
    const {calendarProps, prevButtonProps, nextButtonProps} = calendarAria

    const buttonCtx = reactive({
      slots: {
        previous: {} as any,
        next: {} as any,
      },
    })
    const headingCtx = reactive({'aria-hidden': true as const, level: 2 as const, children: '' as any})

    provide(CalendarStateContext, state as any)
    provide(CalendarContext, props as any)
    provide(ButtonContextKey, buttonCtx)
    provide(HeadingContextKey, headingCtx)

    return () => {
      buttonCtx.slots.previous = prevButtonProps
      buttonCtx.slots.next = nextButtonProps
      headingCtx.children = calendarAria.title

      const values = {
        state,
        isDisabled: props.isDisabled || false,
        isInvalid: state.isValueInvalid,
      }
      const renderProps = getRenderProps({class: attrs.class, style: attrs.style}, values, 'react-aria-Calendar')
      const ariaLabel = (calendarProps as any)['aria-label']
      return h(
        'div',
        mergeProps(attrs, calendarProps, {
          slot: props.slot || undefined,
          class: renderProps.class,
          style: renderProps.style,
          'data-disabled': props.isDisabled || false ? 'true' : undefined,
          'data-invalid': state.isValueInvalid ? 'true' : undefined,
        }),
        [
          h(VisuallyHidden, null, {default: () => h('h2', ariaLabel)}),
          slots.default?.(values),
          h(VisuallyHidden, null, {
            default: () =>
              h('button', {
                'aria-label': nextButtonProps['aria-label'],
                disabled: nextButtonProps.isDisabled || undefined,
                onClick: () => state.focusNextPage(),
                tabindex: -1,
                type: 'button',
              }),
          }),
        ],
      )
    }
  },
})

export interface CalendarGridProps {
  offset?: DateDuration
  weekdayStyle?: 'narrow' | 'short' | 'long'
  class?: string
  style?: any
}

export const CalendarGrid = defineComponent({
  name: 'CalendarGrid',
  inheritAttrs: false,
  props: {
    offset: {type: Object as PropType<DateDuration>, default: undefined},
    weekdayStyle: {type: String as PropType<'narrow' | 'short' | 'long'>, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const state = inject(CalendarStateContext, null) as any
    const calendarProps = inject(CalendarContext, null) as any
    if (!state) throw new Error('CalendarGrid must be used within a Calendar')

    const startDate = computed(() => {
      let start = state.visibleRange.start
      if (props.offset) {
        start = start.add(props.offset)
      }
      return start
    })
    const endDate = computed(() => endOfMonth(startDate.value))

    const gridState = useCalendarGrid(
      {
        startDate: () => startDate.value as any,
        endDate: () => endDate.value as any,
        weekdayStyle: () => props.weekdayStyle,
        firstDayOfWeek: () => (calendarProps?.firstDayOfWeek as any),
      },
      state,
    )

    provide(InternalCalendarGridContext, {
      get headerProps() { return gridState.headerProps },
      get weekDays() { return gridState.weekDays },
      startDate,
      get weeksInMonth() { return gridState.weeksInMonth },
    })

    return () => {
      let children: any
      const slot = slots.default
      if (!slot) {
        const header = h(CalendarGridHeader, null, {
          default: (day: string) => h(CalendarHeaderCell, null, {default: () => day}),
        })
        const weeks = gridState.weeksInMonth
        const rows: any[] = []
        for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
          const dates = state.getDatesInWeek(weekIndex, startDate.value)
          rows.push(
            h('tr', {key: weekIndex}, dates.map((date: CalendarDate | null, i: number) => {
              if (!date) return h('td', {key: i})
              return h(CalendarCell, {key: i, date})
            })),
          )
        }
        children = [header, h('tbody', {class: 'react-aria-CalendarGridBody'}, rows)]
      } else {
        // Try to detect static composition (header/body children).
        const probe = slot()
        const probeNodes = probe == null ? [] : (Array.isArray(probe) ? probe.flat(Infinity) : [probe])
        const typeName = (n: any) => {
          const t = n?.type
          if (typeof t === 'string') return t
          if (typeof t === 'object' && t) return (t as any).name || (t as any).__name
          if (typeof t === 'symbol') return String(t)
          return undefined
        }
        const hasStructure = probeNodes.some((n: any) => {
          const name = typeName(n)
          return name === 'CalendarGridHeader' || name === 'CalendarGridBody' || name === 'thead' || name === 'tbody'
        })
        const looksLikeCellRenderer = !hasStructure && probeNodes.some((n: any) => {
          const name = typeName(n)
          return name === 'CalendarCell' || name === 'td' || n?.props?.role === 'gridcell'
        })

        if (hasStructure) {
          children = probe
        } else if (looksLikeCellRenderer) {
          // Function-as-children: (date) => <CalendarCell />
          const cellRenderer = slot
          const header = h(CalendarGridHeader, null, {
            default: (day: string) => h(CalendarHeaderCell, null, {default: () => day}),
          })
          const weeks = gridState.weeksInMonth
          const rows: any[] = []
          for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
            const dates = state.getDatesInWeek(weekIndex, startDate.value)
            rows.push(
              h('tr', {key: weekIndex}, dates.map((date: CalendarDate | null, i: number) => {
                if (!date) return h('td', {key: i})
                const rendered = cellRenderer(date)
                if (Array.isArray(rendered)) return rendered.length === 1 ? rendered[0] : rendered
                return rendered
              })),
            )
          }
          children = [header, h('tbody', {class: 'react-aria-CalendarGridBody'}, rows)]
        } else if (slot.length >= 1) {
          // Assume cell renderer
          const cellRenderer = slot
          const header = h(CalendarGridHeader, null, {
            default: (day: string) => h(CalendarHeaderCell, null, {default: () => day}),
          })
          const weeks = gridState.weeksInMonth
          const rows: any[] = []
          for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
            const dates = state.getDatesInWeek(weekIndex, startDate.value)
            rows.push(
              h('tr', {key: weekIndex}, dates.map((date: CalendarDate | null, i: number) => {
                if (!date) return h('td', {key: i})
                const rendered = cellRenderer(date)
                if (Array.isArray(rendered)) return rendered.length === 1 ? rendered[0] : rendered
                return rendered
              })),
            )
          }
          children = [header, h('tbody', {class: 'react-aria-CalendarGridBody'}, rows)]
        } else {
          // Static children (no structure detected but slot takes no args)
          children = probe
        }
      }
      return h(
        'table',
        mergeProps(attrs, gridState.gridProps, {
          class: attrs.class ?? 'react-aria-CalendarGrid',
          style: attrs.style,
          cellpadding: 0,
        }),
        children,
      )
    }
  },
})

export const CalendarGridHeader = defineComponent({
  name: 'CalendarGridHeader',
  inheritAttrs: false,
  setup(props, {slots, attrs}) {
    const ctx = inject(InternalCalendarGridContext, null)
    if (!ctx) throw new Error('CalendarGridHeader must be used within a CalendarGrid')
    return () =>
      h(
        'thead',
        mergeProps(attrs, ctx.headerProps, {
          class: attrs.class ?? 'react-aria-CalendarGridHeader',
          style: attrs.style,
        }),
        [
          h(
            'tr',
            (ctx.weekDays || []).map((day, key) => {
              const rendered = slots.default?.(day)
              if (Array.isArray(rendered) && rendered.length === 1) return rendered[0]
              if (rendered && !Array.isArray(rendered)) return rendered
              return h(CalendarHeaderCell, {key}, {default: () => rendered ?? day})
            }),
          ),
        ],
      )
  },
})

export const CalendarHeaderCell = defineComponent({
  name: 'CalendarHeaderCell',
  inheritAttrs: false,
  setup(props, {slots, attrs}) {
    return () =>
      h(
        'th',
        mergeProps(attrs, {
          class: attrs.class || 'react-aria-CalendarHeaderCell',
          style: attrs.style,
        }),
        slots.default?.(),
      )
  },
})

export const CalendarGridBody = defineComponent({
  name: 'CalendarGridBody',
  inheritAttrs: false,
  setup(props, {slots, attrs}) {
    const state = inject(CalendarStateContext, null) as any
    const ctx = inject(InternalCalendarGridContext, null)
    if (!state || !ctx) throw new Error('CalendarGridBody must be used within a CalendarGrid')
    return () => {
      const weeks = ctx.weeksInMonth
      const rows: any[] = []
      for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
        const dates = state.getDatesInWeek(weekIndex, ctx.startDate.value)
        rows.push(
          h(
            'tr',
            {key: weekIndex},
            dates.map((date: CalendarDate | null, i: number) => {
              if (!date) return h('td', {key: i})
              const rendered = slots.default?.(date)
              if (Array.isArray(rendered)) {
                if (rendered.length === 1) return rendered[0]
                if (rendered.length === 0) return h(CalendarCell, {key: i, date})
                return rendered
              }
              if (rendered) return rendered
              return h(CalendarCell, {key: i, date})
            }),
          ),
        )
      }
      return h(
        'tbody',
        mergeProps(attrs, {class: attrs.class ?? 'react-aria-CalendarGridBody', style: attrs.style}),
        rows,
      )
    }
  },
})

export interface CalendarCellProps {
  date: CalendarDate
  isDisabled?: boolean
}

export const CalendarCell = defineComponent({
  name: 'CalendarCell',
  inheritAttrs: false,
  props: {
    date: {type: Object as PropType<CalendarDate>, required: true},
    isDisabled: {type: Boolean, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const state = inject(CalendarStateContext, null) as any
    const gridCtx = inject(InternalCalendarGridContext, null)
    if (!state) throw new Error('CalendarCell must be used within a Calendar')

    const currentMonth = computed(() => gridCtx?.startDate.value ?? state.visibleRange.start)
    const isOutsideMonth = computed(() => {
      if (!props.date) return false
      if (state.visibleDuration.days || state.visibleDuration.weeks) return false
      return !isSameMonth(currentMonth.value, props.date)
    })
    const isTodayDate = computed(() => (props.date ? isToday(props.date, state.timeZone) : false))

    const buttonRef = ref<HTMLElement | null>(null)
    const {cellProps, buttonProps, isPressed, isFocused, isSelected, isDisabled, isUnavailable, isOutsideVisibleRange, isInvalid, formattedDate} =
      useCalendarCell(
        {
          date: () => props.date,
          isDisabled: () => props.isDisabled,
          isOutsideMonth: () => isOutsideMonth.value,
        },
        state,
        buttonRef,
      )

    const {hoverProps, isHovered} = useHover({
      isDisabled: () => isDisabled.value || isUnavailable.value,
    })
    const {focusProps, isFocusVisible: isFocusVisibleRaw} = useFocusVisible()
    // Official: `isFocusVisible &&= states.isFocused`.
    const isFocusVisible = computed(() => isFocusVisibleRaw.value && isFocused.value)

    const isSelectionStart = computed(() => {
      if ('highlightedRange' in state && state.highlightedRange) {
        return isSameDay(props.date, state.highlightedRange.start)
      }
      return false
    })
    const isSelectionEnd = computed(() => {
      if ('highlightedRange' in state && state.highlightedRange) {
        return isSameDay(props.date, state.highlightedRange.end)
      }
      return false
    })

    return () => {
      const values = {
        date: props.date,
        formattedDate: formattedDate.value,
        isHovered: isHovered.value,
        isPressed: isPressed.value,
        isSelected: isSelected.value,
        isSelectionStart: isSelectionStart.value,
        isSelectionEnd: isSelectionEnd.value,
        isFocused: isFocused.value,
        isFocusVisible: isFocusVisible.value,
        isDisabled: isDisabled.value,
        isOutsideVisibleRange: isOutsideVisibleRange.value,
        isOutsideMonth: isOutsideMonth.value,
        isUnavailable: isUnavailable.value,
        isInvalid: isInvalid.value,
        isToday: isTodayDate.value,
      }
      const renderProps = getRenderProps({class: attrs.class, style: attrs.style}, values, 'react-aria-CalendarCell')

      const dataAttrs = {
        'data-focused': isFocused.value ? 'true' : undefined,
        'data-hovered': isHovered.value ? 'true' : undefined,
        'data-pressed': isPressed.value ? 'true' : undefined,
        'data-unavailable': isUnavailable.value ? 'true' : undefined,
        'data-disabled': isDisabled.value ? 'true' : undefined,
        'data-focus-visible': isFocusVisible.value ? 'true' : undefined,
        'data-outside-visible-range': isOutsideVisibleRange.value ? 'true' : undefined,
        'data-outside-month': isOutsideMonth.value ? 'true' : undefined,
        'data-selected': isSelected.value ? 'true' : undefined,
        'data-selection-start': isSelectionStart.value ? 'true' : undefined,
        'data-selection-end': isSelectionEnd.value ? 'true' : undefined,
        'data-invalid': isInvalid.value ? 'true' : undefined,
        'data-today': isTodayDate.value ? 'true' : undefined,
      }

      return h('td', cellProps, [
        h(
          'div',
          mergeProps(attrs, buttonProps, focusProps, hoverProps, dataAttrs, {
            ref: (el: any) => { buttonRef.value = el },
            class: renderProps.class,
            style: renderProps.style,
          }),
          slots.default ? slots.default(values) : formattedDate.value,
        ),
      ])
    }
  },
})
