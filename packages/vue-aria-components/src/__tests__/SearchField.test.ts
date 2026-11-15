import {defineComponent, h, nextTick} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchClick, dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Button,
  Group,
  Input,
  Label,
  SearchField,
  Text,
} from 'vue-aria-components'

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

afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
})

function defaultSlots(extra: any = {}) {
  return () => [
    h(Label as any, null, () => 'Test'),
    h(Input as any),
    h(Button as any, null, () => '✕'),
    h(Text as any, {slot: 'description'}, () => 'Description'),
    h(Text as any, {slot: 'errorMessage'}, () => 'Error'),
    ...(extra.children ?? []),
  ]
}

function mountField(props: any = {}, children: any = defaultSlots()) {
  const changes: string[] = []
  const clears: number[] = []
  const wrapper = mountInDoc(
    defineComponent({
      setup() {
        return () =>
          h(
            SearchField as any,
            {
              'data-testid': 'search-field-test',
              'data-foo': 'bar',
              defaultValue: 'test',
              ...props,
              onChange: (v: string) => {
                changes.push(v)
                props.onChange?.(v)
              },
              onClear: () => {
                clears.push(1)
                props.onClear?.()
              },
            },
            children,
          )
      },
    }),
  )
  return {wrapper, changes, clears}
}

function getField(): HTMLElement {
  return document.querySelector('.react-aria-SearchField') as HTMLElement
}

function getInput(): HTMLInputElement {
  return document.querySelector('.react-aria-SearchField input') as HTMLInputElement
}

function getButton(): HTMLButtonElement {
  return document.querySelector('.react-aria-SearchField button') as HTMLButtonElement
}

describe('SearchField', () => {
  it('provides slots: value, class, aria-labelledby/describedby wiring and a Clear search button', async () => {
    const {wrapper} = mountField()
    await tick()
    const input = getInput()
    expect(input.value).toBe('test')
    expect(input.getAttribute('type')).toBe('search')

    expect(getField().getAttribute('data-foo')).toBe('bar')
    expect(getField().getAttribute('data-testid')).toBe('search-field-test')

    const labelledBy = input.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const label = document.getElementById(labelledBy!)
    expect(label!.className).toContain('react-aria-Label')
    expect(label!.textContent).toBe('Test')

    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const described = describedBy!.split(' ').map((id) => document.getElementById(id)!.textContent)
    expect(described.join(' ')).toBe('Description Error')

    const button = getButton()
    expect(button.getAttribute('aria-label')).toBe('Clear search')
    expect(button.getAttribute('tabindex')).toBe('-1')
    wrapper.unmount()
  })

  it('defaults to empty and renders data-empty on the outer element', async () => {
    const {wrapper} = mountField({defaultValue: undefined})
    await tick()
    expect(getInput().value).toBe('')
    expect(getField().getAttribute('data-empty')).toBe('true')
    wrapper.unmount()
    document.body.replaceChildren()
    const nonEmpty = mountField({defaultValue: 'x'})
    await tick()
    expect(getField().hasAttribute('data-empty')).toBe(false)
    nonEmpty.wrapper.unmount()
  })

  it('data attributes stay on the outer element only (except hover/focus on the input)', async () => {
    const {wrapper} = mountField()
    await tick()
    expect(getField().getAttribute('data-foo')).toBe('bar')
    expect(getInput().hasAttribute('data-foo')).toBe(false)
    expect(getField().hasAttribute('data-empty')).toBe(false)
    wrapper.unmount()
  })

  it('id prop is rendered only on the input; htmlFor links the label', async () => {
    const {wrapper} = mountField({id: 'search'})
    await tick()
    expect(getField().getAttribute('id')).toBeNull()
    expect(getInput().getAttribute('id')).toBe('search')
    const label = document.querySelector('.react-aria-Label') as HTMLElement
    expect(label.getAttribute('for')).toBe('search')
    wrapper.unmount()
  })

  it('supports form and name props on the input only', async () => {
    const {wrapper} = mountField({form: 'test', name: 'test-name'})
    await tick()
    expect(getInput().getAttribute('form')).toBe('test')
    expect(getInput().getAttribute('name')).toBe('test-name')
    expect(getField().getAttribute('form')).toBeNull()
    expect(getField().getAttribute('name')).toBeNull()
    wrapper.unmount()
  })

  it('typing emits a lowercase change event and updates data-empty', async () => {
    const {wrapper, changes} = mountField({defaultValue: ''})
    await tick()
    expect(getField().getAttribute('data-empty')).toBe('true')
    const input = getInput()
    input.focus()
    input.value = 'abc'
    input.dispatchEvent(new Event('input', {bubbles: true}))
    await tick()
    expect(changes).toEqual(['abc'])
    expect(getField().hasAttribute('data-empty')).toBe(false)
    wrapper.unmount()
  })

  it('Escape clears a non-empty value and emits lowercase clear', async () => {
    const {wrapper, clears} = mountField({defaultValue: 'hello'})
    await tick()
    const input = getInput()
    input.focus()
    dispatchKey(input, 'keydown', {key: 'Escape'})
    await tick()
    expect(input.value).toBe('')
    expect(getField().getAttribute('data-empty')).toBe('true')
    expect(clears).toHaveLength(1)
    // Escape again is a no-op
    dispatchKey(input, 'keydown', {key: 'Escape'})
    await tick()
    expect(clears).toHaveLength(1)
    wrapper.unmount()
  })

  it('Escape with an empty value does not emit clear and does not preventDefault', async () => {
    const {wrapper, clears} = mountField({defaultValue: ''})
    await tick()
    const input = getInput()
    input.focus()
    const event = dispatchKey(input, 'keydown', {key: 'Escape'})
    await tick()
    expect(clears).toHaveLength(0)
    expect(event.defaultPrevented).toBe(false)
    wrapper.unmount()
  })

  it('Enter calls onSubmit when provided and prevents the default submit', async () => {
    const onSubmit = vi.fn()
    const {wrapper} = mountField({defaultValue: 'abc', onSubmit})
    await tick()
    const input = getInput()
    input.focus()
    const event = dispatchKey(input, 'keydown', {key: 'Enter'})
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('abc')
    expect(event.defaultPrevented).toBe(true)
    wrapper.unmount()
  })

  it('Enter without onSubmit keeps the native submit (no preventDefault)', async () => {
    const {wrapper} = mountField({defaultValue: 'abc'})
    await tick()
    const input = getInput()
    input.focus()
    const event = dispatchKey(input, 'keydown', {key: 'Enter'})
    await tick()
    expect(event.defaultPrevented).toBe(false)
    wrapper.unmount()
  })

  it('the clear button clears the value and emits clear', async () => {
    const {wrapper, changes, clears} = mountField({defaultValue: 'hello'})
    await tick()
    const input = getInput()
    expect(input.value).toBe('hello')
    await click(getButton())
    expect(input.value).toBe('')
    expect(getField().getAttribute('data-empty')).toBe('true')
    expect(clears).toHaveLength(1)
    expect(changes).toEqual([''])
    wrapper.unmount()
  })

  it('the clear button is disabled when the field is disabled or read-only', async () => {
    const first = mountField({isDisabled: true})
    await tick()
    expect(getButton().disabled).toBe(true)
    first.wrapper.unmount()
    document.body.replaceChildren()
    const second = mountField({isReadOnly: true})
    await tick()
    expect(getButton().disabled).toBe(true)
    second.wrapper.unmount()
  })

  it('isRequired + native validation (default) renders required, not aria-required', async () => {
    const {wrapper} = mountField({isRequired: true})
    await tick()
    const input = getInput()
    expect(input.hasAttribute('required')).toBe(true)
    expect(input.getAttribute('aria-required')).toBeNull()
    expect(getField().getAttribute('data-required')).toBe('true')
    wrapper.unmount()
  })

  it('isRequired + validationBehavior="aria" renders aria-required, not required', async () => {
    const {wrapper} = mountField({isRequired: true, validationBehavior: 'aria'})
    await tick()
    const input = getInput()
    expect(input.getAttribute('aria-required')).toBe('true')
    expect(input.hasAttribute('required')).toBe(false)
    wrapper.unmount()
  })

  it('native validity drives data-invalid on the outer element', async () => {
    const form = {el: null as HTMLFormElement | null}
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h('form', {ref: (el: any) => (form.el = el)}, [
              h(
                SearchField as any,
                {isRequired: true, defaultValue: ''},
                {
                  default: () => [h(Label as any, null, () => 'Test'), h(Input as any)],
                },
              ),
            ])
        },
      }),
    )
    await tick()
    const formEl = form.el!
    const input = getInput()
    expect(input.hasAttribute('required')).toBe(true)
    expect(input.validity.valid).toBe(false)
    expect(getField().hasAttribute('data-invalid')).toBe(false)
    formEl.checkValidity()
    await tick(3)
    expect(getField().getAttribute('data-invalid')).toBe('true')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    wrapper.unmount()
  })

  it('isInvalid renders aria-invalid on the input and data-invalid on the outer element', async () => {
    const {wrapper} = mountField({isInvalid: true})
    await tick()
    expect(getInput().getAttribute('aria-invalid')).toBe('true')
    expect(getField().getAttribute('data-invalid')).toBe('true')
    wrapper.unmount()
  })

  it('supports readonly and disabled state on the outer element', async () => {
    const readonly = mountField({isReadOnly: true})
    await tick()
    expect(getField().getAttribute('data-readonly')).toBe('true')
    expect(getInput().hasAttribute('readonly')).toBe(true)
    readonly.wrapper.unmount()
    document.body.replaceChildren()
    const disabled = mountField({isDisabled: true})
    await tick()
    expect(getField().getAttribute('data-disabled')).toBe('true')
    expect(getInput().hasAttribute('disabled')).toBe(true)
    disabled.wrapper.unmount()
  })

  it('provides a GroupContext with live invalid/disabled state and no presentation role', async () => {
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              SearchField as any,
              null,
              {default: () => [h(Group as any, null, () => 'inner')]},
            )
        },
      }),
    )
    await tick()
    const group = document.querySelector('.react-aria-Group') as HTMLElement
    expect(group.getAttribute('role')).toBe('group')
    wrapper.unmount()
  })

  it('clear button pressStart keeps focus on the input', async () => {
    const {wrapper} = mountField({defaultValue: 'hello'})
    await tick()
    const input = getInput()
    input.focus()
    expect(document.activeElement).toBe(input)
    await click(getButton())
    expect(document.activeElement).toBe(input)
    wrapper.unmount()
  })
})
