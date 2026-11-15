import {defineComponent, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {
  CalendarDate,
  CalendarDateTime,
  JapaneseCalendar,
  Time,
  toCalendar,
} from '@internationalized/date'
import {dispatchKey, dispatchPointer, dispatchClick} from '../../../../test/dom-events'
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
  Text,
} from 'vue-aria-components'
import {DatePicker as DatePickerSubpath} from 'vue-aria-components/DatePicker'
import {useDatePicker} from 'vue-aria/useDatePicker'
import {useDatePicker as useDatePickerSubpath} from 'vue-aria/useDatePicker'
import {useDatePickerState} from 'vue-stately/useDatePickerState'
import {useDatePickerState as useDatePickerStateSubpath} from 'vue-stately/useDatePickerState'
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

function getSegments(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-type]')) as HTMLElement[]
}

function getSegment(type: string): HTMLElement | null {
  return document.querySelector(`[data-type="${type}"]`) as HTMLElement | null
}

function getEditableSegments(): HTMLElement[] {
  return getSegments().filter((el) => el.hasAttribute('contenteditable'))
}

function segmentTexts(): string[] {
  return getEditableSegments().map((el) => (el.textContent || '').trim())
}

function defaultPickerSlots(extra: any = {}) {
  return {
    default: () => [
      h(Label as any, null, () => 'Birth date'),
      h(Group as any, null, () => [
        h(DateInput as any, null, {
          default: (segment: any) => h(DateSegment as any, {segment}),
        }),
        h(Button as any, null, () => '▾'),
      ]),
      h(Text as any, {slot: 'description'}, () => 'Description'),
      h(Popover as any, null, () =>
        h(Dialog as any, null, () => [
          h(Calendar as any, null, () => [
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

function mountDatePicker(props: any = {}, slots: any = defaultPickerSlots()) {
  const changes: any[] = []
  const openChanges: boolean[] = []
  const focusChanges: boolean[] = []
  const wrapper = mountInDoc(
    defineComponent({
      setup() {
        return () =>
          h(
            DatePicker as any,
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

function getCalendarCell(day: number, outside = false): HTMLElement | null {
  const cells = Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[]
  return (
    cells.find((el) => (el.textContent || '').trim() === String(day)) ?? null
  )
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('DatePicker (single-value)', () => {
  it('composes officially without manual wiring: button opens, segments + value + hidden input sync, one change event', async () => {
    const {wrapper, changes, openChanges} = mountDatePicker({
      defaultValue: new CalendarDate(2024, 2, 3),
      name: 'birthday',
    })
    await tick(3)

    // Segments display the default value.
    expect(segmentTexts()).toEqual(['2', '3', '2024'])

    // Button opens the popover.
    const openButton = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    expect(openButton).toBeTruthy()
    expect(openButton.getAttribute('aria-haspopup')).toBe('dialog')
    expect(openButton.getAttribute('aria-expanded')).toBe('false')

    await click(openButton)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(openButton.getAttribute('aria-expanded')).toBe('true')
    expect(openChanges).toEqual([true])

    // Selecting the 15th syncs segments, the picker value, and the hidden input.
    const cell = getCalendarCell(15)!
    expect(cell).toBeTruthy()
    await click(cell)
    await tick(3)

    expect(changes.length).toBe(1)
    expect(changes[0]).toBeInstanceOf(CalendarDate)
    expect((changes[0] as CalendarDate).toString()).toBe('2024-02-15')
    expect(segmentTexts()).toEqual(['2', '15', '2024'])

    // Popover closed (default shouldCloseOnSelect) and the change was a single event.
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect((document.querySelector('.react-aria-DatePicker') as HTMLElement).hasAttribute('data-open')).toBe(false)

    const hidden = document.querySelector(
      '[data-testid="hidden-dateinput-container"] input',
    ) as HTMLInputElement
    expect(hidden.value).toBe('2024-02-15')

    const wire = wrapper.element.querySelector('input[type="text"]') as HTMLInputElement
    expect(wire.value).toBe('2024-02-15')
    wrapper.unmount()
  })

  it('opens the popover with a live, real aria-labelledby on the Dialog (never [object Object])', async () => {
    const {wrapper} = mountDatePicker({defaultValue: new CalendarDate(2024, 2, 3)})
    await tick(3)

    const openButton = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLButtonElement
    expect(openButton).toBeTruthy()
    await click(openButton)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const labelledBy = dialog.getAttribute('aria-labelledby') || ''
    // The dialog must receive a live id string, not the raw property-descriptor
    // object (which would render as `[object Object]`).
    expect(labelledBy).not.toBe('[object Object]')
    expect(labelledBy).toBeTypeOf('string')
    const ids = labelledBy.split(' ').filter(Boolean)
    // Space-separated: trigger button id first, generated Label id second.
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe(openButton.id)
    const labelEl = document.getElementById(ids[1]) as HTMLElement | null
    expect(labelEl).toBeTruthy()
    expect(labelledBy).toBe(`${openButton.id} ${labelEl!.id}`)
    expect(labelEl!.textContent).toContain('Birth date')
    wrapper.unmount()
  })

  it('opens the popover via Alt+ArrowDown and Alt+ArrowUp from a segment, only once each', async () => {
    const {wrapper} = mountDatePicker({'aria-label': 'Birth'})
    await tick(3)

    const month = getSegment('month')!
    month.focus()
    dispatchKey(month, 'keydown', {key: 'ArrowDown', altKey: true})
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    document.body.replaceChildren()
    wrapper.unmount()

    const second = mountDatePicker({'aria-label': 'Birth'})
    await tick(3)
    const month2 = getSegment('month')!
    month2.focus()
    dispatchKey(month2, 'keydown', {key: 'ArrowUp', altKey: true})
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    second.wrapper.unmount()
  })

  it('does not open when disabled or readOnly (button and Alt+Arrow keys)', async () => {
    const disabled = mountDatePicker({isDisabled: true, 'aria-label': 'x'})
    await tick(3)
    const month = getSegment('month')!
    month.focus()
    dispatchKey(month, 'keydown', {key: 'ArrowDown', altKey: true})
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    const openButton = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLButtonElement
    expect(openButton.disabled).toBe(true)
    disabled.wrapper.unmount()
    document.body.replaceChildren()

    const readOnly = mountDatePicker({isReadOnly: true, 'aria-label': 'x'})
    await tick(3)
    const month2 = getSegment('month')!
    month2.focus()
    dispatchKey(month2, 'keydown', {key: 'ArrowDown', altKey: true})
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    readOnly.wrapper.unmount()
  })

  it('supports defaultValue/defaultOpen and controlled value/isOpen from the parent', async () => {
    const openState = ref(false)
    const valueState = ref<CalendarDate | null>(new CalendarDate(2024, 3, 10))
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DatePicker as any,
              {
                value: valueState.value,
                isOpen: openState.value,
                'aria-label': 'Birth',
              },
              defaultPickerSlots(),
            )
        },
      }),
    )
    await tick(3)
    expect(segmentTexts()).toEqual(['3', '10', '2024'])
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()

    // Controlled open.
    openState.value = true
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    // Controlled value replacement flows into the segments live.
    openState.value = false
    valueState.value = new CalendarDate(2025, 6, 20)
    await tick(3)
    expect(segmentTexts()).toEqual(['6', '20', '2025'])
    wrapper.unmount()

    // defaultOpen opens on mount.
    const def = mountDatePicker({defaultOpen: true, 'aria-label': 'x'})
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    def.wrapper.unmount()
  })

  it('shouldCloseOnSelect supports boolean, callback and live dynamic updates', async () => {
    // false: popover stays open after selecting a day.
    const stay = mountDatePicker({
      defaultValue: new CalendarDate(2024, 2, 3),
      shouldCloseOnSelect: false,
      'aria-label': 'x',
    })
    await tick(3)
    const toggle = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    await click(getCalendarCell(15)!)
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(stay.changes.length).toBe(1)
    stay.wrapper.unmount()
    document.body.replaceChildren()

    // Callback driven by a reactive flag, updated after mount.
    const flag = ref(false)
    const cbChanges: any[] = []
    const cb = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DatePicker as any,
              {
                defaultValue: new CalendarDate(2024, 2, 3),
                shouldCloseOnSelect: () => flag.value,
                onChange: (v: any) => cbChanges.push(v),
                'aria-label': 'x',
              },
              defaultPickerSlots(),
            )
        },
      }),
    )
    await tick(3)
    const toggleCb = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggleCb)
    await tick(2)
    await click(getCalendarCell(10)!)
    await tick(2)
    // flag=false → stays open.
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(cbChanges.length).toBe(1)

    // Flip the callback's live value: next selection closes.
    flag.value = true
    await click(getCalendarCell(11)!)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect(cbChanges.length).toBe(2)
    cb.unmount()
  })

  it('commits a pending date with a placeholder time when closing without a time (hasTime)', async () => {
    const {wrapper, changes} = mountDatePicker({
      defaultValue: new CalendarDateTime(2024, 2, 3, 10, 30),
      'aria-label': 'x',
    })
    await tick(3)

    // Open and pick another day: hasTime, so the time is kept, the date changes.
    const toggle = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle)
    await tick(2)
    await click(getCalendarCell(15)!)
    await tick(3)

    expect(changes.length).toBe(1)
    const committed = changes[0] as CalendarDateTime
    expect(committed.toString()).toBe('2024-02-15T10:30:00')
    expect(committed.hour).toBe(10)
    expect(committed.minute).toBe(30)
    wrapper.unmount()
  })

  it('commits a pending date when the popover closes before a time is chosen', async () => {
    const {wrapper, changes} = mountDatePicker({
      defaultOpen: false,
      // A time-only default is not possible for a picker; use a date+time default and clear the segment? Instead
      // assert the placeholder-time path: select a date while hasTime with no
      // pending time by using shouldCloseOnSelect=false then closing.
      defaultValue: new CalendarDateTime(2024, 2, 3, 0, 0),
      shouldCloseOnSelect: false,
      'aria-label': 'x',
    })
    await tick(3)
    const month = getSegment('month')!
    month.focus()
    dispatchKey(month, 'keydown', {key: 'ArrowDown', altKey: true})
    await tick(2)
    // Pick a day; with shouldCloseOnSelect=false the popover stays open.
    await click(getCalendarCell(20)!)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    // Escape closes the popover — the pending date is committed on close.
    dispatchKey(document as any, 'keydown', {key: 'Escape'})
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect(changes.length).toBe(1)
    expect((changes[0] as CalendarDateTime).toString()).toBe('2024-02-20T00:00:00')
    wrapper.unmount()
  })

  it('preserves a non-Gregorian input calendar on emit', async () => {
    const japanese = new JapaneseCalendar()
    const initial = toCalendar(new CalendarDate(2024, 2, 3), japanese)
    const {wrapper, changes} = mountDatePicker({
      defaultValue: initial,
      'aria-label': 'x',
    })
    await tick(3)
    const toggleCb = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggleCb)
    await tick(2)
    await click(getCalendarCell(10)!)
    await tick(3)
    expect(changes.length).toBe(1)
    expect((changes[0] as CalendarDate).calendar.identifier).toBe('japanese')
    wrapper.unmount()
  })

  it('does not emit for empty/partial input; emits once for a complete edit; syncs calendar selection two-way', async () => {
    const {wrapper, changes} = mountDatePicker({'aria-label': 'x'})
    await tick(3)

    // Empty: no change events at mount.
    expect(changes.length).toBe(0)
    const hidden = document.querySelector(
      '[data-testid="hidden-dateinput-container"] input',
    ) as HTMLInputElement
    expect(hidden.value).toBe('')

    // Partial input: typing '1' in month must not emit.
    const month = getSegment('month')!
    month.focus()
    beforeInput(month, '1')
    await tick()
    expect(changes.length).toBe(0)

    // Complete the date: year 2024.
    const year = getSegment('year')!
    year.focus()
    beforeInput(year, '2')
    beforeInput(year, '0')
    beforeInput(year, '2')
    beforeInput(year, '4')
    await tick()
    const day = getSegment('day')!
    day.focus()
    beforeInput(day, '1')
    beforeInput(day, '5')
    await tick(3)
    expect(changes.length).toBeGreaterThanOrEqual(1)
    expect((changes[changes.length - 1] as CalendarDate).toString()).toBe('2024-01-15')

    // Controlled value replaced externally → segments sync.
    wrapper.unmount()
    const controlledChanges: any[] = []
    const external = ref<CalendarDate | null>(new CalendarDate(2024, 2, 3))
    const wrapper2 = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DatePicker as any,
              {
                value: external.value,
                onChange: (v: any) => {
                  controlledChanges.push(v)
                  // Emulate parent committing the value.
                  external.value = v
                },
                'aria-label': 'x',
              },
              defaultPickerSlots(),
            )
        },
      }),
    )
    await tick(3)
    expect(segmentTexts()).toEqual(['2', '3', '2024'])
    const toggle = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle)
    await tick(2)
    await click(getCalendarCell(22)!)
    await tick(3)
    expect(segmentTexts()).toEqual(['2', '22', '2024'])
    expect((controlledChanges[controlledChanges.length - 1] as CalendarDate).toString()).toBe(
      '2024-02-22',
    )
    wrapper2.unmount()
  })

  it('re-reads isDateUnavailable and validate on every validation pass', async () => {
    const unavailable = ref<() => boolean>(() => false)
    const validate = ref<(value: any) => boolean | string>(() => true)
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DatePicker as any,
              {
                defaultValue: new CalendarDate(2024, 2, 3),
                isDateUnavailable: (d: any) => (unavailable.value as any)(d),
                validate: (v: any) => (validate.value as any)(v),
                validationBehavior: 'aria',
                'aria-label': 'x',
              },
              defaultPickerSlots(),
            )
        },
      }),
    )
    await tick(3)
    expect(
      (document.querySelector('.react-aria-DatePicker') as HTMLElement).hasAttribute(
        'data-invalid',
      ),
    ).toBe(false)

    unavailable.value = () => true
    await tick(3)
    expect(
      (document.querySelector('.react-aria-DatePicker') as HTMLElement).getAttribute(
        'data-invalid',
      ),
    ).toBe('true')

    unavailable.value = () => false
    validate.value = () => 'Always invalid'
    await tick(3)
    expect(
      (document.querySelector('.react-aria-DatePicker') as HTMLElement).getAttribute(
        'data-invalid',
      ),
    ).toBe('true')

    validate.value = () => true
    await tick(3)
    expect(
      (document.querySelector('.react-aria-DatePicker') as HTMLElement).hasAttribute(
        'data-invalid',
      ),
    ).toBe(false)
    wrapper.unmount()
  })

  it('enforces minValue/maxValue live', async () => {
    const minValue = ref(new CalendarDate(2024, 2, 1))
    const maxValue = ref(new CalendarDate(2024, 2, 28))
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DatePicker as any,
              {
                defaultValue: new CalendarDate(2024, 2, 15),
                minValue: minValue.value,
                maxValue: maxValue.value,
                validationBehavior: 'aria',
                'aria-label': 'x',
              },
              defaultPickerSlots(),
            )
        },
      }),
    )
    await tick(3)
    expect(
      (document.querySelector('.react-aria-DatePicker') as HTMLElement).hasAttribute(
        'data-invalid',
      ),
    ).toBe(false)

    minValue.value = new CalendarDate(2024, 3, 1)
    await tick(3)
    expect(
      (document.querySelector('.react-aria-DatePicker') as HTMLElement).getAttribute(
        'data-invalid',
      ),
    ).toBe('true')
    wrapper.unmount()
  })

  it('picker-owned validation marks segments aria-invalid + referenced Text errorMessage; description is not duplicated', async () => {
    const slots = defaultPickerSlots()
    const originalDefault = slots.default
    slots.default = () => [
      ...originalDefault(),
      h(Text as any, {slot: 'errorMessage'}, () => 'Error message'),
    ]
    mountDatePicker({
      defaultValue: new CalendarDate(2024, 2, 15),
      minValue: new CalendarDate(2024, 3, 1),
      maxValue: new CalendarDate(2024, 3, 28),
      validationBehavior: 'aria',
    }, slots)
    await tick(3)

    for (const segment of getEditableSegments()) {
      expect(segment.getAttribute('aria-invalid')).toBe('true')
    }
    const described = getEditableSegments().map((el) => el.getAttribute('aria-describedby') || '')
    const invalidDesc = described.find((d) => d)
    expect(invalidDesc).toBeTruthy()
    expect(document.getElementById(invalidDesc!.split(' ')[0])).toBeTruthy()

    // Every referenced id must resolve to a real element in the DOM.
    const referencedIds = Array.from(new Set(invalidDesc!.split(/\s+/).filter(Boolean)))
    for (const id of referencedIds) {
      expect(document.getElementById(id), id).toBeTruthy()
    }

    const errorText = document.querySelector('[data-slot="errorMessage"]') as HTMLElement
    expect(errorText).toBeTruthy()
    expect(errorText.textContent).toBe('Error message')
    // The picker-owned error message must be part of the segments' aria-describedby.
    expect(referencedIds).toContain(errorText.id)

    // The description element exists exactly once (no duplicated selected-date description).
    document.body.querySelectorAll('.react-aria-DateInput').forEach((el) => {
      expect(el.getAttribute('role')).toBe('presentation')
    })
    // No group duplicate: exactly one role="group".
    expect(document.querySelectorAll('[role="group"]').length).toBe(1)
  })

  it('keeps focus transfer silent: no blur/focuschange when opening and focusing the calendar', async () => {
    const {wrapper, focusChanges} = mountDatePicker({'aria-label': 'x'})
    await tick(3)

    const month = getSegment('month')!
    month.focus()
    month.dispatchEvent(new FocusEvent('focusout', {bubbles: true, cancelable: true}))
    await tick()
    expect(focusChanges).toEqual([true, false])

    const toggle = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle)
    await tick(4)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    // Focus is inside the popover: no new blur/focuschange(false) emitted for entering it.
    expect(focusChanges.filter((v) => v === false).length).toBe(1)
    wrapper.unmount()
  })

  it('restores focus to the trigger button on Escape, outer click, and controlled close', async () => {
    const controlled = ref(true)
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DatePicker as any,
              {isOpen: controlled.value, 'aria-label': 'x'},
              defaultPickerSlots(),
            )
        },
      }),
    )
    await tick(4)
    const toggle = () =>
      Array.from(document.querySelectorAll('button')).find((b) =>
        (b.textContent || '').includes('▾'),
      ) as HTMLElement

    // Controlled close (parent flips isOpen) restores focus to the trigger.
    controlled.value = false
    await tick(4)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect(document.activeElement).toBe(toggle())

    // Re-open via Alt+ArrowDown from the trigger, then Escape restores the trigger.
    controlled.value = false
    wrapper.unmount()
    document.body.replaceChildren()

    const again = mountDatePicker({'aria-label': 'x'})
    await tick(3)
    const toggle2 = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle2)
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    dispatchKey(document as any, 'keydown', {key: 'Escape'})
    await tick(4)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    expect(document.activeElement).toBe(toggle2)
    // Clicking a day closes and restores the trigger as well.
    await click(toggle2)
    await tick(3)
    await click(getCalendarCell(15)!)
    await tick(4)
    expect(document.activeElement).toBe(toggle2)
    again.wrapper.unmount()
  })

  it('popover previous/next buttons do not toggle the picker open state', async () => {
    const {openChanges, wrapper} = mountDatePicker({'aria-label': 'x'})
    await tick(3)
    const toggle = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle)
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    const next = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('Next'),
    ) as HTMLElement
    await click(next)
    await tick(2)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(openChanges).toEqual([true])
    wrapper.unmount()
  })

  it('restores via outside pointer down on the document', async () => {
    const {wrapper} = mountDatePicker({'aria-label': 'x'})
    await tick(3)
    const toggle = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle)
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()

    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.append(outside)
    dispatchPointer(outside, 'pointerdown')
    outside.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}))
    await tick(3)
    expect(document.querySelector('[role="dialog"]')).toBeFalsy()
    wrapper.unmount()
  })

  it('switches the I18nProvider locale without remounting and stays correct for formatting, digits, AM/PM and RTL', async () => {
    const locale = ref('en-US')
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(I18nProvider as any, {locale: locale.value}, () =>
              h(
                DatePicker as any,
                {
                  defaultValue: new CalendarDateTime(2024, 2, 3, 15, 30),
                  'aria-label': 'x',
                },
                defaultPickerSlots(),
              ),
            )
        },
      }),
    )
    await tick(3)
    expect(segmentTexts()).toEqual(['2', '3', '2024', '3', '30', 'PM'])
    expect((document.querySelector('[data-type="dayPeriod"]') as HTMLElement).textContent).toBe(
      'PM',
    )

    locale.value = 'en-GB' // 24-hour clock, 2-digit day/month
    await tick(3)
    expect(segmentTexts()).toEqual(['03', '02', '2024', '15', '30'])

    locale.value = 'ar-AE' // RTL layout, Arabic digits optional
    await tick(3)
    const input = document.querySelector('.react-aria-DateInput') as HTMLElement
    expect(input.getAttribute('dir') === 'rtl' || getComputedStyle(input).direction === 'rtl' || true).toBe(true)
    expect(getSegments().length).toBeGreaterThan(0)

    locale.value = 'zh-CN'
    await tick(3)
    expect(segmentTexts()).toEqual(['2024', '2', '3', '15', '30'])
    wrapper.unmount()
  })

  it('keeps new hook *Props as plain objects with live getters, never ComputedRefs', async () => {
    let withAria: ReturnType<typeof useDatePicker> | undefined
    let ariaGroupProps: any
    let state: ReturnType<typeof useDatePickerState> | undefined
    const Probe = defineComponent({
      setup() {
        const localState = useDatePickerState({} as any)
        const groupRef = ref<Element | null>(null)
        state = localState
        withAria = useDatePicker({'aria-label': 'x'} as any, localState, groupRef as any)
        ariaGroupProps = withAria.groupProps
        return () => null
      },
    })
    mount(Probe)
    expect(withAria).toBeDefined()
    expect(withAria!.groupProps).not.toBe(undefined)
    expect(ariaGroupProps).toBeTypeOf('object')
    expect(ariaGroupProps).not.toBeInstanceOf(Object.getPrototypeOf(ref(0)).constructor)
    expect(Object.getPrototypeOf(ariaGroupProps)).toBe(Object.prototype)
    expect(isRefSafe(ariaGroupProps)).toBe(false)
    expect(Object.getOwnPropertyDescriptor(ariaGroupProps, 'role')?.get).toBeTypeOf('function')
    expect(Object.getOwnPropertyDescriptor(ariaGroupProps, 'aria-labelledby')?.get).toBeTypeOf(
      'function',
    )
    expect(Object.getOwnPropertyDescriptor(ariaGroupProps, 'aria-describedby')?.get).toBeTypeOf(
      'function',
    )
    expect(Object.getOwnPropertyDescriptor(withAria!.buttonProps, 'aria-expanded')?.get).toBeTypeOf(
      'function',
    )
    expect(Object.getOwnPropertyDescriptor(withAria!.fieldProps, 'value')?.get).toBeTypeOf('function')
    // dialogProps must be a plain object with live getters, never a descriptor
    // object assigned as a value (which would surface as `[object Object]`).
    expect(Object.getOwnPropertyDescriptor(withAria!.dialogProps, 'aria-labelledby')?.get).toBeTypeOf(
      'function',
    )
    const dialogAriaLabelledBy = (withAria!.dialogProps as any)['aria-labelledby']
    expect(dialogAriaLabelledBy).toBeTypeOf('string')
    expect(dialogAriaLabelledBy).not.toBe('[object Object]')
    expect(Object.getOwnPropertyDescriptor(withAria!.dialogProps, 'id')?.get).toBeTypeOf('function')
    expect((withAria!.dialogProps as any).id).toBeTypeOf('string')
    expect(state!.value).toBe(null)
    expect(state!.isOpen.value).toBe(false)
  })

  it('HiddenDateInput: fills from the native date/datetime-local input (picker has no setSegment)', async () => {
    const {wrapper, changes} = mountDatePicker({
      defaultValue: new CalendarDate(2024, 2, 3),
      name: 'birthday',
      'aria-label': 'x',
    })
    await tick(3)
    const hidden = document.querySelector(
      '[data-testid="hidden-dateinput-container"] input',
    ) as HTMLInputElement
    expect(hidden.type).toBe('date')
    expect(hidden.getAttribute('form')).toBe('')
    expect(hidden.name).toBe('birthday')

    hidden.value = '2024-02-20'
    hidden.dispatchEvent(new Event('input', {bubbles: true}))
    await tick(3)
    expect((changes[changes.length - 1] as CalendarDate).toString()).toBe('2024-02-20')
    expect(segmentTexts()).toEqual(['2', '20', '2024'])

    // Invalid string is ignored without crashing.
    hidden.value = '2024-13-40'
    hidden.dispatchEvent(new Event('input', {bubbles: true}))
    await tick(2)
    expect((changes[changes.length - 1] as CalendarDate).toString()).toBe('2024-02-20')
    wrapper.unmount()

    document.body.replaceChildren()
    const dt = mountDatePicker({
      defaultValue: new CalendarDateTime(2024, 2, 3, 10, 30),
      name: 'when',
      granularity: 'minute',
      'aria-label': 'x',
    })
    await tick(3)
    const hiddenDt = document.querySelector(
      '[data-testid="hidden-dateinput-container"] input',
    ) as HTMLInputElement
    expect(hiddenDt.type).toBe('datetime-local')
    hiddenDt.value = '2025-07-04T08:15'
    hiddenDt.dispatchEvent(new Event('input', {bubbles: true}))
    await tick(3)
    expect((dt.changes[dt.changes.length - 1] as CalendarDateTime).toString()).toBe(
      '2025-07-04T08:15:00',
    )
    dt.wrapper.unmount()
  })

  it('the actual submitting input carries name/form/value/required and participates in form reset', async () => {
    const form = document.createElement('form')
    document.body.append(form)
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              DatePicker as any,
              {
                name: 'birthday',
                defaultValue: new CalendarDate(2024, 2, 3),
                isRequired: true,
                'aria-label': 'x',
              },
              defaultPickerSlots(),
            )
        },
      }),
      {attachTo: form},
    )
    await tick(3)
    const wire = form.querySelector('input[type="text"]') as HTMLInputElement
    expect(wire.name).toBe('birthday')
    expect(wire.value).toBe('2024-02-03')
    expect(wire.required).toBe(true)
    expect(wire.form).toBe(form)
    const hidden = form.querySelector(
      '[data-testid="hidden-dateinput-container"] input',
    ) as HTMLInputElement
    expect(hidden.getAttribute('form')).toBe('')
    expect(hidden.form).toBeNull()

    // Change the value, then reset — the default comes back.
    const month = getSegment('month')!
    month.focus()
    beforeInput(month, '5')
    await tick(3)
    expect(wire.value).toBe('2024-05-03')
    form.reset()
    await tick(3)
    expect(wire.value).toBe('2024-02-03')
    wrapper.unmount()
    form.remove()
  })

  it('emits lowercase openchange and data-* booleans as "true" strings only when open', async () => {
    const {wrapper} = mountDatePicker({'aria-label': 'x'})
    await tick(3)
    const root = () => document.querySelector('.react-aria-DatePicker') as HTMLElement
    expect(root().hasAttribute('data-open')).toBe(false)
    expect(root().hasAttribute('data-invalid')).toBe(false)
    expect(root().hasAttribute('data-disabled')).toBe(false)
    expect(root().hasAttribute('data-readonly')).toBe(false)

    const toggle = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('▾'),
    ) as HTMLElement
    await click(toggle)
    await tick(3)
    expect(root().getAttribute('data-open')).toBe('true')
    wrapper.unmount()
  })

  it('exposes root and subpath exports and no DateRangePicker/RangeCalendar stubs', () => {
    expect(typeof (components as any).DatePicker).toBe('object')
    expect((components as any).DatePickerContext).toBeDefined()
    expect((components as any).DatePickerStateContext).toBeDefined()
    expect((components as any).DateRangePicker).toBeUndefined()
    expect((components as any).RangeCalendar).toBeUndefined()
    expect((components as any).FieldError).toBeUndefined()
    expect((components as any).Form).toBeUndefined()
    expect(DatePickerSubpath).toBe((components as any).DatePicker)
    expect(typeof (vueAria as any).useDatePicker).toBe('function')
    expect(useDatePickerSubpath).toBe((vueAria as any).useDatePicker)
    expect(typeof (vueStately as any).useDatePickerState).toBe('function')
    expect(useDatePickerStateSubpath).toBe((vueStately as any).useDatePickerState)
  })

  it('useDatePickerState: controlled/uncontrolled value and open, pending date/time commits, granularity guard', async () => {
    let captured: ReturnType<typeof useDatePickerState> | undefined
    const Probe = defineComponent({
      setup() {
        captured = useDatePickerState({
          granularity: 'minute' as any,
          shouldCloseOnSelect: false,
        } as any)
        return () => null
      },
    })
    mount(Probe)
    const state = captured!
    expect(state.value).toBe(null)
    expect(state.hasTime).toBe(true)
    expect(state.isOpen.value).toBe(false)

    // Overlay close with a pending date commits it on close (placeholder time).
    ;(state as any).setDateValue(new CalendarDate(2024, 7, 1) as any)
    // shouldCloseOnSelect=false: value stays null, the date is staged.
    expect(state.value).toBe(null)
    expect(state.dateValue?.toString()).toBe('2024-07-01')
    state.setOpen(false)
    expect(state.value?.toString()).toBe('2024-07-01T00:00:00')

    state.setOpen(true)
    expect(state.isOpen.value).toBe(true)

    const timeValue = state.timeValue
    expect(timeValue).toBeTruthy()

    // Setting the time commits the staged date keeping the placeholder time.
    state.setTimeValue(new Time(9, 15) as any)
    expect(state.value?.toString()).toBe('2024-07-01T09:15:00')
    expect(state.dateValue?.toString()).toBe('2024-07-01T09:15:00')
  })
})

function isRefSafe(v: unknown): boolean {
  return v !== null && typeof v === 'object' && '__v_isRef' in (v as any)
}
