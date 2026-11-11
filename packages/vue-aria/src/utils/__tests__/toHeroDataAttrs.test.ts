import {describe, expect, it} from 'vitest'
import {dataAttr, dataAttrValue, toHeroDataAttrs} from 'vue-aria/toHeroDataAttrs'

describe('dataAttr', () => {
  it('returns "true" when the condition is true, otherwise omits the attribute', () => {
    expect(dataAttr(true)).toBe('true')
    expect(dataAttr(false)).toBeUndefined()
    expect(dataAttr(undefined)).toBeUndefined()
  })
})

describe('dataAttrValue', () => {
  it('stringifies values and omits empty ones', () => {
    expect(dataAttrValue('button')).toBe('button')
    expect(dataAttrValue(0)).toBe('0')
    expect(dataAttrValue('')).toBeUndefined()
    expect(dataAttrValue(null)).toBeUndefined()
    expect(dataAttrValue(undefined)).toBeUndefined()
  })
})

describe('toHeroDataAttrs', () => {
  it('omits flags that are false or missing', () => {
    expect(toHeroDataAttrs({})).toEqual({})
    expect(
      toHeroDataAttrs({
        pressed: false,
        hovered: false,
        selected: false,
        entering: false,
        exiting: false,
        invalid: false,
        placement: null,
        slot: '',
      }),
    ).toEqual({})
  })

  it('emits official true-valued attributes and string slots', () => {
    expect(
      toHeroDataAttrs({
        slot: 'button',
        pressed: true,
        hovered: true,
        focused: true,
        focusVisible: true,
        focusWithin: true,
        disabled: true,
        pending: true,
        selected: true,
        entering: true,
        exiting: true,
        invalid: true,
        placement: 'bottom',
      }),
    ).toEqual({
      'data-slot': 'button',
      'data-pressed': 'true',
      'data-hovered': 'true',
      'data-focused': 'true',
      'data-focus-visible': 'true',
      'data-focus-within': 'true',
      'data-disabled': 'true',
      'data-pending': 'true',
      'data-selected': 'true',
      'data-entering': 'true',
      'data-exiting': 'true',
      'data-invalid': 'true',
      'data-placement': 'bottom',
    })
  })
})
