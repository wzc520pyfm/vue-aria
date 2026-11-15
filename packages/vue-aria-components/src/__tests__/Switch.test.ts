/*
 * Tests for the SwitchField / SwitchButton / Switch slice, aligned with the
 * official react-aria-components Switch behavior.
 */

import {defineComponent, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Label,
  Switch,
  SwitchButton,
  SwitchContext,
  SwitchField,
  SwitchFieldContext,
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

describe('SwitchField / SwitchButton', () => {
  function mountField(props: any = {}, slotsFn?: any) {
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              SwitchField as any,
              {
                'data-testid': 'switch-test',
                ...props,
                onChange: (v: boolean) => {
                  changes.push(v)
                  props.onChange?.(v)
                },
              },
              slotsFn ??
                (() => [
                  h(SwitchButton as any, null, () => 'Low power mode'),
                  h(Text as any, {slot: 'description'}, () => 'Description'),
                ]),
            )
        },
      }),
    )
    return {wrapper, changes}
  }

  it('renders a field div with a button label wrapping a switch input', async () => {
    const {wrapper, changes} = mountField()
    await tick()
    const field = document.querySelector('div.react-aria-SwitchField') as HTMLElement
    expect(field).toBeTruthy()
    expect(field.getAttribute('data-testid')).toBe('switch-test')
    const button = field.querySelector('label.react-aria-SwitchButton') as HTMLLabelElement
    expect(button.textContent).toBe('Low power mode')
    const input = button.querySelector('input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.type).toBe('checkbox')
    expect(input.getAttribute('role')).toBe('switch')
    expect(input.checked).toBe(false)
    expect(changes).toEqual([])
    wrapper.unmount()
  })

  it('pressing the button toggles and emits change', async () => {
    const {wrapper, changes} = mountField()
    await tick()
    const button = document.querySelector('label.react-aria-SwitchButton') as HTMLLabelElement
    const input = button.querySelector('input') as HTMLInputElement
    // jsdom does not activate checkbox inputs from pointer events; press the
    // button label (the interactive element) like a real pointer interaction.
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(changes).toEqual([true])
    expect(input.checked).toBe(true)
    expect(button.getAttribute('data-selected')).toBe('true')
    expect(
      document.querySelector('div.react-aria-SwitchField')!.getAttribute('data-selected'),
    ).toBe('true')
    wrapper.unmount()
  })

  it('supports defaultSelected and uncontrolled updates', async () => {
    const {wrapper} = mountField({defaultSelected: true})
    await tick()
    const input = document.querySelector('label.react-aria-SwitchButton input') as HTMLInputElement
    expect(input.checked).toBe(true)
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
              SwitchField as any,
              {
                // Read at render time so the controlled value flows back in
                // when the outer component re-renders (TextField convention).
                isSelected: value.value,
                onChange: (v: boolean) => {
                  value.value = v
                  changes.push(v)
                },
              },
              () => [h(SwitchButton as any, null, () => 'Airplane mode')],
            )
        },
      }),
    )
    await tick()
    const button = document.querySelector('label.react-aria-SwitchButton') as HTMLLabelElement
    const input = button.querySelector('input') as HTMLInputElement
    expect(input.checked).toBe(false)
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(changes).toEqual([true])
    expect(value.value).toBe(true)
    expect(input.checked).toBe(true)
    expect(button.getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })

  it('isDisabled renders disabled input and data-disabled', async () => {
    const {wrapper, changes} = mountField({isDisabled: true})
    await tick()
    const field = document.querySelector('div.react-aria-SwitchField') as HTMLElement
    const button = field.querySelector('label.react-aria-SwitchButton') as HTMLLabelElement
    const input = button.querySelector('input') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(field.getAttribute('data-disabled')).toBe('true')
    expect(button.getAttribute('data-disabled')).toBe('true')
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(changes).toEqual([])
    wrapper.unmount()
  })

  it('description is linked via aria-describedby', async () => {
    const {wrapper} = mountField()
    await tick()
    const input = document.querySelector('label.react-aria-SwitchButton input') as HTMLInputElement
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const described = describedBy!.split(' ').map((id) => document.getElementById(id)!.textContent)
    expect(described.join(' ')).toBe('Description')
    wrapper.unmount()
  })

  it('fills undefined props from SwitchFieldContext', async () => {
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          provide(SwitchFieldContext as any, {defaultSelected: true, isDisabled: true})
          return () =>
            h(SwitchField as any, null, () => [
              h(SwitchButton as any, null, () => 'Context switch'),
            ])
        },
      }),
    )
    await tick()
    const field = document.querySelector('div.react-aria-SwitchField') as HTMLElement
    const input = field.querySelector('input') as HTMLInputElement
    expect(input.checked).toBe(true)
    expect(input.disabled).toBe(true)
    expect(field.getAttribute('data-disabled')).toBe('true')
    wrapper.unmount()
  })

  it('fills undefined props from SwitchContext', async () => {
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          provide(SwitchContext as any, {defaultSelected: true})
          return () => h(Switch as any, null, () => 'Context switch')
        },
      }),
    )
    await tick()
    const input = document.querySelector('label.react-aria-Switch input') as HTMLInputElement
    expect(input.checked).toBe(true)
    wrapper.unmount()
  })

  it('isRequired with aria behavior renders aria-required; native renders required', async () => {
    const ariaWrapper = mountField({isRequired: true, validationBehavior: 'aria'})
    await tick()
    let input = document.querySelector('label.react-aria-SwitchButton input') as HTMLInputElement
    expect(input.getAttribute('aria-required')).toBe('true')
    expect(input.required).toBe(false)
    expect(
      document.querySelector('div.react-aria-SwitchField')!.getAttribute('data-required'),
    ).toBe('true')
    ariaWrapper.wrapper.unmount()

    const nativeWrapper = mountField({isRequired: true})
    await tick()
    input = document.querySelector('label.react-aria-SwitchButton input') as HTMLInputElement
    expect(input.hasAttribute('required')).toBe(true)
    expect(input.getAttribute('aria-required')).toBeNull()
    nativeWrapper.wrapper.unmount()
  })
})

describe('Switch (deprecated)', () => {
  it('renders label.react-aria-Switch with the input inside and toggles via press', async () => {
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              Switch as any,
              {onChange: (v: boolean) => changes.push(v)},
              () => 'Low power mode',
            )
        },
      }),
    )
    await tick()
    const label = document.querySelector('label.react-aria-Switch') as HTMLLabelElement
    expect(label).toBeTruthy()
    expect(label.textContent).toBe('Low power mode')
    const input = label.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('role')).toBe('switch')

    dispatchPointer(label, 'pointerdown')
    dispatchPointer(label, 'pointerup')
    await tick()
    expect(changes).toEqual([true])
    expect(input.checked).toBe(true)
    expect(label.getAttribute('data-selected')).toBe('true')
    wrapper.unmount()
  })
})

describe('Switch readonly focus ring', () => {
  it('a readonly switch lights data-focused / data-focus-visible when the hidden input is focused, and never hovers', async () => {
    const changes: boolean[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              SwitchField as any,
              {isReadOnly: true, onChange: (v: boolean) => changes.push(v)},
              () => h(SwitchButton as any, null, () => 'Low power mode'),
            )
        },
      }),
    )
    await tick()
    const button = document.querySelector('label.react-aria-SwitchButton') as HTMLLabelElement
    expect(button.getAttribute('data-readonly')).toBe('true')
    const input = button.querySelector('input') as HTMLInputElement
    // Readonly inputs stay tabbable: focusProps are merged onto the hidden input.
    expect(input.disabled).toBe(false)

    // Set keyboard modality first: module-level modality may still be
    // 'pointer' from earlier pointer-driven tests in this file.
    dispatchKey(document, 'keydown', {key: 'Tab', code: 'Tab'})
    input.focus()
    await tick()
    expect(document.activeElement).toBe(input)
    expect(button.getAttribute('data-focused')).toBe('true')
    expect(button.getAttribute('data-focus-visible')).toBe('true')

    // Readonly buttons never hover (interaction is disabled for hover only).
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(button.getAttribute('data-hovered')).toBeNull()
    expect(changes).toEqual([])
    wrapper.unmount()
  })
})
