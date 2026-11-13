import {defineComponent, nextTick} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Button,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  SubmenuTrigger,
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

async function tick(ms = 20) {
  await nextTick()
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, ms))
  await nextTick()
}

async function flush() {
  await nextTick()
  await nextTick()
}

function getMenus() {
  return Array.from(document.querySelectorAll('[role="menu"]')) as HTMLElement[]
}
function getMenuItems(menu?: HTMLElement | null) {
  const root = menu ?? document
  return Array.from(root.querySelectorAll('[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"]')) as HTMLElement[]
}
function getSubmenuPopovers() {
  return Array.from(document.querySelectorAll('[data-trigger="SubmenuTrigger"]')) as HTMLElement[]
}
function findItemByText(text: string) {
  return getMenuItems().find((el) => (el.textContent || '').trim() === text) as HTMLElement | undefined
}

async function focusItemInMenu(menu: HTMLElement, text: string) {
  // move focus via keyboard navigation within menu
  const allItems = getMenuItems(menu)
  const target = allItems.find((i) => (i.textContent || '').trim() === text)
  if (!target) throw new Error(`item ${text} not found`)
  // ensure menu has focus context
  if (!menu.contains(document.activeElement)) {
    ;(getMenuItems(menu)[0] as HTMLElement).focus()
    await tick()
  }
  for (let i = 0; i < 10; i++) {
    if (document.activeElement === target) return target
    dispatchKey(document.activeElement as HTMLElement || menu, 'keydown', {key: 'ArrowDown'})
    await tick()
  }
  // try from top
  dispatchKey(menu, 'keydown', {key: 'Home'})
  await tick()
  for (let i = 0; i < 10; i++) {
    if (document.activeElement === target) return target
    dispatchKey(document.activeElement as HTMLElement || menu, 'keydown', {key: 'ArrowDown'})
    await tick()
  }
  throw new Error(`could not focus ${text}`)
}

const BasicSubmenu = defineComponent({
  components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
  props: {
    delay: {type: Number, default: 200},
    placement: {type: String, default: undefined},
  },
  template: `
    <MenuTrigger>
      <Button>Edit</Button>
      <Popover>
        <Menu aria-label="Edit">
          <MenuItem id="cut">Cut</MenuItem>
          <SubmenuTrigger :delay="delay">
            <MenuItem id="share">Share</MenuItem>
            <Popover :placement="placement">
              <Menu aria-label="Share">
                <MenuItem id="email">Email</MenuItem>
                <MenuItem id="sms">SMS</MenuItem>
              </Menu>
            </Popover>
          </SubmenuTrigger>
          <MenuItem id="paste">Paste</MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  `,
})

async function openRootMenu(wrapper: any) {
  await press(wrapper.get('button').element)
  await tick()
  return getMenus()[0]
}

describe('SubmenuTrigger', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('1. composition: official-style renders; parent has trigger among menuitems; inner items not in parent until open', async () => {
    const wrapper = mountInDoc(BasicSubmenu)
    const root = await openRootMenu(wrapper)
    expect(root).toBeTruthy()
    const rootItems = getMenuItems(root)
    expect(rootItems.map((i) => i.textContent?.trim())).toEqual(['Cut', 'Share', 'Paste'])
    expect(root.textContent).not.toContain('Email')
    expect(getMenus().length).toBe(1)

    // open submenu via keyboard
    const share = await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(2)
    const sub = getMenus()[1]
    expect(getMenuItems(sub).map((i) => i.textContent?.trim())).toEqual(['Email', 'SMS'])
    expect(getMenuItems(root).some((i) => i.textContent?.trim() === 'Email')).toBe(false)
    wrapper.unmount()
  })

  it('2. closed/open ARIA and data-has-submenu/data-open; submenu popover has data-trigger="SubmenuTrigger"', async () => {
    const wrapper = mountInDoc(BasicSubmenu)
    const root = await openRootMenu(wrapper)
    const share = await focusItemInMenu(root, 'Share')
    expect(share.getAttribute('aria-haspopup')).toBe('menu')
    expect(share.getAttribute('aria-expanded')).toBe('false')
    expect(share.getAttribute('data-has-submenu')).toBe('true')
    expect(share.getAttribute('data-open')).toBeNull()
    expect(share.getAttribute('aria-controls')).toBeNull()

    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(share.getAttribute('aria-expanded')).toBe('true')
    expect(share.getAttribute('data-open')).toBe('true')
    expect(share.getAttribute('aria-controls')).toBeTruthy()
    const popovers = getSubmenuPopovers()
    expect(popovers.length).toBeGreaterThan(0)
    expect(popovers[0].getAttribute('data-trigger')).toBe('SubmenuTrigger')
    wrapper.unmount()
  })

  it('3. hover opens after default delay 200 (not immediately); custom delay honored; cancelled if pointer leaves early', async () => {
    vi.useFakeTimers()
    const wrapper = mountInDoc(BasicSubmenu, {props: {delay: 200}})
    const btn = wrapper.get('button').element
    dispatchPointer(btn, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(btn, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(btn, 'click', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(30)
    await flush()
    const share = findItemByText('Share')!
    expect(share).toBeTruthy()
    dispatchPointer(share, 'pointerenter', {pointerType: 'mouse'})
    dispatchPointer(share, 'pointerover', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(150)
    await flush()
    expect(getMenus().length).toBe(1)
    await vi.advanceTimersByTimeAsync(60)
    await flush()
    expect(getMenus().length).toBe(2)
    wrapper.unmount()

    // custom delay
    vi.useRealTimers()
    document.body.replaceChildren()
    vi.useFakeTimers()
    const w2 = mountInDoc(BasicSubmenu, {props: {delay: 400}})
    const btn2 = w2.get('button').element
    dispatchPointer(btn2, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(btn2, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(btn2, 'click', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(30)
    await flush()
    const share2 = findItemByText('Share')!
    dispatchPointer(share2, 'pointerenter', {pointerType: 'mouse'})
    dispatchPointer(share2, 'pointerover', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(250)
    await flush()
    expect(getMenus().length).toBe(1)
    await vi.advanceTimersByTimeAsync(200)
    await flush()
    expect(getMenus().length).toBe(2)
    w2.unmount()

    // cancelled if pointer leaves early
    vi.useRealTimers()
    document.body.replaceChildren()
    vi.useFakeTimers()
    const w3 = mountInDoc(BasicSubmenu, {props: {delay: 200}})
    const btn3 = w3.get('button').element
    dispatchPointer(btn3, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(btn3, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(btn3, 'click', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(30)
    await flush()
    const share3 = findItemByText('Share')!
    dispatchPointer(share3, 'pointerenter', {pointerType: 'mouse'})
    dispatchPointer(share3, 'pointerover', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(100)
    await flush()
    dispatchPointer(share3, 'pointerleave', {pointerType: 'mouse'})
    dispatchPointer(share3, 'pointerout', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(300)
    await flush()
    expect(getMenus().length).toBe(1)
    w3.unmount()
  })

  it('4. placement context default is end top when Popover does not pass explicit placement; explicit Popover placement still wins', async () => {
    const w1 = mountInDoc(BasicSubmenu)
    const root = await openRootMenu(w1)
    const share = await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    const pop = getSubmenuPopovers()[0]
    expect(pop).toBeTruthy()
    // "end top" resolves to right side in LTR; our placement sets data-placement to main axis
    expect(pop.getAttribute('data-placement')).toBe('right')
    w1.unmount()

    document.body.replaceChildren()
    const w2 = mountInDoc(BasicSubmenu, {props: {placement: 'bottom start'}})
    const root2 = await openRootMenu(w2)
    const share2 = await focusItemInMenu(root2, 'Share')
    dispatchKey(share2, 'keydown', {key: 'ArrowRight'})
    await tick()
    const pop2 = getSubmenuPopovers()[0]
    expect(pop2.getAttribute('data-placement')).toBe('bottom')
    w2.unmount()
  })

  it('5. keyboard: LTR ArrowRight opens and focuses first submenu item; ArrowLeft closes and focuses trigger. RTL reverses', async () => {
    const wrapper = mountInDoc(BasicSubmenu)
    const root = await openRootMenu(wrapper)
    const share = await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(document.activeElement?.textContent?.trim()).toBe('Email')

    const sub = getMenus()[1]
    dispatchKey(sub, 'keydown', {key: 'ArrowLeft'})
    await tick()
    expect(getMenus().length).toBe(1)
    expect(document.activeElement).toBe(share)
    wrapper.unmount()

    // RTL
    document.body.replaceChildren()
    const RTL = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
      template: `
        <div dir="rtl">
          <MenuTrigger>
            <Button>Edit</Button>
            <Popover>
              <Menu aria-label="Edit">
                <SubmenuTrigger>
                  <MenuItem id="share">Share</MenuItem>
                  <Popover>
                    <Menu aria-label="Share">
                      <MenuItem id="email">Email</MenuItem>
                    </Menu>
                  </Popover>
                </SubmenuTrigger>
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
      `,
    })
    const w2 = mountInDoc(RTL)
    await press(w2.get('button').element)
    await tick()
    const root2 = getMenus()[0]
    const share2 = await focusItemInMenu(root2, 'Share')
    dispatchKey(share2, 'keydown', {key: 'ArrowLeft'})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(document.activeElement?.textContent?.trim()).toBe('Email')
    const sub2 = getMenus()[1]
    dispatchKey(sub2, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(1)
    expect(document.activeElement).toBe(share2)
    w2.unmount()
  })

  it('6. Enter/Space on the trigger opens the submenu and does not fire item onAction / does not close the root', async () => {
    const actions: string[] = []
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
      setup: () => ({actions}),
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" @action="(k) => actions.push(String(k))">
              <SubmenuTrigger>
                <MenuItem id="share">Share</MenuItem>
                <Popover>
                  <Menu aria-label="Share">
                    <MenuItem id="email">Email</MenuItem>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    const root = await openRootMenu(wrapper)
    const share = await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'Enter'})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(actions).toEqual([])
    expect(getMenus()[0]).toBeTruthy()
    wrapper.unmount()

    document.body.replaceChildren()
    const w2 = mountInDoc(Wrapper)
    const root2 = await openRootMenu(w2)
    const share2 = await focusItemInMenu(root2, 'Share')
    dispatchKey(share2, 'keydown', {key: ' '})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(actions.length).toBe(0)
    w2.unmount()
  })

  it('7. Escape closes the submenu only; root stays open; focus returns to the trigger. Nested Escape closes only innermost and focuses that level’s trigger', async () => {
    const wrapper = mountInDoc(BasicSubmenu)
    const root = await openRootMenu(wrapper)
    const share = await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(2)
    const sub = getMenus()[1]
    dispatchKey(sub, 'keydown', {key: 'Escape'})
    await tick()
    expect(getMenus().length).toBe(1)
    expect(document.activeElement).toBe(share)
    wrapper.unmount()

    // Nested
    document.body.replaceChildren()
    const Nested = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <SubmenuTrigger>
                <MenuItem id="share">Share</MenuItem>
                <Popover>
                  <Menu aria-label="Share">
                    <SubmenuTrigger>
                      <MenuItem id="more">More</MenuItem>
                      <Popover>
                        <Menu aria-label="More">
                          <MenuItem id="deep">Deep</MenuItem>
                        </Menu>
                      </Popover>
                    </SubmenuTrigger>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const w2 = mountInDoc(Nested)
    const root2 = await openRootMenu(w2)
    const share2 = await focusItemInMenu(root2, 'Share')
    dispatchKey(share2, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(2)
    const sub1 = getMenus()[1]
    const more = await focusItemInMenu(sub1, 'More')
    dispatchKey(more, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(3)
    const innermost = getMenus()[2]
    dispatchKey(innermost, 'keydown', {key: 'Escape'})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(document.activeElement).toBe(more)
    w2.unmount()
  })

  it('8. choosing a submenu item closes the whole tree (and onAction gets the inner item key)', async () => {
    const actions: string[] = []
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
      setup: () => ({actions}),
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" @action="(k) => actions.push(String(k))">
              <SubmenuTrigger>
                <MenuItem id="share">Share</MenuItem>
                <Popover>
                  <Menu aria-label="Share" @action="(k) => actions.push('inner:' + String(k))">
                    <MenuItem id="email">Email</MenuItem>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    const root = await openRootMenu(wrapper)
    const share = await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    const email = findItemByText('Email')!
    await press(email)
    await tick()
    expect(getMenus().length).toBe(0)
    expect(actions.join(',')).toContain('email')
    wrapper.unmount()
  })

  it('9. safe-path / hover intent: moving toward the submenu does not immediately close it; moving to a different parent item does close it', async () => {
    vi.useFakeTimers()
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <MenuItem id="cut">Cut</MenuItem>
              <SubmenuTrigger>
                <MenuItem id="share">Share</MenuItem>
                <Popover>
                  <Menu aria-label="Share">
                    <MenuItem id="email">Email</MenuItem>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
              <MenuItem id="paste">Paste</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    const btn = wrapper.get('button').element
    dispatchPointer(btn, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(btn, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(btn, 'click', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(30)
    await flush()
    const share = findItemByText('Share')!
    const cut = findItemByText('Cut')!
    // Open submenu via hover
    dispatchPointer(share, 'pointerenter', {pointerType: 'mouse'})
    dispatchPointer(share, 'pointerover', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(250)
    await flush()
    expect(getMenus().length).toBe(2)
    const parentMenu = getMenus()[0]
    const submenu = getMenus()[1]
    // Mock rects to simulate moving pointer toward submenu
    const menuRect = {left: 0, top: 0, right: 100, bottom: 200, width: 100, height: 200, x: 0, y: 0, toJSON() {}} as DOMRect
    const submenuRect = {left: 110, top: 40, right: 210, bottom: 140, width: 100, height: 100, x: 110, y: 40, toJSON() {}} as DOMRect
    parentMenu.getBoundingClientRect = () => menuRect
    submenu.getBoundingClientRect = () => submenuRect
    window.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: 90, clientY: 65, pointerType: 'mouse'}))
    await vi.advanceTimersByTimeAsync(60)
    await flush()
    window.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: 95, clientY: 60, pointerType: 'mouse'}))
    await vi.advanceTimersByTimeAsync(60)
    await flush()
    // pointer-events none should be applied on parent menu during safe path
    expect(parentMenu.style.pointerEvents).toBe('none')
    expect(getMenus().length).toBe(2)

    // Move clearly to different parent item (upward, away from submenu) and focus it.
    parentMenu.style.pointerEvents = ''
    window.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: 10, clientY: 30, pointerType: 'mouse'}))
    await vi.advanceTimersByTimeAsync(60)
    await flush()
    window.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: 10, clientY: 20, pointerType: 'mouse'}))
    await vi.advanceTimersByTimeAsync(60)
    await flush()
    // parent menu focusin on different item closes submenu
    ;(cut as HTMLElement).focus()
    cut.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
    await vi.advanceTimersByTimeAsync(100)
    await flush()
    expect(getMenus().length).toBe(1)
    wrapper.unmount()
  })

  it('10. focus: hover-open does not steal focus from trigger; keyboard-open focuses first inner item; after Escape, trigger is focused', async () => {
    vi.useFakeTimers()
    const wrapper = mountInDoc(BasicSubmenu)
    const btn = wrapper.get('button').element
    dispatchPointer(btn, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(btn, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(btn, 'click', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(30)
    await flush()
    const share = findItemByText('Share')!
    share.focus()
    await vi.advanceTimersByTimeAsync(10)
    await flush()
    dispatchPointer(share, 'pointerenter', {pointerType: 'mouse'})
    dispatchPointer(share, 'pointerover', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(250)
    await flush()
    expect(getMenus().length).toBe(2)
    // hover open keeps focus on trigger
    expect(document.activeElement).toBe(share)
    wrapper.unmount()

    // keyboard open focuses first inner item
    vi.useRealTimers()
    document.body.replaceChildren()
    const w2 = mountInDoc(BasicSubmenu)
    const root = await openRootMenu(w2)
    const share2 = await focusItemInMenu(root, 'Share')
    dispatchKey(share2, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(document.activeElement?.textContent?.trim()).toBe('Email')

    // after Escape, trigger is focused
    const sub = getMenus()[1]
    dispatchKey(sub, 'keydown', {key: 'Escape'})
    await tick()
    expect(document.activeElement).toBe(share2)
    w2.unmount()
  })

  it('11. interact outside the root closes all; click inside the submenu tree does not', async () => {
    const wrapper = mountInDoc(BasicSubmenu)
    const root = await openRootMenu(wrapper)
    const share = await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(2)
    // click inside submenu tree should not close root
    const subPopover = getSubmenuPopovers()[0]
    expect(subPopover).toBeTruthy()
    subPopover.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, pointerId: 1}))
    subPopover.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}))
    await tick()
    expect(getMenus().length).toBe(2)

    // interact outside root closes all
    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.append(outside)
    dispatchPointer(outside, 'pointerdown', {pointerType: 'mouse'})
    outside.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}))
    await tick()
    expect(getMenus().length).toBe(0)
    outside.remove()
    wrapper.unmount()
  })

  it('12. nested SubmenuTrigger (two levels) for open/ARIA/Escape/select', async () => {
    const actions: string[] = []
    const Nested = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
      setup: () => ({actions}),
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" @action="(k) => actions.push('root:' + String(k))">
              <SubmenuTrigger>
                <MenuItem id="share">Share</MenuItem>
                <Popover>
                  <Menu aria-label="Share" @action="(k) => actions.push('s1:' + String(k))">
                    <SubmenuTrigger>
                      <MenuItem id="more">More</MenuItem>
                      <Popover>
                        <Menu aria-label="More" @action="(k) => actions.push('s2:' + String(k))">
                          <MenuItem id="deep">Deep</MenuItem>
                        </Menu>
                      </Popover>
                    </SubmenuTrigger>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Nested)
    const root = await openRootMenu(wrapper)
    const share = await focusItemInMenu(root, 'Share')
    expect(share.getAttribute('aria-expanded')).toBe('false')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(share.getAttribute('aria-expanded')).toBe('true')
    const sub1 = getMenus()[1]
    const more = await focusItemInMenu(sub1, 'More')
    expect(more.getAttribute('aria-haspopup')).toBe('menu')
    dispatchKey(more, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(3)
    expect(more.getAttribute('aria-expanded')).toBe('true')

    // Escape innermost
    const innermost = getMenus()[2]
    dispatchKey(innermost, 'keydown', {key: 'Escape'})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(document.activeElement).toBe(more)

    // reopen and select deep
    dispatchKey(more, 'keydown', {key: 'ArrowRight'})
    await tick()
    const deep = findItemByText('Deep')!
    await press(deep)
    await tick()
    expect(getMenus().length).toBe(0)
    expect(actions.some((a) => a.includes('deep'))).toBe(true)
    wrapper.unmount()
  })

  it('13. SubmenuTrigger inside MenuSection (keys, keyboard, ARIA)', async () => {
    const actions: string[] = []
    const Sectioned = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, MenuSection, SubmenuTrigger},
      setup: () => ({actions}),
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit" @action="(k) => actions.push(String(k))">
              <MenuSection aria-label="Actions">
                <MenuItem id="cut">Cut</MenuItem>
                <SubmenuTrigger>
                  <MenuItem id="share">Share</MenuItem>
                  <Popover>
                    <Menu aria-label="Share" @action="(k) => actions.push('inner:' + String(k))">
                      <MenuItem id="email">Email</MenuItem>
                    </Menu>
                  </Popover>
                </SubmenuTrigger>
              </MenuSection>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Sectioned)
    const root = await openRootMenu(wrapper)
    const share = findItemByText('Share')!
    expect(root.contains(share)).toBe(true)
    expect(share.getAttribute('aria-haspopup')).toBe('menu')
    await focusItemInMenu(root, 'Share')
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await tick()
    expect(getMenus().length).toBe(2)
    expect(document.activeElement?.textContent?.trim()).toBe('Email')
    const email = findItemByText('Email')!
    await press(email)
    await tick()
    expect(getMenus().length).toBe(0)
    expect(actions).toContain('inner:email')
    wrapper.unmount()
  })

  it('14. disabled trigger does not open', async () => {
    vi.useFakeTimers()
    const Wrapper = defineComponent({
      components: {MenuTrigger, Button, Popover, Menu, MenuItem, SubmenuTrigger},
      template: `
        <MenuTrigger>
          <Button>Edit</Button>
          <Popover>
            <Menu aria-label="Edit">
              <SubmenuTrigger>
                <MenuItem id="share" :isDisabled="true">Share</MenuItem>
                <Popover>
                  <Menu aria-label="Share">
                    <MenuItem id="email">Email</MenuItem>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
            </Menu>
          </Popover>
        </MenuTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    const btn = wrapper.get('button').element
    dispatchPointer(btn, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(btn, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(btn, 'click', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(30)
    await flush()
    const share = findItemByText('Share')!
    expect(share).toBeTruthy()
    // hover
    dispatchPointer(share, 'pointerenter', {pointerType: 'mouse'})
    dispatchPointer(share, 'pointerover', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(300)
    await flush()
    expect(getMenus().length).toBe(1)
    // press
    dispatchPointer(share, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(share, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(share, 'click', {pointerType: 'mouse'})
    await vi.advanceTimersByTimeAsync(50)
    await flush()
    expect(getMenus().length).toBe(1)
    // keyboard arrows
    share.focus()
    dispatchKey(share, 'keydown', {key: 'ArrowRight'})
    await vi.advanceTimersByTimeAsync(50)
    await flush()
    expect(getMenus().length).toBe(1)
    // should not advertise popup when disabled
    expect(share.getAttribute('aria-haspopup')).toBeNull()
    wrapper.unmount()
  })

  it('15. existing Menu / ListBox / Button / overlay tests still pass, including DialogTrigger+Popover', async () => {
    const {DialogTrigger, Dialog} = await import('vue-aria-components')
    const Wrapper = defineComponent({
      components: {DialogTrigger, Button, Popover, Dialog},
      template: `
        <DialogTrigger>
          <Button>Open</Button>
          <Popover>
            <Dialog aria-label="D">Hello</Dialog>
          </Popover>
        </DialogTrigger>
      `,
    })
    const wrapper = mountInDoc(Wrapper)
    await press(wrapper.get('button').element)
    await tick()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })
})
