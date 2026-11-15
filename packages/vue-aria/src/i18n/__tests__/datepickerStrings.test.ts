import {describe, expect, it} from 'vitest'
import {LocalizedStringDictionary, LocalizedStringFormatter} from '@internationalized/string'
import datepickerStrings from '../datepickerStrings'

const dict = new LocalizedStringDictionary(datepickerStrings as any)

describe('fmt', () => {
  it('interpolates', () => {
    const formatter = new LocalizedStringFormatter('en-US', dict as any)
    expect(formatter.format('selectedDateDescription', {date: 'March 3, 2024'})).toContain(
      'March 3, 2024',
    )
  })
})
