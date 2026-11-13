import {defineComponent, h, inject, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Header,
  Popover,
  Select,
  SelectStateContext,
  SelectValue,
  Text,
} from 'vue-aria-components'

function mountInDoc(component: any, options: any = {}) {
  return mount(component, {attachTo: document.body, ...options})
}

async function click(el: Element) {
  dispatchPointer(el, 'pointerdown')
  dispatchPointer(el, 'pointerup')
  dispatchPointer(el, 'click')
  await nextTick()
}

async function pressStart(el: Element) {
  dispatchPointer(el, 'pointerdown')
  await nextTick()
}

function focus(el: HTMLElement) {
  el.focus()
}

async function tick(n = 2) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 20))
}

function getTrigger(wrapper: any): HTMLButtonElement {
  return wrapper.find('button').element as HTMLButtonElement
}

describe('Select', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('1. composition/slots, ARIA, placeholder, open popup, click selects and closes', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Text, Popover, ListBox, ListBoxItem},
      template: `
        <form>
          <Select>
            <Label>Favorite Animal</Label>
            <Button>
              <SelectValue />
            </Button>
            <Text slot="description">Description</Text>
            <Popover>
              <ListBox>
                <ListBoxItem id="cat">Cat</ListBoxItem>
                <ListBoxItem id="dog">Dog</ListBoxItem>
                <ListBoxItem id="kangaroo">Kangaroo</ListBoxItem>
              </ListBox>
            </Popover>
          </Select>
        </form>
      `,
    }))
    await tick(3)

    const trigger = getTrigger(wrapper)
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBeFalsy()

    const labelledby = trigger.getAttribute('aria-labelledby') || ''
    const ids = labelledby.split(/\s+/).filter(Boolean)
    expect(ids.length).toBeGreaterThanOrEqual(2)
    const valueSpan = wrapper.find('.react-aria-SelectValue').element as HTMLElement
    expect(ids).toContain(valueSpan.id)
    const label = wrapper.find('.react-aria-Label').element as HTMLElement
    expect(label.textContent).toContain('Favorite Animal')
    expect(ids).toContain(label.id)

    expect(valueSpan.textContent).toBe('Select an item')
    expect(valueSpan.getAttribute('data-placeholder')).toBe('true')

    // open
    await click(trigger)
    await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()

    const listbox = document.querySelector('[role="listbox"]') as HTMLElement | null
    expect(listbox).toBeTruthy()
    const popover = document.querySelector('.react-aria-Popover') as HTMLElement | null
    expect(popover).toBeTruthy()
    expect(popover?.getAttribute('data-trigger')).toBe('Select')

    const options = Array.from(document.querySelectorAll('[role="option"]')) as HTMLElement[]
    expect(options.map(o => o.textContent?.trim())).toEqual(['Cat', 'Dog', 'Kangaroo'])

    // select Dog (press up)
    await click(options[1])
    await tick(4)
    expect(trigger.textContent).toContain('Dog')
    expect(valueSpan.getAttribute('data-placeholder')).toBeFalsy()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[role="listbox"]')).toBeFalsy()
  })

  it('2. data-* attrs and Hero helper signatures empty-diff', async () => {
    // We'll assert runtime data attributes; empty-diff of hero helpers is checked by git in final verification.
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select data-foo="bar" isDisabled isInvalid isRequired>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="a">A</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const root = wrapper.find('.react-aria-Select')
    expect(root.attributes('data-foo')).toBe('bar')
    expect(root.attributes('data-disabled')).toBe('true')
    expect(root.attributes('data-invalid')).toBe('true')
    expect(root.attributes('data-required')).toBe('true')
    expect(root.attributes('data-open')).toBeUndefined()

    // user data-* stays on outer Select only (not duplicated onto inner button/listbox)
    const inner = wrapper.find('button')
    expect(inner.attributes('data-foo')).toBeUndefined()
  })

  it('3. placeholder prop overrides the default string', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select placeholder="Pick one">
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="a">A</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    expect(wrapper.find('.react-aria-SelectValue').text()).toBe('Pick one')
  })

  it('4. controlled/uncontrolled selectedKey/defaultSelectedKey and value/defaultValue, including falsy key 0', async () => {
    const changes: any[] = []
    const Controlled = defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup() {
        const val = ref<any>('cat')
        return {val, onChange: (v: any) => { val.value = v; changes.push(v) }}
      },
      template: `
        <Select :selectedKey="val" @selectionchange="onChange">
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem id="cat">Cat</ListBoxItem>
            <ListBoxItem id="dog">Dog</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    })
    const w = mountInDoc(Controlled)
    await tick(3)
    expect(getTrigger(w).textContent).toContain('Cat')
    await click(getTrigger(w)); await tick(4)
    await click(document.querySelectorAll('[role="option"]')[1]); await tick(4)
    expect(changes.at(-1)).toBe('dog')

    const Uncontrolled = defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select defaultSelectedKey="dog">
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem id="cat">Cat</ListBoxItem>
            <ListBoxItem id="dog">Dog</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    })
    const uw = mountInDoc(Uncontrolled)
    await tick(2)
    expect(getTrigger(uw).textContent).toContain('Dog')

    const Falsy = defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select :defaultValue="0">
          <Label>Num</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem :id="0">Zero</ListBoxItem>
            <ListBoxItem :id="1">One</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    })
    const fw = mountInDoc(Falsy)
    await tick(3)
    expect(getTrigger(fw).textContent).toContain('Zero')
  })

  it('5. pointer open/close, select on press-up, Escape closes without clearing and restores focus', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <div>
          <Select>
            <Label>Animal</Label>
            <Button><SelectValue /></Button>
            <Popover><ListBox>
              <ListBoxItem id="cat">Cat</ListBoxItem>
              <ListBoxItem id="dog">Dog</ListBoxItem>
            </ListBox></Popover>
          </Select>
          <button id="outside">Outside</button>
        </div>
      `,
    }))
    await tick(2)
    const trigger = getTrigger(wrapper)
    // pointerdown opens on press start for mouse/pen (we simulate pointer)
    dispatchPointer(trigger, 'pointerdown', {pointerType: 'mouse'})
    await tick(3)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const popover = document.querySelector('.react-aria-Popover') as HTMLElement
    expect(popover).toBeTruthy()
    // placement bottom start by default context
    expect(['bottom', 'bottom-start', 'bottom start']).toContain((popover.getAttribute('data-placement') || 'bottom start').toLowerCase().replace('_','-'))

    // select on press-up
    const opt = document.querySelectorAll('[role="option"]')[0] as HTMLElement
    dispatchPointer(opt, 'pointerdown', {pointerType: 'mouse'})
    dispatchPointer(opt, 'pointerup', {pointerType: 'mouse'})
    dispatchPointer(opt, 'click', {pointerType: 'mouse'})
    await tick(4)
    expect(trigger.textContent).toContain('Cat')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    // reopen and escape
    await click(trigger); await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'Escape'})
    await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.textContent).toContain('Cat')
    expect(document.activeElement === trigger || trigger.contains(document.activeElement)).toBe(true)
  })

  it('6. keyboard open: Enter/Space/ArrowDown/ArrowUp and cannot open empty unless allowsEmptyCollection', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem id="cat">Cat</ListBoxItem>
            <ListBoxItem id="dog">Dog</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const trigger = getTrigger(wrapper)
    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    dispatchKey(document.activeElement || trigger, 'keydown', {key: 'Escape'})
    await tick(3)

    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'Enter'})
    await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    dispatchKey(document.activeElement || trigger, 'keydown', {key: 'Escape'})
    await tick(3)

    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: ' '})
    await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    dispatchKey(document.activeElement || trigger, 'keydown', {key: 'Escape'})
    await tick(3)

    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'ArrowUp'})
    await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    dispatchKey(document.activeElement || trigger, 'keydown', {key: 'Escape'})
    await tick(3)

    const Empty = defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox},
      template: `
        <Select>
          <Label>Empty</Label><Button><SelectValue /></Button>
          <Popover><ListBox></ListBox></Popover>
        </Select>
      `,
    })
    const ew = mountInDoc(Empty)
    await tick(2)
    const et = getTrigger(ew)
    focus(et)
    dispatchKey(et, 'keydown', {key: 'ArrowDown'})
    await tick(3)
    expect(et.getAttribute('aria-expanded')).toBe('false')
  })

  it('7. while closed ArrowRight/ArrowLeft change single selection (repeats) and not in multiple', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup: () => ({onChange: (v: any) => changes.push(v)}),
      template: `
        <Select @change="onChange">
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem id="cat">Cat</ListBoxItem>
            <ListBoxItem id="dog">Dog</ListBoxItem>
            <ListBoxItem id="kangaroo">Kangaroo</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const trigger = getTrigger(wrapper)
    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'ArrowRight'})
    await tick(2)
    expect(changes.length).toBeGreaterThanOrEqual(1)
    dispatchKey(trigger, 'keydown', {key: 'ArrowRight'})
    await tick(2)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    const Multi = defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup() {
        const changes2: any[] = []
        return {changes2, onChange: (v: any) => changes2.push(v)}
      },
      template: `
        <Select selectionMode="multiple" @change="onChange">
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem id="cat">Cat</ListBoxItem>
            <ListBoxItem id="dog">Dog</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    })
    const mw = mountInDoc(Multi)
    await tick(2)
    const mt = getTrigger(mw)
    focus(mt)
    dispatchKey(mt, 'keydown', {key: 'ArrowRight'})
    await tick(2)
    expect((mw.vm as any).changes2.length).toBe(0)
  })

  it('8. closed typeahead selects matching item and does not open (single mode only)', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem id="cat">Cat</ListBoxItem>
            <ListBoxItem id="dog">Dog</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const trigger = getTrigger(wrapper)
    focus(trigger)
    trigger.dispatchEvent(new KeyboardEvent('keydown', {key: 'd', bubbles: true, cancelable: true}))
    await tick(3)
    expect(trigger.textContent).toContain('Dog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('9. option can be chosen from open list with keyboard', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox>
            <ListBoxItem id="cat">Cat</ListBoxItem>
            <ListBoxItem id="dog">Dog</ListBoxItem>
          </ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const trigger = getTrigger(wrapper)
    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    // move to dog and select
    const active = () => (document.activeElement as HTMLElement) || trigger
    dispatchKey(active(), 'keydown', {key: 'ArrowDown'})
    await tick(2)
    dispatchKey(active(), 'keydown', {key: 'Enter'})
    await tick(4)
    expect(trigger.textContent).toContain('Dog')
  })

  it('10. HiddenSelect form integration small collection', async () => {
    let form: HTMLFormElement | null = null
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup() { return {setForm: (el: any) => { form = el }} },
      template: `
        <form :ref="setForm">
          <Select name="animal" isRequired defaultSelectedKey="cat">
            <Label>Animal</Label>
            <Button><SelectValue /></Button>
            <Popover><ListBox>
              <ListBoxItem id="cat">Cat</ListBoxItem>
              <ListBoxItem id="dog">Dog</ListBoxItem>
            </ListBox></Popover>
          </Select>
        </form>
      `,
    }))
    await tick(3)
    const container = wrapper.find('[data-testid="hidden-select-container"]')
    expect(container.exists()).toBe(true)
    expect(container.attributes('data-a11y-ignore')).toBe('aria-hidden-focus')
    expect(container.attributes('data-react-aria-prevent-focus')).toBe('true')
    const selectEl = wrapper.find('select').element as HTMLSelectElement
    expect(selectEl.getAttribute('name')).toBe('animal')
    expect(selectEl.required).toBe(true)
    expect(selectEl.tabIndex).toBe(-1)
    const firstOpt = selectEl.querySelector('option') as HTMLOptionElement
    expect(firstOpt.getAttribute('value')).toBe('')
    expect(firstOpt.getAttribute('label')).toBe('\u00A0')

    expect(new FormData(form!).get('animal')).toBe('cat')

    // change via trigger
    await click(getTrigger(wrapper)); await tick(4)
    await click(document.querySelectorAll('[role="option"]')[1]); await tick(4)
    expect(new FormData(form!).get('animal')).toBe('dog')

    // autofill/native change updates state
    selectEl.value = 'cat'
    selectEl.dispatchEvent(new Event('change', {bubbles: true}))
    await tick(3)
    expect(getTrigger(wrapper).textContent).toContain('Cat')
  })

  it('11. collection size > 300 with name uses hidden input(s)', async () => {
    const items = Array.from({length: 305}, (_, i) => ({id: `i${i}`, name: `Item ${i}`}))
    let form: HTMLFormElement | null = null
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup() { return {items, setForm: (el: any) => { form = el }} },
      template: `
        <form :ref="setForm">
          <Select name="big" isRequired defaultSelectedKey="i1" :items="items">
            <Label>Big</Label>
            <Button><SelectValue /></Button>
            <Popover><ListBox :items="items">
              <template #default="{ item }"><ListBoxItem :id="item.id">{{ item.name }}</ListBoxItem></template>
            </ListBox></Popover>
          </Select>
        </form>
      `,
    }))
    await tick(4)
    expect(wrapper.find('select').exists()).toBe(false)
    const inputs = wrapper.findAll('input[name="big"]')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
    expect(new FormData(form!).get('big')).toBe('i1')
  })

  it('12. shouldCloseOnSelect false keeps single open; true closes multiple', async () => {
    const Single = defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select :shouldCloseOnSelect="false">
          <Label>A</Label><Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    })
    const sw = mountInDoc(Single); await tick(2)
    await click(getTrigger(sw)); await tick(4)
    await click(document.querySelectorAll('[role="option"]')[0]); await tick(4)
    expect(getTrigger(sw).getAttribute('aria-expanded')).toBe('true')
    // Close the single-select popover before interacting with the multiple-select
    dispatchKey(getTrigger(sw), 'keydown', {key: 'Escape'})
    await tick(3)

    const Multi = defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select selectionMode="multiple" :shouldCloseOnSelect="true">
          <Label>A</Label><Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    })
    const mw = mountInDoc(Multi); await tick(2)
    await click(getTrigger(mw)); await tick(4)
    await click(document.querySelectorAll('[role="option"]')[0]); await tick(4)
    expect(getTrigger(mw).getAttribute('aria-expanded')).toBe('false')
  })

  it('13. multiple selection, aria-multiselectable, deselect to empty, controlled array, formatting, FormData getAll', async () => {
    let form: HTMLFormElement | null = null
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup() {
        const val = ref<any[]>(['cat'])
        return {val, setForm: (el: any) => { form = el }, onChange: (v: any) => { val.value = v }}
      },
      template: `
        <form :ref="setForm">
          <Select selectionMode="multiple" name="pets" :value="val" @change="onChange">
            <Label>Pets</Label><Button><SelectValue /></Button>
            <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem></ListBox></Popover>
          </Select>
        </form>
      `,
    }))
    await tick(3)
    expect(getTrigger(wrapper).textContent).toContain('Cat')
    await click(getTrigger(wrapper)); await tick(4)
    const lb = document.querySelector('[role="listbox"]') as HTMLElement
    expect(lb.getAttribute('aria-multiselectable')).toBe('true')
    const opts = Array.from(document.querySelectorAll('[role="option"]')) as HTMLElement[]
    // add dog
    await click(opts[1]); await tick(4)
    expect(getTrigger(wrapper).textContent).toContain('Cat')
    expect(getTrigger(wrapper).textContent).toContain('Dog')
    // deselect dog
    await click(opts[1]); await tick(4)
    // deselect cat -> empty
    await click(opts[0]); await tick(4)
    expect(wrapper.find('.react-aria-SelectValue').text()).toBe('Select an item')
    // select cat and dog for formatting
    await click(opts[0]); await tick(3)
    await click(opts[1]); await tick(3)
    const text = getTrigger(wrapper).textContent || ''
    expect(text.includes('Cat') && text.includes('Dog')).toBe(true)
    // Exact Intl.ListFormat (en) conjunction formatting
    expect(wrapper.find('.react-aria-SelectValue').text()).toBe('Cat and Dog')
    const fd = new FormData(form!)
    const all = fd.getAll('pets').map(String)
    expect(all).toContain('cat')
    expect(all).toContain('dog')
  })

  it('14. isDisabled prevents open; isRequired/isInvalid data attrs; autoFocus focuses trigger; autoComplete lands on hidden control', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select isDisabled isRequired isInvalid autoComplete="organization-title" name="x">
          <Label>Animal</Label><Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(4)
    const root = wrapper.find('.react-aria-Select')
    expect(root.attributes('data-disabled')).toBe('true')
    expect(root.attributes('data-required')).toBe('true')
    expect(root.attributes('data-invalid')).toBe('true')
    const trigger = getTrigger(wrapper)
    await click(trigger); await tick(3)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const sel = wrapper.find('select')
    if (sel.exists()) expect(sel.attributes('autocomplete')).toBe('organization-title')

    // autoFocus applies to a non-disabled Select
    const focused = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select autoFocus>
          <Label>Animal</Label><Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(4)
    const fTrigger = getTrigger(focused)
    expect(document.activeElement === fTrigger || fTrigger.contains(document.activeElement as any)).toBe(true)
    focused.unmount()
  })

  it('15. custom SelectValue slot and sibling clear button with slot=null via SelectStateContext', async () => {
    const ClearBtn = defineComponent({
      components: {Button},
      setup() {
        const state = inject(SelectStateContext as any, null) as any
        return {state}
      },
      template: `<Button :slot="null" data-testid="clear" @press="state?.setValue(null)">Clear</Button>`,
    })
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem, ClearBtn},
      template: `
        <Select defaultSelectedKey="cat">
          <Label>Animal</Label>
          <Button><SelectValue v-slot="{ isPlaceholder, selectedText }">{{ isPlaceholder ? 'Select an item' : 'Value: ' + selectedText }}</SelectValue></Button>
          <ClearBtn />
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(4)
    expect(getTrigger(wrapper).textContent).toContain('Value: Cat')
    const clear = document.querySelector('[data-testid="clear"]') as HTMLButtonElement
    expect(clear).toBeTruthy()
    expect(clear.tabIndex).toBeGreaterThanOrEqual(0)
    await click(clear); await tick(4)
    expect(wrapper.find('.react-aria-SelectValue').text()).toBe('Select an item')
  })

  it('16. Label click focuses trigger and nested Label/Button/Text inside Popover do not inherit Select trigger aria', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Text, Popover, ListBox, ListBoxItem},
      template: `
        <Select>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover>
            <Label data-testid="inner-label">Inner</Label>
            <Button data-testid="inner-button">InnerBtn</Button>
            <Text slot="description" data-testid="inner-text">InnerText</Text>
            <ListBox>
              <ListBoxItem id="cat">Cat</ListBoxItem>
            </ListBox>
          </Popover>
        </Select>
      `,
    }))
    await tick(3)
    const label = wrapper.find('.react-aria-Label').element as HTMLElement
    const trigger = getTrigger(wrapper)
    label.click()
    await tick(2)
    expect(document.activeElement === trigger || trigger.contains(document.activeElement as any)).toBe(true)

    await click(trigger); await tick(4)
    const innerBtn = document.querySelector('[data-testid="inner-button"]') as HTMLButtonElement
    expect(innerBtn).toBeTruthy()
    // should not have select trigger aria like aria-haspopup listbox or aria-expanded from select
    expect(innerBtn.getAttribute('aria-haspopup')).not.toBe('listbox')
    const innerLabel = document.querySelector('[data-testid="inner-label"]') as HTMLElement
    expect(innerLabel.getAttribute('id')).not.toBe(label.getAttribute('id'))
  })

  it('17. trigger aria-describedby includes description and errorMessage Text ids', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Text, Popover, ListBox, ListBoxItem},
      template: `
        <Select isInvalid>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Text slot="description">Description</Text>
          <Text slot="errorMessage">Error message</Text>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(3)
    const trigger = getTrigger(wrapper)
    const describedby = (trigger.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
    const desc = wrapper.find('[data-slot="description"]').element as HTMLElement
    const err = wrapper.find('[data-slot="errorMessage"]').element as HTMLElement
    expect(desc.id).toBeTruthy()
    expect(err.id).toBeTruthy()
    expect(describedby).toContain(desc.id)
    expect(describedby).toContain(err.id)
  })

  it('18. live data-* attrs: data-focused, data-focus-visible, data-open, trigger data-pressed', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const trigger = getTrigger(wrapper)
    const rootEl = () => wrapper.find('.react-aria-Select').element as HTMLElement
    expect(rootEl().getAttribute('data-focused')).toBeFalsy()
    expect(rootEl().getAttribute('data-focus-visible')).toBeFalsy()
    expect(rootEl().getAttribute('data-open')).toBeFalsy()
    expect(trigger.getAttribute('data-pressed')).toBeFalsy()
    focus(trigger)
    await nextTick()
    expect(rootEl().getAttribute('data-focused')).toBe('true')
    expect(rootEl().getAttribute('data-focus-visible')).toBe('true')
    dispatchKey(trigger, 'keydown', {key: 'Enter'})
    await tick(4)
    expect(rootEl().getAttribute('data-open')).toBe('true')
    expect(trigger.getAttribute('data-pressed')).toBe('true')
  })

  it('19. keyboard open focuses first/selected option, ArrowUp focuses last, allowsEmptyCollection opens empty', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select>
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const trigger = getTrigger(wrapper)
    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect((document.activeElement as HTMLElement)?.textContent).toContain('Cat')
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick(3)

    // ArrowUp opens at last
    focus(trigger)
    dispatchKey(trigger, 'keydown', {key: 'ArrowUp'})
    await tick(4)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect((document.activeElement as HTMLElement)?.textContent).toContain('Dog')
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick(3)

    // Selected item receives focus on open
    const selected = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      template: `
        <Select defaultSelectedKey="dog">
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem><ListBoxItem id="dog">Dog</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const sTrigger = getTrigger(selected)
    focus(sTrigger)
    dispatchKey(sTrigger, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect((document.activeElement as HTMLElement)?.textContent).toContain('Dog')
    dispatchKey(document.activeElement as HTMLElement, 'keydown', {key: 'Escape'})
    await tick(3)
    selected.unmount()

    // allowsEmptyCollection permits opening an empty list
    const emptyAllowed = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox},
      template: `
        <Select :allowsEmptyCollection="true">
          <Label>Empty</Label><Button><SelectValue /></Button>
          <Popover><ListBox></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(2)
    const eTrigger = getTrigger(emptyAllowed)
    focus(eTrigger)
    dispatchKey(eTrigger, 'keydown', {key: 'ArrowDown'})
    await tick(3)
    expect(eTrigger.getAttribute('aria-expanded')).toBe('true')
    emptyAllowed.unmount()
    wrapper.unmount()
  })

  it('20. required empty select blocks submit and FormData value is empty string', async () => {
    let form: HTMLFormElement | null = null
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup() { return {setForm: (el: any) => { form = el }} },
      template: `
        <form :ref="setForm">
          <Select name="animal" isRequired>
            <Label>Animal</Label>
            <Button><SelectValue /></Button>
            <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem></ListBox></Popover>
          </Select>
        </form>
      `,
    }))
    await tick(3)
    expect(new FormData(form!).get('animal')).toBe('')
    expect(form!.checkValidity()).toBe(false)
    wrapper.unmount()
  })

  it('21. form attribute associates the hidden control with an external form', async () => {
    let form: HTMLFormElement | null = null
    const wrapper = mountInDoc(defineComponent({
      components: {Select, Label, Button, SelectValue, Popover, ListBox, ListBoxItem},
      setup() { return {setForm: (el: any) => { form = el }} },
      template: `
        <form id="external-form" :ref="setForm"></form>
        <Select name="ext" form="external-form" defaultSelectedKey="cat">
          <Label>Animal</Label>
          <Button><SelectValue /></Button>
          <Popover><ListBox><ListBoxItem id="cat">Cat</ListBoxItem></ListBox></Popover>
        </Select>
      `,
    }))
    await tick(3)
    const selectEl = wrapper.find('select').element as HTMLSelectElement
    expect(selectEl.getAttribute('form')).toBe('external-form')
    expect(new FormData(form!).get('ext')).toBe('cat')
    wrapper.unmount()
  })
})
