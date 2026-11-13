import {defineComponent, h, nextTick, ref, isRef, provide} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {
  CalendarDate,
  CalendarDateTime,
  JapaneseCalendar,
  Time,
  createCalendar,
} from '@internationalized/date'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  DateField,
  DateInput,
  DateSegment,
  DateFieldContext,
  Group,
  I18nProvider,
  Label,
  TimeField,
} from 'vue-aria-components'
import {useDateField} from 'vue-aria/useDateField'
import {useDateFieldState} from 'vue-stately/useDateFieldState'
import {useFilter} from 'vue-aria/useFilter'
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

function focusOut(el: Element, relatedTarget: Element | null = document.body) {
  el.dispatchEvent(new FocusEvent('focusout', {bubbles: true, cancelable: true, relatedTarget}))
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

function defaultDateFieldSlots() {
  return {
    default: () => [
      h(Label as any, null, () => 'Birthday'),
      h(DateInput as any, null, {
        default: (segment: any) => h(DateSegment as any, {segment}),
      }),
    ],
  }
}

function defaultTimeFieldSlots() {
  return {
    default: () => [
      h(Label as any, null, () => 'Time'),
      h(DateInput as any, null, {
        default: (segment: any) => h(DateSegment as any, {segment}),
      }),
    ],
  }
}

function mountDateField(props: any = {}, slots: any = defaultDateFieldSlots()) {
  const changes: any[] = []
  const focusChanges: any[] = []
  const wrapper = mountInDoc(
    defineComponent({
      setup() {
        return () =>
          h(
            DateField as any,
            {
              ...props,
              onChange: (v: any) => changes.push(v),
              // Vue emits `focuschange` (all-lowercase); listeners register as `onFocuschange`.
              onFocuschange: (v: any) => focusChanges.push(v),
            },
            slots,
          )
      },
    }),
  )
  return {wrapper, changes, focusChanges}
}

function mountTimeField(props: any = {}, slots: any = defaultTimeFieldSlots()) {
  const changes: any[] = []
  const focusChanges: any[] = []
  const wrapper = mountInDoc(
    defineComponent({
      setup() {
        return () =>
          h(
            TimeField as any,
            {
              ...props,
              onChange: (v: any) => changes.push(v),
              // Vue emits `focuschange` (all-lowercase); listeners register as `onFocuschange`.
              onFocuschange: (v: any) => focusChanges.push(v),
            },
            slots,
          )
      },
    }),
  )
  return {wrapper, changes, focusChanges}
}

describe('DateField slice', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('composes DateField + Label + DateInput + DateSegment with segment text rendered', async () => {
    mountDateField({defaultValue: new CalendarDate(2024, 2, 3), 'aria-label': 'x'})
    await tick()

    // Label rendered and associated.
    const label = document.querySelector('.react-aria-Label') as HTMLElement
    expect(label).toBeTruthy()
    expect(label.textContent).toBe('Birthday')

    // The input group renders with role group and segments in en-US order.
    const group = document.querySelector('[role="group"]') as HTMLElement
    expect(group).toBeTruthy()
    expect(group.className).toContain('react-aria-DateInput')
    expect(group.getAttribute('aria-labelledby')).toContain(label.id)

    const order = getEditableSegments().map((el) => el.getAttribute('data-type'))
    expect(order).toEqual(['month', 'day', 'year'])
    expect(segmentTexts()).toEqual(['2', '3', '2024'])

    // A hidden input backs the field, carrying the serialized value.
    const hidden = group.parentElement!.querySelector('input[type="text"]') as HTMLInputElement
    expect(hidden).toBeTruthy()
    expect(hidden.value).toBe('2024-02-03')
    expect(hidden.hasAttribute('name')).toBe(false)
  })

  it('exposes the value on the native hidden input and the HiddenDateInput only for DateField', async () => {
    const {wrapper} = mountDateField({
      defaultValue: new CalendarDate(2024, 2, 3),
      name: 'birthday',
    })
    await tick()

    // Native text input carrying the wire value for form submission.
    const input = wrapper.element.querySelector('input[type="text"]') as HTMLInputElement
    expect(input.getAttribute('name')).toBe('birthday')
    expect(input.value).toBe('2024-02-03')

    // HiddenDateInput (native date input) is present on DateField only.
    const hiddenDateInput = document.querySelector('[data-testid="hidden-dateinput-container"] input') as HTMLInputElement
    expect(hiddenDateInput).toBeTruthy()
    expect(hiddenDateInput.type).toBe('date')
    expect(hiddenDateInput.value).toBe('2024-02-03')
    expect(hiddenDateInput.getAttribute('form')).toBe('')
    expect(hiddenDateInput.name).toBe('birthday')

    wrapper.unmount()
    document.body.replaceChildren()

    // TimeField: no HiddenDateInput; the submitted value is the time string.
    mountTimeField({defaultValue: new Time(8, 30), name: 'time'})
    await tick()
    expect(document.querySelector('[data-testid="hidden-dateinput-container"]')).toBeNull()
    const timeHidden = document.querySelector('input[type="text"], input[type="hidden"]') as HTMLInputElement
    expect(timeHidden.getAttribute('name')).toBe('time')
    expect(timeHidden.value).toMatch(/^08:30/)
  })

  it('renders placeholder segments and data-placeholder="true" for an empty field, and emits nothing', async () => {
    const {changes} = mountDateField({'aria-label': 'x'})
    await tick()

    expect(segmentTexts()).toEqual(['mm', 'dd', 'yyyy'])
    for (const segment of getEditableSegments()) {
      expect(segment.getAttribute('data-placeholder')).toBe('true')
      expect(segment.getAttribute('aria-valuetext')).toBe('Empty')
      expect(segment.hasAttribute('aria-valuenow')).toBe(false)
    }
    // Hidden input carries an empty value.
    const hidden = document.querySelector('input[type="text"]') as HTMLInputElement
    expect(hidden.value).toBe('')
    expect(changes.length).toBe(0)
  })

  it('updates the segments live when the parent replaces a controlled value', async () => {
    const value = ref<any>(new CalendarDate(2024, 2, 3))
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              DateField as any,
              {value: value.value, 'aria-label': 'x'},
              defaultDateFieldSlots(),
            )
        },
      }),
    )
    await tick()
    expect(segmentTexts()).toEqual(['2', '3', '2024'])

    value.value = new CalendarDate(2025, 11, 25)
    await tick()
    expect(segmentTexts()).toEqual(['11', '25', '2025'])
    wrapper.unmount()
  })

  it('keeps a non-Gregorian input value in its calendar system on emit', async () => {
    const {changes} = mountDateField({
      value: new CalendarDate(new JapaneseCalendar(), 'reiwa', 6, 5, 3),
    })
    await tick()

    // Increment the month segment: 5 -> 6.
    const month = getSegment('month')!
    month.focus()
    await pressKey(month, 'ArrowUp')
    expect(changes.length).toBeGreaterThan(0)
    const emitted = changes[changes.length - 1]
    expect(emitted.calendar.identifier).toBe('japanese')
    expect(emitted.month).toBe(6)
  })

  it('does not eagerly emit for partial or temporarily invalid input, emits once complete, confirms on blur', async () => {
    const {changes, wrapper} = mountDateField({'aria-label': 'x'})
    await tick()

    // Partial: month + day only.
    beforeInput(getSegment('month')!, '0')
    await tick()
    beforeInput(getSegment('month')!, '2')
    await tick()
    beforeInput(getSegment('day')!, '0')
    await tick()
    beforeInput(getSegment('day')!, '3')
    await tick()
    expect(changes.length).toBe(0)

    // Complete: year. Each valid completion emits.
    for (const digit of ['2', '0', '2', '4']) {
      beforeInput(getSegment('year')!, digit)
      await tick()
    }
    expect(changes.length).toBeGreaterThan(0)
    expect(changes[changes.length - 1].toString()).toBe('2024-02-03')
    wrapper.unmount()
    document.body.replaceChildren()

    // Temporarily invalid (Feb 30): no emit while editing; blur clamps and emits.
    const {changes: changes2, wrapper: wrapper2} = mountDateField({'aria-label': 'x'})
    await tick()
    for (const digit of ['0', '2']) beforeInput(getSegment('month')!, digit)
    await tick()
    for (const digit of ['3', '0']) beforeInput(getSegment('day')!, digit)
    await tick()
    for (const digit of ['2', '0', '2', '4']) beforeInput(getSegment('year')!, digit)
    await tick()
    expect(changes2.length).toBe(0)

    // Blur out of the field: confirmPlaceholder commits the clamped date.
    const year = getSegment('year')!
    year.focus()
    focusOut(year, document.body)
    await tick()
    expect(changes2.length).toBeGreaterThan(0)
    expect(changes2[changes2.length - 1].toString()).toBe('2024-02-29')
    wrapper2.unmount()
  })

  it('Backspace truncates the focused numeric segment and clears to the placeholder', async () => {
    // Clears a fully entered segment to its placeholder.
    const {wrapper} = mountDateField({defaultValue: new CalendarDate(2024, 2, 3)})
    await tick()
    const year = getSegment('year')!
    beforeInput(year, 'x', 'deleteContentBackward')
    await tick()
    // '2024' -> '202'
    expect((getSegment('year')!.textContent || '').trim()).toBe('202')
    focusOut(year)
    await tick()
    wrapper.unmount()
    document.body.replaceChildren()

    const {wrapper: wrapper2} = mountDateField({defaultValue: new CalendarDate(2024, 2, 3)})
    await tick()
    // Trim repeated Backspaces to clear the year entirely.
    const year2 = getSegment('year')!
    for (const [input] of [['2', ''], ['0', ''], ['2', ''], ['4', '']] as any[]) {
      void input
    }
    for (let i = 0; i < 4; i++) {
      beforeInput(getSegment('year')!, '', 'deleteContentBackward')
      await tick()
    }
    expect((getSegment('year')!.textContent || '').trim()).toBe('yyyy')
    expect(getSegment('year')!.getAttribute('data-placeholder')).toBe('true')
    year2.blur()
    wrapper2.unmount()
  })

  it('advances focus across segments and auto-advances after enough digits are typed', async () => {
    mountDateField({'aria-label': 'x'})
    await tick()
    const month = getSegment('month')!
    month.focus()
    await tick()
    await pressKey(month, 'ArrowRight')
    expect(document.activeElement).toBe(getSegment('day'))
    await pressKey(getSegment('day')!, 'ArrowRight')
    expect(document.activeElement).toBe(getSegment('year'))
    await pressKey(getSegment('year')!, 'ArrowLeft')
    expect(document.activeElement).toBe(getSegment('day'))

    // Typing a two-digit month auto-advances focus to the day segment.
    month.focus()
    beforeInput(month, '1')
    beforeInput(month, '2')
    await tick()
    expect(document.activeElement).toBe(getSegment('day'))
    expect((getSegment('month')!.textContent || '').trim()).toBe('12')
    // Typing '12' auto-advanced; Enter on the year segment does nothing.
    await pressKey(getSegment('day')!, 'Enter')
    expect(document.activeElement).toBe(getSegment('day'))
  })

  it('ArrowUp/ArrowDown and PageUp/PageDown and Home/End adjust values with wrap-around', async () => {
    mountDateField({defaultValue: new CalendarDate(2024, 2, 3)})
    await tick()
    const month = getSegment('month')!
    month.focus()
    await pressKey(month, 'ArrowUp')
    expect((getSegment('month')!.textContent || '').trim()).toBe('3')
    await pressKey(month, 'ArrowDown')
    expect((getSegment('month')!.textContent || '').trim()).toBe('2')
    await pressKey(month, 'PageUp')
    expect((getSegment('month')!.textContent || '').trim()).toBe('4')
    await pressKey(month, 'PageDown')
    expect((getSegment('month')!.textContent || '').trim()).toBe('2')
    await pressKey(month, 'End')
    expect((getSegment('month')!.textContent || '').trim()).toBe('12')
    await pressKey(month, 'Home')
    expect((getSegment('month')!.textContent || '').trim()).toBe('1')
    // Wrap: ArrowDown from month 1 wraps to December.
    await pressKey(month, 'ArrowDown')
    expect((getSegment('month')!.textContent || '').trim()).toBe('12')

    // Year pages by 5, rounding to the nearest increment (2024 -> 2025).
    const year = getSegment('year')!
    year.focus()
    await pressKey(year, 'PageUp')
    expect((year.textContent || '').trim()).toBe('2025')
    // Day increments.
    const day = getSegment('day')!
    day.focus()
    await pressKey(day, 'ArrowUp')
    expect((day.textContent || '').trim()).toBe('4')
  })

  it('emits data-* as "true" strings on the field, group, and segments', async () => {
    mountDateField({
      defaultValue: new CalendarDate(2024, 2, 3),
      isRequired: true,
      isInvalid: true,
      validationBehavior: 'aria',
    })
    await tick()

    const field = document.querySelector('.react-aria-DateField') as HTMLElement
    expect(field.getAttribute('data-required')).toBe('true')
    expect(field.getAttribute('data-invalid')).toBe('true')
    expect(field.hasAttribute('data-readonly')).toBe(false)
    expect(field.hasAttribute('data-disabled')).toBe(false)

    const group = document.querySelector('.react-aria-DateInput') as HTMLElement
    expect(group.getAttribute('data-invalid')).toBe('true')
    expect(group.hasAttribute('data-readonly')).toBe(false)

    // Hover the group: data-hovered="true".
    dispatchPointer(group, 'pointerenter', {pointerType: 'mouse'})
    await tick()
    expect(group.getAttribute('data-hovered')).toBe('true')
    dispatchPointer(group, 'pointerleave', {pointerType: 'mouse'})
    await tick()
    expect(group.hasAttribute('data-hovered')).toBe(false)

    // Focus a segment: data-focus-within="true" on the group; segment focused.
    const month = getSegment('month')!
    month.focus()
    await tick()
    expect(group.getAttribute('data-focus-within')).toBe('true')
    expect(month.getAttribute('data-focused')).toBe('true')
    expect(month.getAttribute('data-focus-visible')).toBe('true')

    // Invalid: every editable segment carries data-invalid + aria-invalid.
    for (const segment of getEditableSegments()) {
      expect(segment.getAttribute('data-invalid')).toBe('true')
      expect(segment.getAttribute('aria-invalid')).toBe('true')
    }
    focusOut(month)
    await tick()
  })

  it('marks a required field and segment with data-required and required on the native input', async () => {
    mountDateField({isRequired: true, defaultValue: new CalendarDate(2024, 2, 3)})
    await tick()
    const field = document.querySelector('.react-aria-DateField') as HTMLElement
    expect(field.getAttribute('data-required')).toBe('true')
    const input = document.querySelector('input[type="text"]') as HTMLInputElement
    expect(input.hasAttribute('required')).toBe(true)
    // aria validation behavior drops the native required attribute.
    document.body.replaceChildren()

    mountDateField({
      isRequired: true,
      validationBehavior: 'aria',
      defaultValue: new CalendarDate(2024, 2, 3),
    })
    await tick()
    const input2 = document.querySelector('input[type="hidden"]') as HTMLInputElement
    expect(input2.hasAttribute('required')).toBe(false)
  })

  it('supports isDisabled and isReadOnly for both field and segment state', async () => {
    const {changes, wrapper} = mountDateField({
      defaultValue: new CalendarDate(2024, 2, 3),
      isDisabled: true,
    })
    await tick()

    const field = document.querySelector('.react-aria-DateField') as HTMLElement
    expect(field.getAttribute('data-disabled')).toBe('true')

    for (const segment of getEditableSegments()) {
      expect(segment.getAttribute('data-disabled')).toBe('true')
      expect(segment.hasAttribute('tabindex')).toBe(false)
      expect(segment.hasAttribute('contenteditable')).toBe(false)
    }
    // Input events are ignored.
    const month = getSegment('month')!
    beforeInput(month, '5')
    await tick()
    expect((getSegment('month')!.textContent || '').trim()).toBe('2')
    expect(changes.length).toBe(0)
    wrapper.unmount()
    document.body.replaceChildren()

    // ReadOnly.
    mountDateField({
      defaultValue: new CalendarDate(2024, 2, 3),
      isReadOnly: true,
    })
    await tick()
    expect((document.querySelector('.react-aria-DateField') as HTMLElement).getAttribute('data-readonly')).toBe('true')
    for (const segment of getEditableSegments()) {
      expect(segment.getAttribute('data-readonly')).toBe('true')
      expect(segment.getAttribute('aria-readonly')).toBe('true')
    }
    beforeInput(getSegment('month')!, '5')
    await tick()
    expect((getSegment('month')!.textContent || '').trim()).toBe('2')
  })

  it('flags out-of-range values as invalid with validationBehavior="aria"', async () => {
    mountDateField({
      defaultValue: new CalendarDate(2024, 1, 15),
      minValue: new CalendarDate(2024, 2, 1),
      maxValue: new CalendarDate(2024, 3, 1),
      validationBehavior: 'aria',
    })
    await tick()
    expect((document.querySelector('.react-aria-DateField') as HTMLElement).getAttribute('data-invalid')).toBe('true')
    expect((document.querySelector('.react-aria-DateInput') as HTMLElement).getAttribute('data-invalid')).toBe('true')
    for (const segment of getEditableSegments()) {
      expect(segment.getAttribute('data-invalid')).toBe('true')
    }
    document.body.replaceChildren()

    mountDateField({
      defaultValue: new CalendarDate(2024, 2, 15),
      minValue: new CalendarDate(2024, 2, 1),
      maxValue: new CalendarDate(2024, 3, 1),
      validationBehavior: 'aria',
    })
    await tick()
    expect((document.querySelector('.react-aria-DateField') as HTMLElement).hasAttribute('data-invalid')).toBe(false)
  })

  it('renders only the first editable segment with aria-describedby', async () => {
    mountDateField({defaultValue: new CalendarDate(2024, 2, 3)})
    await tick()
    const editable = getEditableSegments()
    expect(editable[0].getAttribute('aria-describedby')).toBeTruthy()
    for (const segment of editable.slice(1)) {
      expect(segment.hasAttribute('aria-describedby')).toBe(false)
    }
  })

  it('emits lowercase change and focuschange events', async () => {
    const {changes, focusChanges} = mountDateField({'aria-label': 'x'})
    await tick()
    expect(changes.length).toBe(0)
    expect(focusChanges.length).toBe(0)

    const group = document.querySelector('.react-aria-DateInput') as HTMLElement
    group.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
    await tick()
    expect(focusChanges).toContain(true)

    focusOut(getSegment('year')!)
    await tick()
    expect(focusChanges).toContain(false)
  })

  it('supports the I18nProvider locale for formatting, segment order and the filter collator', async () => {
    // zh-CN: segments start with the year.
    mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(I18nProvider as any, {locale: 'zh-CN'}, () =>
              h(
                DateField as any,
                {defaultValue: new CalendarDate(2024, 2, 3), 'aria-label': 'x'},
                defaultDateFieldSlots(),
              ),
            )
        },
      }),
    )
    await tick()
    const order = getEditableSegments().map((el) => el.getAttribute('data-type'))
    expect(order).toEqual(['year', 'month', 'day'])
    document.body.replaceChildren()

    // useFilter follows the I18nProvider locale: Turkish 'i' does not match
    // the dotted capital 'İ' under sensitivity "base", but does match 'I' in en-US.
    const seen: Record<string, boolean | undefined> = {}
    for (const locale of ['en-US', 'tr-TR']) {
      mountInDoc(
        defineComponent({
          setup() {
            const {startsWith} = useFilter({sensitivity: 'base'})
            seen[locale] = startsWith('i', 'I')
            return () => h('div')
          },
        }),
      )
      // Wrap in the provider via a fresh mount.
    }
    // The probe above ran without a provider; re-run under explicit providers.
    document.body.replaceChildren()
    const seen2: Record<string, boolean | undefined> = {}
    for (const locale of ['en-US', 'tr-TR']) {
      seen2[locale] = undefined
      mountInDoc(
        defineComponent({
          setup() {
            return () =>
              h(I18nProvider as any, {locale}, () =>
                h(
                  defineComponent({
                    setup() {
                      const {startsWith} = useFilter({sensitivity: 'base'})
                      seen2[locale] = startsWith('i', 'I')
                      return () => h('div')
                    },
                  }),
                ),
              )
          },
        }),
      )
      await tick()
    }
    expect(seen2['en-US']).toBe(true)
    expect(seen2['tr-TR']).toBe(false)
  })

  it('renders the TimeField with a default granularity of minute and 12-hour clock', async () => {
    mountTimeField({'aria-label': 'x'})
    await tick()
    const order = getEditableSegments().map((el) => el.getAttribute('data-type'))
    expect(order).toEqual(['hour', 'minute', 'dayPeriod'])
    expect(segmentTexts()).toEqual(['––', '––', 'AM'])

    // Hour/minute placeholders are dashes.
    for (const segment of getEditableSegments()) {
      expect(segment.getAttribute('data-placeholder')).toBe('true')
    }
    document.body.replaceChildren()

    // hourCycle 24: no dayPeriod segment; hour is 23 max.
    mountTimeField({'aria-label': 'x', hourCycle: 24, defaultValue: new Time(9, 30)})
    await tick()
    const order24 = getEditableSegments().map((el) => el.getAttribute('data-type'))
    expect(order24).toEqual(['hour', 'minute'])
    const hour = getSegment('hour')!
    expect(hour.getAttribute('aria-valuemax')).toBe('23')
    hour.focus()
    await pressKey(hour, 'ArrowUp')
    expect((getSegment('hour')!.textContent || '').trim()).toBe('10')
  })

  it('TimeField emits a Time value and submits a time string on the hidden input', async () => {
    const {changes} = mountTimeField({defaultValue: new Time(8, 30), name: 'time'})
    await tick()
    expect(segmentTexts()).toEqual(['8', '30', 'AM'])
    const hidden = document.querySelector('input[name="time"]') as HTMLInputElement
    expect(hidden.value).toMatch(/^08:30/)

    // Increment the hour: 8 -> 9; change emits a Time.
    const hour = getSegment('hour')!
    hour.focus()
    await pressKey(hour, 'ArrowUp')
    expect(changes.length).toBeGreaterThan(0)
    const emitted = changes[changes.length - 1]
    expect(emitted).toBeInstanceOf(Time)
    expect(emitted.hour).toBe(9)
    expect(emitted.minute).toBe(30)
  })

  it('deleting with Delete clears the focused segment to its placeholder', async () => {
    mountDateField({defaultValue: new CalendarDate(2024, 2, 3)})
    await tick()
    const day = getSegment('day')!
    expect((day.textContent || '').trim()).toBe('3')
    beforeInput(day, '', 'deleteContentForward')
    await tick()
    expect((getSegment('day')!.textContent || '').trim()).toBe('dd')
    expect(getSegment('day')!.getAttribute('data-placeholder')).toBe('true')
  })

  it('keeps Hook *Props as plain objects with live getters, never ComputedRefs', async () => {
    let fieldProps: any
    let inputProps: any
    mountInDoc(
      defineComponent({
        setup() {
          const fieldRef = ref<Element | null>(null)
          const inputRef = ref<HTMLInputElement | null>(null)
          const state = useDateFieldState({
            defaultValue: new CalendarDate(2024, 2, 3),
            locale: 'en-US',
            createCalendar: () => createCalendar,
          } as any)
          const res = useDateField({inputRef, label: true, 'aria-label': 'x'} as any, state as any, fieldRef as any)
          fieldProps = res.fieldProps
          inputProps = res.inputProps
          return () => h('div')
        },
      }),
    )
    await tick()
    expect(isRef(fieldProps)).toBe(false)
    expect(isRef(inputProps)).toBe(false)
    // Live getters: reading at different times tracks current state.
    expect(typeof fieldProps['aria-describedby']).toBe('string')
    expect(inputProps.value).toBe('2024-02-03')
  })

  it('renders DateInput standalone through DateFieldContext (no field state)', async () => {
    // The official "DateInput without field state" path: DateFieldContext is
    // provided directly (e.g. by a DatePicker in a later slice), so the input
    // creates and provides its own state.
    const changes: any[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          provide(DateFieldContext as any, {
            value: new CalendarDate(2024, 2, 3),
            onChange: (v: any) => changes.push(v),
            'aria-label': 'x',
          })
          return () =>
            h(DateInput as any, null, {
              default: (segment: any) => h(DateSegment as any, {segment}),
            })
        },
      }),
    )
    await tick()
    expect(segmentTexts()).toEqual(['2', '3', '2024'])
    beforeInput(getSegment('month')!, '5')
    await tick()
    expect(changes.length).toBeGreaterThan(0)
    expect(changes[changes.length - 1].month).toBe(5)
    wrapper.unmount()
  })

  it('exports only what the slice intends and no deferred stubs', () => {
    // Components root: slice surface present, deferred APIs absent.
    expect(typeof (components as any).DateField).toBe('object')
    expect(typeof (components as any).TimeField).toBe('object')
    expect(typeof (components as any).DateInput).toBe('object')
    expect(typeof (components as any).DateSegment).toBe('object')
    expect((components as any).DateFieldContext).toBeDefined()
    expect((components as any).TimeFieldContext).toBeDefined()
    expect((components as any).DateFieldStateContext).toBeDefined()
    expect((components as any).TimeFieldStateContext).toBeDefined()
    expect((components as any).Group).toBeDefined()
    expect((components as any).GroupContext).toBeDefined()
    for (const name of [
      'DatePicker',
      'DateRangePicker',
      'RangeCalendar',
      'FieldError',
      'Form',
      'HiddenDateInput',
      'Segment',
    ]) {
      expect((components as any)[name], name).toBeUndefined()
    }

    // vue-aria root: official entries present, internal/deferred hooks absent.
    expect(typeof (vueAria as any).useDateField).toBe('function')
    expect(typeof (vueAria as any).useDateSegment).toBe('function')
    expect(typeof (vueAria as any).useTimeField).toBe('function')
    for (const name of [
      'useDatePicker',
      'useDateRangePicker',
      'useSpinButton',
      'useDisplayNames',
      'useDatePickerGroup',
      'useFormValidation',
    ]) {
      expect((vueAria as any)[name], name).toBeUndefined()
    }

    // vue-stately root: official entries present, internal/deferred state absent.
    expect(typeof (vueStately as any).useDateFieldState).toBe('function')
    expect(typeof (vueStately as any).useTimeFieldState).toBe('function')
    for (const name of [
      'useDatePickerState',
      'useDateRangePickerState',
      'useRangeCalendarState',
      'IncompleteDate',
      'useFormValidationState',
    ]) {
      expect((vueStately as any)[name], name).toBeUndefined()
    }
  })
})
