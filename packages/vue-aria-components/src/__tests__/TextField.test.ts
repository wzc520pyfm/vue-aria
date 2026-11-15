import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchPointer} from '../../../../test/dom-events'
import {
  Group,
  Input,
  Label,
  Text,
  TextArea,
  TextField,
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

function fieldSlots(input: any, extra: any = {}) {
  return () => [
    h(Label as any, null, () => 'Test'),
    h(input as any, null),
    h(Text as any, {slot: 'description'}, () => 'Description'),
    h(Text as any, {slot: 'errorMessage'}, () => 'Error'),
    ...(extra.children ?? []),
  ]
}

describe.each([
  {name: 'Input', component: Input},
  {name: 'TextArea', component: TextArea},
])('TextField ($name)', ({name, component}) => {
  function mountField(props: any = {}, children: any = fieldSlots(component)) {
    const changes: string[] = []
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              TextField as any,
              {
                'data-testid': 'text-field-test',
                'data-foo': 'bar',
                defaultValue: 'test',
                ...props,
                onChange: (v: string) => {
                  changes.push(v)
                  props.onChange?.(v)
                },
              },
              children,
            )
        },
      }),
    )
    return {wrapper, changes}
  }

  function getField(): HTMLElement {
    return document.querySelector('.react-aria-TextField') as HTMLElement
  }

  function getTextBox(): HTMLTextAreaElement | HTMLInputElement {
    return document.querySelector('.react-aria-TextField input, .react-aria-TextField textarea') as any
  }

  it('provides slots: value, class, aria-labelledby/describedby wiring', async () => {
    const {wrapper} = mountField()
    await tick()
    const input = getTextBox()
    expect(input).toBeTruthy()
    expect(input.value).toBe('test')
    expect(input.className).toContain(`react-aria-${name}`)
    if (name === 'Input') {
      expect(input.getAttribute('type')).toBe('text')
    } else {
      expect(input.getAttribute('type')).toBeNull()
      expect(input.getAttribute('pattern')).toBeNull()
    }

    expect(getField().getAttribute('data-foo')).toBe('bar')
    expect(getField().getAttribute('data-testid')).toBe('text-field-test')

    const labelledBy = input.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const label = document.getElementById(labelledBy!)
    expect(label).toBeTruthy()
    expect(label!.className).toContain('react-aria-Label')
    expect(label!.textContent).toBe('Test')

    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const described = describedBy!.split(' ').map((id) => document.getElementById(id)!.textContent)
    expect(described.join(' ')).toBe('Description Error')
    wrapper.unmount()
  })

  it('renders custom data-* attributes only on the outer element', async () => {
    const {wrapper} = mountField()
    await tick()
    expect(getField().getAttribute('data-foo')).toBe('bar')
    expect(getTextBox().hasAttribute('data-foo')).toBe(false)
    wrapper.unmount()
  })

  it('id prop is rendered only on the input; htmlFor links the label', async () => {
    const {wrapper} = mountField({id: 'name'})
    await tick()
    const outer = getField()
    const input = getTextBox()
    expect(outer.getAttribute('id')).toBeNull()
    expect(input.getAttribute('id')).toBe('name')
    const label = document.querySelector('.react-aria-Label') as HTMLElement
    expect(label.getAttribute('for')).toBe('name')
    wrapper.unmount()
  })

  it('supports form and name props on the input only', async () => {
    const {wrapper} = mountField({form: 'test', name: 'test-name'})
    await tick()
    const input = getTextBox()
    expect(input.getAttribute('form')).toBe('test')
    expect(input.getAttribute('name')).toBe('test-name')
    expect(getField().getAttribute('form')).toBeNull()
    expect(getField().getAttribute('name')).toBeNull()
    wrapper.unmount()
  })

  it('controlled and uncontrolled values; typing emits a lowercase change event', async () => {
    const {wrapper, changes} = mountField()
    await tick()
    const input = getTextBox()
    input.focus()
    input.value = 'typed'
    input.dispatchEvent(new Event('input', {bubbles: true}))
    await tick()
    expect(changes).toEqual(['typed'])
    expect(input.value).toBe('typed')
    wrapper.unmount()
  })

  it('supports controlled value updates', async () => {
    const value = ref('a')
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              TextField as any,
              {value: value.value},
              {default: () => h(component as any)},
            )
        },
      }),
    )
    await tick()
    const input = getTextBox()
    expect(input.value).toBe('a')
    value.value = 'b'
    await tick()
    expect(input.value).toBe('b')
    wrapper.unmount()
  })

  it('isRequired + native validation (default) renders required, not aria-required', async () => {
    const {wrapper} = mountField({isRequired: true})
    await tick()
    const input = getTextBox()
    expect(input.hasAttribute('required')).toBe(true)
    expect(input.getAttribute('aria-required')).toBeNull()
    expect(getField().getAttribute('data-required')).toBe('true')
    wrapper.unmount()
  })

  it('isRequired + validationBehavior="aria" renders aria-required, not required', async () => {
    const {wrapper} = mountField({isRequired: true, validationBehavior: 'aria'})
    await tick()
    const input = getTextBox()
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
                TextField as any,
                {isRequired: true},
                {
                  default: () => [h(Label as any, null, () => 'Test'), h(component as any)],
                },
              ),
            ])
        },
      }),
    )
    await tick()
    const formEl = form.el!
    const input = getTextBox()
    expect(input.hasAttribute('required')).toBe(true)
    expect(input.validity.valid).toBe(false)
    expect(getField().hasAttribute('data-invalid')).toBe(false)
    formEl.checkValidity()
    await tick(3)
    expect(getField().getAttribute('data-invalid')).toBe('true')
    input.value = 'Devon'
    input.dispatchEvent(new Event('input', {bubbles: true}))
    await tick()
    expect(input.validity.valid).toBe(true)
    wrapper.unmount()
  })

  it('isInvalid renders aria-invalid on the input and data-invalid on the outer element', async () => {
    const {wrapper} = mountField({isInvalid: true})
    await tick()
    expect(getTextBox().getAttribute('aria-invalid')).toBe('true')
    expect(getField().getAttribute('data-invalid')).toBe('true')
    wrapper.unmount()
  })

  it('data-invalid is omitted (not "false") when valid', async () => {
    const {wrapper} = mountField({})
    await tick()
    expect(getField().hasAttribute('data-invalid')).toBe(false)
    wrapper.unmount()
  })

  it('supports readonly state', async () => {
    const {wrapper} = mountField({})
    await tick()
    expect(getField().hasAttribute('data-readonly')).toBe(false)
    wrapper.unmount()
    document.body.replaceChildren()
    const readonly = mountField({isReadOnly: true})
    await tick()
    expect(getField().getAttribute('data-readonly')).toBe('true')
    expect(getTextBox().hasAttribute('readonly')).toBe(true)
    readonly.wrapper.unmount()
  })

  it('supports disabled state', async () => {
    const {wrapper} = mountField({isDisabled: true})
    await tick()
    expect(getField().getAttribute('data-disabled')).toBe('true')
    expect(getTextBox().hasAttribute('disabled')).toBe(true)
    wrapper.unmount()
  })

  it('isRequired renders data-required=true and required on the native input', async () => {
    const {wrapper} = mountField({isRequired: true})
    await tick()
    expect(getField().getAttribute('data-required')).toBe('true')
    expect(getTextBox().hasAttribute('required')).toBe(true)
    wrapper.unmount()
  })

  it('Input/TextArea output hover and focus data-* attributes', async () => {
    const {wrapper} = mountField()
    await tick()
    const input = getTextBox()
    expect(input.hasAttribute('data-hovered')).toBe(false)
    dispatchPointer(input, 'pointerenter')
    await tick()
    expect(input.getAttribute('data-hovered')).toBe('true')
    input.focus()
    await tick()
    expect(input.getAttribute('data-focused')).toBe('true')
    wrapper.unmount()
  })

  it('provides a presentation GroupContext to composed groups', async () => {
    const wrapper = mountInDoc(
      defineComponent({
        setup() {
          return () =>
            h(
              TextField as any,
              null,
              {default: () => [h(Group as any, null, () => 'inner')]},
            )
        },
      }),
    )
    await tick()
    expect(document.querySelector('.react-aria-Group')?.getAttribute('role')).toBe('presentation')
    wrapper.unmount()
  })
})
