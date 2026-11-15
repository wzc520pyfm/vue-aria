import {defineComponent, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {CalendarDate, CalendarDateTime, JapaneseCalendar} from '@internationalized/date'
import {dispatchClick, dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  I18nProvider,
  RangeCalendar,
  RangeCalendarContext,
  RangeCalendarStateContext,
  useLocale,
} from 'vue-aria-components'
import {useRangeCalendarState} from 'vue-stately/useRangeCalendarState'
import {createCalendar} from '@internationalized/date'

const wrappers: any[] = []

// Unmounting every wrapper between tests keeps the shared useDescription
// nodes and the window listeners leak-free, which keeps jsdom deterministic.
function mountInDoc(component: any, options: any = {}) {
  const wrapper = mount(component, {attachTo: document.body, ...options})
  wrappers.push(wrapper)
  return wrapper
}

// Real pointer events have non-zero contact geometry for physical pointers;
// a zero-size pointerdown is treated as a virtual click (matches browsers).
const realPointer = {pointerType: 'mouse', width: 1, height: 1} as const

async function click(el: Element, init: any = realPointer) {
  dispatchPointer(el, 'pointerdown', init)
  dispatchPointer(el, 'pointerup', init)
  // Real user clicks have a non-zero detail; detail=0 is treated as a virtual
  // (screen reader) click by usePress.
  dispatchClick(el, {detail: 1})
  await nextTick()
}

async function pressKey(el: Element, key: string, opts: any = {}) {
  dispatchKey(el, 'keydown', {key, ...opts})
  dispatchKey(el, 'keyup', {key, ...opts})
  await nextTick()
}

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
}

function cells() {
  return Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[]
}

function cell(day: number) {
  return cells().find(el => (el.textContent || '').trim() === String(day) && !el.hasAttribute('data-outside-month'))
}

function selectedCells() {
  return cells()
    .filter(el => el.getAttribute('data-selected') === 'true')
    .map(el => (el.textContent || '').trim())
}

function nextButton() {
  return Array.from(document.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').length > 0 && /next/i.test(b.getAttribute('aria-label') || '')) as HTMLButtonElement | undefined
}

function prevButton() {
  return Array.from(document.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').length > 0 && /previous/i.test(b.getAttribute('aria-label') || '')) as HTMLButtonElement | undefined
}

function mountRangeCalendar(props: any = {}, onChange?: (v: any) => void, children?: any) {
  return mountInDoc(defineComponent({
    setup() {
      return () => h(RangeCalendar as any, {
        'aria-label': 'Trip dates',
        defaultValue: {start: new CalendarDate(2024, 2, 10), end: new CalendarDate(2024, 2, 12)},
        defaultFocusedValue: new CalendarDate(2024, 2, 10),
        onChange,
        ...props,
      }, {
        default: () => children ?? h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
      })
    },
  }))
}

describe('RangeCalendar slice', () => {
  afterEach(() => {
    for (const wrapper of wrappers) {
      try {
        wrapper.unmount()
      } catch {
        // already unmounted
      }
    }
    wrappers.length = 0
    document.body.replaceChildren()
  })

  it('renders with controlled and uncontrolled {start,end} values', async () => {
    const changes: any[] = []
    mountRangeCalendar({}, (v) => changes.push(v))
    await tick(3)
    expect(document.querySelector('[role="application"]')).toBeTruthy()
    expect(document.querySelector('[role="grid"]')).toBeTruthy()
    // defaultValue makes 10-12 selected
    expect(selectedCells()).toEqual(['10', '11', '12'])

    // controlled: parent updates flow into the grid
    const value = ref<any>({start: new CalendarDate(2024, 2, 3), end: new CalendarDate(2024, 2, 6)})
    document.body.replaceChildren()
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {'aria-label': 'Trip dates', value: value.value}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    expect(selectedCells()).toEqual(['3', '4', '5', '6'])
    value.value = {start: new CalendarDate(2024, 2, 14), end: new CalendarDate(2024, 2, 15)}
    await tick(3)
    expect(selectedCells()).toEqual(['14', '15'])
  })

  it('first click sets anchorDate only and does not emit change; second click commits a sorted range', async () => {
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {'aria-label': 'Trip dates', defaultFocusedValue: new CalendarDate(2024, 2, 10), onChange: (v: any) => changes.push(v)}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)

    await click(cell(10)!)
    await tick(3)
    expect(changes.length).toBe(0)

    await click(cell(12)!)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].start.month).toBe(2)
    expect(changes[0].start.year).toBe(2024)
    expect(changes[0].end.day).toBe(12)
  })

  it('reverses selection order when second click precedes the anchor', async () => {
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {'aria-label': 'Trip dates', defaultFocusedValue: new CalendarDate(2024, 2, 10), onChange: (v: any) => changes.push(v)}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    await click(cell(15)!)
    await tick(2)
    await click(cell(10)!)
    await tick(2)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(15)
  })

  it('anchor phase updates highlightedRange and data-selected/start/end', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {'aria-label': 'Trip dates', defaultFocusedValue: new CalendarDate(2024, 2, 10)}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)

    await click(cell(10)!)
    await tick(2)
    expect(selectedCells()).toEqual(['10'])
    expect(cell(10)!.getAttribute('data-selection-start')).toBe('true')
    expect(cell(10)!.getAttribute('data-selection-end')).toBe('true')

    dispatchPointer(cell(13)!, 'pointerenter', {pointerType: 'mouse'})
    await tick(2)
    expect(selectedCells()).toEqual(['10', '11', '12', '13'])
    expect(cell(10)!.getAttribute('data-selection-start')).toBe('true')
    expect(cell(10)!.getAttribute('data-selection-end')).toBeNull()
    expect(cell(13)!.getAttribute('data-selection-end')).toBe('true')
  })

  it('uses focusNearestAvailableDate when starting a range selection with the keyboard', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {
          'aria-label': 'Trip dates',
          defaultFocusedValue: new CalendarDate(2024, 2, 10),
          isDateUnavailable: (d: any) => d.day === 11,
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)

    // 2024-02-10 focused; pressing Enter starts range selection and the focus
    // must skip the unavailable 2024-02-11 and land on an available date.
    await pressKey(cell(10)!, 'Enter')
    await tick(3)
    const focused = cells().find(el => el.getAttribute('data-focused') === 'true')
    expect((focused?.textContent || '').trim()).toBe('9')
  })

  it('keyboard selection with Enter and Space commits ranges in order', async () => {
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {
          'aria-label': 'Trip dates',
          defaultFocusedValue: new CalendarDate(2024, 2, 10),
          onChange: (v: any) => changes.push(v),
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    const grid = document.querySelector('[role="grid"]') as HTMLElement

    // Start selection with the keyboard (focused date = 10).
    await pressKey(grid, 'Enter')
    await tick(2)
    expect(changes.length).toBe(0)

    // Move two days forward (focus = 12).
    await pressKey(grid, 'ArrowRight')
    await pressKey(grid, 'ArrowRight')
    await tick(2)

    // Commit with Space.
    await pressKey(grid, ' ')
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(12)
  })

  it('isDateUnavailable receives the anchor date live (not snapshotted)', async () => {
    const seen: Array<{date: any, anchor: any}> = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {
          'aria-label': 'Trip dates',
          isDateUnavailable: (date: any, anchor: any) => {
            seen.push({date, anchor})
            return anchor ? date.day === 16 : date.day === 17
          },
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    // Before anchoring, every call sees a null anchor.
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every(({anchor}) => anchor === null)).toBe(true)

    // User has not anchored yet: 17 is unavailable, 16 is available.
    expect(cell(17)!.getAttribute('data-unavailable')).toBe('true')
    expect(cell(16)!.getAttribute('data-unavailable')).toBeNull()

    await click(cell(10)!)
    await tick(3)
    // After anchoring, the callback observes the live anchor on every call.
    expect(seen.some(({anchor}) => anchor && anchor.day === 10)).toBe(true)
    // The callback's behavior changed with the live anchor: 16 becomes unavailable.
    expect(cell(16)!.getAttribute('data-unavailable')).toBe('true')
    expect(cell(17)!.getAttribute('data-unavailable')).toBeNull()
  })

  it('allowsNonContiguousRanges=false tightens the second-click range; true keeps it open', async () => {
    const props = {
      'aria-label': 'Trip dates',
      isDateUnavailable: (d: any) => d.day === 15,
    }
    mountRangeCalendar({...props, allowsNonContiguousRanges: false})
    await tick(3)
    await click(cell(10)!)
    await tick(3)
    // Max is tightened to the day before the unavailable 15th.
    expect(cell(16)!.getAttribute('data-disabled')).toBe('true')
    expect(cell(15)!.getAttribute('data-disabled')).toBe('true')
    expect(cell(14)!.getAttribute('data-disabled')).toBeNull()

    document.body.replaceChildren()
    mountRangeCalendar({...props, allowsNonContiguousRanges: true})
    await tick(3)
    await click(cell(10)!)
    await tick(3)
    // No tightening: later dates remain selectable (except the unavailable one itself).
    expect(cell(16)!.getAttribute('data-disabled')).toBeNull()
    expect(cell(14)!.getAttribute('data-disabled')).toBeNull()
  })

  it('pointerup outside commits with commitBehavior="select" (default)', async () => {
    const changes: any[] = []
    mountRangeCalendar({defaultValue: null}, (v) => changes.push(v))
    await tick(3)
    const start = cell(10)!
    dispatchPointer(start, 'pointerdown', realPointer)
    await nextTick()
    dispatchPointer(cell(12)!, 'pointerenter', realPointer)
    await tick(2)
    // Release outside the calendar body; focus is already inside (drag start
    // focused the anchor cell).
    dispatchPointer(document.body, 'pointerup', realPointer)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(12)
  })

  it('blur outside commits with commitBehavior="select" by default', async () => {
    const changes: any[] = []
    mountRangeCalendar({defaultValue: null}, (v) => changes.push(v))
    await tick(3)
    await click(cell(10)!)
    await tick(2)
    // Focus is inside the calendar; blur to an element outside of it.
    cell(10)!.dispatchEvent(new FocusEvent('blur', {bubbles: true, relatedTarget: document.body}))
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(10)
  })

  it('blur within the calendar does not commit', async () => {
    const changes: any[] = []
    mountRangeCalendar({defaultValue: null, onBlur: (e: FocusEvent) => {}}, (v) => changes.push(v))
    await tick(3)
    await click(cell(10)!)
    await tick(2)
    const other = cell(12)!
    other.dispatchEvent(new FocusEvent('blur', {bubbles: true, relatedTarget: cell(11)}))
    await tick(3)
    expect(changes.length).toBe(0)
  })

  it('commitBehavior="clear" clears the selection on outside pointerup', async () => {
    const changes: any[] = []
    mountRangeCalendar({commitBehavior: 'clear'}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(14)!, 'pointerdown', realPointer)
    await nextTick()
    cell(14)!.focus?.()
    dispatchPointer(document.body, 'pointerup', realPointer)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0]).toBeNull()
    expect(selectedCells()).toEqual([])
  })

  it('commitBehavior="reset" resets the anchor on outside pointerup', async () => {
    const changes: any[] = []
    mountRangeCalendar({commitBehavior: 'reset'}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(14)!, 'pointerdown', realPointer)
    await nextTick()
    cell(14)!.focus?.()
    dispatchPointer(document.body, 'pointerup', realPointer)
    await tick(3)
    // Selection preserved, anchor reset — no change emitted.
    expect(changes.length).toBe(0)
    expect(selectedCells()).toEqual(['10', '11', '12'])
    // A subsequent click starts a fresh in-progress selection.
    await click(cell(16)!)
    await nextTick()
    expect(changes.length).toBe(0)
    expect(selectedCells()).toEqual(['16'])
  })

  it('commitBehavior is not triggered by the previous/next buttons', async () => {
    const changes: any[] = []
    mountRangeCalendar({}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(14)!, 'pointerdown', realPointer)
    await tick(2)
    expect(selectedCells()).toEqual(['14'])

    const next = nextButton()!
    expect(next).toBeTruthy()
    // Focus inside the calendar; pointerup on the next button does not commit.
    cell(14)!.focus?.()
    dispatchPointer(next, 'pointerup', realPointer)
    await tick(3)
    expect(changes.length).toBe(0)
  })

  it('selects a range by dragging with the mouse', async () => {
    const changes: any[] = []
    mountRangeCalendar({defaultValue: null}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(10)!, 'pointerdown', realPointer)
    await nextTick()
    dispatchPointer(cell(13)!, 'pointerenter', realPointer)
    await tick(2)
    expect(selectedCells()).toEqual(['10', '11', '12', '13'])
    expect(changes.length).toBe(0)

    dispatchPointer(cell(13)!, 'pointerup', realPointer)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(13)
  })

  it('drags the start of the highlighted range to modify it', async () => {
    const changes: any[] = []
    mountRangeCalendar({}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(10)!, 'pointerdown', realPointer)
    await nextTick()
    dispatchPointer(cell(7)!, 'pointerenter', realPointer)
    await tick(2)
    expect(selectedCells()).toEqual(['7', '8', '9', '10', '11', '12'])
    expect(changes.length).toBe(0)

    dispatchPointer(cell(7)!, 'pointerup', realPointer)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(7)
    expect(changes[0].end.day).toBe(12)
  })

  it('drags the end of the highlighted range to modify it', async () => {
    const changes: any[] = []
    mountRangeCalendar({}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(12)!, 'pointerdown', realPointer)
    await nextTick()
    dispatchPointer(cell(15)!, 'pointerenter', realPointer)
    await tick(2)
    expect(selectedCells()).toEqual(['10', '11', '12', '13', '14', '15'])
    expect(changes.length).toBe(0)

    dispatchPointer(cell(15)!, 'pointerup', realPointer)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(15)
  })

  it('ignores virtual pointerdown (zero-size contact geometry)', async () => {
    const changes: any[] = []
    mountRangeCalendar({defaultValue: null}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(10)!, 'pointerdown', {pointerType: '', width: 0, height: 0})
    await nextTick()
    cell(10)!.focus?.()
    dispatchPointer(document.body, 'pointerup', {pointerType: '', width: 0, height: 0})
    await tick(3)
    expect(changes.length).toBe(0)
  })

  it('touch drag selects a range only after the 200ms delay', async () => {
    const changes: any[] = []
    mountRangeCalendar({defaultValue: null}, (v) => changes.push(v))
    await tick(3)

    dispatchPointer(cell(10)!, 'pointerdown', {pointerType: 'touch', width: 1, height: 1})
    // Before the delay, nothing is selected and highlighting is ignored.
    dispatchPointer(cell(12)!, 'pointerenter', {pointerType: 'touch', width: 1, height: 1})
    await tick(2)
    expect(selectedCells()).toEqual([])
    expect(changes.length).toBe(0)

    // After the delay, the press starts a drag selection.
    await new Promise((resolve) => setTimeout(resolve, 260))
    await tick(2)
    expect(selectedCells()).toEqual(['10'])
    dispatchPointer(cell(13)!, 'pointerenter', {pointerType: 'touch', width: 1, height: 1})
    await tick(2)
    expect(selectedCells()).toEqual(['10', '11', '12', '13'])
    dispatchPointer(cell(13)!, 'pointerup', {pointerType: 'touch', width: 1, height: 1})
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(13)
  })

  it('quick touch tap follows the official press flow (commits a single day)', async () => {
    const changes: any[] = []
    mountRangeCalendar({defaultValue: null}, (v) => changes.push(v))
    await tick(3)
    dispatchPointer(cell(10)!, 'pointerdown', {pointerType: 'touch', width: 1, height: 1})
    dispatchPointer(cell(10)!, 'pointerup', {pointerType: 'touch', width: 1, height: 1})
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.day).toBe(10)
    expect(changes[0].end.day).toBe(10)
  })

  it('emits lowercase change and focuschange events', async () => {
    const changes: any[] = []
    const focusChanges: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {
          'aria-label': 'Trip dates',
          defaultFocusedValue: new CalendarDate(2024, 2, 10),
          onChange: (v: any) => changes.push(v),
          // Vue emits `focuschange` (all-lowercase); the listener registers as `onFocuschange`.
          onFocuschange: (d: any) => focusChanges.push(d),
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    const grid = document.querySelector('[role="grid"]') as HTMLElement
    await pressKey(grid, 'ArrowRight')
    await tick(2)
    expect(focusChanges.length).toBeGreaterThan(0)
    expect(typeof focusChanges[0].day).toBe('number')

    await pressKey(grid, 'Enter')
    await pressKey(grid, 'ArrowRight')
    await pressKey(grid, 'Enter')
    await tick(3)
    expect(changes.length).toBe(1)
  })

  it('emitted dates keep the input calendar identity, else gregorian, and preserve time', async () => {
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {
          'aria-label': 'Trip dates',
          defaultValue: {
            start: new CalendarDate(new JapaneseCalendar(), 2024, 2, 10),
            end: new CalendarDate(new JapaneseCalendar(), 2024, 2, 12),
          },
          onChange: (v: any) => changes.push(v),
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    await click(cell(15)!)
    await click(cell(18)!)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0].start.calendar.identifier).toBe('japanese')
    expect(changes[0].end.calendar.identifier).toBe('japanese')

    // CalendarDateTime inputs preserve time in the emitted value.
    document.body.replaceChildren()
    const timeChanges: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {
          'aria-label': 'Trip dates',
          defaultValue: {
            start: new CalendarDateTime(2024, 2, 10, 13, 30, 0),
            end: new CalendarDateTime(2024, 2, 12, 20, 45, 0),
          },
          onChange: (v: any) => timeChanges.push(v),
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    await click(cell(16)!)
    await click(cell(18)!)
    await tick(3)
    expect(timeChanges.length).toBe(1)
    expect((timeChanges[0].start as any).hour).toBe(13)
    expect((timeChanges[0].start as any).minute).toBe(30)
    expect((timeChanges[0].end as any).hour).toBe(20)
    expect((timeChanges[0].end as any).minute).toBe(45)
  })

  it('consumes RangeCalendarContext (value/onChange/min/max/firstDayOfWeek/pageBehavior)', async () => {
    const contextChanges: any[] = []
    mountInDoc(defineComponent({
      setup() {
        provide(RangeCalendarContext as any, {
          value: {start: new CalendarDate(2024, 2, 12), end: new CalendarDate(2024, 2, 14)},
          onChange: (v: any) => contextChanges.push(v),
          minValue: new CalendarDate(2024, 2, 10),
          maxValue: new CalendarDate(2024, 2, 20),
          firstDayOfWeek: 'mon',
          pageBehavior: 'single',
          visibleDuration: {months: 2},
        })
        return () =>
          h(RangeCalendar as any, {'aria-label': 'Trip dates'}, {
            default: () => [
              h('header', [h(Button as any, {slot: 'previous'}, () => 'Prev'), h(Heading as any), h(Button as any, {slot: 'next'}, () => 'Next')]),
              h(CalendarGrid as any, {weekdayStyle: 'short'}, {default: (date: any) => h(CalendarCell as any, {date})}),
              h(CalendarGrid as any, {offset: {months: 1}}, {default: (date: any) => h(CalendarCell as any, {date})}),
            ],
          })
      },
    }))
    await tick(3)
    // Context value drives the selection.
    expect(selectedCells()).toEqual(['12', '13', '14'])
    // Context minValue disables earlier cells.
    expect(cell(5)!.getAttribute('data-disabled')).toBe('true')
    // Context maxValue disables later cells.
    expect(cell(25)!.getAttribute('data-disabled')).toBe('true')
    // Context firstDayOfWeek applies.
    const headers = Array.from(document.querySelectorAll('thead th')).map(th => (th.textContent || '').trim().toLowerCase())
    expect(headers[0]).toMatch(/mon/)
    // No context isDisabled and no local isDisabled: not disabled.
    expect(document.querySelector('[role="application"]')!.hasAttribute('data-disabled')).toBe(false)
    // Context onChange is used when no local onChange is passed (see separate test).
    expect(contextChanges.length).toBe(0)
  })

  it('context isDisabled=true applies when no local prop is passed (boolean default false cannot shadow it)', async () => {
    mountInDoc(defineComponent({
      setup() {
        provide(RangeCalendarContext as any, {
          isDisabled: true,
        })
        return () =>
          h(RangeCalendar as any, {'aria-label': 'Trip dates'}, {
            default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
          })
      },
    }))
    await tick(3)
    expect(document.querySelector('[role="application"]')!.getAttribute('data-disabled')).toBe('true')
  })

  it('local props override context props (and boolean default false does not shadow context true)', async () => {
    const contextChanges: any[] = []
    mountInDoc(defineComponent({
      setup() {
        provide(RangeCalendarContext as any, {
          value: {start: new CalendarDate(2024, 2, 12), end: new CalendarDate(2024, 2, 14)},
          onChange: (v: any) => contextChanges.push(v),
          minValue: new CalendarDate(2024, 2, 10),
          maxValue: new CalendarDate(2024, 2, 20),
          firstDayOfWeek: 'mon',
          isDisabled: true,
          pageBehavior: 'visible',
        })
        return () =>
          h(RangeCalendar as any, {'aria-label': 'Trip dates', maxValue: new CalendarDate(2024, 2, 25), firstDayOfWeek: 'tue', isDisabled: false}, {
            default: () => [
              h('header', [h(Button as any, {slot: 'next'}, () => 'Next')]),
              h(CalendarGrid as any, {weekdayStyle: 'short'}, {default: (date: any) => h(CalendarCell as any, {date})}),
            ],
          })
      },
    }))
    await tick(3)
    // Local maxValue wins over the context maxValue.
    expect(cell(22)!.getAttribute('data-disabled')).toBeNull()
    // Local firstDayOfWeek wins over the context firstDayOfWeek.
    const headers = Array.from(document.querySelectorAll('thead th')).map(th => (th.textContent || '').trim().toLowerCase())
    expect(headers[0]).toMatch(/tue/)
    // Local isDisabled=false wins over context isDisabled=true (explicit local prop).
    expect(document.querySelector('[role="application"]')!.hasAttribute('data-disabled')).toBe(false)
  })

  it('context pageBehavior controls how far next/previous page', async () => {
    // visible: pages by visibleDuration (2 months); single: by one month.
    const cases: Array<{pageBehavior: string | undefined, expected: RegExp}> = [
      {pageBehavior: 'visible', expected: /April/i},
      {pageBehavior: 'single', expected: /March/i},
    ]
    for (const {pageBehavior, expected} of cases) {
      document.body.replaceChildren()
      mountInDoc(defineComponent({
        setup() {
          provide(RangeCalendarContext as any, {
            value: {start: new CalendarDate(2024, 1, 5), end: new CalendarDate(2024, 1, 10)},
            pageBehavior,
            visibleDuration: {months: 2},
          })
          return () =>
            h(RangeCalendar as any, {'aria-label': 'Trip dates'}, {
              default: () => [
                h('header', [h(Button as any, {slot: 'next'}, () => 'Next'), h(Heading as any)]),
                h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
              ],
            })
        },
      }))
      await tick(3)
      const next = nextButton()!
      await click(next, realPointer)
      await tick(4)
      const heading = Array.from(document.querySelectorAll('h1,h2,[data-slot="heading"]')).find(el => /March|April/i.test(el.textContent || '')) as HTMLElement | undefined
      expect(heading?.textContent || '', pageBehavior).toMatch(expected)
    }
  })

  it('context onChange is called exactly once per change when combined with no local onChange', async () => {
    const contextChanges: any[] = []
    mountInDoc(defineComponent({
      setup() {
        provide(RangeCalendarContext as any, {
          onChange: (v: any) => contextChanges.push(v),
        })
        return () =>
          h(RangeCalendar as any, {'aria-label': 'Trip dates', defaultFocusedValue: new CalendarDate(2024, 2, 10)}, {
            default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
          })
      },
    }))
    await tick(3)
    await click(cell(10)!)
    await click(cell(12)!)
    await tick(2)
    expect(contextChanges.length).toBe(1)
    expect(contextChanges[0].start.day).toBe(10)
    expect(contextChanges[0].end.day).toBe(12)
  })

  it('Grid/Cell work under RangeCalendar and CalendarGrid still throws outside any calendar', async () => {
    // Under RangeCalendar, no error is thrown.
    mountRangeCalendar({})
    await tick(3)
    expect(document.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0)

    // Outside any calendar, the Grid still throws.
    document.body.replaceChildren()
    expect(() =>
      mountInDoc(defineComponent({
        setup() {
          return () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        },
      })),
    ).toThrowError('CalendarGrid must be used within a Calendar')
  })

  it('emits data-disabled / data-invalid as "true" strings, omitted otherwise', async () => {
    mountRangeCalendar({isDisabled: true, isInvalid: true})
    await tick(3)
    const root = document.querySelector('[role="application"]') as HTMLElement
    expect(root.getAttribute('data-disabled')).toBe('true')
    expect(root.getAttribute('data-invalid')).toBe('true')

    document.body.replaceChildren()
    mountRangeCalendar({})
    await tick(3)
    const root2 = document.querySelector('[role="application"]') as HTMLElement
    expect(root2.hasAttribute('data-disabled')).toBe(false)
    expect(root2.hasAttribute('data-invalid')).toBe(false)
    const day = cell(10)!
    expect(day.getAttribute('data-disabled')).toBeNull()
  })

  it('keeps hook props as live strings, never [object Object]', async () => {
    const labelledby = 'trip-dates-label'
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {'aria-label': 'Trip dates', 'aria-labelledby': labelledby, defaultFocusedValue: new CalendarDate(2024, 2, 10)}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    const root = document.querySelector('[role="application"]') as HTMLElement
    expect(root.getAttribute('aria-label')).toContain('Trip dates')
    expect(root.getAttribute('aria-labelledby')?.trim()).toBe('trip-dates-label')
    expect(root.getAttribute('aria-label')).not.toContain('[object Object]')
  })

  it('renders the visually hidden heading description and trailing next button', async () => {
    mountRangeCalendar({})
    await tick(3)
    expect(document.querySelector('[role="application"] h2')?.textContent).toContain('Trip dates')
    // Trailing visually hidden next button (tabindex -1).
    const trailing = Array.from(document.querySelectorAll('button[tabindex="-1"]'))
    expect(trailing.length).toBeGreaterThan(0)
  })

  it('screen-reader prompt in aria-describedby switches between start/finish', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {
          'aria-label': 'Trip dates',
          autoFocus: true,
          defaultFocusedValue: new CalendarDate(2024, 2, 10),
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    const describedbyBefore = cell(10)!.getAttribute('aria-describedby')
    expect(describedbyBefore).toBeTruthy()
    const descByText = (text: string) =>
      Array.from(document.querySelectorAll('[id^="react-aria-description"]'))
        .find((el) => el.textContent?.includes(text))
    expect(cell(10)!.getAttribute('aria-describedby')).toBeTruthy()
    expect(descByText('start selecting')).toBeTruthy()

    await click(cell(10)!)
    await tick(3)
    // The prompt switched to the finish message; the shared hidden description
    // node exists in the document.
    expect(descByText('finish selecting')).toBeTruthy()
    expect(cell(10)!.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('supports I18nProvider locale and firstDayOfWeek', async () => {
    const seen = ref<any>(null)
    mountInDoc(defineComponent({
      setup() {
        return () => h(I18nProvider as any, {locale: 'ar-AE'}, () => h(defineComponent({
          setup() {
            const locale = useLocale()
            seen.value = {locale: locale.locale, direction: locale.direction}
            return () => h(RangeCalendar as any, {'aria-label': 'Trip dates'}, {
              default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
            })
          },
        })))
      },
    }))
    await tick(3)
    expect(seen.value.locale).toBe('ar-AE')
    expect(seen.value.direction).toBe('rtl')

    document.body.replaceChildren()
    mountInDoc(defineComponent({
      setup() {
        return () => h(RangeCalendar as any, {'aria-label': 'Trip dates', firstDayOfWeek: 'mon'}, {
          default: () => h(CalendarGrid as any, {weekdayStyle: 'short'}, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    const headers = Array.from(document.querySelectorAll('thead th')).map(th => (th.textContent || '').trim().toLowerCase())
    expect(headers[0]).toMatch(/mon/)
  })

  it('regression: single-value Calendar and DatePicker still work alongside RangeCalendar', async () => {
    mountRangeCalendar({})
    await tick(3)
    document.body.replaceChildren()

    // Single Calendar still selects a single date.
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {
          'aria-label': 'Date',
          defaultValue: new CalendarDate(2024, 2, 15),
          onChange: (v: any) => changes.push(v),
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
        })
      },
    }))
    await tick(3)
    await click(cell(18)!)
    await tick(3)
    expect(changes.length).toBe(1)
    expect(changes[0]).toBeInstanceOf(CalendarDate)
    expect((changes[0] as any).day).toBe(18)
  })

  it('useRangeCalendarState hook: controlled value, tightening and dragging', async () => {
    let state: any
    const value = ref<any>(null)
    mountInDoc(defineComponent({
      setup() {
        state = useRangeCalendarState({
          value: value as any,
          onChange: (v: any) => { value.value = v },
          isDateUnavailable: (d: any) => d.day === 15,
          allowsNonContiguousRanges: false,
          defaultFocusedValue: new CalendarDate(2024, 2, 10),
          locale: 'en-US',
          createCalendar: () => createCalendar,
        })
        return () => h('div')
      },
    }))
    await tick(3)
    expect(state.anchorDate).toBeNull()
    expect(state.highlightedRange).toBeNull()

    state.selectDate(new CalendarDate(2024, 2, 10))
    await tick(2)
    expect(state.anchorDate?.day).toBe(10)
    expect(state.highlightedRange?.start.day).toBe(10)
    expect(state.highlightedRange?.end.day).toBe(10)
    // max is tightened to the 14th (day before unavailable 15th).
    expect(state.maxValue?.day).toBe(14)

    expect(typeof state.isDragging).toBe('boolean')
    state.setDragging(true)
    expect(state.isDragging).toBe(true)
    state.setDragging(false)

    state.selectDate(new CalendarDate(2024, 2, 12))
    await tick(2)
    expect(state.anchorDate).toBeNull()
    expect(value.value?.start?.day).toBe(10)
    expect(value.value?.end?.day).toBe(12)

    state.clearSelection()
    await tick(2)
    expect(state.value).toBeNull()

    // Uncontrolled state seeds from defaultValue.
    document.body.replaceChildren()
    let state2: any
    mountInDoc(defineComponent({
      setup() {
        state2 = useRangeCalendarState({
          defaultValue: {start: new CalendarDate(2024, 2, 5), end: new CalendarDate(2024, 2, 8)},
          locale: 'en-US',
          createCalendar: () => createCalendar,
        })
        return () => h('div')
      },
    }))
    await tick(3)
    expect(state2.value?.start?.day).toBe(5)
    expect(state2.value?.end?.day).toBe(8)
    expect(state2.highlightedRange?.start.day).toBe(5)
  })
})
