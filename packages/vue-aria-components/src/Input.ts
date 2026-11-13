/*
 * Port of `react-aria-components@1.22.1` `Input`
 * (`packages/react-aria-components/src/Input.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue: consumes `InputContext` fully, emits Hero UI data-* locally
 * (`data-hovered` / `data-focused` / `data-focus-visible` / `data-disabled` /
 * `data-invalid`), and the official `react-aria-Input` class.
 */

import {defineComponent, h, inject, mergeProps as vueMergeProps, type PropType} from 'vue'
import {mergeProps, useFocusVisible, useHover} from 'vue-aria'
import {InputContextKey} from './context'

export interface InputRenderProps {
  isHovered: boolean
  isFocused: boolean
  isFocusVisible: boolean
  isDisabled: boolean
  isInvalid: boolean
}

export interface InputProps {
  placeholder?: string
  autoFocus?: boolean
  className?: string
  'data-slot'?: string
}

const boolAttr = (v: unknown): boolean => v === true || v === 'true' || v === '' || v === 1

export const Input = defineComponent({
  name: 'Input',
  inheritAttrs: false,
  props: {
    placeholder: {type: String, default: undefined},
    autoFocus: {type: Boolean, default: undefined},
    'data-slot': {type: String, default: undefined},
  },
  setup(props, {slots, attrs}) {
    const ctx = inject(InputContextKey, undefined) as Record<string, any> | undefined

    const {hoverProps, isHovered} = useHover({
      isDisabled: () => boolAttr((ctx as any)?.disabled ?? (ctx as any)?.isDisabled),
    })
    const {isFocused, isFocusVisible, focusProps} = useFocusVisible({
      isDisabled: () => boolAttr((ctx as any)?.disabled ?? (ctx as any)?.isDisabled),
    })

    return () => {
      const c = (ctx ?? {}) as Record<string, any>
      const attrsAny = attrs as Record<string, any>
      // Official useContextProps: the component's own props win over context.
      const pickLocal = (key: string) => (attrsAny[key] !== undefined ? attrsAny[key] : props[key as keyof typeof props] !== undefined ? props[key as keyof typeof props] : c[key])
      const isDisabled = boolAttr(pickLocal('disabled') ?? pickLocal('isDisabled'))
      const ariaInvalid = pickLocal('aria-invalid')
      const isInvalid = ariaInvalid != null && ariaInvalid !== false && ariaInvalid !== 'false'

      const ctxAttrs: Record<string, any> = {}
      // Forward the full InputContext: value, handlers, ARIA, name/form,
      // autoComplete/autoCorrect/spellCheck, required, disabled and readOnly.
      for (const key of [
        'id',
        'name',
        'form',
        'type',
        'pattern',
        'autoComplete',
        'autoCapitalize',
        'autoCorrect',
        'spellCheck',
        'enterKeyHint',
        'maxLength',
        'minLength',
        'inputMode',
        'placeholder',
        'autoFocus',
        'required',
        'disabled',
        'readOnly',
        'role',
        'value',
        'aria-label',
        'aria-labelledby',
        'aria-describedby',
        'aria-errormessage',
        'aria-activedescendant',
        'aria-autocomplete',
        'aria-haspopup',
        'aria-controls',
        'aria-expanded',
        'onInput',
        'onChange',
        'onKeyDown',
        'onKeydown',
        'onKeyUp',
        'onKeyup',
        'onFocus',
        'onBlur',
        'onCopy',
        'onCut',
        'onPaste',
        'onSelect',
        'onBeforeInput',
        'onCompositionEnd',
        'onCompositionStart',
        'onCompositionUpdate',
      ]) {
        if (c[key] !== undefined) ctxAttrs[key] = c[key]
      }
      // Local props (attrs / declared props) win over context, handlers chain.
      for (const key of ['placeholder', 'autoFocus', 'type', 'maxLength', 'minLength', 'required', 'disabled', 'readOnly'] as const) {
        const local = attrsAny[key] ?? props[key as keyof typeof props]
        if (local !== undefined) ctxAttrs[key] = local
      }

      const refValue = c.ref
      const domProps = mergeProps(
        ctxAttrs,
        attrsAny,
        focusProps,
        hoverProps,
        {
          // Context ref wins for the field's input element.
          ...(refValue
            ? {
                ref: (el: HTMLInputElement | null) => {
                  if (typeof refValue === 'function') refValue(el)
                  else if (refValue && typeof refValue === 'object' && 'value' in refValue) refValue.value = el
                },
              }
            : {}),
          class: ['react-aria-Input', attrsAny.class].filter(Boolean),
          'data-hovered': isHovered.value ? 'true' : undefined,
          'data-focused': isFocused.value ? 'true' : undefined,
          'data-focus-visible': isFocusVisible.value ? 'true' : undefined,
          'data-disabled': isDisabled ? 'true' : undefined,
          'data-invalid': isInvalid ? 'true' : undefined,
          ...(props['data-slot'] ?? attrsAny['data-slot'] ? {'data-slot': props['data-slot'] ?? attrsAny['data-slot']} : {'data-slot': 'input'}),
        },
      )
      return h('input', domProps)
    }
  },
})

export {InputContextKey as InputContext}
