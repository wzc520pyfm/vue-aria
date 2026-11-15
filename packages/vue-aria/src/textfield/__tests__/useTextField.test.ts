import {defineComponent, h, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {useTextField} from '../useTextField'

function mountField(props: any = {}, element: 'input' | 'textarea' = 'input') {
  let field: any
  const inputRef = ref<any | null>(null)
  const Probe = defineComponent({
    setup() {
      field = useTextField(props, inputRef)
      return () => h(element, {ref: (el: any) => (inputRef.value = el)})
    },
  })
  const wrapper = mount(Probe, {attachTo: document.body})
  return {wrapper, field: field!, inputRef}
}

describe('useTextField hook', () => {
  it('with default textfield props if no props are provided', () => {
    const {wrapper, field} = mountField({'aria-label': 'mandatory label'})
    const props = field.inputProps
    expect(props.type).toBe('text')
    expect(props.disabled).toBeFalsy()
    expect(props.readOnly).toBeFalsy()
    expect(props['aria-invalid']).toBeUndefined()
    expect(props['aria-required']).toBeUndefined()
    expect(typeof props.onInput).toBe('function')
    expect(props.autoFocus).toBeFalsy()
    wrapper.unmount()
  })

  it('with appropriate props if type is defined', () => {
    const type = 'search'
    const {wrapper, field} = mountField({type, 'aria-label': 'mandatory label'})
    expect(field.inputProps.type).toBe(type)
    wrapper.unmount()
  })

  it('with appropriate props if isDisabled is defined', () => {
    let {wrapper, field} = mountField({isDisabled: true, 'aria-label': 'mandatory label'})
    expect(field.inputProps.disabled).toBe(true)
    wrapper.unmount()

    const second = mountField({isDisabled: false, 'aria-label': 'mandatory label'})
    expect(second.field.inputProps.disabled).toBeFalsy()
    second.wrapper.unmount()
  })

  it('with appropriate props if isRequired is defined (aria behavior by default)', () => {
    let {wrapper, field} = mountField({isRequired: true, 'aria-label': 'mandatory label'})
    expect(field.inputProps['aria-required']).toBe(true)
    expect(field.inputProps.required).toBeUndefined()
    wrapper.unmount()

    const second = mountField({isRequired: false, 'aria-label': 'mandatory label'})
    expect(second.field.inputProps['aria-required']).toBeUndefined()
    second.wrapper.unmount()
  })

  it('with appropriate props if isRequired is defined and validationBehavior is native', () => {
    const {wrapper, field} = mountField({
      isRequired: true,
      validationBehavior: 'native',
      'aria-label': 'mandatory label',
    })
    expect(field.inputProps.required).toBe(true)
    expect(field.inputProps['aria-required']).toBeUndefined()
    wrapper.unmount()
  })

  it('with appropriate props if isReadOnly is defined', () => {
    let {wrapper, field} = mountField({isReadOnly: true, 'aria-label': 'mandatory label'})
    expect(field.inputProps.readOnly).toBe(true)
    wrapper.unmount()

    const second = mountField({isReadOnly: false, 'aria-label': 'mandatory label'})
    expect(second.field.inputProps.readOnly).toBeFalsy()
    second.wrapper.unmount()
  })

  it('with appropriate props if validationState is defined', () => {
    let {wrapper, field} = mountField({validationState: 'invalid', 'aria-label': 'mandatory label'})
    expect(field.inputProps['aria-invalid']).toBe(true)
    wrapper.unmount()

    const second = mountField({validationState: 'valid', 'aria-label': 'mandatory label'})
    expect(second.field.inputProps['aria-invalid']).toBeUndefined()
    second.wrapper.unmount()
  })

  it('with appropriate props if isInvalid is defined', () => {
    let {wrapper, field} = mountField({isInvalid: true, 'aria-label': 'mandatory label'})
    expect(field.inputProps['aria-invalid']).toBe(true)
    expect(field.isInvalid).toBe(true)
    wrapper.unmount()

    const second = mountField({isInvalid: false, 'aria-label': 'mandatory label'})
    expect(second.field.inputProps['aria-invalid']).toBeUndefined()
    second.wrapper.unmount()
  })

  it('with appropriate props if autoCapitalize is defined', () => {
    let {wrapper, field} = mountField({autoCapitalize: 'on', 'aria-label': 'mandatory label'})
    expect(field.inputProps.autoCapitalize).toBe('on')
    wrapper.unmount()

    const second = mountField({autoCapitalize: 'off', 'aria-label': 'mandatory label'})
    expect(second.field.inputProps.autoCapitalize).toBe('off')
    second.wrapper.unmount()
  })

  it('with an onChange that calls user specified onChange with appropriate values', () => {
    const onChange = vi.fn()
    const {wrapper, field} = mountField({onChange, 'aria-label': 'mandatory label'})
    field.inputProps.onInput({target: {value: '1'}})
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('1')
    wrapper.unmount()
  })

  it('without type prop if inputElementType is textarea', () => {
    const pattern = 'pattern'
    const {wrapper, field} = mountField(
      {type: 'search', pattern, inputElementType: 'textarea', 'aria-label': 'mandatory label'},
      'textarea',
    )
    expect(field.inputProps.type).toBeUndefined()
    expect(field.inputProps.pattern).toBeUndefined()
    wrapper.unmount()
  })

  it('passes form, name, id, placeholder and enterKeyHint through', () => {
    const {wrapper, field} = mountField({
      form: 'testForm',
      name: 'testName',
      id: 'testId',
      placeholder: 'testPlaceholder',
      enterKeyHint: 'search',
      'aria-label': 'mandatory label',
    })
    expect(field.inputProps.form).toBe('testForm')
    expect(field.inputProps.name).toBe('testName')
    expect(field.inputProps.id).toBe('testId')
    expect(field.inputProps.placeholder).toBe('testPlaceholder')
    expect(field.inputProps.enterKeyHint).toBe('search')
    wrapper.unmount()
  })

  it('starts uncontrolled with defaultValue and updates its input value on input', () => {
    const onChange = vi.fn()
    const {wrapper, field} = mountField({defaultValue: 'initial', onChange, 'aria-label': 'mandatory label'})
    expect(field.inputProps.value).toBe('initial')
    field.inputProps.onInput({target: {value: 'typed'}})
    expect(onChange).toHaveBeenCalledWith('typed')
    expect(field.inputProps.value).toBe('typed')
    wrapper.unmount()
  })

  it('treats a supplied value as controlled and does not update internal state', () => {
    const onChange = vi.fn()
    const {wrapper, field} = mountField({value: 'controlled', onChange, 'aria-label': 'mandatory label'})
    expect(field.inputProps.value).toBe('controlled')
    field.inputProps.onInput({target: {value: 'typed'}})
    expect(onChange).toHaveBeenCalledWith('typed')
    // controlled: the visible value stays the prop value
    expect(field.inputProps.value).toBe('controlled')
    wrapper.unmount()
  })

  it('live getters re-read changed prop values instead of snapshotting at setup', () => {
    const isDisabled = ref(false)
    const isRequired = ref(false)
    const isInvalid = ref(false)
    const props = {
      isDisabled: () => isDisabled.value,
      isRequired: () => isRequired.value,
      isInvalid: () => isInvalid.value,
      'aria-label': 'mandatory label',
    }
    const {wrapper, field} = mountField(props)
    expect(field.inputProps.disabled).toBeFalsy()
    expect(field.inputProps['aria-invalid']).toBeUndefined()
    isDisabled.value = true
    isRequired.value = true
    isInvalid.value = true
    expect(field.inputProps.disabled).toBe(true)
    expect(field.inputProps['aria-required']).toBe(true)
    expect(field.inputProps['aria-invalid']).toBe(true)
    wrapper.unmount()
  })
})
