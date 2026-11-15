import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {useNumberField} from '../useNumberField'
import {useNumberFieldState} from 'vue-stately/useNumberFieldState'

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

function mountField(props: any = {}) {
  let state: any
  let field: any
  const inputRef = ref<HTMLInputElement | null>(null)
  const changes: number[] = []
  const Probe = defineComponent({
    setup() {
      state = useNumberFieldState({
        locale: 'en-US',
        ...props,
        onChange: (v: number) => {
          changes.push(v)
          props.onChange?.(v)
        },
      })
      field = useNumberField({...props, locale: 'en-US'}, state, inputRef)
      return () => h('input', {ref: (el: any) => (inputRef.value = el)})
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, state: state!, field: field!, inputRef, changes}
}

function fireInput(field: any, value: string) {
  const handler = field.inputProps.onInput || field.inputProps.onChange
  handler?.({target: {value}})
}

describe('useNumberField hook', () => {
  it('returns plain live-getter prop objects and default input semantics', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const {wrapper, field} = mountField({'aria-label': 'Width'})
    expect(typeof (field.inputProps.onInput || field.inputProps.onChange)).toBe('function')
    expect(field.inputProps.type).toBe('text')
    expect(field.inputProps.autoComplete).toBe('off')
    expect(field.inputProps.role).toBe(null)
    expect(field.inputProps['aria-valuenow']).toBe(null)
    expect(field.inputProps['aria-valuemin']).toBe(null)
    expect(field.inputProps['aria-valuemax']).toBe(null)
    expect(field.groupProps.role).toBe('group')
    expect(field.incrementButtonProps.excludeFromTabOrder).toBe(true)
    expect(field.decrementButtonProps.excludeFromTabOrder).toBe(true)
    warn.mockRestore()
    wrapper.unmount()
  })

  it('wires labels/description/error props', () => {
    const {wrapper, field} = mountField({
      label: 'Width',
      description: 'desc',
      errorMessage: 'err',
    })
    expect(field.labelProps).toBeTruthy()
    // label/description/error message props objects should exist; ids may be generated when elements are present
    expect(typeof field.descriptionProps).toBe('object')
    expect(typeof field.errorMessageProps).toBe('object')
    wrapper.unmount()
  })

  it('increment/decrement aria labels include field label by default', () => {
    const {wrapper, field} = mountField({label: 'Width'})
    expect(field.incrementButtonProps['aria-label']).toMatch(/Increase/i)
    expect(field.incrementButtonProps['aria-label']).toMatch(/Width/)
    expect(field.decrementButtonProps['aria-label']).toMatch(/Decrease/i)
    expect(field.decrementButtonProps['aria-label']).toMatch(/Width/)
    wrapper.unmount()
  })

  it('allows custom increment/decrement aria labels', () => {
    const {wrapper, field} = mountField({
      'aria-label': 'Width',
      incrementAriaLabel: 'Add one',
      decrementAriaLabel: 'Remove one',
    })
    expect(field.incrementButtonProps['aria-label']).toBe('Add one')
    expect(field.decrementButtonProps['aria-label']).toBe('Remove one')
    wrapper.unmount()
  })

  it('button isDisabled reflects canIncrement/canDecrement bounds', async () => {
    const {wrapper, state, field} = mountField({
      'aria-label': 'Width',
      defaultValue: 10,
      minValue: 0,
      maxValue: 10,
    })
    await tick()
    expect(state.canIncrement).toBe(false)
    expect(state.canDecrement).toBe(true)
    expect(field.incrementButtonProps.isDisabled).toBe(true)
    expect(field.decrementButtonProps.isDisabled).toBe(false)
    wrapper.unmount()
  })

  it('commits on blur via focus handler', async () => {
    const {wrapper, inputRef, changes, field} = mountField({
      'aria-label': 'Width',
      defaultValue: 1,
      commitBehavior: 'snap',
    })
    await tick()
    fireInput(field, '5')
    // blur through inputProps/focus props
    ;(field.inputProps.onBlur || field.inputProps.onblur)?.(new FocusEvent('blur', {relatedTarget: document.body}))
    await tick()
    expect(changes[changes.length - 1]).toBe(5)
    expect(inputRef.value).toBeTruthy()
    wrapper.unmount()
  })

  it('Enter commits', async () => {
    const {wrapper, field, changes} = mountField({
      'aria-label': 'Width',
      defaultValue: 1,
    })
    await tick()
    fireInput(field, '9')
    const onKeyDown = field.inputProps.onKeyDown || field.inputProps.onkeydown
    onKeyDown?.(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}))
    await tick()
    expect(changes[changes.length - 1]).toBe(9)
    wrapper.unmount()
  })

  it('isInvalid and validation fields are live getters', async () => {
    const validate = (v: number | null) => (v != null && v > 5 ? 'Too big' : true)
    const {wrapper, state, field} = mountField({
      'aria-label': 'Width',
      defaultValue: 1,
      validate,
    })
    expect(field.isInvalid).toBe(false)
    state.setInputValue('10')
    state.commit()
    await tick()
    expect(field.isInvalid).toBe(true)
    expect(field.validationErrors.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('does not put name on the visible input props', () => {
    const {wrapper, field} = mountField({label: 'Width', name: 'qty'})
    expect(field.inputProps.name).toBeUndefined()
    expect(field.inputProps.form).toBeUndefined()
    wrapper.unmount()
  })
})
