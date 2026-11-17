import {createApp, defineComponent, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {I18nProvider} from 'vue-aria'
import {
  DEFAULT_SLOT,
  ToggleButton,
  ToggleButtonContext,
  ToggleButtonGroup,
  ToggleButtonGroupContext,
  ToggleGroupStateContext,
  Toolbar,
} from 'vue-aria-components'
import type {Key} from 'vue-aria-components'
import type {
  ToggleButtonProps,
  ToggleButtonRenderProps,
  ToggleButtonGroupProps,
  ToggleButtonGroupRenderProps,
} from 'vue-aria-components'
import * as ToggleButtonEntry from 'vue-aria-components/ToggleButton'
import * as GroupEntry from 'vue-aria-components/ToggleButtonGroup'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function mountInDoc(body: () => any) {
  return mount(defineComponent({
    setup() {
      const result = body()
      if (typeof result === 'function') return result
      return () => body()
    },
  }), {attachTo: document.body})
}

function pointerClick(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
  el.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse'}))
  el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, button: 0, detail: 1}))
}

const stringStyle: ToggleButtonProps = {style: 'color: red'}
const objectStyle: ToggleButtonProps = {style: {color: 'blue'}}
const functionStyle: ToggleButtonProps = {
  style: (values) => ({color: values.isSelected ? 'green' : values.defaultStyle.color ?? 'black'}),
}
const listenerStyle: ToggleButtonProps = {
  onChange: (selected) => selected,
  onPress: (event) => event.type,
  onPressstart: (event) => event.type,
  onPressend: (event) => event.type,
  onPressup: (event) => event.type,
  onPresschange: (pressed) => pressed,
  onKeyDown: (event) => event.key,
  onKeyUp: (event) => event.key,
}
const groupStyle: ToggleButtonGroupProps = {
  selectionMode: 'multiple',
  disallowEmptySelection: true,
  selectedKeys: new Set<Key>([1, 'a']),
  defaultSelectedKeys: ['a'],
  orientation: 'vertical',
  onSelectionChange: (keys) => keys,
  onSelectionchange: (keys) => keys,
  className: (values) => values.defaultClassName ?? values.orientation,
  style: (values) => values.defaultStyle,
}
const buttonRender: ToggleButtonRenderProps = {
  isHovered: false,
  isPressed: false,
  isFocused: false,
  isFocusVisible: false,
  isDisabled: false,
  isSelected: false,
  state: {isSelected: false, defaultSelected: false, setSelected() {}, toggle() {}},
}
const groupRender: ToggleButtonGroupRenderProps = {
  orientation: 'horizontal',
  isDisabled: false,
  state: {
    selectionMode: 'single',
    isDisabled: false,
    selectedKeys: new Set(),
    toggleKey() {},
    setSelected() {},
    setSelectedKeys() {},
  },
}

describe('ToggleButton', () => {
  it('accepts style, listener, and render prop assignments', () => {
    expect(stringStyle.style).toBe('color: red')
    expect(objectStyle.style).toEqual({color: 'blue'})
    expect(typeof functionStyle.style).toBe('function')
    expect(typeof listenerStyle.onPressstart).toBe('function')
    expect(listenerStyle.onPresschange?.(true)).toBe(true)
    expect(groupStyle.selectionMode).toBe('multiple')
    expect(buttonRender.isSelected).toBe(false)
    expect(groupRender.orientation).toBe('horizontal')
    expect('isPending' in buttonRender).toBe(false)
  })

  it('publishes the pin surface and withholds SelectionIndicator and the group context from the button entry', () => {
    expect(ToggleButtonContext).toBe(Symbol.for('vue-aria-components.ToggleButtonContext'))
    expect(ToggleButtonGroupContext).toBe(Symbol.for('vue-aria-components.ToggleButtonGroupContext'))
    expect(ToggleGroupStateContext).toBe(Symbol.for('vue-aria-components.ToggleGroupStateContext'))
    expect(ToggleButtonEntry.ToggleButtonContext).toBe(ToggleButtonContext)
    expect(ToggleButtonEntry.ToggleButton).toBe(ToggleButton)
    expect(GroupEntry.ToggleButtonGroup).toBe(ToggleButtonGroup)
    expect(GroupEntry.ToggleGroupStateContext).toBe(ToggleGroupStateContext)
    expect(GroupEntry.ToggleButton).toBe(ToggleButton)
    expect(ToggleButtonEntry).not.toHaveProperty('ToggleButtonGroup')
    expect(ToggleButtonEntry).not.toHaveProperty('ToggleGroupStateContext')
    expect(ToggleButtonEntry).not.toHaveProperty('DEFAULT_SLOT')
    expect(ToggleButtonEntry).not.toHaveProperty('SelectionIndicator')
    expect(GroupEntry).not.toHaveProperty('ToggleButtonContext')
    expect(GroupEntry).not.toHaveProperty('SelectionIndicator')
    expect(GroupEntry).not.toHaveProperty('SelectionIndicatorContext')
    expect(GroupEntry).not.toHaveProperty('SharedElementTransition')
    expect(GroupEntry).not.toHaveProperty('DEFAULT_SLOT')
    expect(GroupEntry).not.toHaveProperty('Label')
  })

  it('renders a standalone toggle button and selects once per press', async () => {
    const seen: boolean[] = []
    const presses: string[] = []
    const wrapper = mountInDoc(() => h(ToggleButton, {
      id: 'solo',
      'data-foo': 'bar',
      onChange: (value: boolean) => seen.push(value),
      onPress: () => presses.push('press'),
      onClick: () => presses.push('click'),
    }, {
      default: ({isSelected}: ToggleButtonRenderProps) => isSelected ? 'On' : 'Off',
    }))
    await nextTick()
    const button = document.querySelector('button') as HTMLButtonElement
    expect(button.className).toBe('react-aria-ToggleButton')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('id')).toBe('solo')
    expect(button.getAttribute('data-foo')).toBe('bar')
    expect(button.hasAttribute('data-rac')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.textContent).toBe('Off')
    pointerClick(button)
    await nextTick()
    expect(seen).toEqual([true])
    expect(presses).toEqual(['press', 'click'])
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('data-selected')).toBe('true')
    expect(button.textContent).toBe('On')
    wrapper.unmount()
  })

  it('stringifies a standalone numeric id and keeps an explicit empty class', async () => {
    const wrapper = mountInDoc(() => h(ToggleButton, {id: 0, className: ''}, () => 'Zero'))
    await nextTick()
    const button = document.querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('id')).toBe('0')
    expect(button.className).toBe('')
    expect(button.classList.contains('react-aria-ToggleButton')).toBe(false)
    wrapper.unmount()
  })

  it('selects inside a single group with radio semantics and ignores focus movement', async () => {
    const seen: string[][] = []
    const wrapper = mountInDoc(() => h(ToggleButtonGroup, {
      'aria-label': 'Format',
      onSelectionChange: (keys: Set<Key>) => seen.push([...keys].map(String)),
    }, () => [
      h(ToggleButton, {id: 'foo'}, () => 'Foo'),
      h(ToggleButton, {id: 'bar'}, () => 'Bar'),
    ]))
    await nextTick()
    const group = document.querySelector('[role="radiogroup"]') as HTMLElement
    expect(group.className).toBe('react-aria-ToggleButtonGroup')
    expect(group.getAttribute('aria-orientation')).toBe('horizontal')
    expect(group.getAttribute('data-orientation')).toBe('horizontal')
    expect(group.hasAttribute('data-rac')).toBe(false)
    const radios = [...group.querySelectorAll('[role="radio"]')] as HTMLButtonElement[]
    expect(radios).toHaveLength(2)
    expect(radios[0].hasAttribute('id')).toBe(false)
    expect(radios[0].hasAttribute('aria-pressed')).toBe(false)
    expect(radios[0].getAttribute('aria-checked')).toBe('false')
    pointerClick(radios[1])
    await nextTick()
    expect(seen).toEqual([['bar']])
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    radios[0].focus()
    const right = new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true})
    radios[0].dispatchEvent(right)
    expect(right.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(radios[1])
    expect(seen).toEqual([['bar']])
    expect(radios[0].getAttribute('aria-checked')).toBe('false')
    const home = new KeyboardEvent('keydown', {key: 'Home', bubbles: true, cancelable: true})
    radios[1].dispatchEvent(home)
    expect(home.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(radios[1])
    wrapper.unmount()
  })

  it('uses multiple toolbar semantics and does not normalize a rejected controlled base', async () => {
    const selected = ref<Iterable<Key>>(new Set<Key>())
    const seen: string[][] = []
    const wrapper = mountInDoc(() => h(ToggleButtonGroup, {
      selectionMode: 'multiple',
      selectedKeys: selected.value,
      'aria-label': 'Align',
      onSelectionChange: (keys: Set<Key>) => seen.push([...keys].map(String).sort()),
    }, () => [
      h(ToggleButton, {id: 'a'}, () => 'A'),
      h(ToggleButton, {id: 'b'}, () => 'B'),
    ]))
    await nextTick()
    const group = document.querySelector('[role="toolbar"]') as HTMLElement
    const buttons = [...group.querySelectorAll('button')]
    pointerClick(buttons[0])
    pointerClick(buttons[1])
    expect(seen).toEqual([['a'], ['b']])
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false')
    selected.value = new Set(['a', 'b'])
    await nextTick()
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true')
    wrapper.unmount()
  })

  it('lets a group disabled state win over a local false and still allows toggleKey', async () => {
    let state: ToggleButtonGroupRenderProps['state'] | undefined
    const wrapper = mountInDoc(() => h(ToggleButtonGroup, {
      isDisabled: true,
      'aria-label': 'Format',
    }, {
      default: (values: ToggleButtonGroupRenderProps) => {
        state = values.state
        return [
          h(ToggleButton, {id: 'a', isDisabled: false}, () => 'A'),
          h(ToggleButton, {id: 'b'}, () => 'B'),
        ]
      },
    }))
    await nextTick()
    const group = document.querySelector('[role="radiogroup"]') as HTMLElement
    expect(group.getAttribute('data-disabled')).toBe('true')
    expect(group.getAttribute('aria-disabled')).toBe('true')
    const radios = [...group.querySelectorAll('[role="radio"]')] as HTMLButtonElement[]
    expect(radios[0].disabled).toBe(true)
    pointerClick(radios[0])
    expect(state!.selectedKeys.size).toBe(0)
    state!.toggleKey('a')
    await nextTick()
    expect([...state!.selectedKeys]).toEqual(['a'])
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('keeps a button without an id standalone inside a group, and treats id 0 as a member', async () => {
    const groupSeen: string[] = []
    const ownSeen: boolean[] = []
    const wrapper = mountInDoc(() => h(ToggleButtonGroup, {
      'aria-label': 'Format',
      onSelectionChange: (keys: Set<Key>) => groupSeen.push([...keys].map(String).join(',')),
    }, () => [
      h(ToggleButton, {onChange: (value: boolean) => ownSeen.push(value)}, () => 'Loose'),
      h(ToggleButton, {id: 0}, () => 'Zero'),
    ]))
    await nextTick()
    const loose = [...document.querySelectorAll('button')].find((node) => node.textContent === 'Loose')!
    const zero = [...document.querySelectorAll('button')].find((node) => node.textContent === 'Zero')!
    expect(loose.getAttribute('aria-pressed')).toBe('false')
    expect(loose.getAttribute('role')).toBeNull()
    expect(zero.getAttribute('role')).toBe('radio')
    expect(zero.hasAttribute('id')).toBe(false)
    pointerClick(loose)
    pointerClick(zero)
    await nextTick()
    expect(ownSeen).toEqual([true])
    expect(groupSeen).toEqual(['0'])
    expect(loose.getAttribute('aria-pressed')).toBe('true')
    expect(zero.getAttribute('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('calls a standalone context onChange and ignores it inside a group', async () => {
    const selected = ref(false)
    const contextSeen: boolean[] = []
    const localSeen: boolean[] = []
    const groupedSeen: boolean[] = []
    const ctx: Record<string, any> = {
      onChange: (value: boolean) => {
        contextSeen.push(value)
        selected.value = value
      },
    }
    Object.defineProperty(ctx, 'isSelected', {enumerable: true, get: () => selected.value})
    const wrapper = mountInDoc(() => {
      provide(ToggleButtonContext, ctx)
      return () => h('div', [
        h(ToggleButton, {onChange: (value: boolean) => localSeen.push(value)}, () => 'Solo'),
        h(ToggleButtonGroup, {'aria-label': 'Format'}, () => h(ToggleButton, {
          id: 'item',
          onChange: (value: boolean) => groupedSeen.push(value),
        }, () => 'Item')),
      ])
    })
    await nextTick()
    const solo = [...document.querySelectorAll('button')].find((node) => node.textContent === 'Solo')!
    const item = [...document.querySelectorAll('button')].find((node) => node.textContent === 'Item')!
    pointerClick(solo)
    pointerClick(item)
    await nextTick()
    expect(contextSeen).toEqual([true])
    expect(localSeen).toEqual([true])
    expect(groupedSeen).toEqual([])
    expect(solo.getAttribute('aria-pressed')).toBe('true')
    expect(item.getAttribute('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('forwards focus, popup, and hover props from context, with a local false winning', async () => {
    const exclude = ref(true)
    const prevent = ref(true)
    const popup = ref<string | boolean>('menu')
    const expanded = ref<boolean | undefined>(true)
    const controls = ref('panel')
    const ariaDisabled = ref<boolean | undefined>(undefined)
    let hoverStart: (event: unknown) => void = () => hoverSeen.push('start-a')
    let hoverEnd: (event: unknown) => void = () => hoverSeen.push('end-a')
    let hoverChange: (value: boolean) => void = (value) => hoverSeen.push(value ? 'change-a' : 'change-a-off')
    const hoverSeen: string[] = []
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'excludeFromTabOrder', {enumerable: true, get: () => exclude.value})
    Object.defineProperty(ctx, 'preventFocusOnPress', {enumerable: true, get: () => prevent.value})
    Object.defineProperty(ctx, 'aria-haspopup', {enumerable: true, get: () => popup.value})
    Object.defineProperty(ctx, 'aria-expanded', {enumerable: true, get: () => expanded.value})
    Object.defineProperty(ctx, 'aria-controls', {enumerable: true, get: () => controls.value})
    Object.defineProperty(ctx, 'aria-disabled', {enumerable: true, get: () => ariaDisabled.value})
    Object.defineProperty(ctx, 'onHoverstart', {enumerable: true, get: () => hoverStart})
    Object.defineProperty(ctx, 'onHoverend', {enumerable: true, get: () => hoverEnd})
    Object.defineProperty(ctx, 'onHoverchange', {enumerable: true, get: () => hoverChange})
    const localExclude = ref<boolean | undefined>(undefined)
    const wrapper = mountInDoc(() => {
      provide(ToggleButtonContext, ctx)
      return () => h(ToggleButton, {excludeFromTabOrder: localExclude.value}, () => 'Item')
    })
    await nextTick()
    let button = document.querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('tabindex')).toBe('-1')
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.getAttribute('aria-controls')).toBe('panel')
    const down = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse'})
    button.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    button.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse'}))

    popup.value = 'dialog'
    await nextTick()
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    expect(button.getAttribute('tabindex')).toBe('-1')

    localExclude.value = false
    await nextTick()
    expect(button.getAttribute('tabindex')).toBe('0')
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')

    prevent.value = false
    await nextTick()
    const later = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, button: 0, pointerId: 2, pointerType: 'mouse'})
    button.dispatchEvent(later)
    expect(later.defaultPrevented).toBe(false)

    button.dispatchEvent(new PointerEvent('pointerenter', {bubbles: true, pointerType: 'mouse'}))
    expect(hoverSeen).toContain('start-a')
    hoverStart = () => hoverSeen.push('start-b')
    button.dispatchEvent(new PointerEvent('pointerleave', {bubbles: true, pointerType: 'mouse'}))
    button.dispatchEvent(new PointerEvent('pointerenter', {bubbles: true, pointerType: 'mouse'}))
    expect(hoverSeen).toContain('start-b')
    expect(hoverSeen.filter((item) => item === 'start-a')).toHaveLength(1)
    wrapper.unmount()
  })

  it('captures defaultSelected at setup, before any read and across an id change', async () => {
    const id = ref<Key>('a')
    let held: ToggleButtonRenderProps['state'] | undefined
    const wrapper = mountInDoc(() => h(ToggleButtonGroup, {
      defaultSelectedKeys: ['a'],
      'aria-label': 'Format',
    }, () => h(ToggleButton, {id: id.value}, {
      default: ({state, isSelected}: ToggleButtonRenderProps) => {
        held = state
        return isSelected ? 'on' : 'off'
      },
    })))
    await nextTick()
    const button = document.querySelector('button') as HTMLButtonElement
    expect(button.textContent).toBe('on')
    expect(held!.isSelected).toBe(true)
    pointerClick(button)
    await nextTick()
    expect(held!.isSelected).toBe(false)
    expect(held!.defaultSelected).toBe(true)
    id.value = 'b'
    await nextTick()
    expect(held!.isSelected).toBe(false)
    expect(held!.defaultSelected).toBe(true)
    wrapper.unmount()
  })

  it('keeps the setup defaultSelected while the same button leaves and rejoins the group', async () => {
    const id = ref<Key | null>('a')
    let held: ToggleButtonRenderProps['state'] | undefined
    const wrapper = mountInDoc(() => h(ToggleButtonGroup, {
      defaultSelectedKeys: ['a'],
      'aria-label': 'Format',
    }, () => h(ToggleButton, {id: id.value}, {
      default: ({state}: ToggleButtonRenderProps) => {
        held = state
        return 'item'
      },
    })))
    await nextTick()
    expect(held!.defaultSelected).toBe(true)
    id.value = null
    await nextTick()
    expect(held!.isSelected).toBe(false)
    expect(held!.defaultSelected).toBe(true)
    id.value = 'a'
    await nextTick()
    expect(held!.isSelected).toBe(true)
    expect(held!.defaultSelected).toBe(true)
    wrapper.unmount()
  })

  it('runs each lowercase hover listener once', async () => {
    const counts = {start: 0, end: 0, change: 0}
    const hoverListeners: ToggleButtonProps = {
      onHoverstart: (event) => {
        counts.start += event.type === 'hoverstart' ? 1 : 0
      },
      onHoverend: (event) => {
        counts.end += event.type === 'hoverend' ? 1 : 0
      },
      onHoverchange: () => {
        counts.change += 1
      },
    }
    type NoUpperHover = 'onHoverStart' extends keyof ToggleButtonProps ? never : true
    const upperAbsent: NoUpperHover = true
    expect(upperAbsent).toBe(true)
    expect(hoverListeners.onHoverstart).toBeTypeOf('function')
    expect(hoverListeners.onHoverend).toBeTypeOf('function')
    expect(hoverListeners.onHoverchange).toBeTypeOf('function')
    const wrapper = mountInDoc(() => h(ToggleButton, {
      onHoverstart: hoverListeners.onHoverstart,
      onHoverend: hoverListeners.onHoverend,
      onHoverchange: hoverListeners.onHoverchange,
    }, () => 'Item'))
    await nextTick()
    const button = document.querySelector('button') as HTMLButtonElement
    button.dispatchEvent(new PointerEvent('pointerenter', {bubbles: true, pointerType: 'mouse'}))
    button.dispatchEvent(new PointerEvent('pointerleave', {bubbles: true, pointerType: 'mouse'}))
    expect(counts).toEqual({start: 1, end: 1, change: 2})
    wrapper.unmount()
  })

  it('exposes the initial group selection as defaultSelected and keeps it after the selection changes', async () => {
    const wrapper = mountInDoc(() => h(ToggleButtonGroup, {
      defaultSelectedKeys: ['a'],
      'aria-label': 'Format',
    }, {
      default: () => [
        h(ToggleButton, {
          id: 'a',
          className: ({state}: ToggleButtonRenderProps) => state.defaultSelected ? 'was-default' : 'not-default',
          style: ({state}: ToggleButtonRenderProps) => ({color: state.defaultSelected ? 'green' : 'red'}),
        }, {
          default: ({state}: ToggleButtonRenderProps) => String(state.defaultSelected),
        }),
        h(ToggleButton, {id: 'b'}, {
          default: ({state}: ToggleButtonRenderProps) => `b:${String(state.defaultSelected)}`,
        }),
      ],
    }))
    await nextTick()
    const selected = [...document.querySelectorAll('button')].find((node) => node.textContent === 'true')!
    const other = [...document.querySelectorAll('button')].find((node) => node.textContent === 'b:false')!
    expect(selected.className).toContain('was-default')
    expect(selected.style.color).toBe('green')
    expect(other.textContent).toBe('b:false')
    pointerClick(selected)
    await nextTick()
    expect(selected.textContent).toBe('true')
    expect(selected.className).toContain('was-default')
    expect(selected.getAttribute('aria-checked')).toBe('false')
    wrapper.unmount()
  })

  it('opts out of props context with slot null without leaving the group', async () => {
    const slot = ref<string | null | undefined>(null)
    const ctx = {
      'aria-label': 'From context',
      className: 'from-context',
      id: 'ctx',
      slots: {
        [DEFAULT_SLOT]: {'aria-label': 'Default', className: 'deflt', id: 'default-id'},
        test: {'aria-label': 'Named', className: 'named'},
      },
    }
    const wrapper = mountInDoc(() => {
      provide(ToggleButtonGroupContext, {'aria-label': 'Group'})
      provide(ToggleButtonContext, ctx)
      return () => h(ToggleButtonGroup, {}, () => h(ToggleButton, {slot: slot.value, id: 'item'}, () => 'Item'))
    })
    await nextTick()
    let button = document.querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBeNull()
    expect(button.className).toBe('react-aria-ToggleButton')
    expect(button.getAttribute('role')).toBe('radio')
    pointerClick(button)
    await nextTick()
    expect(button.getAttribute('aria-checked')).toBe('true')

    slot.value = undefined
    await nextTick()
    button = document.querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Default')
    expect(button.className).toContain('deflt')
    expect(button.hasAttribute('id')).toBe(false)

    slot.value = 'test'
    await nextTick()
    button = document.querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('slot')).toBe('test')
    expect(button.getAttribute('aria-label')).toBe('Named')

    slot.value = null
    await nextTick()
    button = document.querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBeNull()
    expect(button.getAttribute('aria-checked')).toBe('true')
    wrapper.unmount()
  })

  it('refreshes a context selection set after the group opts out and the same set is edited', async () => {
    const keys = new Set<Key>(['a'])
    const slot = ref<string | null | undefined>(undefined)
    const wrapper = mountInDoc(() => {
      provide(ToggleButtonGroupContext, {
        slots: {
          [DEFAULT_SLOT]: {selectedKeys: keys, 'aria-label': 'Format'},
        },
      })
      return () => h(ToggleButtonGroup, {slot: slot.value}, () => [
        h(ToggleButton, {id: 'a'}, () => 'A'),
        h(ToggleButton, {id: 'b'}, () => 'B'),
      ])
    })
    await nextTick()
    let a = [...document.querySelectorAll('button')].find((node) => node.textContent === 'A')!
    expect(a.getAttribute('aria-checked')).toBe('true')
    slot.value = null
    await nextTick()
    a = [...document.querySelectorAll('button')].find((node) => node.textContent === 'A')!
    expect(a.getAttribute('aria-checked')).toBe('false')
    keys.delete('a')
    keys.add('b')
    slot.value = undefined
    await nextTick()
    const b = [...document.querySelectorAll('button')].find((node) => node.textContent === 'B')!
    a = [...document.querySelectorAll('button')].find((node) => node.textContent === 'A')!
    expect(b.getAttribute('aria-checked')).toBe('true')
    expect(a.getAttribute('aria-checked')).toBe('false')
    wrapper.unmount()
  })

  it('updates one context field at a time and replaces a ref from A to B', async () => {
    const A = ref<Element | null>(null)
    const B = ref<Element | null>(null)
    const label = ref('First')
    const disabled = ref(false)
    const className = ref('one')
    const color = ref('red')
    let current: unknown = A
    const ctx: Record<string, any> = {}
    Object.defineProperty(ctx, 'ref', {enumerable: true, configurable: true, get: () => current})
    Object.defineProperty(ctx, 'aria-label', {enumerable: true, configurable: true, get: () => label.value})
    Object.defineProperty(ctx, 'isDisabled', {enumerable: true, configurable: true, get: () => disabled.value})
    Object.defineProperty(ctx, 'className', {enumerable: true, configurable: true, get: () => className.value})
    Object.defineProperty(ctx, 'style', {enumerable: true, configurable: true, get: () => ({color: color.value})})
    const tick = ref(0)
    const wrapper = mountInDoc(() => {
      provide(ToggleButtonContext, ctx)
      return () => h(ToggleButton, {'data-tick': tick.value}, () => 'Item')
    })
    await nextTick()
    let button = document.querySelector('button') as HTMLButtonElement
    expect(A.value).toBe(button)
    expect(B.value).toBeNull()
    expect(button.getAttribute('aria-label')).toBe('First')

    label.value = 'Second'
    await nextTick()
    expect(button.getAttribute('aria-label')).toBe('Second')
    expect(button.disabled).toBe(false)

    disabled.value = true
    await nextTick()
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-label')).toBe('Second')

    className.value = 'two'
    await nextTick()
    expect(button.className).toContain('two')
    expect(button.className).not.toContain('one')

    color.value = 'blue'
    await nextTick()
    expect(button.style.color).toBe('blue')

    current = B
    tick.value++
    await nextTick()
    await nextTick()
    button = document.querySelector('button') as HTMLButtonElement
    expect(A.value).toBeNull()
    expect(B.value).toBe(button)
    wrapper.unmount()
    await nextTick()
    expect(B.value).toBeNull()
  })

  it('throws for a missing slots entry and restores after opt-out', async () => {
    const slot = ref<string | null | undefined>('absent')
    const errors: string[] = []
    const Parent = defineComponent({
      setup() {
        provide(ToggleButtonGroupContext, {
          slots: {test: {'aria-label': 'Named'}},
        })
        return () => h(ToggleButtonGroup, {slot: slot.value, 'aria-label': 'Local'})
      },
      errorCaptured(err) {
        errors.push(err instanceof Error ? err.message : String(err))
        return false
      },
    })
    const wrapper = mount(Parent, {attachTo: document.body})
    await nextTick()
    expect(errors.join('\n')).toMatch(/Invalid slot "absent"/)
    slot.value = null
    await nextTick()
    const group = document.querySelector('[aria-label="Local"]') as HTMLElement
    expect(group).not.toBeNull()
    expect(group.getAttribute('role')).toBe('radiogroup')
    wrapper.unmount()
  })

  it('nests groups, skips disabled items, and follows RTL arrows without selecting', async () => {
    const locale = ref('en-US')
    const ids = ref<string[]>(['a', 'b', 'c'])
    const disabled = ref('b')
    const outer: string[] = []
    const inner: string[] = []
    const wrapper = mountInDoc(() => h(I18nProvider, {locale: locale.value}, () => h(Toolbar, {'aria-label': 'Tools'}, () => [
      h(ToggleButtonGroup, {
        selectionMode: 'multiple',
        'aria-label': 'Outer',
        onSelectionChange: (keys: Set<Key>) => outer.push([...keys].join(',')),
      }, () => [
        h(ToggleButton, {id: 'outer'}, () => 'Outer'),
        h(ToggleButtonGroup, {
          'aria-label': 'Inner',
          orientation: 'horizontal',
          onSelectionChange: (keys: Set<Key>) => inner.push([...keys].join(',')),
        }, () => ids.value.map((id) => h(ToggleButton, {id, isDisabled: id === disabled.value}, () => id))),
      ]),
    ])))
    await nextTick()
    await nextTick()
    const groups = [...document.querySelectorAll('[aria-label="Outer"], [aria-label="Inner"]')] as HTMLElement[]
    const outerGroup = groups.find((node) => node.getAttribute('aria-label') === 'Outer')!
    const innerGroup = groups.find((node) => node.getAttribute('aria-label') === 'Inner')!
    expect(outerGroup.getAttribute('role')).toBe('group')
    expect(innerGroup.getAttribute('role')).toBe('radiogroup')
    const innerButtons = [...innerGroup.querySelectorAll('button')] as HTMLButtonElement[]
    innerButtons[0].focus()
    innerButtons[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    expect(document.activeElement).toBe(innerButtons[2])
    expect(inner).toEqual([])
    locale.value = 'ar'
    await nextTick()
    innerButtons[2].focus()
    innerButtons[2].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}))
    expect(document.activeElement).toBe(innerButtons[0])
    pointerClick(innerButtons[0])
    await nextTick()
    expect(inner).toEqual(['a'])
    expect(outer).toEqual([])
    ids.value = ['a']
    await nextTick()
    expect(innerGroup.querySelectorAll('button')).toHaveLength(1)
    wrapper.unmount()
  })

  it('navigates a group mounted in an iframe document', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument!
    const host = doc.createElement('div')
    doc.body.appendChild(host)
    const app = createApp({
      setup() {
        return () => h(ToggleButtonGroup, {'aria-label': 'Frame'}, () => [
          h(ToggleButton, {id: 'one'}, () => 'One'),
          h(ToggleButton, {id: 'two'}, () => 'Two'),
        ])
      },
    })
    app.mount(host)
    await nextTick()
    const buttons = [...host.querySelectorAll('button')]
    const nodeView = buttons[0].ownerDocument.defaultView!
    buttons[0].focus()
    const right = new nodeView.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true})
    buttons[0].dispatchEvent(right)
    expect(right.defaultPrevented).toBe(true)
    expect(buttons[0].ownerDocument.activeElement).toBe(buttons[1])
    expect(buttons[1].getAttribute('aria-checked')).toBe('false')
    app.unmount()
  })
})
