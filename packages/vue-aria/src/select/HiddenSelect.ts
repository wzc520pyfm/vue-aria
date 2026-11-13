import {computed, defineComponent, h, onMounted, onBeforeUnmount, ref, watch, type PropType} from 'vue'
import type {Key} from 'vue-stately/useListState'
import type {SelectState} from 'vue-stately/useSelectState'
import {selectData} from './useSelect'

export interface AriaHiddenSelectProps {
  autoComplete?: string
  label?: unknown
  name?: string
  form?: string
  isDisabled?: boolean
}

export interface AriaHiddenSelectOptions extends AriaHiddenSelectProps {
  selectRef?: {value: HTMLSelectElement | HTMLInputElement | null}
}

export interface HiddenSelectProps<T = unknown, M extends 'single' | 'multiple' = 'single'> extends AriaHiddenSelectProps {
  state: SelectState<T, M>
  triggerRef: {value: Element | null | undefined}
  validationBehavior?: 'aria' | 'native'
  isRequired?: boolean
}

export interface HiddenSelectAria {
  containerProps: Record<string, any>
  inputProps: Record<string, any>
  selectProps: Record<string, any>
}

export function useHiddenSelect<T, M extends 'single' | 'multiple' = 'single'>(
  props: AriaHiddenSelectOptions,
  state: SelectState<T, M>,
  triggerRef: {value: Element | null | undefined},
): HiddenSelectAria {
  const data = selectData.get(state as object) || {}
  const autoComplete = props.autoComplete ?? data.autoComplete
  const name = props.name ?? data.name
  const form = props.form ?? data.form
  const isDisabled = props.isDisabled ?? data.isDisabled
  const validationBehavior = (props as any).validationBehavior ?? data.validationBehavior ?? 'aria'
  const isRequired = (props as any).isRequired ?? data.isRequired

  const containerProps: Record<string, any> = {
    'aria-hidden': true,
    'data-a11y-ignore': 'aria-hidden-focus',
    'data-react-aria-prevent-focus': 'true',
    style: {
      border: 0,
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      height: '1px',
      margin: '-1px',
      overflow: 'hidden',
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      width: '1px',
      whiteSpace: 'nowrap',
    },
  }

  const selectProps: Record<string, any> = {
    tabIndex: -1,
    autoComplete,
    disabled: !!isDisabled,
    name,
    form,
  }
  Object.defineProperties(selectProps, {
    multiple: {get: () => state.selectionManager.selectionMode === 'multiple', enumerable: true},
    required: {get: () => validationBehavior === 'native' && !!isRequired, enumerable: true},
    value: {
      get: () => {
        const v = state.value.value as any
        if (Array.isArray(v)) return v.map((x) => (x == null ? '' : String(x)))
        return v == null ? '' : String(v)
      },
      enumerable: true,
    },
  })

  const inputProps: Record<string, any> = {style: {display: 'none'}}

  return {containerProps, inputProps, selectProps}
}

export const HiddenSelect = defineComponent({
  name: 'HiddenSelect',
  props: {
    state: {type: Object as PropType<SelectState<any, any>>, required: true},
    triggerRef: {type: Object as PropType<{value: Element | null | undefined}>, required: true},
    label: {type: null, default: undefined},
    name: {type: String, default: undefined},
    form: {type: String, default: undefined},
    isDisabled: {type: Boolean, default: undefined},
    isRequired: {type: Boolean, default: undefined},
    autoComplete: {type: String, default: undefined},
    validationBehavior: {type: String as PropType<'aria' | 'native' | undefined>, default: undefined},
  },
  setup(props) {
    const selectRef = ref<HTMLSelectElement | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)

    const data = computed(() => selectData.get(props.state as object) || {})
    const name = computed(() => props.name ?? data.value.name)
    const form = computed(() => props.form ?? data.value.form)
    const isDisabled = computed(() => props.isDisabled ?? data.value.isDisabled ?? false)
    const isRequired = computed(() => props.isRequired ?? data.value.isRequired ?? false)
    const validationBehavior = computed(() => (props.validationBehavior ?? data.value.validationBehavior ?? 'aria') as 'aria' | 'native')
    const autoComplete = computed(() => props.autoComplete ?? data.value.autoComplete)
    const label = computed(() => props.label ?? data.value.label)

    const values = computed<(Key | null)[]>(() => {
      const v = props.state.value.value as any
      return Array.isArray(v) ? v : [v ?? null]
    })

    const onNativeChange = (e: Event) => {
      const target = e.target as HTMLSelectElement | HTMLInputElement
      if ((target as HTMLSelectElement).multiple) {
        const opts = Array.from((target as HTMLSelectElement).selectedOptions || [])
        props.state.setValue(opts.map(o => o.value) as any)
      } else {
        const val = target.value
        props.state.setValue(val === '' ? null : (val as any))
      }
    }

    // Form reset: restore default/initial value.
    let formEl: HTMLFormElement | null = null
    const onReset = () => {
      const initial = (props.state as any)._initialValue ?? props.state.defaultValue
      props.state.setValue(initial as any)
    }
    onMounted(() => {
      const el = selectRef.value || inputRef.value
      if (!el) return
      formEl = (el as any).form || (form.value ? (document.getElementById(form.value) as HTMLFormElement | null) : null)
      formEl?.addEventListener('reset', onReset)
    })
    onBeforeUnmount(() => {
      formEl?.removeEventListener('reset', onReset)
    })

    return () => {
      const collectionSize = props.state.collection.value.size
      const isMultiple = props.state.selectionManager.selectionMode === 'multiple'

      // <= 300: native select for autofill.
      if (collectionSize <= 300) {
        const currentKeys = values.value.map(v => (v == null ? '' : String(v)))
        const contains = (k: string) => currentKeys.includes(k)
        const emptySelected = !isMultiple && currentKeys.every(k => k === '')
        const options: any[] = [
          h('option', {value: '', label: '\u00A0', selected: emptySelected}, '\u00A0'),
        ]
        for (const key of props.state.collection.value.getKeys()) {
          const item = props.state.collection.value.getItem(key)
          if (item && item.type === 'item') {
            options.push(h('option', {key: String(item.key), value: String(item.key), selected: contains(String(item.key))}, item.textValue ?? String(item.key)))
          }
        }
        if (collectionSize === 0 && name.value) {
          values.value.forEach((v, i) => {
            options.push(h('option', {key: `val-${i}`, value: v == null ? '' : String(v), selected: true}))
          })
        }
        return h(
          'div',
          {
            'data-testid': 'hidden-select-container',
            'data-a11y-ignore': 'aria-hidden-focus',
            'aria-hidden': true,
            'data-react-aria-prevent-focus': 'true',
            style: {
              border: 0,
              clip: 'rect(0 0 0 0)',
              clipPath: 'inset(50%)',
              height: '1px',
              margin: '-1px',
              overflow: 'hidden',
              padding: 0,
              position: 'fixed',
              top: 0,
              left: 0,
              width: '1px',
              whiteSpace: 'nowrap',
            },
          },
          [
            h('label', {}, [
              label.value as any,
              h('select', {
                ref: selectRef,
                tabIndex: -1,
                autoComplete: autoComplete.value,
                disabled: isDisabled.value,
                multiple: isMultiple,
                required: validationBehavior.value === 'native' && isRequired.value,
                name: name.value,
                form: form.value,
                onChange: onNativeChange,
                onInput: onNativeChange,
              }, options),
            ]),
          ],
        )
      }

      // > 300 with name: hidden inputs.
      if (name.value) {
        const vals = values.value.length === 0 ? [null] : values.value
        return vals.map((v, i) => {
          const common = {
            autoComplete: autoComplete.value,
            name: name.value,
            form: form.value,
            disabled: isDisabled.value,
            value: v == null ? '' : String(v),
            onChange: () => {},
          }
          if (validationBehavior.value === 'native') {
            return h('input', {
              key: i,
              ...common,
              ref: i === 0 ? inputRef : undefined,
              style: {display: 'none'},
              type: 'text',
              required: i === 0 && isRequired.value,
              tabIndex: -1,
            })
          }
          return h('input', {
            key: i,
            ...common,
            ref: i === 0 ? inputRef : undefined,
            type: 'hidden',
          })
        })
      }

      return null
    }
  },
})
