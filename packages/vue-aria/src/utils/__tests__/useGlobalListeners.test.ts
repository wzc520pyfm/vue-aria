import {defineComponent} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it, vi} from 'vitest'
import {useGlobalListeners} from '../useGlobalListeners'

describe('useGlobalListeners', () => {
  it('removes every record that shares a callback when target, type, and options differ', () => {
    let api: ReturnType<typeof useGlobalListeners> | undefined
    const wrapper = mount(
      defineComponent({
        setup() {
          api = useGlobalListeners()
          return () => null
        },
      }),
    )
    const fn = vi.fn()
    const target = document.createElement('div')
    api!.addGlobalListener(window, 'mouseup', fn, false)
    api!.addGlobalListener(window, 'touchend', fn, false)
    api!.addGlobalListener(window, 'pointerup', fn, false)
    api!.addGlobalListener(target, 'pointerup', fn, true)

    api!.removeGlobalListener(window, 'mouseup', fn, false)
    window.dispatchEvent(new Event('mouseup'))
    window.dispatchEvent(new Event('touchend'))
    window.dispatchEvent(new Event('pointerup'))
    target.dispatchEvent(new Event('pointerup'))
    expect(fn).toHaveBeenCalledTimes(3)

    api!.removeGlobalListener(window, 'touchend', fn, false)
    api!.removeGlobalListener(window, 'pointerup', fn, false)
    api!.removeGlobalListener(target, 'pointerup', fn, true)
    fn.mockClear()
    window.dispatchEvent(new Event('touchend'))
    window.dispatchEvent(new Event('pointerup'))
    target.dispatchEvent(new Event('pointerup'))
    expect(fn).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
