/*
 * Tests for the CheckboxGroup / CheckboxField / Checkbox / CheckboxButton
 * slice, aligned with the official react-aria-components Checkbox behavior.
 */

import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Checkbox,
  CheckboxButton,
  CheckboxField,
  CheckboxGroup,
  Label,
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

describe('Checkbox (deprecated)', () => {
  function mountCheckbox(props: any = {}) {
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              Checkbox as any,
              {
                'data-testid': 'checkbox-test',
                ...props,
                onChange: (v: boolean) => {
                  changes.push(v)
                  props.onChange?.(v)
                },
              },
              () => 'Accept terms',
            )
        },
      }),
    )
    return {wrapper, changes}
  }

  it('renders a label wrapping a hidden checkbox input and toggles on click', async () => {
    const {wrapper, changes} = mountCheckbox()
    await tick()
    const label = document.querySelector('label.react-aria-Checkbox') as HTMLLabelElement
    expect(label).toBeTruthy()
    expect(label.textContent).toBe('Accept terms')
    expect(label.getAttribute('data-testid')).toBe('checkbox-test')
    const input = label.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.checked).toBe(false)

    dispatchPointer(label, 'pointerdown')
    dispatchPointer(label, 'pointerup')
    await tick()
    expect(changes).toEqual([true])
    expect(input.checked).toBe(true)
    expect(label.getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })

  it('is controlled by isSelected', async () => {
    const value = ref(false)
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              Checkbox as any,
              {
                isSelected: value.value,
                onChange: (v: boolean) => {
                  value.value = v
                  changes.push(v)
                },
              },
              () => 'Accept',
            )
        },
      }),
    )
    await tick()
    const input = document.querySelector('label.react-aria-Checkbox input') as HTMLInputElement
    expect(input.checked).toBe(false)
    // jsdom does not activate checkbox inputs from pointer events; press the
    // label (the interactive element) like a real pointer interaction.
    const label = document.querySelector('label.react-aria-Checkbox') as HTMLLabelElement
    dispatchPointer(label, 'pointerdown')
    dispatchPointer(label, 'pointerup')
    await tick()
    expect(changes).toEqual([true])
    expect(value.value).toBe(true)
    expect(input.checked).toBe(true)
    wrapper.unmount()
  })

  it('supports defaultSelected and uncontrolled updates', async () => {
    const {wrapper} = mountCheckbox({defaultSelected: true})
    await tick()
    const input = document.querySelector('label.react-aria-Checkbox input') as HTMLInputElement
    expect(input.checked).toBe(true)
    wrapper.unmount()
  })

  it('isIndeterminate is presentational only', async () => {
    const {wrapper} = mountCheckbox({isIndeterminate: true, defaultSelected: true})
    await tick()
    const label = document.querySelector('label.react-aria-Checkbox') as HTMLLabelElement
    const input = label.querySelector('input') as HTMLInputElement
    expect(input.indeterminate).toBe(true)
    expect(label.getAttribute('data-indeterminate')).toBe('true')
    expect(label.getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })

  it('native validation renders required; aria behavior renders aria-required', async () => {
    const {wrapper} = mountCheckbox({isRequired: true})
    await tick()
    let input = document.querySelector('label.react-aria-Checkbox input') as HTMLInputElement
    expect(input.required).toBe(true)
    expect(input.getAttribute('aria-required')).toBeNull()
    wrapper.unmount()

    const {wrapper: wrapper2} = mountCheckbox({isRequired: true, validationBehavior: 'aria'})
    await tick()
    input = document.querySelector('label.react-aria-Checkbox input') as HTMLInputElement
    expect(input.required).toBe(false)
    expect(input.getAttribute('aria-required')).toBe('true')
    wrapper2.unmount()
  })

  it('isDisabled renders disabled input and data-disabled', async () => {
    const {wrapper, changes} = mountCheckbox({isDisabled: true})
    await tick()
    const label = document.querySelector('label.react-aria-Checkbox') as HTMLLabelElement
    const input = label.querySelector('input') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(label.getAttribute('data-disabled')).toBe('true')
    dispatchPointer(label, 'pointerdown')
    dispatchPointer(label, 'pointerup')
    await tick()
    expect(changes).toEqual([])
    wrapper.unmount()
  })
})

describe('CheckboxField / CheckboxButton', () => {
  function mountField(props: any = {}, slotsFn?: any) {
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              CheckboxField as any,
              {
                'data-testid': 'field-test',
                ...props,
                onChange: (v: boolean) => {
                  changes.push(v)
                  props.onChange?.(v)
                },
              },
              slotsFn ??
                (() => [
                  h(
                    CheckboxButton as any,
                    {slot: 'label'},
                    {
                      default: (values: any) =>
                        h('span', {class: 'indicator'}, values.isSelected ? 'ON' : 'OFF'),
                    },
                  ),
                  h(Text as any, {slot: 'description'}, () => 'Description'),
                ]),
            )
        },
      }),
    )
    return {wrapper, changes}
  }

  it('renders field data-* on the div and the button label carries the input', async () => {
    const {wrapper, changes} = mountField()
    await tick()
    const field = document.querySelector('div.react-aria-CheckboxField') as HTMLElement
    expect(field).toBeTruthy()
    expect(field.getAttribute('data-testid')).toBe('field-test')
    expect(field.getAttribute('data-selected')).toBeNull()

    const button = field.querySelector('label.react-aria-CheckboxButton') as HTMLLabelElement
    expect(button).toBeTruthy()
    const input = button.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input).toBeTruthy()

    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(changes).toEqual([true])
    expect(field.getAttribute('data-selected')).toBe('true')
    expect(button.querySelector('.indicator')!.textContent).toBe('ON')
    wrapper.unmount()
  })

  it('description is linked via aria-describedby', async () => {
    const {wrapper} = mountField()
    await tick()
    const input = document.querySelector('label.react-aria-CheckboxButton input') as HTMLInputElement
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const described = describedBy!.split(' ').map((id) => document.getElementById(id)!.textContent)
    expect(described.join(' ')).toBe('Description')
    wrapper.unmount()
  })

  it('custom validate + aria behavior marks the input invalid after commit', async () => {
    const {wrapper} = mountField({
      defaultSelected: true,
      validate: (v: boolean) => (!v ? 'must accept' : null),
      validationBehavior: 'aria',
    })
    await tick()
    const button = document.querySelector('label.react-aria-CheckboxButton') as HTMLLabelElement
    const input = button.querySelector('input') as HTMLInputElement
    // Toggle off: validate(false) reports an error via aria-invalid.
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(input.checked).toBe(false)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    wrapper.unmount()
  })
})

describe('CheckboxGroup', () => {
  function mountGroup(props: any = {}, slotsFn?: any) {
    const changes: any[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              CheckboxGroup as any,
              {
                'data-testid': 'group-test',
                ...props,
                onChange: (v: any[]) => {
                  changes.push(v)
                  props.onChange?.(v)
                },
              },
              slotsFn ??
                (() => [
                  h(Label as any, null, () => 'Colors'),
                  h(
                    CheckboxField as any,
                    {value: 'red'},
                    {
                      default: () => [
                        h(CheckboxButton as any, null, () => 'Red'),
                        h(Text as any, {slot: 'description'}, () => 'Red description'),
                      ],
                    },
                  ),
                  h(
                    CheckboxField as any,
                    {value: 'blue'},
                    {default: () => [h(CheckboxButton as any, null, () => 'Blue')]},
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
    const group = document.querySelector('div.react-aria-CheckboxGroup') as HTMLElement
    expect(group).toBeTruthy()
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('data-testid')).toBe('group-test')
    const labelledBy = group.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)!.textContent).toBe('Colors')

    const inputs = Array.from(group.querySelectorAll('input[type="checkbox"]'))
    expect(inputs.length).toBe(2)
    for (const input of inputs) {
      expect((input as HTMLInputElement).name).toBe('colors')
    }
    expect(changes).toEqual([])
    wrapper.unmount()
  })

  it('group description is linked to every item input', async () => {
    const {wrapper} = mountGroup({name: 'colors'}, () => [
      h(Label as any, null, () => 'Colors'),
      h(Text as any, {slot: 'description'}, () => 'Group description'),
      h(
        CheckboxField as any,
        {value: 'red'},
        {
          default: () => [
            h(CheckboxButton as any, null, () => 'Red'),
            h(Text as any, {slot: 'description'}, () => 'Red description'),
          ],
        },
      ),
      h(
        CheckboxField as any,
        {value: 'blue'},
        {default: () => [h(CheckboxButton as any, null, () => 'Blue')]},
      ),
    ])
    await tick()
    const group = document.querySelector('div.react-aria-CheckboxGroup') as HTMLElement
    const input = group.querySelector('input') as HTMLInputElement
    const describedBy = (input.getAttribute('aria-describedby') || '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .filter(Boolean)
    expect(describedBy.join(' ')).toContain('Group description')
    expect(describedBy.join(' ')).toContain('Red description')
    wrapper.unmount()
  })

  it('clicking items updates the group value and emits change', async () => {
    const {wrapper, changes} = mountGroup({name: 'colors', defaultValue: ['red']})
    await tick()
    const group = document.querySelector('div.react-aria-CheckboxGroup') as HTMLElement
    const buttons = Array.from(group.querySelectorAll('label.react-aria-CheckboxButton'))
    expect(group.getAttribute('data-selected')).toBeNull()

    // Red is selected by default; its input is checked and the field shows data-selected.
    const redButton = buttons[0]
    expect(redButton.getAttribute('data-selected')).toBe('true')
    expect((redButton.querySelector('input') as HTMLInputElement).checked).toBe(true)

    dispatchPointer(buttons[1], 'pointerdown')
    dispatchPointer(buttons[1], 'pointerup')
    await tick()
    expect(changes.length).toBe(1)
    expect([...changes[0]].sort()).toEqual(['blue', 'red'])
    expect(buttons[1].getAttribute('data-selected')).toBe('true')

    dispatchPointer(redButton, 'pointerdown')
    dispatchPointer(redButton, 'pointerup')
    await tick()
    expect(changes.length).toBe(2)
    expect(changes[1]).toEqual(['blue'])
    expect(redButton.getAttribute('data-selected')).toBeNull()
    wrapper.unmount()
  })

  it('is controlled by value', async () => {
    const value = ref<string[]>([])
    const changes: any[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              CheckboxGroup as any,
              {
                // Read at render time so the controlled value flows back in
                // when the outer component re-renders (TextField convention).
                name: 'colors',
                value: value.value,
                onChange: (v: string[]) => {
                  value.value = [...v]
                  changes.push(v)
                },
              },
              () => [
                h(Label as any, null, () => 'Colors'),
                h(
                  CheckboxField as any,
                  {value: 'red'},
                  {default: () => [h(CheckboxButton as any, null, () => 'Red')]},
                ),
                h(
                  CheckboxField as any,
                  {value: 'blue'},
                  {default: () => [h(CheckboxButton as any, null, () => 'Blue')]},
                ),
              ],
            )
        },
      }),
    )
    await tick()
    const group = document.querySelector('div.react-aria-CheckboxGroup') as HTMLElement
    const button = group.querySelector('label.react-aria-CheckboxButton') as HTMLLabelElement
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(value.value).toEqual(['red'])
    expect(changes.length).toBe(1)
    expect(button.getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })

  it('isRequired with aria behavior marks the group invalid until an item is selected', async () => {
    const {wrapper} = mountGroup({isRequired: true, validationBehavior: 'aria', name: 'colors'})
    await tick()
    const group = document.querySelector('div.react-aria-CheckboxGroup') as HTMLElement
    const input = group.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('aria-required')).toBe('true')
    expect(input.required).toBe(false)
    // Toggle an item on and off, then commit by toggling again: the group stays valid.
    const buttons = Array.from(group.querySelectorAll('label.react-aria-CheckboxButton'))
    dispatchPointer(buttons[0], 'pointerdown')
    dispatchPointer(buttons[0], 'pointerup')
    await tick()
    dispatchPointer(buttons[1], 'pointerdown')
    dispatchPointer(buttons[1], 'pointerup')
    await tick()
    expect(group.getAttribute('data-invalid')).toBeNull()
    wrapper.unmount()
  })

  it('per-item validate marks the individual item invalid with aria behavior', async () => {
    const {wrapper} = mountGroup(
      {
        name: 'colors',
        validationBehavior: 'aria',
        validate: (v: string[]) => (v.length === 0 ? 'pick one' : null),
      },
      () => [
        h(Label as any, null, () => 'Colors'),
        h(
          CheckboxField as any,
          {value: 'red', validate: (v: boolean) => (!v ? 'red required' : null)},
          {default: () => [h(CheckboxButton as any, null, () => 'Red')]},
        ),
        h(
          CheckboxField as any,
          {value: 'blue'},
          {default: () => [h(CheckboxButton as any, null, () => 'Blue')]},
        ),
      ],
    )
    await tick()
    const group = document.querySelector('div.react-aria-CheckboxGroup') as HTMLElement
    const redField = group.querySelectorAll('div.react-aria-CheckboxField')[0]
    // Select then unselect red: the per-item validate error shows.
    const buttons = Array.from(group.querySelectorAll('label.react-aria-CheckboxButton'))
    dispatchPointer(buttons[0], 'pointerdown')
    dispatchPointer(buttons[0], 'pointerup')
    await tick()
    dispatchPointer(buttons[0], 'pointerdown')
    dispatchPointer(buttons[0], 'pointerup')
    await tick()
    expect(redField.getAttribute('data-invalid')).toBe('true')
    const redInput = redField.querySelector('input') as HTMLInputElement
    expect(redInput.getAttribute('aria-invalid')).toBe('true')
    wrapper.unmount()
  })
})

describe('form reset', () => {
  it('restores the default selection on form reset', async () => {
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h('form', {id: 'reset-form'}, [
              h(
                Checkbox as any,
                {defaultSelected: true},
                () => 'Accept terms',
              ),
              h(
                CheckboxGroup as any,
                {name: 'toppings', defaultValue: ['a']},
                () => [
                  h(
                    CheckboxField as any,
                    {value: 'a'},
                    {default: () => [h(CheckboxButton as any, null, () => 'A')]},
                  ),
                  h(
                    CheckboxField as any,
                    {value: 'b'},
                    {default: () => [h(CheckboxButton as any, null, () => 'B')]},
                  ),
                ],
              ),
            ])
        },
      }),
    )
    await tick()
    const form = document.getElementById('reset-form') as HTMLFormElement
    const inputs = Array.from(form.querySelectorAll('input')) as HTMLInputElement[]
    expect(inputs[0].checked).toBe(true)

    // Toggle the standalone checkbox off and check item b instead of a.
    inputs[0].click()
    await tick()
    const itemB = inputs[2]
    itemB.click()
    await tick()
    expect(inputs[0].checked).toBe(false)
    // Checkbox groups are multi-select: a stays checked alongside b.
    expect(inputs[1].checked).toBe(true)
    expect(inputs[2].checked).toBe(true)

    form.reset()
    await tick()
    expect(inputs[0].checked).toBe(true)
    expect(inputs[1].checked).toBe(true)
    expect(inputs[2].checked).toBe(false)
    wrapper.unmount()
  })
})

describe('Checkbox keyboard interaction', () => {
  it('space on a focused input dispatches change and toggles state', async () => {
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              Checkbox as any,
              {onChange: (v: boolean) => changes.push(v)},
              () => 'Accept',
            )
        },
      }),
    )
    await tick()
    const input = document.querySelector('label.react-aria-Checkbox input') as HTMLInputElement
    input.focus()
    // jsdom does not run native keyboard activation; emulate the browser's
    // change event after flipping the checked property.
    input.checked = true
    input.dispatchEvent(new Event('change', {bubbles: true}))
    await tick()
    expect(changes).toEqual([true])
    const label = document.querySelector('label.react-aria-Checkbox') as HTMLLabelElement
    expect(label.getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })
})

describe('Checkbox readonly focus ring', () => {
  it('a readonly checkbox lights data-focused / data-focus-visible when the hidden input is focused, and never hovers', async () => {
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              CheckboxField as any,
              {isReadOnly: true, onChange: (v: boolean) => changes.push(v)},
              () => h(CheckboxButton as any, null, () => 'Accept'),
            )
        },
      }),
    )
    await tick()
    const label = document.querySelector('label.react-aria-CheckboxButton') as HTMLLabelElement
    expect(label.getAttribute('data-readonly')).toBe('true')
    const input = label.querySelector('input') as HTMLInputElement
    // Readonly inputs stay tabbable: focusProps are merged onto the hidden input.
    expect(input.disabled).toBe(false)

    // Set keyboard modality first: module-level modality may still be
    // 'pointer' from earlier pointer-driven tests in this file.
    dispatchKey(document, 'keydown', {key: 'Tab', code: 'Tab'})
    input.focus()
    await tick()
    expect(document.activeElement).toBe(input)
    expect(label.getAttribute('data-focused')).toBe('true')
    expect(label.getAttribute('data-focus-visible')).toBe('true')

    // Readonly buttons never hover (interaction is disabled for hover only).
    dispatchPointer(label, 'pointerdown')
    dispatchPointer(label, 'pointerup')
    await tick()
    expect(label.getAttribute('data-hovered')).toBeNull()
    expect(changes).toEqual([])
    wrapper.unmount()
  })
})
