import {describe, expect, it} from 'vitest'
import {behaviorAdapter} from '../adapter'

describe('behaviorAdapter', () => {
  it('identifies this implementation as vue-aria', () => {
    expect(behaviorAdapter.name).toBe('vue-aria')
  })
})
