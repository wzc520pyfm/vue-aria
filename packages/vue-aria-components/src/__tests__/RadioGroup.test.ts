/*
 * Tests for the RadioGroup / RadioField / Radio / RadioButton slice, aligned
 * with the official react-aria-components RadioGroup behavior.
 */

import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  I18nProvider,
  Label,
  Radio,
  RadioButton,
  RadioField,
  RadioGroup,
  Text,
} from 'vue-aria-components'

function mountInDoc(component: any, options: any = {}) {
  return mount(component, {attachTo: document.body, ...options})
}

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('RadioGroup', () => {
  function mountGroup(props: any = {}, slotsFn?: any) {
    const changes: any[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              RadioGroup as any,
              {
                'data-testid': 'group-test',
                ...props,
                onChange: (v: any) => {
                  changes.push(v)
                  props.onChange?.(v)
                },
              },
              slotsFn ??
                (() => [
                  h(Label as any, null, () => 'Colors'),
                  h(
                    RadioField as any,
                    {value: 'red'},
                    {default: () => [h(RadioButton as any, null, () => 'Red')]},
                  ),
                  h(
                    RadioField as any,
                    {value: 'blue'},
                    {default: () => [h(RadioButton as any, null, () => 'Blue')]},
                  ),
                ]),
            )
        },
      }),
    )
    return {wrapper, changes}
  }

  it('renders a labeled group with inputs sharing the group name', async () => {
    const {wrapper, changes} = mountGroup({name: 'colors'})
    await tick()
    const group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    expect(group).toBeTruthy()
    expect(group.getAttribute('role')).toBe('radiogroup')
    expect(group.getAttribute('data-testid')).toBe('group-test')
    expect(group.getAttribute('data-orientation')).toBe('vertical')
    const labelledBy = group.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)!.textContent).toBe('Colors')

    const inputs = Array.from(group.querySelectorAll('input[type="radio"]'))
    expect(inputs.length).toBe(2)
    const names = new Set(inputs.map((input) => (input as HTMLInputElement).name))
    expect(names.size).toBe(1)
    expect([...names][0]).toBe('colors')
    expect(changes).toEqual([])
    wrapper.unmount()
  })

  it('radios share a generated name when name is omitted', async () => {
    const {wrapper} = mountGroup()
    await tick()
    const inputs = Array.from(document.querySelectorAll('input[type="radio"]'))
    const names = new Set(inputs.map((input) => (input as HTMLInputElement).name))
    expect(names.size).toBe(1)
    expect([...names][0]).toBeTruthy()
    wrapper.unmount()
  })

  it('defaultValue selects a radio; clicking another moves the selection and emits change', async () => {
    const {wrapper, changes} = mountGroup({name: 'colors', defaultValue: 'red'})
    await tick()
    const group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    const buttons = Array.from(group.querySelectorAll('label.react-aria-RadioButton'))
    expect(group.getAttribute('data-selected')).toBeNull()
    expect(buttons[0].getAttribute('data-selected')).toBe('true')
    expect((buttons[0].querySelector('input') as HTMLInputElement).checked).toBe(true)
    expect(buttons[1].getAttribute('data-selected')).toBeNull()

    // jsdom does not activate radio inputs from pointer events; press the label.
    dispatchPointer(buttons[1], 'pointerdown')
    dispatchPointer(buttons[1], 'pointerup')
    await tick()
    expect(changes).toEqual(['blue'])
    expect(buttons[1].getAttribute('data-selected')).toBe('true')
    expect((buttons[1].querySelector('input') as HTMLInputElement).checked).toBe(true)
    expect(buttons[0].getAttribute('data-selected')).toBeNull()
    wrapper.unmount()
  })

  it('RadioField renders field data-* and the button carries the input', async () => {
    const {wrapper} = mountGroup({name: 'colors', defaultValue: 'blue'})
    await tick()
    const fields = Array.from(document.querySelectorAll('div.react-aria-RadioField'))
    expect(fields.length).toBe(2)
    expect(fields[1].getAttribute('data-selected')).toBe('true')
    const button = fields[1].querySelector('label.react-aria-RadioButton') as HTMLLabelElement
    expect(button.getAttribute('data-selected')).toBe('true')
    expect(button.querySelector('input[type="radio"]')).toBeTruthy()
    wrapper.unmount()
  })

  it('is controlled by value', async () => {
    const value = ref('')
    const changes: any[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              RadioGroup as any,
              {
                // Read at render time so the controlled value flows back in
                // when the outer component re-renders (TextField convention).
                name: 'colors',
                value: value.value,
                onChange: (v: string) => {
                  value.value = v
                  changes.push(v)
                },
              },
              () => [
                h(Label as any, null, () => 'Colors'),
                h(
                  RadioField as any,
                  {value: 'red'},
                  {default: () => [h(RadioButton as any, null, () => 'Red')]},
                ),
                h(
                  RadioField as any,
                  {value: 'blue'},
                  {default: () => [h(RadioButton as any, null, () => 'Blue')]},
                ),
              ],
            )
        },
      }),
    )
    await tick()
    const group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    const button = group.querySelector('label.react-aria-RadioButton') as HTMLLabelElement
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(value.value).toBe('red')
    expect(changes).toEqual(['red'])
    expect(button.getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })

  it('keyboard arrows move selection and focus with roving tabIndex', async () => {
    const {wrapper, changes} = mountGroup({name: 'colors'})
    await tick()
    const group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    const inputs = Array.from(group.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]

    // Nothing selected yet: every radio is tabbable (official behavior).
    expect(inputs[0].tabIndex).toBe(0)
    expect(inputs[1].tabIndex).toBe(0)

    inputs[0].focus()
    // jsdom does not run native keyboard activation; the group-level keyboard
    // handler receives the bubbled keydown and moves selection + focus.
    dispatchKey(inputs[0], 'keydown', {key: 'ArrowDown'})
    await tick()

    expect(changes).toEqual(['blue'])
    expect(inputs[1].checked).toBe(true)
    expect(document.activeElement).toBe(inputs[1])
    // Roving tabIndex follows the selection.
    expect(inputs[0].tabIndex).toBe(-1)
    expect(inputs[1].tabIndex).toBe(0)
    expect(
      document
        .querySelector('label.react-aria-RadioButton')!
        .getAttribute('data-selected'),
    ).toBeNull()
    wrapper.unmount()
  })

  it('orientation=horizontal is reflected in data-orientation and aria-orientation', async () => {
    const {wrapper} = mountGroup({name: 'colors', orientation: 'horizontal'})
    await tick()
    const group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    expect(group.getAttribute('data-orientation')).toBe('horizontal')
    expect(group.getAttribute('aria-orientation')).toBe('horizontal')
    wrapper.unmount()
  })

  it('disabled group disables every input and renders data-disabled', async () => {
    const {wrapper, changes} = mountGroup({name: 'colors', isDisabled: true, defaultValue: 'red'})
    await tick()
    const group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    expect(group.getAttribute('data-disabled')).toBe('true')
    for (const input of Array.from(group.querySelectorAll('input'))) {
      expect((input as HTMLInputElement).disabled).toBe(true)
    }
    const buttons = Array.from(group.querySelectorAll('label.react-aria-RadioButton'))
    dispatchPointer(buttons[1], 'pointerdown')
    dispatchPointer(buttons[1], 'pointerup')
    await tick()
    expect(changes).toEqual([])
    wrapper.unmount()
  })

  it('isRequired with aria behavior renders aria-required; native renders required', async () => {
    const ariaWrapper = mountGroup({name: 'colors', isRequired: true, validationBehavior: 'aria'})
    await tick()
    let group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    let input = document.querySelector('input[type="radio"]') as HTMLInputElement
    // Official behavior: aria-required is on the group element, not the input.
    expect(group.getAttribute('aria-required')).toBe('true')
    expect(input.getAttribute('aria-required')).toBeNull()
    expect(input.required).toBe(false)
    ariaWrapper.wrapper.unmount()

    const nativeWrapper = mountGroup({name: 'colors', isRequired: true})
    await tick()
    group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    input = document.querySelector('input[type="radio"]') as HTMLInputElement
    expect(input.hasAttribute('required')).toBe(true)
    expect(input.getAttribute('aria-required')).toBeNull()
    expect(group.getAttribute('data-required')).toBe('true')
    nativeWrapper.wrapper.unmount()
  })

  it('group description is linked to every item input', async () => {
    const {wrapper} = mountGroup({name: 'colors'}, () => [
      h(Label as any, null, () => 'Colors'),
      h(Text as any, {slot: 'description'}, () => 'Group description'),
      h(
        RadioField as any,
        {value: 'red'},
        {
          default: () => [
            h(RadioButton as any, null, () => 'Red'),
            h(Text as any, {slot: 'description'}, () => 'Red description'),
          ],
        },
      ),
      h(
        RadioField as any,
        {value: 'blue'},
        {default: () => [h(RadioButton as any, null, () => 'Blue')]},
      ),
    ])
    await tick()
    const group = document.querySelector('div.react-aria-RadioGroup') as HTMLElement
    const inputs = Array.from(group.querySelectorAll('input')) as HTMLInputElement[]
    for (const input of inputs) {
      const describedBy = (input.getAttribute('aria-describedby') || '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent)
        .filter(Boolean)
      expect(describedBy.join(' ')).toContain('Group description')
    }
    // The red radio also links its own description.
    const redDescribedBy = (inputs[0].getAttribute('aria-describedby') || '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .filter(Boolean)
    expect(redDescribedBy.join(' ')).toContain('Red description')
    wrapper.unmount()
  })

  it('orientation=horizontal reverses the horizontal arrows in RTL locales', async () => {
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(I18nProvider as any, {locale: 'ar-AE'}, () =>
              h(
                RadioGroup as any,
                {name: 'colors', orientation: 'horizontal'},
                () => [
                  h(
                    RadioField as any,
                    {value: 'red'},
                    {default: () => [h(RadioButton as any, null, () => 'Red')]},
                  ),
                  h(
                    RadioField as any,
                    {value: 'blue'},
                    {default: () => [h(RadioButton as any, null, () => 'Blue')]},
                  ),
                ],
              ),
            )
        },
      }),
    )
    await tick()
    const inputs = Array.from(
      document.querySelectorAll('input[type="radio"]'),
    ) as HTMLInputElement[]
    expect(inputs).toHaveLength(2)
    inputs[0].focus()
    // RTL: ArrowRight moves to the *previous* radio (wraps to last), ArrowLeft to the next.
    dispatchKey(inputs[0], 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(document.activeElement).toBe(inputs[1])
    expect(inputs[1].checked).toBe(true)
    dispatchKey(inputs[1], 'keydown', {key: 'ArrowLeft'})
    await tick()
    expect(document.activeElement).toBe(inputs[0])
    expect(inputs[0].checked).toBe(true)
    // Vertical arrows are unaffected by direction.
    dispatchKey(inputs[0], 'keydown', {key: 'ArrowDown'})
    await tick()
    expect(document.activeElement).toBe(inputs[1])
    wrapper.unmount()
  })
})

describe('Radio (deprecated)', () => {
  it('renders label.react-aria-Radio with the input inside and toggles via press', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              RadioGroup as any,
              {name: 'colors', onChange: (v: any) => changes.push(v)},
              () => [
                h(Label as any, null, () => 'Colors'),
                h(Radio as any, {value: 'red'}, () => 'Red'),
                h(Radio as any, {value: 'blue'}, () => 'Blue'),
              ],
            )
        },
      }),
    )
    await tick()
    const labels = Array.from(document.querySelectorAll('label.react-aria-Radio'))
    expect(labels.length).toBe(2)
    expect(labels[0].textContent).toBe('Red')
    expect(labels[0].querySelector('input[type="radio"]')).toBeTruthy()

    dispatchPointer(labels[0], 'pointerdown')
    dispatchPointer(labels[0], 'pointerup')
    await tick()
    expect(changes).toEqual(['red'])
    expect(labels[0].getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })
})
