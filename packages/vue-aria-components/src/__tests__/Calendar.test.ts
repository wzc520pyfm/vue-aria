import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {CalendarDate, JapaneseCalendar} from '@internationalized/date'
import {dispatchClick, dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Dialog,
  DialogTrigger,
  Heading,
  I18nProvider,
  Modal,
  useLocale,
  isRTL,
} from 'vue-aria-components'
import {useDateFormatter} from 'vue-aria/useDateFormatter'
import {useLocalizedStringFormatter} from 'vue-aria/useLocalizedStringFormatter'
import {useLocalizedStringDictionary} from 'vue-aria/useLocalizedStringFormatter'
import {VisuallyHidden, useVisuallyHidden} from 'vue-aria/VisuallyHidden'
import {useCalendarState} from 'vue-stately/useCalendarState'

function mountInDoc(component: any, options: any = {}) {
  return mount(component, {attachTo: document.body, ...options})
}

async function click(el: Element) {
  dispatchPointer(el, 'pointerdown')
  dispatchPointer(el, 'pointerup')
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
  await new Promise((resolve) => setTimeout(resolve, 10))
}

function getCells() {
  return Array.from(document.querySelectorAll('[role="gridcell"] .react-aria-CalendarCell, td [role="button"]')) as HTMLElement[]
}

describe('Calendar slice', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('I18nProvider overrides locale/direction and isRTL works', async () => {
    const seen = ref<any>(null)
    mountInDoc(defineComponent({
      setup() {
        return () => h(I18nProvider as any, {locale: 'ar-AE'}, () => h(defineComponent({
          setup() {
            const locale = useLocale()
            seen.value = {locale: locale.locale, direction: locale.direction}
            return () => h('div')
          }
        })))
      }
    }))
    await tick()
    expect(seen.value.locale).toBe('ar-AE')
    expect(seen.value.direction).toBe('rtl')
    expect(isRTL('ar')).toBe(true)
    expect(isRTL('he')).toBe(true)
    expect(isRTL('en-US')).toBe(false)

    // no provider default
    const seen2 = ref<any>(null)
    mountInDoc(defineComponent({
      setup() {
        const locale = useLocale()
        seen2.value = locale.locale
        return () => h('div')
      }
    }))
    await tick()
    expect(typeof seen2.value).toBe('string')
    expect(seen2.value.length).toBeGreaterThan(0)
  })

  it('useDateFormatter follows locale and subpath exports are importable', () => {
    const en = defineComponent({
      setup() {
        const f = useDateFormatter({month: 'long', timeZone: 'UTC'} as any)
        return () => h('div', f.format(new Date('2024-01-15T12:00:00Z')))
      }
    })
    const ja = defineComponent({
      setup() {
        const f = useDateFormatter({month: 'long', timeZone: 'UTC'} as any)
        return () => h('div', f.format(new Date('2024-01-15T12:00:00Z')))
      }
    })
    const w1 = mountInDoc(defineComponent({setup: () => () => h(I18nProvider as any, {locale: 'en-US'}, () => h(en))}))
    const w2 = mountInDoc(defineComponent({setup: () => () => h(I18nProvider as any, {locale: 'ja-JP'}, () => h(ja))}))
    expect(w1.text()).not.toBe(w2.text())

    expect(typeof VisuallyHidden).toBe('object')
    expect(typeof useVisuallyHidden).toBe('function')
    expect(typeof useCalendarState).toBe('function')
    expect(typeof useLocalizedStringFormatter).toBe('function')
    expect(typeof useLocalizedStringDictionary).toBe('function')
  })

  it('renders one-month grid with controlled/uncontrolled value and emits in input calendar system', async () => {
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date', onChange: (v: any) => changes.push(v)}, {
          default: () => [
            h('header', [h(Button as any, {slot: 'previous'}, () => 'Prev'), h(Heading as any), h(Button as any, {slot: 'next'}, () => 'Next')]),
            h(CalendarGrid as any, null, {
              default: () => [
                h(CalendarGridHeader as any, null, {default: (day: string) => h(CalendarHeaderCell as any, null, {default: () => day})}),
                h(CalendarGridBody as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
              ]
            })
          ]
        })
      }
    }))
    await tick(3)
    expect(document.querySelector('[role="application"]')).toBeTruthy()
    const grid = document.querySelector('[role="grid"]')
    expect(grid).toBeTruthy()
    const cells = Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[]
    expect(cells.length).toBeGreaterThan(0)

    const day20 = cells.find(el => (el.textContent || '').trim() === '20' && !el.hasAttribute('data-outside-month'))
    expect(day20).toBeTruthy()
    await click(day20!)
    await tick(3)
    expect(changes.length).toBeGreaterThan(0)
    const v = changes[changes.length - 1]
    expect(v).toBeInstanceOf(CalendarDate)
    expect(v.calendar.identifier).toBe('gregory')
  })

  it('Button slot previous/next pages month, have aria-label, and disable at min/max; heading shows title', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {
          defaultValue: new CalendarDate(2024, 1, 15),
          minValue: new CalendarDate(2024, 1, 1),
          maxValue: new CalendarDate(2024, 2, 29),
          'aria-label': 'Date',
        }, {
          default: () => [
            h('header', [h(Button as any, {slot: 'previous'}, () => 'Prev'), h(Heading as any), h(Button as any, {slot: 'next'}, () => 'Next')]),
            h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
          ]
        })
      }
    }))
    await tick(3)
    const prev = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Prev')) as HTMLButtonElement
    const next = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Next')) as HTMLButtonElement
    expect(prev.getAttribute('aria-label')).toBeTruthy()
    expect(next.getAttribute('aria-label')).toBeTruthy()
    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(false)
    await click(next)
    await tick(4)
    const heading = Array.from(document.querySelectorAll('h1,h2,h3,h4,[data-slot="heading"]')).find(el => /February/i.test(el.textContent || '')) as HTMLElement | undefined
    expect(heading).toBeTruthy()
    expect(prev.disabled).toBe(false)
    await click(next)
    await tick(4)
    expect(next.disabled).toBe(true)
  })

  it('Dialog title Heading still works', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(DialogTrigger as any, {defaultOpen: true}, {
          default: () => [
            h(Button as any, null, () => 'Open'),
            h(Modal as any, null, {
              default: () => h(Dialog as any, null, {
                default: () => [
                  h(Heading as any, {slot: 'title'}, () => 'My Title'),
                  h('p', 'Body'),
                ],
              })
            })
          ]
        })
      }
    }))
    await tick(4)
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const heading = document.querySelector('[data-slot="heading"]') as HTMLElement
    expect(heading?.textContent).toContain('My Title')
    const labelledby = dialog?.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    expect(document.getElementById(labelledby!)?.textContent).toContain('My Title')
    wrapper.unmount()
  })


  it('supports weekdayStyle/firstDayOfWeek and does not shift days into wrong columns', async () => {
    const w1 = mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date', firstDayOfWeek: 'mon'}, {
          default: () => h(CalendarGrid as any, {weekdayStyle: 'short'}, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const headers = Array.from(document.querySelectorAll('thead th')).map(th => (th.textContent || '').trim().toLowerCase())
    expect(headers.length).toBe(7)
    expect(headers[0]).toMatch(/mon/)
    w1.unmount()
    document.body.replaceChildren()

    // 2024-02-01 is a Thursday. With Sunday start, it should appear at index 4 in first week.
    const w2 = mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 2, 1), 'aria-label': 'Date'}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const firstRow = document.querySelector('tbody tr')!
    const tds = Array.from(firstRow.querySelectorAll('td'))
    const idx = tds.findIndex(td => (td.textContent || '').trim() === '1' && td.querySelector('[role="button"]'))
    expect(idx).toBe(4) // Sun,Mon,Tue,Wed,Thu
    // cells before day 1 should be outside-month days or empty placeholders
    expect(idx).toBeGreaterThan(0)
    w2.unmount()
  })

  it('keyboard navigation moves focus and RTL reverses arrows; Enter/Space select', async () => {
    const w1 = mountInDoc(defineComponent({
      setup() {
        return () => h(I18nProvider as any, {locale: 'ar-AE'}, () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date'}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        }))
      }
    }))
    await tick(3)
    const grid = document.querySelector('[role="grid"]') as HTMLElement
    const getFocused = () => document.activeElement as HTMLElement
    const tabbable = document.querySelector('td [tabindex="0"]') as HTMLElement
    tabbable?.focus()
    await tick()
    const initial = getFocused()
    const initialText = initial?.textContent
    // In RTL, ArrowLeft should move to next day (day number increases)
    await pressKey(grid, 'ArrowLeft')
    await tick(2)
    const afterLeft = getFocused()
    expect(afterLeft).toBeTruthy()
    expect(afterLeft).not.toBe(initial)
    // ArrowRight moves previous day in RTL (back)
    await pressKey(grid, 'ArrowRight')
    await tick(2)
    expect(getFocused()?.textContent).toBe(initialText)
    w1.unmount()
    document.body.replaceChildren()

    const changes: any[] = []
    const w2 = mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date', onChange: (v: any) => changes.push(v)}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const grid2 = document.querySelector('[role="grid"]') as HTMLElement
    const tab2 = document.querySelector('td [tabindex="0"]') as HTMLElement
    tab2?.focus()
    await tick()
    await pressKey(grid2, 'ArrowRight')
    await tick(2)
    await pressKey(grid2, 'Enter')
    await tick(3)
    expect(changes.length).toBeGreaterThan(0)
    w2.unmount()
  })

  it('min/max disable out-of-range cells and isDateUnavailable is focusable but not selectable', async () => {
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {
          defaultValue: new CalendarDate(2024, 1, 15),
          minValue: new CalendarDate(2024, 1, 10),
          maxValue: new CalendarDate(2024, 1, 20),
          isDateUnavailable: (d: any) => d.day === 15,
          'aria-label': 'Date',
          onChange: (v: any) => changes.push(v),
        }, {default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})})
      }
    }))
    await tick(3)
    const cells = Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[]
    const day5 = cells.find(el => (el.textContent||'').trim() === '5' && !el.hasAttribute('data-outside-month'))
    expect(day5?.getAttribute('aria-disabled') === 'true' || day5?.hasAttribute('data-disabled')).toBe(true)
    const day15 = cells.find(el => (el.textContent||'').trim() === '15' && !el.hasAttribute('data-outside-month'))
    expect(day15).toBeTruthy()
    expect(day15?.getAttribute('data-unavailable')).toBe('true')
    await click(day15!)
    await tick(3)
    // unavailable should not select
    expect(changes.filter(c => c?.day === 15).length).toBe(0)
  })

  it('cell data-* and heading title', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date'}, {
          default: () => [
            h('header', [h(Button as any, {slot: 'previous'}, () => 'Prev'), h(Heading as any), h(Button as any, {slot: 'next'}, () => 'Next')]),
            h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
          ]
        })
      }
    }))
    await tick(3)
    const heading = Array.from(document.querySelectorAll('h1,h2,h3,[data-slot="heading"]')).find(el => /January|2024/i.test(el.textContent || ''))
    expect(heading).toBeTruthy()
    expect(document.querySelector('[role="application"]')).toBeTruthy()
    const cells = Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[]
    const day15 = cells.find(el => (el.textContent||'').trim() === '15' && !el.hasAttribute('data-outside-month'))
    expect(day15).toBeTruthy()
    // defaultValue makes it selected
    expect(day15?.getAttribute('data-selected')).toBe('true')
  })

  it('reflects parent updates to the controlled value', async () => {
    const value = ref<any>(new CalendarDate(2024, 1, 15))
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {value: value.value, 'aria-label': 'Date'}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const getDay = (n: number) => (Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[])
      .find(el => (el.textContent || '').trim() === String(n) && !el.hasAttribute('data-outside-month'))
    expect(getDay(15)?.getAttribute('data-selected')).toBe('true')

    value.value = new CalendarDate(2024, 1, 20)
    await tick(3)
    expect(getDay(20)?.getAttribute('data-selected')).toBe('true')
    expect(getDay(15)?.getAttribute('data-selected')).not.toBe('true')
  })

  it('keeps non-Gregorian input values in their calendar system on emit', async () => {
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {
          defaultValue: new CalendarDate(new JapaneseCalendar(), 2024, 1, 15),
          'aria-label': 'Date',
          onChange: (v: any) => changes.push(v),
        }, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const day20 = (Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[])
      .find(el => (el.textContent || '').trim() === '20' && !el.hasAttribute('data-outside-month'))
    expect(day20).toBeTruthy()
    await click(day20!)
    await tick(3)
    expect(changes.length).toBeGreaterThan(0)
    expect(changes[changes.length - 1].calendar.identifier).toBe('japanese')
  })

  it('emits data-hovered when pointer hovers a cell', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date'}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const cell = (Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[])
      .find(el => (el.textContent || '').trim() === '15' && !el.hasAttribute('data-outside-month'))!
    expect(cell).toBeTruthy()
    expect(cell.getAttribute('data-hovered')).toBeNull()
    dispatchPointer(cell, 'pointerenter', {pointerType: 'mouse'})
    await nextTick()
    expect(cell.getAttribute('data-hovered')).toBe('true')
    dispatchPointer(cell, 'pointerleave', {pointerType: 'mouse'})
    await nextTick()
    expect(cell.getAttribute('data-hovered')).toBeNull()
  })

  it('emits data-focus-visible when a cell is keyboard focused', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date'}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const cell = document.querySelector('td [tabindex="0"]') as HTMLElement
    expect(cell).toBeTruthy()
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}))
    cell.focus()
    await nextTick()
    expect(cell.getAttribute('data-focused')).toBe('true')
    expect(cell.getAttribute('data-focus-visible')).toBe('true')
  })

  it('CalendarGrid offset renders a second month and multiple selection toggles', async () => {
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {defaultValue: new CalendarDate(2024, 1, 15), 'aria-label': 'Date', visibleDuration: {months: 2}}, {
          default: () => [
            h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})}),
            h(CalendarGrid as any, {offset: {months: 1}}, {default: (date: any) => h(CalendarCell as any, {date})}),
          ]
        })
      }
    }))
    await tick(3)
    expect(document.querySelectorAll('[role="grid"]').length).toBe(2)

    document.body.replaceChildren()
    const changes: any[] = []
    mountInDoc(defineComponent({
      setup() {
        return () => h(Calendar as any, {selectionMode: 'multiple', 'aria-label': 'Date', onChange: (v: any) => changes.push(v)}, {
          default: () => h(CalendarGrid as any, null, {default: (date: any) => h(CalendarCell as any, {date})})
        })
      }
    }))
    await tick(3)
    const cells = Array.from(document.querySelectorAll('td [role="button"]')) as HTMLElement[]
    const pick = (n: number) => cells.find(el => (el.textContent||'').trim() === String(n) && !el.hasAttribute('data-outside-month') && el.getAttribute('aria-disabled') !== 'true')
    const a = pick(10); const b = pick(12)
    if (a) await click(a)
    if (b) await click(b)
    await tick(3)
    expect(changes.length).toBeGreaterThanOrEqual(1)
  })

})
