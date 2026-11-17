import {defineComponent, h, isRef, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {I18nProvider} from '../../i18n/I18nProvider'
import {useToolbar, type AriaToolbarProps, type ToolbarAria} from '../useToolbar'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function press(target: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

function mountHook(
  props: AriaToolbarProps = {'aria-label': 'Tools'},
  children?: () => any,
  locale?: {value: string},
) {
  const root = ref<HTMLElement | null>(null)
  const roles: string[] = []
  let aria!: ToolbarAria
  const Inner = defineComponent({
    name: 'ToolbarHookProbe',
    setup() {
      aria = useToolbar(props, root)
      return () => {
        roles.push(aria.toolbarProps.role)
        const bag = {
          ref: root,
          role: aria.toolbarProps.role,
          'aria-orientation': aria.toolbarProps['aria-orientation'],
          'aria-label': aria.toolbarProps['aria-label'],
          'aria-labelledby': aria.toolbarProps['aria-labelledby'],
          'aria-describedby': aria.toolbarProps['aria-describedby'],
          'aria-details': aria.toolbarProps['aria-details'],
          id: aria.toolbarProps.id,
          'data-tools': aria.toolbarProps['data-tools'],
          onKeydownCapture: aria.toolbarProps.onKeydownCapture,
          onFocusCapture: aria.toolbarProps.onFocusCapture,
          onBlurCapture: aria.toolbarProps.onBlurCapture,
        }
        return h('div', bag, children ? children() : [
          h('button', {type: 'button'}, 'One'),
          h('button', {type: 'button'}, 'Two'),
          h('button', {type: 'button'}, 'Three'),
        ])
      }
    },
  })
  const wrapper = mount(defineComponent({
    setup() {
      if (!locale) return () => h(Inner)
      return () => h(I18nProvider, {locale: locale.value}, {default: () => h(Inner)})
    },
  }), {attachTo: document.body})
  const buttons = () => [...root.value!.querySelectorAll('button')] as HTMLButtonElement[]
  return {wrapper, root, roles, get aria() { return aria }, buttons}
}

describe('useToolbar', () => {
  it('exposes a plain live toolbar prop bag and drops labelledby when aria-label is non-null', async () => {
    const label = ref<string | null | undefined>('Tools')
    const labelledBy = ref('tools-label')
    const describedBy = ref('tools-desc')
    const details = ref('tools-details')
    const orientation = ref<'horizontal' | 'vertical' | undefined>(undefined)
    const props: AriaToolbarProps = {
      orientation: () => orientation.value,
      'aria-label': () => label.value,
      'aria-labelledby': () => labelledBy.value,
      'aria-describedby': () => describedBy.value,
      'aria-details': () => details.value,
      id: 'toolbar-id',
      'data-tools': 'yes',
    }
    const {aria, wrapper, root} = mountHook(props)
    expect(isRef(aria.toolbarProps)).toBe(false)
    expect(root.value!.getAttribute('role')).toBe('toolbar')
    expect(root.value!.getAttribute('aria-orientation')).toBe('horizontal')
    expect(root.value!.getAttribute('aria-label')).toBe('Tools')
    expect(root.value!.hasAttribute('aria-labelledby')).toBe(false)
    expect(root.value!.getAttribute('aria-describedby')).toBe('tools-desc')
    expect(root.value!.getAttribute('aria-details')).toBe('tools-details')
    expect(root.value!.id).toBe('toolbar-id')
    expect(root.value!.getAttribute('data-tools')).toBe('yes')
    expect(root.value!.hasAttribute('tabindex')).toBe(false)

    label.value = ''
    await nextTick()
    expect(aria.toolbarProps['aria-label']).toBe('')
    expect(aria.toolbarProps['aria-labelledby']).toBeUndefined()

    label.value = null
    describedBy.value = 'next-desc'
    orientation.value = 'vertical'
    await nextTick()
    expect(root.value!.hasAttribute('aria-label')).toBe(false)
    expect(root.value!.getAttribute('aria-labelledby')).toBe('tools-label')
    expect(root.value!.getAttribute('aria-describedby')).toBe('next-desc')
    expect(root.value!.getAttribute('aria-orientation')).toBe('vertical')
    wrapper.unmount()
  })

  it('moves with arrows in capture before the child, without wrap, Home, End, or roving tabindex', async () => {
    const seen: string[] = []
    const {wrapper, root, buttons} = mountHook({'aria-label': 'Tools'}, () => [
      h('button', {type: 'button', onKeydown: () => seen.push('one')}, 'One'),
      h('button', {type: 'button', tabindex: -1, onKeydown: () => seen.push('two')}, 'Two'),
      h('button', {type: 'button', onKeydown: () => seen.push('three')}, 'Three'),
    ])
    const [one, two, three] = buttons()
    one.focus()
    const right = press(one, 'ArrowRight')
    expect(right.defaultPrevented).toBe(true)
    expect(seen).toEqual([])
    expect(document.activeElement).toBe(two)
    expect(two.getAttribute('tabindex')).toBe('-1')
    expect(one.getAttribute('tabindex')).toBeNull()
    expect(root.value!.hasAttribute('tabindex')).toBe(false)

    press(two, 'ArrowRight')
    expect(document.activeElement).toBe(three)
    const end = press(three, 'ArrowRight')
    expect(end.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(three)

    press(three, 'ArrowLeft')
    expect(document.activeElement).toBe(two)
    press(two, 'ArrowLeft')
    press(one, 'ArrowLeft')
    expect(document.activeElement).toBe(one)

    const down = press(one, 'ArrowDown')
    const home = press(one, 'Home')
    const endKey = press(one, 'End')
    expect(down.defaultPrevented).toBe(false)
    expect(home.defaultPrevented).toBe(false)
    expect(endKey.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(one)
    expect(seen).toEqual(['one', 'one', 'one'])
    wrapper.unmount()
  })

  it('uses vertical arrows and reverses only horizontal RTL, including a live locale and orientation change', async () => {
    const locale = ref('en-US')
    const orientation = ref<'horizontal' | 'vertical'>('horizontal')
    const {wrapper, buttons} = mountHook({
      'aria-label': 'Tools',
      orientation: () => orientation.value,
    }, undefined, locale)
    const [one, two] = buttons()
    one.focus()
    press(one, 'ArrowLeft')
    expect(document.activeElement).toBe(one)
    press(one, 'ArrowRight')
    expect(document.activeElement).toBe(two)

    locale.value = 'he-IL'
    await nextTick()
    one.focus()
    press(one, 'ArrowLeft')
    expect(document.activeElement).toBe(two)
    press(two, 'ArrowRight')
    expect(document.activeElement).toBe(one)
    const downRtl = press(one, 'ArrowDown')
    expect(downRtl.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(one)

    orientation.value = 'vertical'
    await nextTick()
    one.focus()
    press(one, 'ArrowLeft')
    expect(document.activeElement).toBe(one)
    const down = press(one, 'ArrowDown')
    expect(down.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(two)
    press(two, 'ArrowUp')
    expect(document.activeElement).toBe(one)
    wrapper.unmount()
  })

  it('records Tab focus without cancelling it and restores only external reentry', async () => {
    const {wrapper, root} = mountHook({'aria-label': 'Tools'}, () => [
      h('button', {type: 'button'}, 'One'),
      h('button', {type: 'button'}, 'Two'),
      h('button', {type: 'button'}, 'Three'),
    ])
    const bar = root.value!
    const one = bar.querySelector('button')!
    const buttons = [...bar.querySelectorAll('button')]
    const two = buttons[1]
    const three = buttons[2]
    const outside = document.createElement('button')
    outside.type = 'button'
    outside.textContent = 'Before'
    document.body.appendChild(outside)

    two.focus()
    const tab = press(two, 'Tab')
    expect(tab.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(three)

    outside.focus()
    expect(document.activeElement).toBe(outside)
    one.focus()
    expect(document.activeElement).toBe(two)

    two.focus()
    press(two, 'ArrowRight')
    expect(document.activeElement).toBe(three)
    outside.focus()
    one.focus()
    expect(document.activeElement).toBe(three)

    three.focus()
    const shift = press(three, 'Tab', {shiftKey: true})
    expect(shift.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(one)
    outside.focus()
    three.focus()
    expect(document.activeElement).toBe(three)

    two.focus()
    outside.focus()
    two.remove()
    one.focus()
    expect(document.activeElement).toBe(one)
    expect(two.isConnected).toBe(false)
    wrapper.unmount()
  })

  it('skips disabled, hidden, css-hidden, inert, prevent-focus, and closed details, including tabindex=-1', async () => {
    const {wrapper, root} = mountHook({'aria-label': 'Tools'}, () => [
      h('button', {type: 'button'}, 'A'),
      h('button', {type: 'button', disabled: true}, 'Disabled'),
      h('div', {tabindex: -1, id: 'neg'}, 'Neg'),
      h('button', {type: 'button', hidden: true}, 'Hidden'),
      h('button', {type: 'button', style: 'display: none'}, 'Display'),
      h('button', {type: 'button', style: 'visibility: hidden'}, 'Visibility'),
      h('details', [h('summary', 'Sum'), h('button', {type: 'button', id: 'inside'}, 'Inside')]),
      h('div', {inert: true}, [h('button', {type: 'button'}, 'Inert')]),
      h('div', {'data-react-aria-prevent-focus': 'true'}, [h('button', {type: 'button'}, 'Prevent')]),
      h('input', {type: 'text', 'aria-label': 'Text'}),
      h('input', {type: 'hidden'}),
      h('input', {disabled: true, 'aria-label': 'Off'}),
      h('select', {'aria-label': 'Select'}, [h('option', 'A')]),
      h('textarea', {'aria-label': 'Area'}),
      h('a', {href: '#help'}, 'Help'),
      h('a', 'No href'),
      h('button', {type: 'button', tabindex: -1, id: 'minus'}, 'Minus'),
    ])
    const bar = root.value!
    const sequence = [
      'A',
      'Neg',
      'Sum',
      'Text',
      'Select',
      'Area',
      'Help',
      'Minus',
    ]
    const currentName = () => {
      const el = document.activeElement as HTMLElement
      return el.getAttribute('aria-label') || el.textContent || el.id
    }
    ;(bar.querySelector('button') as HTMLButtonElement).focus()
    expect(currentName()).toBe('A')
    for (const name of sequence.slice(1)) {
      press(document.activeElement!, 'ArrowRight')
      expect(currentName()).toBe(name)
    }
    press(document.activeElement!, 'ArrowRight')
    expect(currentName()).toBe('Minus')

    const details = bar.querySelector('details')!
    details.open = true
    ;(bar.querySelector('summary') as HTMLElement).focus()
    press(document.activeElement!, 'ArrowRight')
    expect((document.activeElement as HTMLElement).id).toBe('inside')
    wrapper.unmount()
  })

  it('updates nested role from the ancestor and ignores events from a replaced root', async () => {
    const ancestorRole = ref('toolbar')
    const which = ref<'a' | 'b'>('a')
    const root = ref<HTMLElement | null>(null)
    const roles: string[] = []
    let aria!: ToolbarAria
    const wrapper = mount(defineComponent({
      setup() {
        aria = useToolbar({'aria-label': 'Inner'}, root)
        return () => h('div', {id: 'ancestor', role: ancestorRole.value}, [
          h('div', {
            'data-root': 'a',
            ref: which.value === 'a' ? root : undefined,
            role: aria.toolbarProps.role,
          }, [h('button', {type: 'button'}, 'A1'), h('button', {type: 'button'}, 'A2')]),
          h('div', {
            'data-root': 'b',
            ref: which.value === 'b' ? root : undefined,
            role: which.value === 'b' ? aria.toolbarProps.role : 'presentation',
          }, [h('button', {type: 'button'}, 'B1'), h('button', {type: 'button'}, 'B2')]),
        ])
      },
    }), {attachTo: document.body})
    const read = (name: string) => document.querySelector(`[data-root="${name}"]`) as HTMLElement
    await nextTick()
    roles.push(read('a').getAttribute('role')!)
    expect(roles).toEqual(['group'])
    expect(aria.toolbarProps.role).toBe('group')

    const a1 = read('a').querySelector('button')!
    const childSaw = vi.fn()
    a1.addEventListener('keydown', childSaw)
    a1.focus()
    const ignored = press(a1, 'ArrowRight')
    expect(ignored.defaultPrevented).toBe(false)
    expect(childSaw).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(a1)

    ancestorRole.value = 'presentation'
    await nextTick()
    expect(read('a').getAttribute('role')).toBe('toolbar')
    const captured = press(a1, 'ArrowRight')
    expect(captured.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(read('a').querySelectorAll('button')[1])

    which.value = 'b'
    await nextTick()
    const b1 = read('b').querySelector('button')!
    const oldEvent = press(a1, 'ArrowRight')
    expect(oldEvent.defaultPrevented).toBe(false)
    b1.focus()
    press(b1, 'ArrowRight')
    expect(document.activeElement).toBe(read('b').querySelectorAll('button')[1])

    ancestorRole.value = 'toolbar'
    await nextTick()
    expect(read('b').getAttribute('role')).toBe('group')
    const b2 = read('b').querySelectorAll('button')[1]
    b2.focus()
    const nestedAgain = press(b2, 'ArrowLeft')
    expect(nestedAgain.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(b2)

    wrapper.unmount()
    const after = press(b2, 'ArrowLeft')
    expect(after.defaultPrevented).toBe(false)
  })

  it('records the first render as toolbar before the nested role update', async () => {
    const root = ref<HTMLElement | null>(null)
    const roles: string[] = []
    const wrapper = mount(defineComponent({
      setup() {
        const aria = useToolbar({'aria-label': 'Inner'}, root)
        return () => h('div', {role: 'toolbar'}, [
          h('div', {
            ref: root,
            role: (() => {
              roles.push(aria.toolbarProps.role)
              return aria.toolbarProps.role
            })(),
          }),
        ])
      },
    }), {attachTo: document.body})
    await nextTick()
    expect(roles[0]).toBe('toolbar')
    expect(roles.at(-1)).toBe('group')
    expect(roles.length).toBeLessThan(5)
    wrapper.unmount()
  })
})
