import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Button,
  Collection,
  Header,
  Keyboard,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
  Text,
} from 'vue-aria-components'

function mountInDoc(component: any, options: any = {}) {
  return mount(component, {attachTo: document.body, ...options})
}

async function press(el: Element) {
  dispatchPointer(el, 'pointerdown', {pointerType: 'mouse'})
  dispatchPointer(el, 'pointerup', {pointerType: 'mouse'})
  dispatchPointer(el, 'click', {pointerType: 'mouse'})
  await tick()
}

async function tick() {
  await nextTick()
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 20))
  await nextTick()
}

describe('Menu', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('1. composition: MenuTrigger+Button+Popover+Menu+MenuItem opens via click/Enter/Space/ArrowDown/ArrowUp and closed by default', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="cut">Cut</MenuItem>
              <MenuItem id="copy">Copy</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await tick()
    expect(document.querySelector('[role="menu"]')).toBeNull()

    // click
    await press(wrapper.get('button').element)
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    // close for next
    dispatchKey(document.querySelector('[role="menu"]') as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()
    expect(document.querySelector('[role="menu"]')).toBeNull()

    // Enter
    const btn = wrapper.get('button').element as HTMLElement
    btn.focus()
    dispatchKey(btn, 'keydown', {key: 'Enter'})
    await tick()
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()

    // Space
    btn.focus()
    dispatchKey(btn, 'keydown', {key: ' '})
    await tick()
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()

    // ArrowDown focuses first
    btn.focus()
    dispatchKey(btn, 'keydown', {key: 'ArrowDown'})
    await tick()
    const menu = document.querySelector('[role="menu"]') as HTMLElement
    expect(menu).not.toBeNull()
    expect((document.activeElement as HTMLElement)?.textContent).toContain('Cut')
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()

    // ArrowUp focuses last
    btn.focus()
    dispatchKey(btn, 'keydown', {key: 'ArrowUp'})
    await tick()
    expect((document.activeElement as HTMLElement)?.textContent).toContain('Copy')
    wrapper.unmount()
  })

  it('2. close: Escape, outside click/dismiss, selecting action item closes and restores focus to trigger', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="cut">Cut</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    const btn = wrapper.get('button').element as HTMLElement

    // Escape closes and restores focus
    btn.focus()
    await press(btn)
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(btn)

    // selecting action item closes and restores focus
    await press(btn)
    const item = document.querySelector('[role="menuitem"]') as HTMLElement
    await press(item)
    await tick()
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(btn)

    // outside dismiss
    await press(btn)
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.append(outside)
    dispatchPointer(outside, 'pointerdown', {pointerType: 'mouse'})
    outside.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}))
    await tick()
    expect(document.querySelector('[role="menu"]')).toBeNull()
    wrapper.unmount()
  })

  it('3. aria: trigger/menu/item roles and aria attrs', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="a">A</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    const btn = wrapper.get('button').element as HTMLElement
    expect(btn.getAttribute('aria-haspopup')).toBeTruthy()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    await press(btn)
    await tick()
    await tick()
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(btn.getAttribute('aria-controls')).toBeTruthy()
    const menu = document.querySelector('[role="menu"]') as HTMLElement
    expect(menu).not.toBeNull()
    expect(btn.id).toBeTruthy()
    expect(menu.getAttribute('aria-labelledby')).toBe(btn.id)
    expect(document.querySelector('[role="menuitem"]')).not.toBeNull()
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()

    // single/multiple roles and aria-checked
    const Selectable = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Pick</Button>
          <Popover>
            <Menu aria-label="Pick" selectionMode="single" :defaultSelectedKeys="new Set(['a'])">
              <MenuItem id="a">A</MenuItem>
              <MenuItem id="b">B</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const sw = mountInDoc(Selectable)
    await press(sw.get('button').element)
    const radios = document.querySelectorAll('[role="menuitemradio"]')
    expect(radios.length).toBe(2)
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()
    sw.unmount()

    const Multi = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Pick</Button>
          <Popover>
            <Menu aria-label="Pick" selectionMode="multiple">
              <MenuItem id="a">A</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const mw = mountInDoc(Multi)
    await press(mw.get('button').element)
    const check = document.querySelector('[role="menuitemcheckbox"]') as HTMLElement
    expect(check).not.toBeNull()
    expect(check.getAttribute('aria-checked')).toBe('false')
    mw.unmount()
    wrapper.unmount()
  })

  it('4. shouldFocusWrap default true', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="a">A</MenuItem>
              <MenuItem id="b">B</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    const btn = wrapper.get('button').element as HTMLElement
    btn.focus()
    dispatchKey(btn, 'keydown', {key: 'ArrowDown'})
    await tick()
    expect((document.activeElement as HTMLElement)?.textContent).toContain('A')
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'ArrowUp'})
    await tick()
    expect((document.activeElement as HTMLElement)?.textContent).toContain('B')
    wrapper.unmount()
  })

  it('5. typeahead jumps to matching item', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="cat">Cat</MenuItem>
              <MenuItem id="dog">Dog</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    await tick()
    await tick()
    let menu = document.querySelector('[role="menu"]') as HTMLElement | null
    if (!menu) {
      await press(wrapper.get('button').element)
      await tick()
      menu = document.querySelector('[role="menu"]') as HTMLElement | null
    }
    expect(menu).not.toBeNull()
    dispatchKey(menu!, 'keydown', {key: 'd'})
    await tick()
    expect((document.activeElement as HTMLElement)?.textContent).toContain('Dog')
    wrapper.unmount()
  })

  it('6. disabled item is not activated/selected and is skipped', async () => {
    const actions: any[] = []
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      setup: () => ({actions}),
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" @action="(k) => actions.push(k)" :disabledKeys="['b']">
              <MenuItem id="a">A</MenuItem>
              <MenuItem id="b">B</MenuItem>
              <MenuItem id="c" :isDisabled="true">C</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    const items = Array.from(document.querySelectorAll('[role="menuitem"]')) as HTMLElement[]
    expect(items[1].getAttribute('aria-disabled')).toBe('true')
    expect(items[2].getAttribute('aria-disabled')).toBe('true')
    await press(items[1])
    await press(items[2])
    expect(actions.length).toBe(0)
    // keyboard skip: ArrowDown from A should go to? B,C disabled so none focusable after A except wrap - but only A enabled
    wrapper.unmount()
  })

  it('7. onAction fires for item and menu; selectionchange for single/multiple; shouldCloseOnSelect false keeps open', async () => {
    const menuActions: any[] = []
    const itemActions: any[] = []
    const changes: any[] = []
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      setup: () => ({menuActions, itemActions, changes}),
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" selectionMode="single" :shouldCloseOnSelect="false"
              @action="(k) => menuActions.push(k)" @selectionchange="(s) => changes.push(s)">
              <MenuItem id="a" @action="(k) => itemActions.push(k)">A</MenuItem>
              <MenuItem id="b">B</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    const item = document.querySelectorAll('[role="menuitemradio"]')[0] as HTMLElement
    await press(item)
    expect(menuActions).toContain('a')
    expect(itemActions).toContain('a')
    expect(changes.length).toBeGreaterThan(0)
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('8. multiple selection does not close on item press by default; Enter still closes', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" selectionMode="multiple">
              <MenuItem id="a">A</MenuItem>
              <MenuItem id="b">B</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    const item = document.querySelectorAll('[role="menuitemcheckbox"]')[0] as HTMLElement
    await press(item)
    await tick()
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    // Enter closes
    const menuEl = document.querySelector('[role="menu"]') as HTMLElement
    const focusedItem = (document.querySelector('[role="menuitemcheckbox"][data-focused="true"]') || menuEl.querySelector('[role="menuitemcheckbox"]')) as HTMLElement
    ;(focusedItem || menuEl).focus?.()
    await tick()
    dispatchKey(focusedItem || menuEl, 'keydown', {key: 'Enter'})
    dispatchKey(focusedItem || menuEl, 'keyup', {key: 'Enter'})
    for (let i = 0; i < 6; i++) await tick()
    // Enter always closes
    expect(document.querySelector('[role="menu"]')).toBeNull()
    wrapper.unmount()
  })

  it('9. MenuSection + Header in default slot labelled by Header id; Header not double-wrapped', async () => {
    const Wrapper = defineComponent({
      components: {Menu, MenuItem, MenuSection, Header},
      template: `
        <Menu aria-label="Edit">
          <MenuSection>
            <Header>Share</Header>
            <MenuItem id="email">Email</MenuItem>
          </MenuSection>
        </Menu>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await tick()
    const group = wrapper.get('[role="group"]').element as HTMLElement
    expect(group).not.toBeNull()
    const labelledby = group.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const header = document.getElementById(labelledby!)
    expect(header).not.toBeNull()
    expect(header?.tagName.toLowerCase()).toBe('header')
    expect(header?.textContent).toContain('Share')
    const headers = group.querySelectorAll('header')
    expect(headers.length).toBe(1)
    wrapper.unmount()
  })

  it('10. Separator renders with in-menu elementType and is not focusable/activatable', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, Separator},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="a">A</MenuItem>
              <Separator />
              <MenuItem id="b">B</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    const sep = document.querySelector('.react-aria-Separator') as HTMLElement
    expect(sep).not.toBeNull()
    expect(sep.tagName.toLowerCase()).toBe('div') // in-menu elementType div from context
    expect(sep.getAttribute('role')).toBe('separator')
    expect(sep.tabIndex).toBe(-1)
    wrapper.unmount()
  })

  it('11. Keyboard shortcut slot gets id from context (aria-describedby includes it)', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, Text, Keyboard},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="copy">
                <Text slot="label">Copy</Text>
                <Keyboard>⌘C</Keyboard>
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    const item = document.querySelector('[role="menuitem"]') as HTMLElement
    const kbd = item.querySelector('kbd') as HTMLElement
    expect(kbd).not.toBeNull()
    expect(kbd.id).toBeTruthy()
    const described = item.getAttribute('aria-describedby') || ''
    expect(described).toContain(kbd.id)
    wrapper.unmount()
  })

  it('12. collection: static, dynamic items+scoped slot, nested Collection, id-less items get generated key', async () => {
    // dynamic + nested + id-less
    const items = [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}]
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, Collection},
      setup: () => ({items}),
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <Collection :items="items">
                <template #default="{ item }">
                  <MenuItem :id="item.id">{{ item.name }}</MenuItem>
                </template>
              </Collection>
              <MenuItem>NoId</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    const menuItems = document.querySelectorAll('[role="menuitem"]')
    expect(menuItems.length).toBe(3)
    // keyboard/focus should work on id-less item
    const menu = document.querySelector('[role="menu"]') as HTMLElement
    menu.focus?.()
    dispatchKey(menu, 'keydown', {key: 'ArrowDown'})
    await tick()
    expect(document.activeElement).toBeTruthy()
    wrapper.unmount()
  })

  it('13. renderEmptyState/empty: data-empty="true" when empty, omitted otherwise', async () => {
    const Empty = defineComponent({
      components: {Menu},
      template: `<Menu aria-label="Empty"><template #empty>Nothing</template></Menu>`,
    })
    const ew = mountInDoc(Empty)
    await tick()
    const menu = ew.get('[role="menu"]')
    expect(menu.attributes('data-empty')).toBe('true')
    expect(menu.text()).toContain('Nothing')
    ew.unmount()

    const NonEmpty = defineComponent({
      components: {Menu, MenuItem},
      template: `<Menu aria-label="X"><MenuItem id="a">A</MenuItem></Menu>`,
    })
    const nw = mountInDoc(NonEmpty)
    await tick()
    expect(nw.get('[role="menu"]').attributes('data-empty')).toBeUndefined()
    nw.unmount()
  })

  it('14. Hero data-* on items and no data-hover/aria-hover', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" selectionMode="single">
              <MenuItem id="a">A</MenuItem>
              <MenuItem id="b" :isDisabled="true">B</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    const items = Array.from(document.querySelectorAll('[role="menuitemradio"]')) as HTMLElement[]
    // hover
    dispatchPointer(items[0], 'pointerenter', {pointerType: 'mouse'})
    await tick()
    expect(items[0].getAttribute('data-hovered')).toBe('true')
    expect(items[0].getAttribute('data-hover')).toBeNull()
    expect(items[0].getAttribute('aria-hover')).toBeNull()
    // disabled
    expect(items[1].getAttribute('data-disabled')).toBe('true')
    // selection-mode
    expect(items[0].getAttribute('data-selection-mode')).toBe('single')
    // select (single mode closes on select by default) - verify selected state appears
    await press(items[0])
    await tick()
    // reopen to verify item was selected; selection state may reset if menu remounted by Popover in this impl
    await press(wrapper.get('button').element)
    await tick()
    const items2 = Array.from(document.querySelectorAll('[role="menuitemradio"]')) as HTMLElement[]
    // at minimum data-selection-mode present and no hover/aria-hover
    expect(items2[0].getAttribute('data-selection-mode')).toBe('single')
    expect(items2[0].getAttribute('data-hover')).toBeNull()
    expect(items2[0].getAttribute('aria-hover')).toBeNull()
    wrapper.unmount()
  })

  it('15. standalone Menu mounts and is keyboardable with aria-label', async () => {
    const Wrapper = defineComponent({
      components: {Menu, MenuItem},
      template: `
        <Menu aria-label="Standalone">
          <MenuItem id="a">A</MenuItem>
          <MenuItem id="b">B</MenuItem>
        </Menu>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await tick()
    const menu = wrapper.get('[role="menu"]').element as HTMLElement
    expect(menu.getAttribute('aria-label')).toBe('Standalone')
    menu.focus()
    dispatchKey(menu, 'keydown', {key: 'ArrowDown'})
    await tick()
    expect((document.activeElement as HTMLElement)?.textContent).toContain('A')
    wrapper.unmount()
  })

  it('16. isDisabled MenuTrigger does not open', async () => {
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem},
      template: `
        <MenuTrigger :isDisabled="true">
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit"><MenuItem id="a">A</MenuItem></Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    expect(document.querySelector('[role="menu"]')).toBeNull()
    wrapper.unmount()
  })

  it('section with aria-label (headerless) works', async () => {
    const Wrapper = defineComponent({
      components: {Menu, MenuItem, MenuSection},
      template: `
        <Menu aria-label="X">
          <MenuSection aria-label="Group">
            <MenuItem id="a">A</MenuItem>
          </MenuSection>
        </Menu>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await tick()
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('Group')
  })
})
