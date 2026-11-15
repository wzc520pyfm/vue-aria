import {defineComponent, h, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {I18nProvider} from '../../i18n/I18nProvider'
import {useSearchField} from '../useSearchField'
import {useSearchFieldState} from 'vue-stately/useSearchFieldState'

function mountSearch(props: any = {}, locale?: string) {
  let state: any
  let field: any
  const inputRef = ref<HTMLInputElement | null>(null)
  const Probe = defineComponent({
    setup() {
      state = useSearchFieldState({...props, onChange: props.onChange})
      field = useSearchField(
        {'aria-label': 'testLabel', ...props},
        state,
        inputRef,
      )
      return () =>
        h(
          'input',
          {
            ref: (el: any) => (inputRef.value = el),
          },
        )
    },
  })
  const wrapper = locale
    ? mount(defineComponent({
        components: {I18nProvider},
        setup() {
          return () => h(I18nProvider as any, {locale}, () => h(Probe))
        },
      }), {attachTo: document.body})
    : mount(Probe, {attachTo: document.body})
  return {wrapper, field: field!, state: state!, inputRef}
}

function keyEvent(key: string, opts: any = {}) {
  return {
    key,
    isComposing: false,
    repeat: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: {},
    ...opts,
  } as any
}

describe('useSearchField hook', () => {
  it('should return inputProps with type search and value equal to state.value', () => {
    const {wrapper, field, state} = mountSearch({})
    expect(field.inputProps.type).toBe('search')
    expect(field.inputProps.value).toBe(state.value)
    expect(typeof field.inputProps.onKeyDown).toBe('function')
    wrapper.unmount()
  })

  it('does not return a defaultValue prop', () => {
    const {wrapper, field} = mountSearch({defaultValue: 'ABC'})
    expect(field.inputProps.defaultValue).toBeUndefined()
    wrapper.unmount()
  })

  it('should support a custom type', () => {
    const {wrapper, field} = mountSearch({type: 'text'})
    expect(field.inputProps.type).toBe('text')
    wrapper.unmount()
  })

  it('pressing Enter calls preventDefault and onSubmit when onSubmit is provided', () => {
    const onSubmit = vi.fn()
    const {wrapper, field, state} = mountSearch({onSubmit})
    state.setValue('hello')
    const e = keyEvent('Enter')
    field.inputProps.onKeyDown(e)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('hello')
    expect(e.preventDefault).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('pressing Enter does not preventDefault when onSubmit is not provided', () => {
    const {wrapper, field, state} = mountSearch({})
    state.setValue('hello')
    const e = keyEvent('Enter')
    field.inputProps.onKeyDown(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('pressing Enter does not call onSubmit when isDisabled is true', () => {
    const onSubmit = vi.fn()
    const {wrapper, field} = mountSearch({isDisabled: true, onSubmit, onClear: vi.fn()})
    const e = keyEvent('Enter')
    field.inputProps.onKeyDown(e)
    expect(onSubmit).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('pressing Escape clears a non-empty value and calls onClear once', () => {
    const onClear = vi.fn()
    const {wrapper, field, state} = mountSearch({onClear})
    state.setValue('search')
    field.inputProps.onKeyDown(keyEvent('Escape'))
    expect(state.value).toBe('')
    expect(onClear).toHaveBeenCalledTimes(1)
    // pressing again with an empty value does nothing further
    field.inputProps.onKeyDown(keyEvent('Escape'))
    expect(state.value).toBe('')
    expect(onClear).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('pressing Escape with an empty value does not preventDefault', () => {
    const onClear = vi.fn()
    const {wrapper, field} = mountSearch({onClear})
    const e = keyEvent('Escape')
    field.inputProps.onKeyDown(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(onClear).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('pressing Escape with a non-empty value prevents default (clears)', () => {
    const onClear = vi.fn()
    const {wrapper, field, state} = mountSearch({onClear})
    state.setValue('x')
    const e = keyEvent('Escape')
    field.inputProps.onKeyDown(e)
    expect(e.preventDefault).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('user provided onKeyDown is called', () => {
    const onKeyDown = vi.fn()
    const {wrapper, field} = mountSearch({onKeyDown})
    field.inputProps.onKeyDown(keyEvent('Enter'))
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('clearButtonProps has a localized aria-label, excludeFromTabOrder and preventFocusOnPress', () => {
    const {wrapper, field} = mountSearch({}, 'en-US')
    expect(field.clearButtonProps['aria-label']).toBe('Clear search')
    expect(field.clearButtonProps.excludeFromTabOrder).toBe(true)
    expect(field.clearButtonProps.preventFocusOnPress).toBe(true)
    expect(field.clearButtonProps.isDisabled).toBe(false)
    wrapper.unmount()
  })

  it('clearButtonProps has a German aria-label under de-DE', () => {
    const {wrapper, field} = mountSearch({}, 'de-DE')
    expect(field.clearButtonProps['aria-label']).toBe('Suche zurücksetzen')
    wrapper.unmount()
  })

  it('clear button is disabled when the field is disabled or read-only', () => {
    for (const extra of [{isDisabled: true}, {isReadOnly: true}]) {
      const {wrapper, field} = mountSearch(extra)
      expect(field.clearButtonProps.isDisabled).toBe(true)
      wrapper.unmount()
    }
  })

  it('clear button onPressStart focuses the input, onPress clears and calls onClear', () => {
    const onClear = vi.fn()
    const {wrapper, field, state, inputRef} = mountSearch({onClear})
    state.setValue('hello')
    const focus = vi.spyOn(inputRef.value!, 'focus')
    field.clearButtonProps.onPressStart?.({} as any)
    expect(focus).toHaveBeenCalledTimes(1)
    field.clearButtonProps.onPress?.({} as any)
    expect(state.value).toBe('')
    expect(onClear).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
