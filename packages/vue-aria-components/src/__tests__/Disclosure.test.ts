import {defineComponent, h, nextTick, provide, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {Button, Disclosure, DisclosureGroup, DisclosurePanel, Heading, Menu, MenuItem, MenuTrigger, Popover} from 'vue-aria-components'
import {DisclosureContext} from '../Disclosure'
import * as stately from 'vue-stately'
import * as aria from 'vue-aria'
import * as components from 'vue-aria-components'
import type {AriaDisclosureProps, DisclosureAria} from 'vue-aria'
import type {DisclosureGroupProps as StatelyGroupProps, DisclosureGroupState, DisclosureProps as StatelyDisclosureProps, DisclosureState} from 'vue-stately'
import type {
  ButtonProps,
  ButtonRenderProps,
  DisclosureGroupProps,
  DisclosureGroupRenderProps,
  DisclosurePanelProps,
  DisclosurePanelRenderProps,
  DisclosureProps,
  DisclosureRenderProps,
  HeadingProps,
} from 'vue-aria-components'
import type {Key} from 'vue-aria-components/DisclosureGroup'

function mountInDoc(component: any) {
  return mount(component, {attachTo: document.body})
}

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 10))
}

function disclosureTree(extra: Record<string, any> = {}, panelChildren?: () => any) {
  return h(Disclosure, {'data-testid': 'disclosure', ...extra}, {
    default: (values: DisclosureRenderProps) => [
      h(Heading, {level: 3}, {
        default: () => h(Button, {slot: 'trigger'}, {default: () => (values.isExpanded ? 'Collapse' : 'Trigger')}),
      }),
      h(DisclosurePanel, {'data-testid': 'panel'}, {
        default: () => panelChildren?.() ?? h('p', 'Content'),
      }),
    ],
  })
}

describe('Disclosure', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('renders the default class, custom class, DOM props, region role, and aria labels', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h('div', [
          disclosureTree(),
          h(Disclosure, {'data-testid': 'custom', class: 'test-class', 'data-foo': 'bar'}, {
            default: () => [
              h(Heading, {level: 3, 'aria-label': 'Test disclosure heading'}, {
                default: () => h(Button, {slot: 'trigger'}, {default: () => 'Trigger'}),
              }),
              h(DisclosurePanel, {role: 'region', 'aria-label': 'Test disclosure panel'}, {
                default: () => h('p', 'More'),
              }),
            ],
          }),
        ])
      },
    }))
    await tick()
    const disclosure = document.querySelector('.react-aria-Disclosure') as HTMLElement
    expect(disclosure).toBeTruthy()
    const custom = document.querySelector('[data-testid="custom"]') as HTMLElement
    expect(custom.className).toContain('test-class')
    expect(custom.getAttribute('data-foo')).toBe('bar')
    const heading = custom.querySelector('h3') as HTMLElement
    expect(heading.getAttribute('aria-label')).toBe('Test disclosure heading')
    const panel = custom.querySelector('.react-aria-DisclosurePanel') as HTMLElement
    expect(panel.getAttribute('role')).toBe('region')
    expect(panel.getAttribute('aria-label')).toBe('Test disclosure panel')
    const firstPanel = document.querySelector('[data-testid="panel"]') as HTMLElement
    expect(firstPanel.getAttribute('role')).toBe('group')
    wrapper.unmount()
  })

  it('wires stable ids and expanded semantics, and toggles from the render prop', async () => {
    const wrapper = mountInDoc(defineComponent({setup: () => () => disclosureTree()}))
    await tick()
    const root = document.querySelector('[data-testid="disclosure"]') as HTMLElement
    const button = root.querySelector('button') as HTMLButtonElement
    const panel = root.querySelector('[data-testid="panel"]') as HTMLElement
    expect(root.hasAttribute('data-expanded')).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-labelledby')).toBe(button.id)
    expect(panel.getAttribute('hidden')).toBe('until-found')
    expect(panel.style.display).not.toBe('none')
    const triggerId = button.id
    const panelId = panel.id

    dispatchPointer(button, 'pointerdown')
    expect(root.hasAttribute('data-expanded')).toBe(false)
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(root.getAttribute('data-expanded')).toBe('true')
    expect(button.textContent).toBe('Collapse')
    expect(panel.hasAttribute('hidden')).toBe(false)
    expect(panel.getAttribute('aria-hidden')).toBe('false')
    expect(button.id).toBe(triggerId)
    expect(panel.id).toBe(panelId)

    dispatchPointer(button, 'pointerdown', {pointerType: 'touch'})
    dispatchPointer(button, 'pointerup', {pointerType: 'touch'})
    await tick()
    expect(root.hasAttribute('data-expanded')).toBe(false)
    wrapper.unmount()
  })

  it('toggles keyboard on keydown only, ignores repeats, arrows, and a virtual click', async () => {
    const changes: boolean[] = []
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Disclosure, {
          onExpandedChange: (value: boolean) => changes.push(value),
          onExpandedchange: (value: boolean) => changes.push(value),
        }, {
          default: () => [
            h(Heading, {level: 3}, {default: () => h(Button, {slot: 'trigger'}, {default: () => 'Trigger'})}),
            h(DisclosurePanel, {}, {default: () => h('p', 'Content')}),
          ],
        })
      },
    }))
    await tick()
    const button = document.querySelector('button') as HTMLButtonElement
    dispatchKey(button, 'keydown', {key: 'ArrowDown'})
    dispatchKey(button, 'keydown', {key: 'Tab'})
    await tick()
    expect(changes).toEqual([])

    dispatchKey(button, 'keydown', {key: 'Enter'})
    dispatchKey(button, 'keydown', {key: 'Enter', repeat: true})
    dispatchKey(button, 'keydown', {key: 'Enter', repeat: true})
    await tick()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    dispatchKey(button, 'keyup', {key: 'Enter'})
    await tick()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(changes.filter((value, index) => index % 2 === 0)).toEqual([true])

    dispatchKey(button, 'keydown', {key: ' '})
    dispatchKey(button, 'keyup', {key: ' '})
    await tick()
    expect(button.getAttribute('aria-expanded')).toBe('false')

    const virtual = document.createElement('button')
    document.body.appendChild(virtual)
    button.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, detail: 0}))
    await tick()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('keeps a controlled value from changing on press and still expands a disabled disclosure from outside', async () => {
    const expanded = ref(true)
    const disabled = ref(true)
    const changes: boolean[] = []
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Disclosure, {
          isExpanded: expanded.value,
          isDisabled: disabled.value,
          'data-testid': 'disclosure',
          onExpandedChange: (value: boolean) => changes.push(value),
        }, {
          default: () => [
            h(Heading, {level: 3}, {default: () => h(Button, {slot: 'trigger'}, {default: () => 'Trigger'})}),
            h(DisclosurePanel, {}, {default: () => h('p', 'Content')}),
          ],
        })
      },
    }))
    await tick()
    const root = document.querySelector('[data-testid="disclosure"]') as HTMLElement
    const button = root.querySelector('button') as HTMLButtonElement
    expect(root.getAttribute('data-disabled')).toBe('true')
    expect(root.getAttribute('data-expanded')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('data-disabled')).toBe('true')
    const panel = root.querySelector('.react-aria-DisclosurePanel') as HTMLElement
    expect(panel.hasAttribute('hidden')).toBe(false)

    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
    expect(changes).toEqual([])
    expect(root.getAttribute('data-expanded')).toBe('true')

    expanded.value = false
    disabled.value = false
    await tick()
    expect(root.hasAttribute('data-expanded')).toBe(false)
    expect(root.hasAttribute('data-disabled')).toBe(false)
    expect(panel.getAttribute('hidden')).toBe('until-found')
    wrapper.unmount()
  })

  it('tracks descendant focus-visible-within across internal focus moves', async () => {
    let api: DisclosureRenderProps | undefined
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(Disclosure, {
          'data-testid': 'disclosure',
          className: ({isFocusVisibleWithin}: DisclosureRenderProps) => (isFocusVisibleWithin ? 'focus' : 'blur'),
        }, {
          default: (values: DisclosureRenderProps) => {
            api = values
            return [
              h(Heading, {level: 3}, {default: () => h(Button, {slot: 'trigger'}, {default: () => 'Trigger'})}),
              h(DisclosurePanel, {'data-testid': 'panel'}, {
                default: () => [h('input', {id: 'inside-a'}), h('input', {id: 'inside-b'})],
              }),
            ]
          },
        })
      },
    }))
    await tick()
    const root = document.querySelector('[data-testid="disclosure"]') as HTMLElement
    const panel = document.querySelector('[data-testid="panel"]') as HTMLElement
    const button = root.querySelector('button') as HTMLButtonElement
    expect(root.hasAttribute('data-focus-visible-within')).toBe(false)
    expect(root.className).toContain('blur')

    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}))
    button.focus()
    await tick()
    expect(root.getAttribute('data-focus-visible-within')).toBe('true')
    expect(root.className).toContain('focus')
    expect(api?.isFocusVisibleWithin).toBe(true)

    const first = document.getElementById('inside-a') as HTMLInputElement
    const second = document.getElementById('inside-b') as HTMLInputElement
    first.focus()
    await tick()
    expect(root.getAttribute('data-focus-visible-within')).toBe('true')
    expect(panel.getAttribute('data-focus-visible-within')).toBe('true')
    second.focus()
    await tick()
    expect(root.getAttribute('data-focus-visible-within')).toBe('true')
    expect(panel.getAttribute('data-focus-visible-within')).toBe('true')

    window.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
    await tick()
    expect(root.hasAttribute('data-focus-visible-within')).toBe(false)
    expect(panel.hasAttribute('data-focus-visible-within')).toBe(false)

    button.blur()
    await tick()
    expect(root.hasAttribute('data-focus-visible-within')).toBe(false)
    wrapper.unmount()
  })

  it('isolates nearby buttons, panel buttons, menu triggers, and nested disclosures', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Disclosure, Heading, Button, DisclosurePanel, MenuTrigger, Popover, Menu, MenuItem},
      template: `
        <Disclosure data-testid="disclosure">
          <Heading :level="3">
            <Button slot="trigger" data-testid="disclosure-trigger">Trigger</Button>
          </Heading>
          <Button data-testid="nearby">Nearby</Button>
          <MenuTrigger>
            <Button aria-label="Menu" data-testid="menu-trigger">Menu</Button>
            <Popover>
              <Menu data-testid="menu" aria-label="Actions">
                <MenuItem id="open">Open</MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
          <DisclosurePanel>
            <Button slot="trigger" data-testid="panel-trigger">Panel trigger</Button>
            <Button :slot="null" data-testid="panel-clear">Cleared</Button>
            <Disclosure>
              <Heading :level="3">
                <Button slot="trigger">Inner</Button>
              </Heading>
              <DisclosurePanel><p>Content 2</p></DisclosurePanel>
            </Disclosure>
          </DisclosurePanel>
        </Disclosure>
      `,
    }))
    await tick()
    const root = document.querySelector('[data-testid="disclosure"]') as HTMLElement
    const trigger = document.querySelector('[data-testid="disclosure-trigger"]') as HTMLButtonElement
    const nearby = document.querySelector('[data-testid="nearby"]') as HTMLButtonElement
    const menuTrigger = document.querySelector('[data-testid="menu-trigger"]') as HTMLButtonElement
    const panelTrigger = document.querySelector('[data-testid="panel-trigger"]') as HTMLButtonElement
    const cleared = document.querySelector('[data-testid="panel-clear"]') as HTMLButtonElement

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(nearby.hasAttribute('aria-controls')).toBe(false)
    expect(panelTrigger.getAttribute('aria-controls')).not.toBe(trigger.getAttribute('aria-controls'))
    expect(cleared.hasAttribute('aria-expanded')).toBe(false)

    dispatchPointer(menuTrigger, 'pointerdown')
    dispatchPointer(menuTrigger, 'pointerup')
    await tick()
    expect(document.querySelector('[data-testid="menu"]')).toBeTruthy()
    expect(root.hasAttribute('data-expanded')).toBe(false)

    dispatchPointer(nearby, 'pointerdown')
    dispatchPointer(nearby, 'pointerup')
    dispatchPointer(panelTrigger, 'pointerdown')
    dispatchPointer(panelTrigger, 'pointerup')
    dispatchPointer(cleared, 'pointerdown')
    dispatchPointer(cleared, 'pointerup')
    await tick()
    expect(root.hasAttribute('data-expanded')).toBe(false)

    // The open menu captures pointerdown. Close it before pressing the disclosure trigger.
    const menu = document.querySelector('[data-testid="menu"]') as HTMLElement
    dispatchKey(menu, 'keydown', {key: 'Escape'})
    await tick()
    expect(document.querySelector('[data-testid="menu"]')).toBeFalsy()

    const triggerAgain = document.querySelector('[data-testid="disclosure-trigger"]') as HTMLButtonElement
    dispatchPointer(triggerAgain, 'pointerdown')
    dispatchPointer(triggerAgain, 'pointerup')
    await tick()
    expect(root.getAttribute('data-expanded')).toBe('true')
    const inner = [...document.querySelectorAll('button')].find((node) => node.textContent === 'Inner') as HTMLButtonElement
    const innerPanel = [...document.querySelectorAll('.react-aria-DisclosurePanel')].at(-1) as HTMLElement
    expect(innerPanel.getAttribute('hidden')).toBe('until-found')
    dispatchPointer(inner, 'pointerdown')
    dispatchPointer(inner, 'pointerup')
    await tick()
    expect(innerPanel.hasAttribute('hidden')).toBe(false)
    expect(root.getAttribute('data-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('keeps class, style, and context props live', async () => {
    const disabled = ref(false)
    const elRef = ref<HTMLElement | null>(null)
    const ctx: Record<string, any> = {ref: elRef}
    Object.defineProperty(ctx, 'isDisabled', {
      enumerable: true,
      configurable: true,
      get: () => disabled.value,
    })
    const wrapper = mountInDoc(defineComponent({
      setup() {
        provide(DisclosureContext, ctx)
        return () => h(Disclosure, {
          'data-testid': 'disclosure',
          className: ({isDisabled}: DisclosureRenderProps) => (isDisabled ? 'is-off' : 'is-on'),
          style: ({isExpanded}: DisclosureRenderProps) => ({color: isExpanded ? 'red' : 'blue'}),
        }, {
          default: () => h(Button, {slot: 'trigger'}, {default: () => 'Trigger'}),
        })
      },
    }))
    await tick()
    const root = document.querySelector('[data-testid="disclosure"]') as HTMLElement
    expect(elRef.value).toBe(root)
    expect(root.className).toContain('is-on')
    expect(root.style.color).toBe('blue')
    disabled.value = true
    await tick()
    expect(root.getAttribute('data-disabled')).toBe('true')
    expect(root.className).toContain('is-off')
    const button = root.querySelector('button') as HTMLButtonElement
    expect(button.hasAttribute('disabled')).toBe(true)
    wrapper.unmount()
  })
})

describe('DisclosureGroup', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  function groupView(props: Record<string, any> = {}) {
    return h(DisclosureGroup, {'data-testid': 'group', ...props}, {
      default: () => [
        item('item1', 'Trigger 1', 'Content 1'),
        item('item2', 'Trigger 2', 'Content 2'),
      ],
    })
  }

  function item(id: Key, label: string, content: string) {
    return h(Disclosure, {id}, {
      default: () => [
        h(Heading, {level: 3}, {default: () => h(Button, {slot: 'trigger'}, {default: () => label})}),
        h(DisclosurePanel, {}, {default: () => h('p', content)}),
      ],
    })
  }

  function buttonByText(text: string) {
    return [...document.querySelectorAll('button')].find((node) => node.textContent === text) as HTMLButtonElement
  }

  function panelByText(text: string) {
    return [...document.querySelectorAll('p')].find((node) => node.textContent === text)?.parentElement as HTMLElement
  }

  async function toggle(text: string) {
    const button = buttonByText(text)
    dispatchPointer(button, 'pointerdown')
    dispatchPointer(button, 'pointerup')
    await tick()
  }

  it('allows every item to collapse, expands many when asked, and keeps numeric keys', async () => {
    const wrapper = mountInDoc(defineComponent({setup: () => () => groupView()}))
    await tick()
    expect(document.querySelector('.react-aria-DisclosureGroup')).toBeTruthy()
    expect(panelByText('Content 1').getAttribute('hidden')).toBe('until-found')
    await toggle('Trigger 1')
    expect(panelByText('Content 1').hasAttribute('hidden')).toBe(false)
    expect(panelByText('Content 2').getAttribute('hidden')).toBe('until-found')
    await toggle('Trigger 2')
    expect(panelByText('Content 1').getAttribute('hidden')).toBe('until-found')
    expect(panelByText('Content 2').hasAttribute('hidden')).toBe(false)
    await toggle('Trigger 2')
    expect(panelByText('Content 2').getAttribute('hidden')).toBe('until-found')
    wrapper.unmount()

    const many = mountInDoc(defineComponent({
      setup: () => () => groupView({allowsMultipleExpanded: true}),
    }))
    await tick()
    await toggle('Trigger 1')
    await toggle('Trigger 2')
    expect(panelByText('Content 1').hasAttribute('hidden')).toBe(false)
    expect(panelByText('Content 2').hasAttribute('hidden')).toBe(false)
    many.unmount()

    const numericKeys = ref<Key[]>([1])
    const numeric = mountInDoc(defineComponent({
      setup() {
        return () => h(DisclosureGroup, {expandedKeys: numericKeys.value}, {
          default: () => [item(1, 'One', 'Content 1'), item(2, 'Two', 'Content 2')],
        })
      },
    }))
    await tick()
    expect(panelByText('Content 1').hasAttribute('hidden')).toBe(false)
    expect(panelByText('Content 2').getAttribute('hidden')).toBe('until-found')
    numeric.unmount()
  })

  it('supports controlled keys, disables user input only, and keeps the first key when multiple expansion turns off', async () => {
    const keys = ref<Key[]>(['item1'])
    const allows = ref(true)
    const disabled = ref(false)
    const changes: Array<Set<Key>> = []
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(DisclosureGroup, {
          expandedKeys: keys.value,
          allowsMultipleExpanded: allows.value,
          isDisabled: disabled.value,
          onExpandedChange: (next: Set<Key>) => {
            changes.push(next)
            keys.value = [...next]
          },
        }, {
          default: () => [item('item1', 'Trigger 1', 'Content 1'), item('item2', 'Trigger 2', 'Content 2')],
        })
      },
    }))
    await tick()
    expect(panelByText('Content 1').hasAttribute('hidden')).toBe(false)
    await toggle('Trigger 2')
    expect(keys.value).toEqual(['item1', 'item2'])
    allows.value = false
    await tick()
    expect(keys.value).toEqual(['item1'])
    expect(panelByText('Content 1').hasAttribute('hidden')).toBe(false)
    expect(panelByText('Content 2').getAttribute('hidden')).toBe('until-found')

    disabled.value = true
    await tick()
    const buttons = [...document.querySelectorAll('.react-aria-Disclosure button')] as HTMLButtonElement[]
    expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
    const before = [...keys.value]
    await toggle('Trigger 2')
    expect(keys.value).toEqual(before)
    keys.value = ['item2']
    await tick()
    expect(panelByText('Content 2').hasAttribute('hidden')).toBe(false)
    expect(changes.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('isolates nested groups', async () => {
    const wrapper = mountInDoc(defineComponent({
      setup() {
        return () => h(DisclosureGroup, {}, {
          default: () => h(Disclosure, {id: 'item1'}, {
            default: () => [
              h(Heading, {level: 3}, {default: () => h(Button, {slot: 'trigger'}, {default: () => 'Trigger 1'})}),
              h(DisclosurePanel, {}, {
                default: () => h(DisclosureGroup, {}, {
                  default: () => h(Disclosure, {id: 'item2'}, {
                    default: () => [
                      h(Heading, {level: 3}, {default: () => h(Button, {slot: 'trigger'}, {default: () => 'Trigger 2'})}),
                      h(DisclosurePanel, {}, {default: () => h('p', 'Content 2')}),
                    ],
                  }),
                }),
              }),
            ],
          }),
        })
      },
    }))
    await tick()
    expect(panelByText('Content 2').getAttribute('hidden')).toBe('until-found')
    await toggle('Trigger 1')
    expect(panelByText('Content 2').getAttribute('hidden')).toBe('until-found')
    await toggle('Trigger 2')
    expect(panelByText('Content 2').hasAttribute('hidden')).toBe(false)
    await toggle('Trigger 2')
    expect(panelByText('Content 2').getAttribute('hidden')).toBe('until-found')
    const outer = buttonByText('Trigger 1')
    expect(outer.getAttribute('aria-expanded')).toBe('true')
    wrapper.unmount()
  })
})

describe('Disclosure public exports', () => {
  it('exports the official surfaces and refuses the denylist', async () => {
    expect(typeof stately.useDisclosureState).toBe('function')
    expect(typeof stately.useDisclosureGroupState).toBe('function')
    expect(typeof aria.useDisclosure).toBe('function')
    expect(components.Disclosure).toBeTruthy()
    expect(components.DisclosurePanel).toBeTruthy()
    expect(components.DisclosureGroup).toBeTruthy()
    expect(components.DisclosureContext).toBeTruthy()
    expect(components.DisclosureStateContext).toBeTruthy()
    expect(components.DisclosureGroupStateContext).toBeTruthy()

    const {useDisclosureState: useDisclosureStateSub} = await import('vue-stately/useDisclosureState')
    const {useDisclosureGroupState: useDisclosureGroupStateSub} = await import('vue-stately/useDisclosureGroupState')
    const {useDisclosure: useDisclosureSub} = await import('vue-aria/useDisclosure')
    const disclosureEntry = await import('vue-aria-components/Disclosure')
    const groupEntry = await import('vue-aria-components/DisclosureGroup')
    expect(typeof useDisclosureStateSub).toBe('function')
    expect(typeof useDisclosureGroupStateSub).toBe('function')
    expect(typeof useDisclosureSub).toBe('function')
    expect(disclosureEntry.Disclosure).toBeTruthy()
    expect(disclosureEntry.DisclosurePanel).toBeTruthy()
    expect(disclosureEntry.Button).toBeTruthy()
    expect(disclosureEntry.Heading).toBeTruthy()
    expect(groupEntry.DisclosureGroup).toBeTruthy()
    expect(groupEntry.DisclosureGroupStateContext).toBeTruthy()
    expect((disclosureEntry as any).DisclosureGroup).toBeUndefined()
    expect((disclosureEntry as any).DisclosureGroupStateContext).toBeUndefined()

    for (const name of [
      'useDisclosureGroup',
      'DisclosureGroupContext',
      'useToggle',
      'useFocusable',
      'filterDOMProps',
      'getFocusableTreeWalker',
    ]) {
      expect((stately as any)[name]).toBeUndefined()
      expect((aria as any)[name]).toBeUndefined()
      expect((components as any)[name]).toBeUndefined()
      expect((disclosureEntry as any)[name]).toBeUndefined()
      expect((groupEntry as any)[name]).toBeUndefined()
    }

    const typeProbe = (
      _statelyProps: StatelyDisclosureProps | null,
      _state: DisclosureState | null,
      _groupProps: StatelyGroupProps | null,
      _groupState: DisclosureGroupState | null,
      _ariaProps: AriaDisclosureProps | null,
      _aria: DisclosureAria | null,
      _props: DisclosureProps | null,
      _render: DisclosureRenderProps | null,
      _panelProps: DisclosurePanelProps | null,
      _panelRender: DisclosurePanelRenderProps | null,
      _group: DisclosureGroupProps | null,
      _groupRender: DisclosureGroupRenderProps | null,
      _button: ButtonProps | null,
      _buttonRender: ButtonRenderProps | null,
      _heading: HeadingProps | null,
      _key: Key | null,
    ) => _statelyProps ?? _state ?? _groupProps ?? _groupState ?? _ariaProps ?? _aria ?? _props ?? _render ?? _panelProps ?? _panelRender ?? _group ?? _groupRender ?? _button ?? _buttonRender ?? _heading ?? _key
    expect(typeof typeProbe).toBe('function')
  })
})
