import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {CalendarDate, CalendarDateTime} from '@internationalized/date'
import {dispatchKey, dispatchPointer, dispatchClick} from '../../../../test/dom-events'
import {
  Button,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateRangePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
  RangeCalendar,
  Text,
} from 'vue-aria-components'
import {DateRangePicker as DateRangePickerSubpath} from 'vue-aria-components/DateRangePicker'
import {useDateRangePicker} from 'vue-aria/useDateRangePicker'
import {useDateRangePicker as useDateRangePickerSubpath} from 'vue-aria/useDateRangePicker'
import {useDateRangePickerState} from 'vue-stately/useDateRangePickerState'
import {useDateRangePickerState as useDateRangePickerStateSubpath} from 'vue-stately/useDateRangePickerState'
import * as components from 'vue-aria-components'
import * as vueAria from 'vue-aria'
import * as vueStately from 'vue-stately'

function mountInDoc(component: any, options: any = {}) {
  return mount(component, {attachTo: document.body, ...options})
}

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

async function click(el: Element) {
  dispatchPointer(el, 'pointerdown')
  dispatchPointer(el, 'pointerup')
  dispatchClick(el, {detail: 1})
  await tick()
}

async function pressKey(el: Element, key: string, opts: any = {}) {
  dispatchKey(el, 'keydown', {key, ...opts})
  dispatchKey(el, 'keyup', {key, ...opts})
  await tick()
}

function beforeInput(el: Element, data: string, inputType = 'insertText') {
  el.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType,
      data,
    }),
  )
}

function fields(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.react-aria-DateInput')) as HTMLElement[]
}

function getSegment(type: string, fieldIndex = 0): HTMLElement | null {
  return fields()[fieldIndex]?.querySelector(`[data-type="${type}"]`) as HTMLElement | null
}

function segmentTextsOf(fieldIndex: number): string[] {
  return Array.from(fields()[fieldIndex]?.querySelectorAll('[data-type]') ?? [])
    .filter((el) => el.hasAttribute('contenteditable'))
    .map((el) => (el.textContent || '').trim())
}

function getCalendarCell(day: number): HTMLElement | null {
  const cells = Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[]
  return cells.find((el) => (el.textContent || '').trim() === String(day)) ?? null
}

function defaultRangeSlots(extra: any = {}) {
  return {
    default: () => [
      h(Label as any, null, () => 'Trip dates'),
      h(Group as any, null, () => [
        h(DateInput as any, {slot: 'start'}, {
          default: (segment: any) => h(DateSegment as any, {segment}),
        }),
        h(DateInput as any, {slot: 'end'}, {
          default: (segment: any) => h(DateSegment as any, {segment}),
        }),
        h(Button as any, null, () => '▾'),
      ]),
      h(Text as any, {slot: 'description'}, () => 'Description'),
      h(Popover as any, null, () =>
        h(Dialog as any, null, () => [
          h(RangeCalendar as any, null, () => [
            h('header', [
              h(Button as any, {slot: 'previous'}, () => 'Prev'),
              h(Heading as any),
              h(Button as any, {slot: 'next'}, () => 'Next'),
            ]),
            h(CalendarGrid as any, null, {
              default: (date: any) => h(CalendarCell as any, {date}),
            }),
          ]),
        ]),
      ),
    ],
    ...extra,
  }
}

function mountDateRangePicker(props: any = {}, slots: any = defaultRangeSlots()) {
  const changes: any[] = []
  const openChanges: boolean[] = []
  const focusChanges: boolean[] = []
  const wrapper = mountInDoc(
    defineComponent({
      setup() {
        return () =>
          h(
            DateRangePicker as any,
            {
              ...props,
              onChange: (v: any) => changes.push(v),
              onOpenchange: (v: boolean) => openChanges.push(v),
              onFocuschange: (v: boolean) => focusChanges.push(v),
            },
            slots,
          )
      },
    }),
  )
  return {wrapper, changes, openChanges, focusChanges}
}

function openToggle(): HTMLElement {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent || '').includes('▾'),
  ) as HTMLElement
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('DateRangePicker', () => {
  it('composes officially: button opens, both fields + value + hidden inputs sync, one change event', async () => {
    const {wrapper, changes, openChanges} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
      startName: 'tripStart',
      endName: 'tripEnd',
    })
    await tick(3)

    // Two standalone fields render in DOM order (start, end).
    expect(fields().length).toBe(2)
    expect(segmentTextsOf(0)).toEqual(['2', '3', '2024'])
    expect(segmentTextsOf(1)).toEqual(['2', '12', '2024'])

    // The button opens the popover with aria-haspopup/expanded and the
    // popover is tagged trigger="DateRangePicker".
    const toggle = openToggle()
    expect(toggle).toBeTruthy()
    expect(toggle.getAttribute('aria-haspopup')).toBe('dialog')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await click(toggle)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(document.querySelector('[data-trigger="DateRangePicker"]')).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(openChanges).toEqual([true])

    // Select a day in the calendar: the value commits (granularity=day) and both fields sync.
    const cell = getCalendarCell(15)!
    expect(cell).toBeTruthy()
    // First click sets the new anchor; second click completes the range.
    await click(cell)
    await tick(2)
    const cellEnd = getCalendarCell(18)!
    await click(cellEnd)
    await tick(3)

    expect(changes.length).toBe(1)
    expect(changes[0].start.toString()).toBe('2024-02-15')
    expect(changes[0].end.toString()).toBe('2024-02-18')
    expect(segmentTextsOf(0)).toEqual(['2', '15', '2024'])
    expect(segmentTextsOf(1)).toEqual(['2', '18', '2024'])

    // Popover closed (default shouldCloseOnSelect), and there is NO picker-level HiddenDateInput.
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect(document.querySelector('[data-testid="hidden-dateinput-container"]')).toBeNull()

    // The two wire inputs carry startName/endName and the serialized values.
    const startWire = document.querySelector('input[name="tripStart"]') as HTMLInputElement
    const endWire = document.querySelector('input[name="tripEnd"]') as HTMLInputElement
    expect(startWire).toBeTruthy()
    expect(endWire).toBeTruthy()
    expect(startWire.value).toBe('2024-02-15')
    expect(endWire.value).toBe('2024-02-18')
    wrapper.unmount()
  })

  it('hidden inputs carry no name when startName/endName are not provided', async () => {
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
    })
    await tick(3)
    const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
    // Two wire inputs, neither carrying a name.
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    for (const input of inputs) {
      expect(input.getAttribute('name')).toBeNull()
    }
    wrapper.unmount()
  })

  it('renders an incomplete range from the start field without committing a value', async () => {
    const {wrapper, changes} = mountDateRangePicker({'aria-label': 'Trip dates'})
    await tick(3)

    // No value yet: placeholder segments in both fields.
    expect(segmentTextsOf(0)).toEqual(['mm', 'dd', 'yyyy'])
    expect(segmentTextsOf(1)).toEqual(['mm', 'dd', 'yyyy'])

    // Type a complete start date: the start field is filled, end stays placeholder.
    const month = getSegment('month', 0)!
    month.focus()
    beforeInput(month, '2')
    await tick()
    const day = getSegment('day', 0)!
    day.focus()
    beforeInput(day, '1')
    beforeInput(day, '5')
    await tick()
    const year = getSegment('year', 0)!
    year.focus()
    beforeInput(year, '2')
    beforeInput(year, '0')
    beforeInput(year, '2')
    beforeInput(year, '4')
    await tick(3)

    expect(segmentTextsOf(0)).toEqual(['2', '15', '2024'])
    expect(segmentTextsOf(1)).toEqual(['mm', 'dd', 'yyyy'])
    // An incomplete range must not emit change.
    expect(changes.length).toBe(0)
    wrapper.unmount()
  })

  it('typing a complete start and end range emits the full value and keeps the fields in sync', async () => {
    const {wrapper, changes} = mountDateRangePicker({'aria-label': 'Trip dates'})
    await tick(3)

    const typeDate = (fieldIndex: number, month: string, day: string[], year: string[]) => {
      const m = getSegment('month', fieldIndex)!
      m.focus()
      beforeInput(m, month)
      const d = getSegment('day', fieldIndex)!
      d.focus()
      for (const ch of day) beforeInput(d, ch)
      const y = getSegment('year', fieldIndex)!
      y.focus()
      for (const ch of year) beforeInput(y, ch)
    }

    typeDate(0, '2', ['1', '5'], ['2', '0', '2', '4'])
    await tick(3)
    // An incomplete range (end still empty) emits nothing.
    expect(changes.length).toBe(0)
    typeDate(1, '3', ['2', '0'], ['2', '0', '2', '4'])
    await tick(3)

    expect(changes.length).toBeGreaterThanOrEqual(1)
    const committed = changes[changes.length - 1]
    expect(committed.start.toString()).toBe('2024-02-15')
    expect(committed.end.toString()).toBe('2024-03-20')
    expect(segmentTextsOf(0)).toEqual(['2', '15', '2024'])
    expect(segmentTextsOf(1)).toEqual(['3', '20', '2024'])
    wrapper.unmount()
  })

  it('moves focus from the last start segment to the first end segment when typing the full year (shared focus manager)', async () => {
    const {wrapper} = mountDateRangePicker({'aria-label': 'Trip dates'})
    await tick(3)

    const year = getSegment('year', 0)!
    year.focus()
    beforeInput(year, '2')
    beforeInput(year, '0')
    beforeInput(year, '2')
    beforeInput(year, '4')
    await tick(3)

    // The shared manager (excluding the button) advances focus to the end field.
    const active = document.activeElement as HTMLElement
    expect(active).toBe(getSegment('month', 1))
    wrapper.unmount()
  })

  it('ArrowRight from the last start segment moves focus to the first end segment', async () => {
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
    })
    await tick(3)

    const startYear = getSegment('year', 0)!
    startYear.focus()
    await pressKey(startYear, 'ArrowRight')
    expect(document.activeElement).toBe(getSegment('month', 1))

    // And backwards: ArrowLeft from the first end segment lands on the last start segment.
    const endMonth = getSegment('month', 1)!
    await pressKey(endMonth, 'ArrowLeft')
    expect(document.activeElement).toBe(getSegment('year', 0))
    wrapper.unmount()
  })

  it('typing through the end field boundary does not move focus onto the trigger button', async () => {
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
    })
    await tick(3)

    const endYear = getSegment('year', 1)!
    endYear.focus()
    beforeInput(endYear, '2')
    beforeInput(endYear, '0')
    beforeInput(endYear, '2')
    beforeInput(endYear, '4')
    await tick(3)
    // The shared manager excludes the button: focus never lands on it after the
    // last end segment fills up.
    expect(document.activeElement).not.toBe(openToggle())
    wrapper.unmount()
  })

  it('supports controlled {start,end} value and controlled isOpen from the parent', async () => {
    const openState = ref(false)
    const valueState = ref<any>({
      start: new CalendarDate(2024, 3, 10),
      end: new CalendarDate(2024, 3, 14),
    })
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DateRangePicker as any,
              {
                value: valueState.value,
                isOpen: openState.value,
                'aria-label': 'Trip dates',
              },
              defaultRangeSlots(),
            )
        },
      }),
    )
    await tick(3)
    expect(segmentTextsOf(0)).toEqual(['3', '10', '2024'])
    expect(segmentTextsOf(1)).toEqual(['3', '14', '2024'])
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()

    // Controlled open.
    openState.value = true
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    // Controlled value replacement flows into both fields live.
    openState.value = false
    valueState.value = {start: new CalendarDate(2025, 6, 20), end: new CalendarDate(2025, 6, 24)}
    await tick(3)
    expect(segmentTextsOf(0)).toEqual(['6', '20', '2025'])
    expect(segmentTextsOf(1)).toEqual(['6', '24', '2025'])
    wrapper.unmount()

    // defaultOpen opens on mount.
    const def = mountDateRangePicker({defaultOpen: true, 'aria-label': 'x'})
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    def.wrapper.unmount()
  })

  it('calendar selection updates both fields and emits sorted ranges when the user clicks days in reverse order', async () => {
    const {wrapper, changes} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
      'aria-label': 'Trip dates',
    })
    await tick(3)

    await click(openToggle())
    await tick(2)
    // Click the 15th first (anchor), then the 10th (before the anchor): the committed range sorts.
    await click(getCalendarCell(15)!)
    await tick(2)
    await click(getCalendarCell(10)!)
    await tick(3)

    expect(changes.length).toBe(1)
    expect(changes[0].start.toString()).toBe('2024-02-10')
    expect(changes[0].end.toString()).toBe('2024-02-15')
    expect(segmentTextsOf(0)).toEqual(['2', '10', '2024'])
    expect(segmentTextsOf(1)).toEqual(['2', '15', '2024'])
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    wrapper.unmount()
  })

  it('shouldCloseOnSelect=false keeps the popover open and re-reads the flag live', async () => {
    const {wrapper, openChanges} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
      shouldCloseOnSelect: false,
      'aria-label': 'Trip dates',
    })
    await tick(3)

    await click(openToggle())
    await tick(2)
    await click(getCalendarCell(10)!)
    await tick(2)
    await click(getCalendarCell(14)!)
    await tick(3)
    // With shouldCloseOnSelect=false the popover stays open after selection.
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(openChanges).toEqual([true])
    wrapper.unmount()

    // Live re-read: flip the flag from false to true via a callback and select again.
    const flag = ref(false)
    const cbChanges: any[] = []
    const cb = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DateRangePicker as any,
              {
                defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
                shouldCloseOnSelect: () => flag.value,
                onChange: (v: any) => cbChanges.push(v),
                'aria-label': 'x',
              },
              defaultRangeSlots(),
            )
        },
      }),
    )
    await tick(3)
    await click(openToggle())
    await tick(2)
    await click(getCalendarCell(20)!)
    await tick(2)
    await click(getCalendarCell(22)!)
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(cbChanges.length).toBe(1)

    flag.value = true
    await click(getCalendarCell(20)!)
    await tick(2)
    await click(getCalendarCell(23)!)
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    cb.unmount()
    document.body.replaceChildren()
  })

  it('commits a pending full range with a placeholder time when the popover closes before a time is chosen (hasTime)', async () => {
    const {wrapper, changes} = mountDateRangePicker({
      defaultOpen: false,
      shouldCloseOnSelect: false,
      granularity: 'minute',
      // Opens the calendar at February 2024 and provides a date+time placeholder
      // (granularity must exist in the value/placeholder, official guard).
      placeholderValue: new CalendarDateTime(2024, 2, 10, 0, 0),
      'aria-label': 'Trip dates',
    })
    await tick(3)

    await click(openToggle())
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    // Pick a full date range with no time selected: pending selection stays incomplete because hasTime.
    await click(getCalendarCell(10)!)
    await tick(2)
    await click(getCalendarCell(12)!)
    await tick(3)
    expect(changes.length).toBe(0)

    // Close the popover: the pending complete date range is committed with a placeholder time.
    dispatchKey(document as any, 'keydown', {key: 'Escape'})
    await tick(4)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect(changes.length).toBe(1)
    expect((changes[0].start as CalendarDateTime).toString()).toBe('2024-02-10T00:00:00')
    expect((changes[0].end as CalendarDateTime).toString()).toBe('2024-02-12T00:00:00')
    wrapper.unmount()
  })

  it('keeps the full datetime range when a date+time default value is selected in the calendar', async () => {
    const {wrapper, changes} = mountDateRangePicker({
      defaultValue: {
        start: new CalendarDateTime(2024, 2, 3, 10, 30),
        end: new CalendarDateTime(2024, 2, 12, 11, 45),
      },
      'aria-label': 'Trip dates',
    })
    await tick(3)
    expect(segmentTextsOf(0).join(' ')).toContain('2')

    await click(openToggle())
    await tick(2)
    // Pick a new anchor day and complete the range; existing times survive.
    await click(getCalendarCell(15)!)
    await tick(2)
    await click(getCalendarCell(18)!)
    await tick(3)

    expect(changes.length).toBe(1)
    expect((changes[0].start as CalendarDateTime).hour).toBe(10)
    expect((changes[0].start as CalendarDateTime).minute).toBe(30)
    expect((changes[0].end as CalendarDateTime).hour).toBe(11)
    expect((changes[0].end as CalendarDateTime).minute).toBe(45)
    wrapper.unmount()
  })

  it('reversed range shows rangeReversed and merging keeps both validation errors', async () => {
    // Controlled parent handing an out-of-order range (end before start).
    const {wrapper} = mountDateRangePicker({
      value: {start: new CalendarDate(2024, 2, 20), end: new CalendarDate(2024, 2, 10)},
      minValue: new CalendarDate(2024, 2, 5),
      validationBehavior: 'aria',
      'aria-label': 'Trip dates',
    })
    await tick(3)

    const root = document.querySelector('.react-aria-DateRangePicker') as HTMLElement
    expect(root.getAttribute('data-invalid')).toBe('true')
    wrapper.unmount()

    // Hook-level: the reversed range surfaces rangeReversed and merges with the start underflow.
    const calls: any[] = []
    let withAria: ReturnType<typeof useDateRangePicker> | undefined
    let capturedState: ReturnType<typeof useDateRangePickerState> | undefined
    const Probe = defineComponent({
      setup() {
        const localState = useDateRangePickerState({
          value: {start: new CalendarDate(2024, 2, 2), end: new CalendarDate(2024, 2, 1)},
          minValue: new CalendarDate(2024, 2, 5),
          validationBehavior: 'aria',
          isDateUnavailable: (date: any, anchor: any) => {
            calls.push([date, anchor])
            return false
          },
          'aria-label': 'x',
        } as any)
        const groupRef = ref<Element | null>(null)
        capturedState = localState
        withAria = useDateRangePicker({'aria-label': 'x'} as any, localState, groupRef as any)
        return () => null
      },
    })
    mount(Probe)
    const errors = capturedState!.displayValidation.validationErrors
    // Start underflow + reversed range both survive the merge.
    expect(errors.some((e) => e.includes('2024-02-05') || e.includes('or later'))).toBe(true)
    expect(errors).toContain('Start date must be before end date.')
    expect(capturedState!.isInvalid).toBe(true)
    // The builtin validation called isDateUnavailable with (date, null) and two arguments.
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0][1]).toBe(null)
    withAria! // eslint-disable-line @typescript-eslint/no-unused-expressions
  })

  it('passes two-arg isDateUnavailable and allowsNonContiguousRanges through to calendarProps (live getters)', async () => {
    const unavailable = new CalendarDate(2024, 2, 14)
    const anchorCalls: any[] = []
    let withAria: ReturnType<typeof useDateRangePicker> | undefined
    let capturedState: ReturnType<typeof useDateRangePickerState> | undefined
    const Probe = defineComponent({
      setup() {
        const localState = useDateRangePickerState({
          shouldCloseOnSelect: false,
          isDateUnavailable: (date: any, anchor: any) => {
            anchorCalls.push([date, anchor])
            return date.day === 14
          },
          allowsNonContiguousRanges: true,
        } as any)
        const groupRef = ref<Element | null>(null)
        capturedState = localState
        withAria = useDateRangePicker(
          {
            'aria-label': 'x',
            allowsNonContiguousRanges: true,
            isDateUnavailable: (date: any, anchor: any) => {
              anchorCalls.push([date, anchor])
              return date.day === 14
            },
          } as any,
          localState,
          groupRef as any,
        )
        return () => null
      },
    })
    mount(Probe)

    const cal: any = withAria!.calendarProps
    expect(cal.autoFocus).toBe(true)
    expect(cal.allowsNonContiguousRanges).toBe(true)
    expect(typeof cal.isDateUnavailable).toBe('function')
    expect(cal.isDateUnavailable(unavailable, 'anchor-marker' as any)).toBe(true)
    expect(anchorCalls).toEqual([[unavailable, 'anchor-marker']])
    expect(Object.getOwnPropertyDescriptor(cal, 'value')?.get).toBeTypeOf('function')
    expect(cal.value).toBeNull()
    expect(typeof cal.onChange).toBe('function')
    expect(capturedState!.hasTime).toBe(false)
    withAria! // eslint-disable-line @typescript-eslint/no-unused-expressions
  })

  it('an unavailable endpoint date marks the picker invalid (two-arg builtin validation)', async () => {
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 20)},
      // Feb 20 (the end date) is unavailable: the end builtin validation fails.
      isDateUnavailable: (date: any) => date.day === 20,
      validationBehavior: 'aria',
      'aria-label': 'Trip dates',
    })
    await tick(3)
    const root = document.querySelector('.react-aria-DateRangePicker') as HTMLElement
    expect(root.getAttribute('data-invalid')).toBe('true')
    wrapper.unmount()
  })

  it('focus returns to the trigger button (not the group div) when the popover closes', async () => {
    const {wrapper} = mountDateRangePicker({'aria-label': 'Trip dates'})
    await tick(3)

    const toggle = openToggle()
    await click(toggle)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    dispatchKey(document as any, 'keydown', {key: 'Escape'})
    await tick(4)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect(document.activeElement).toBe(toggle)
    wrapper.unmount()
  })

  it('opens the popover with a live, real aria-labelledby on the Dialog (never [object Object])', async () => {
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
    })
    await tick(3)

    const toggle = openToggle()
    await click(toggle)
    await tick(2)

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog).toBeTruthy()
    const labelledBy = dialog.getAttribute('aria-labelledby') || ''
    expect(labelledBy).not.toBe('[object Object]')
    expect(labelledBy).toBeTypeOf('string')
    const ids = labelledBy.split(' ').filter(Boolean)
    // Space-separated: trigger button id first, generated Label id second.
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe(toggle.id)
    const labelEl = document.getElementById(ids[1]) as HTMLElement | null
    expect(labelEl).toBeTruthy()
    expect(labelledBy).toBe(`${toggle.id} ${labelEl!.id}`)
    expect(labelEl!.textContent).toContain('Trip dates')
    // The dialog id is a live string too.
    expect(dialog.getAttribute('id')).toBeTypeOf('string')
    expect(document.getElementById(dialog.getAttribute('id')!)).toBe(dialog)
    wrapper.unmount()
  })

  it('announces the formatted range via selectedRangeDescription', async () => {
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 20)},
      'aria-label': 'Trip dates',
    })
    await tick(3)

    // The description is rendered by the shared useDescription machinery as a hidden node in body.
    // Only the outer picker group carries role="group".
    const group = document.querySelector('[role="group"]') as HTMLElement
    expect(group).toBeTruthy()
    const describedBy = (group.getAttribute('aria-describedby') || '')
      .split(' ')
      .filter(Boolean)
    const descId = describedBy.find((id) => id.startsWith('react-aria-description-'))
    expect(descId).toBeTruthy()
    const desc = document.getElementById(descId!) as HTMLElement | null
    expect(desc).toBeTruthy()
    expect(desc!.textContent).toBe('Selected Range: February 3 to 20, 2024')
    wrapper.unmount()
  })

  it('emits lowercase openchange/focuschange and emits change with the range object', async () => {
    const {wrapper, changes, openChanges, focusChanges} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
      'aria-label': 'Trip dates',
    })
    await tick(3)

    const toggle = openToggle()
    // Focus the first segment: focuschange(true) fires once.
    const month = getSegment('month', 0)!
    month.focus()
    await tick()
    expect(focusChanges).toEqual([true])

    // Blur out of the picker entirely: focuschange(false) fires once.
    month.dispatchEvent(new FocusEvent('focusout', {bubbles: true, cancelable: true}))
    await tick()
    expect(focusChanges).toEqual([true, false])

    await click(toggle)
    await tick(2)
    expect(openChanges).toEqual([true])
    wrapper.unmount()
  })

  it('data-* booleans are "true" strings only when applicable; opens with data-open', async () => {
    const {wrapper} = mountDateRangePicker({'aria-label': 'x', isRequired: true})
    await tick(3)
    const root = () => document.querySelector('.react-aria-DateRangePicker') as HTMLElement
    expect(root().hasAttribute('data-open')).toBe(false)
    expect(root().getAttribute('data-required')).toBe('true')
    expect(root().hasAttribute('data-disabled')).toBe(false)
    expect(root().hasAttribute('data-invalid')).toBe(false)

    await click(openToggle())
    await tick(2)
    expect(root().getAttribute('data-open')).toBe('true')
    wrapper.unmount()
  })

  it('disabled/readOnly: Alt+ArrowDown and the button cannot open the popover', async () => {
    const disabled = mountDateRangePicker({isDisabled: true, 'aria-label': 'x'})
    await tick(3)
    const month = getSegment('month', 0)!
    month.focus()
    dispatchKey(month, 'keydown', {key: 'ArrowDown', altKey: true})
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    const button = openToggle()
    expect(button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true' || button.getAttribute('disabled') !== null).toBe(true)
    disabled.wrapper.unmount()
    document.body.replaceChildren()

    const readOnly = mountDateRangePicker({isReadOnly: true, 'aria-label': 'x'})
    await tick(3)
    const month2 = getSegment('month', 0)!
    month2.focus()
    dispatchKey(month2, 'keydown', {key: 'ArrowDown', altKey: true})
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    readOnly.wrapper.unmount()
  })

  it('the two fields render role="presentation" and the outer group owns the only role="group"', async () => {
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
      'aria-label': 'Trip dates',
    })
    await tick(3)
    for (const field of fields()) {
      expect(field.getAttribute('role')).toBe('presentation')
    }
    expect(document.querySelectorAll('[role="group"]').length).toBe(1)
    wrapper.unmount()
  })

  it('two-arg isDateUnavailable gates the calendar and flags the range (anchored calls)', async () => {
    const anchorCalls: Array<[any, any]> = []
    const {wrapper} = mountDateRangePicker({
      defaultValue: {start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 12)},
      isDateUnavailable: (date: any, anchor: any) => {
        anchorCalls.push([date, anchor])
        return date.day >= 10 && date.day <= 12
      },
      allowsNonContiguousRanges: false,
      'aria-label': 'Trip dates',
    })
    await tick(3)
    // The unavailable days are not selectable in the calendar (aria-disabled/unavailable marker).
    await click(openToggle())
    await tick(2)
    const unavailableCell = getCalendarCell(11)!
    expect(
      unavailableCell.getAttribute('aria-disabled') === 'true' ||
      unavailableCell.getAttribute('data-unavailable') === 'true' ||
      unavailableCell.hasAttribute('data-unavailable'),
    ).toBe(true)
    expect(anchorCalls.length).toBeGreaterThan(0)
    expect(anchorCalls.every(([, anchor]) => anchor === null || anchor?.day !== undefined)).toBe(true)
    wrapper.unmount()
  })

  it('exports the slice surface from the root and the DateRangePicker subpath', () => {
    expect(typeof (components as any).DateRangePicker).toBe('object')
    expect((components as any).DateRangePickerContext).toBeDefined()
    expect((components as any).DateRangePickerStateContext).toBeDefined()
    expect(DateRangePickerSubpath).toBe((components as any).DateRangePicker)
    expect(typeof (vueAria as any).useDateRangePicker).toBe('function')
    expect(useDateRangePickerSubpath).toBe((vueAria as any).useDateRangePicker)
    expect(typeof (vueStately as any).useDateRangePickerState).toBe('function')
    expect(useDateRangePickerStateSubpath).toBe((vueStately as any).useDateRangePickerState)
    // Still no Form/FieldError stubs.
    expect((components as any).FieldError).toBeUndefined()
    expect((components as any).Form).toBeUndefined()
  })

  it('useDateRangePickerState: uncontrolled and controlled, setValue commits only complete ranges', async () => {
    let captured: ReturnType<typeof useDateRangePickerState> | undefined
    const changes: any[] = []
    const Probe = defineComponent({
      setup() {
        captured = useDateRangePickerState({
          granularity: 'day' as any,
          shouldCloseOnSelect: false,
          onChange: (v: any) => changes.push(v),
        } as any)
        return () => null
      },
    })
    mount(Probe)
    const state = captured!
    expect(state.value).toEqual({start: null, end: null})
    expect(state.hasTime).toBe(false)
    expect(state.isOpen.value).toBe(false)

    // Incomplete setValue does not emit change and does not clear the pending placeholder.
    state.setValue({start: new CalendarDate(2024, 2, 3), end: null} as any)
    expect(state.value).toEqual({start: new CalendarDate(2024, 2, 3), end: null})
    expect(changes.length).toBe(0)

    // Complete setValue commits and emits once.
    state.setValue({start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 10)} as any)
    expect((state.value as any).start.toString()).toBe('2024-02-03')
    expect(changes.length).toBe(1)

    // setDateTime on each part updates the range live.
    state.setDateTime('start', new CalendarDate(2024, 3, 1) as any)
    expect((state.value as any).start.toString()).toBe('2024-03-01')
    state.setDateTime('end', new CalendarDate(2024, 3, 5) as any)
    expect((state.value as any).end.toString()).toBe('2024-03-05')
    expect(changes.length).toBe(3)
  })

  it('useDateRangePickerState: setOpen(false) commits a pending full date range with placeholder time (hasTime)', async () => {
    let captured: ReturnType<typeof useDateRangePickerState> | undefined
    const changes: any[] = []
    const Probe = defineComponent({
      setup() {
        captured = useDateRangePickerState({
          granularity: 'minute' as any,
          shouldCloseOnSelect: false,
          onChange: (v: any) => changes.push(v),
        } as any)
        return () => null
      },
    })
    mount(Probe)
    const state = captured!
    expect(state.hasTime).toBe(true)

    // Simulate a pending complete date range from the calendar (hasTime, no times chosen).
    state.setDateRange({start: new CalendarDate(2024, 2, 10), end: new CalendarDate(2024, 2, 12)} as any)
    expect(changes.length).toBe(0)

    // Closing commits with placeholder time.
    state.setOpen(false)
    expect(changes.length).toBe(1)
    expect((changes[0].start as CalendarDateTime).toString()).toBe('2024-02-10T00:00:00')
    expect((changes[0].end as CalendarDateTime).toString()).toBe('2024-02-12T00:00:00')
    expect((captured!.value as any).start.toString()).toBe('2024-02-10T00:00:00')
  })

  it('useDateRangePickerState: setOpen(false) commits the placeholder time (not midnight) with a range defaultValue and timed placeholderValue (hasTime)', async () => {
    let captured: ReturnType<typeof useDateRangePickerState> | undefined
    const changes: any[] = []
    const Probe = defineComponent({
      setup() {
        captured = useDateRangePickerState({
          // Controlled-but-empty value: lets the range `defaultValue` and the timed
          // `placeholderValue` coexist without the granularity check tripping on a
          // time-less defaultValue start. Both props are set; the placeholder time
          // must win over midnight either way.
          value: null,
          granularity: 'minute' as any,
          shouldCloseOnSelect: false,
          // Range defaultValue must not shadow the timed placeholderValue when
          // resolving the placeholder time (official uses placeholderValue only).
          defaultValue: {
            start: new CalendarDate(2024, 2, 1),
            end: new CalendarDate(2024, 2, 2),
          },
          placeholderValue: new CalendarDateTime(2024, 2, 10, 9, 30),
          onChange: (v: any) => changes.push(v),
        } as any)
        return () => null
      },
    })
    mount(Probe)
    await nextTick()
    const state = captured!
    expect(state.hasTime).toBe(true)

    // Simulate a pending complete date range from the calendar (hasTime, no times chosen).
    state.setDateRange({start: new CalendarDate(2024, 2, 10), end: new CalendarDate(2024, 2, 12)} as any)
    expect(changes.length).toBe(0)

    // Closing commits with the placeholder time, not midnight.
    state.setOpen(false)
    expect(changes.length).toBe(1)
    expect((changes[0].start as CalendarDateTime).toString()).toBe('2024-02-10T09:30:00')
    expect((changes[0].end as CalendarDateTime).toString()).toBe('2024-02-12T09:30:00')
    expect((captured!.value as any).start.toString()).toBe('2024-02-10T09:30:00')
    expect((captured!.value as any).end.toString()).toBe('2024-02-12T09:30:00')
  })

  it('useDateRangePicker keeps hook *Props as plain objects with live getters, never ComputedRefs', async () => {
    let withAria: ReturnType<typeof useDateRangePicker> | undefined
    let state: ReturnType<typeof useDateRangePickerState> | undefined
    const Probe = defineComponent({
      setup() {
        const localState = useDateRangePickerState({} as any)
        const groupRef = ref<Element | null>(null)
        state = localState
        withAria = useDateRangePicker(
          {'aria-label': 'x', startName: 'from', endName: 'to'} as any,
          localState,
          groupRef as any,
        )
        return () => null
      },
    })
    mount(Probe)

    const isRefSafe = (v: unknown) =>
      v !== null && typeof v === 'object' && '__v_isRef' in (v as any)

    expect(withAria).toBeDefined()
    expect(typeof withAria!.groupProps).toBe('object')
    expect(Object.getPrototypeOf(withAria!.groupProps)).toBe(Object.prototype)
    expect(isRefSafe(withAria!.groupProps)).toBe(false)
    expect(Object.getOwnPropertyDescriptor(withAria!.groupProps, 'role')?.get).toBeTypeOf('function')
    expect(
      Object.getOwnPropertyDescriptor(withAria!.groupProps, 'aria-labelledby')?.get,
    ).toBeTypeOf('function')
    expect(
      Object.getOwnPropertyDescriptor(withAria!.groupProps, 'aria-describedby')?.get,
    ).toBeTypeOf('function')

    // Fields: shared focus manager, presentation role, live value getters, names.
    const commonManager = withAria!.startFieldProps['__vueAriaDateFieldFocusManager']
    expect(commonManager).toBeTruthy()
    expect(withAria!.endFieldProps['__vueAriaDateFieldFocusManager']).toBe(commonManager)
    expect(withAria!.startFieldProps['__vueAriaDateFieldRole']).toBe('presentation')
    expect(withAria!.endFieldProps['__vueAriaDateFieldRole']).toBe('presentation')
    expect(withAria!.startFieldProps.name).toBe('from')
    expect(withAria!.endFieldProps.name).toBe('to')
    expect(Object.getOwnPropertyDescriptor(withAria!.startFieldProps, 'value')?.get).toBeTypeOf(
      'function',
    )
    expect(Object.getOwnPropertyDescriptor(withAria!.endFieldProps, 'value')?.get).toBeTypeOf(
      'function',
    )
    expect(withAria!.startFieldProps.onChange).toBeTypeOf('function')
    expect(withAria!.endFieldProps.onChange).toBeTypeOf('function')

    // dialogProps: live string getters, never descriptor objects as values.
    const dialogAriaLabelledBy = (withAria!.dialogProps as any)['aria-labelledby']
    expect(dialogAriaLabelledBy).toBeTypeOf('string')
    expect(dialogAriaLabelledBy).not.toBe('[object Object]')
    expect(Object.getOwnPropertyDescriptor(withAria!.dialogProps, 'aria-labelledby')?.get).toBeTypeOf(
      'function',
    )
    expect((withAria!.dialogProps as any).id).toBeTypeOf('string')

    // calendarProps: autoFocus, live value (null until complete), two-arg isDateUnavailable.
    const cal: any = withAria!.calendarProps
    expect(cal.autoFocus).toBe(true)
    expect(cal.value).toBeNull()
    expect(cal.isDateUnavailable(new CalendarDate(2024, 2, 14), null)).toBe(false)

    // Button: aria-expanded is live; hidden description id lands in aria-labelledby.
    expect(withAria!.buttonProps['aria-labelledby'].split(' ')[0]).toBe(withAria!.buttonProps.id)
    expect(state!.isOpen.value).toBe(false)
  })
})
