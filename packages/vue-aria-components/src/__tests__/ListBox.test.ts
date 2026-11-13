import {defineComponent, h, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {Collection, Header, ListBox, ListBoxItem, ListBoxSection, Text} from 'vue-aria-components'

function mountInDoc(component: any, options: any = {}) {
  return mount(component, {attachTo: document.body, ...options})
}

async function press(el: Element) {
  dispatchPointer(el, 'pointerdown')
  dispatchPointer(el, 'pointerup')
  dispatchPointer(el, 'click')
  await nextTick()
}

describe('ListBox', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('renders static items with listbox/option roles', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      template: `
        <ListBox aria-label="Animals">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const listbox = wrapper.find('[role="listbox"]')
    expect(listbox.exists()).toBe(true)
    const options = wrapper.findAll('[role="option"]')
    expect(options).toHaveLength(2)
    expect(options[0].text()).toContain('Cat')
    expect(options[1].text()).toContain('Dog')
  })

  it('renders dynamic items with scoped slot and keys from id/item.id', async () => {
    const items = [{id: 'one', name: 'One'}, {id: 'two', name: 'Two'}]
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({items}),
      template: `
        <ListBox aria-label="Items" :items="items">
          <template #default="{ item }">
            <ListBoxItem :id="item.id">{{ item.name }}</ListBoxItem>
          </template>
        </ListBox>
      `,
    }))
    await nextTick()
    const options = wrapper.findAll('[role="option"]')
    expect(options).toHaveLength(2)
    expect(options.map(o => o.text())).toEqual(['One', 'Two'])
  })

  it('defaults selectionMode to none: click does not select and aria-selected is absent', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      template: `
        <ListBox aria-label="Animals">
          <ListBoxItem id="cat">Cat</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const option = wrapper.get('[role="option"]')
    await press(option.element)
    expect(option.attributes('aria-selected')).toBeUndefined()
    expect(option.attributes('data-selected')).toBeUndefined()
    expect(wrapper.emitted('selectionchange')).toBeFalsy()
  })

  it('single selection toggle behavior: click selects and toggles, emits Set', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({onChange: (s: any) => changes.push(s)}),
      template: `
        <ListBox aria-label="Animals" selectionMode="single" @selectionchange="onChange">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const [cat] = wrapper.findAll('[role="option"]')
    await press(cat.element)
    expect(changes.length).toBeGreaterThan(0)
    let sel = changes[changes.length - 1] as Set<any>
    expect(sel instanceof Set).toBe(true)
    expect(sel.has('cat')).toBe(true)
    expect(cat.attributes('aria-selected')).toBe('true')
    expect(cat.attributes('data-selected')).toBe('true')

    await press(cat.element)
    sel = changes[changes.length - 1] as Set<any>
    expect(sel.size).toBe(0)
    await nextTick()
    expect(cat.attributes('data-selected')).toBeUndefined()
  })

  it('multiple selection toggle behavior selects multiple items', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({onChange: (s: any) => changes.push(s)}),
      template: `
        <ListBox aria-label="Animals" selectionMode="multiple" @selectionchange="onChange">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const [cat, dog] = wrapper.findAll('[role="option"]')
    await press(cat.element)
    await press(dog.element)
    const sel = changes[changes.length - 1] as Set<any>
    expect(sel.has('cat')).toBe(true)
    expect(sel.has('dog')).toBe(true)
    expect(cat.attributes('data-selection-mode')).toBe('multiple')
  })

  it('supports controlled selectedKeys and uncontrolled defaultSelectedKeys', async () => {
    const Controlled = defineComponent({
      components: {ListBox, ListBoxItem},
      setup() {
        const selected = ref(new Set(['cat']))
        return {selected}
      },
      template: `
        <ListBox aria-label="Animals" selectionMode="single" :selectedKeys="selected" @selectionchange="selected = $event">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    })
    const cw = mountInDoc(Controlled)
    await nextTick()
    expect(cw.findAll('[role="option"]')[0].attributes('data-selected')).toBe('true')

    const Uncontrolled = defineComponent({
      components: {ListBox, ListBoxItem},
      template: `
        <ListBox aria-label="Animals" selectionMode="single" :defaultSelectedKeys="new Set(['dog'])">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    })
    const uw = mountInDoc(Uncontrolled)
    await nextTick()
    expect(uw.findAll('[role="option"]')[1].attributes('data-selected')).toBe('true')
  })

  it('respects disabledKeys and item isDisabled', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      template: `
        <ListBox aria-label="Animals" selectionMode="single" :disabledKeys="['dog']">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const [cat, dog] = wrapper.findAll('[role="option"]')
    expect(dog.attributes('aria-disabled')).toBe('true')
    expect(dog.attributes('data-disabled')).toBe('true')
    await press(dog.element)
    expect(dog.attributes('data-selected')).toBeUndefined()
  })

  it('renders sections with role group and header labelling', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem, ListBoxSection, Header},
      template: `
        <ListBox aria-label="Foods">
          <ListBoxSection id="fruit">
            <template #header><Header>Fruit</Header></template>
            <ListBoxItem id="apple">Apple</ListBoxItem>
          </ListBoxSection>
          <ListBoxSection id="veg" aria-label="Vegetables">
            <ListBoxItem id="carrot">Carrot</ListBoxItem>
          </ListBoxSection>
        </ListBox>
      `,
    }))
    await nextTick()
    const groups = wrapper.findAll('[role="group"]')
    expect(groups.length).toBeGreaterThanOrEqual(2)
  })

  it('shows empty state when collection is empty', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox},
      template: `
        <ListBox aria-label="Empty">
          <template #empty>No items</template>
        </ListBox>
      `,
    }))
    await nextTick()
    const listbox = wrapper.get('[role="listbox"]')
    expect(listbox.attributes('data-empty')).toBe('true')
    expect(listbox.text()).toContain('No items')
  })

  it('keyboard ArrowDown moves focus and Space selects in toggle mode', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({onChange: (s: any) => changes.push(s)}),
      template: `
        <ListBox aria-label="Animals" selectionMode="single" @selectionchange="onChange">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const listbox = wrapper.get('[role="listbox"]').element as HTMLElement
    listbox.focus()
    await nextTick()
    dispatchKey(listbox, 'keydown', {key: 'ArrowDown'})
    await nextTick()
    const focused = document.activeElement as HTMLElement
    dispatchKey(focused || listbox, 'keydown', {key: ' '})
    await nextTick()
    expect(changes.length).toBeGreaterThan(0)
  })
})

  it('replace selectionBehavior: click replaces selection in single/multiple context as specified', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({onChange: (s: any) => changes.push(s)}),
      template: `
        <ListBox aria-label="Animals" selectionMode="multiple" selectionBehavior="replace" @selectionchange="onChange">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const [cat, dog] = wrapper.findAll('[role="option"]')
    await press(cat.element)
    await press(dog.element)
    const sel = changes[changes.length - 1] as Set<any>
    expect(sel.size).toBe(1)
    expect(sel.has('dog')).toBe(true)
  })

  it('item isDisabled prevents selection and has data-disabled', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      template: `
        <ListBox aria-label="Animals" selectionMode="single">
          <ListBoxItem id="cat" :isDisabled="true">Cat</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const cat = wrapper.get('[role="option"]')
    expect(cat.attributes('aria-disabled')).toBe('true')
    expect(cat.attributes('data-disabled')).toBe('true')
    await press(cat.element)
    expect(cat.attributes('data-selected')).toBeUndefined()
  })

  it('Enter selects focused option', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({onChange: (s: any) => changes.push(s)}),
      template: `
        <ListBox aria-label="Animals" selectionMode="single" @selectionchange="onChange">
          <ListBoxItem id="cat">Cat</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const listbox = wrapper.get('[role="listbox"]').element as HTMLElement
    listbox.focus()
    await nextTick()
    dispatchKey(listbox, 'keydown', {key: 'ArrowDown'})
    await nextTick()
    const focused = document.activeElement as HTMLElement
    dispatchKey(focused || listbox, 'keydown', {key: 'Enter'})
    await nextTick()
    expect(changes.length).toBeGreaterThan(0)
  })

  it('Escape clears selection in default configuration', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({onChange: (s: any) => changes.push(s)}),
      template: `
        <ListBox aria-label="Animals" selectionMode="multiple" @selectionchange="onChange">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const [cat, dog] = wrapper.findAll('[role="option"]')
    await press(cat.element)
    await press(dog.element)
    const listbox = wrapper.get('[role="listbox"]').element as HTMLElement
    listbox.focus()
    dispatchKey(listbox, 'keydown', {key: 'Escape'})
    await nextTick()
    const sel = changes[changes.length - 1] as Set<any>
    expect(sel.size).toBe(0)
  })

  it('Mod+A selects all in multiple and emits all', async () => {
    const changes: any[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      setup: () => ({onChange: (s: any) => changes.push(s)}),
      template: `
        <ListBox aria-label="Animals" selectionMode="multiple" @selectionchange="onChange">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const listbox = wrapper.get('[role="listbox"]').element as HTMLElement
    listbox.focus()
    dispatchKey(listbox, 'keydown', {key: 'a', ctrlKey: true})
    await nextTick()
    expect(changes[changes.length - 1]).toBe('all')
  })

  it('renderEmptyState prop shows when empty and sets data-empty', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox},
      template: `<ListBox aria-label="Empty" :renderEmptyState="() => 'Nothing'" />`,
    }))
    await nextTick()
    const listbox = wrapper.get('[role="listbox"]')
    expect(listbox.attributes('data-empty')).toBe('true')
    expect(listbox.text()).toContain('Nothing')
  })

  it('headerless section supports aria-label', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem, ListBoxSection},
      template: `
        <ListBox aria-label="Foods">
          <ListBoxSection id="fruit" aria-label="Fruit">
            <ListBoxItem id="apple">Apple</ListBoxItem>
          </ListBoxSection>
        </ListBox>
      `,
    }))
    await nextTick()
    const group = wrapper.get('[role="group"]')
    expect(group.attributes('aria-label')).toBe('Fruit')
  })

  it('typeahead focuses matching item by text content', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox, ListBoxItem},
      template: `
        <ListBox aria-label="Animals" selectionMode="single">
          <ListBoxItem id="cat">Cat</ListBoxItem>
          <ListBoxItem id="dog">Dog</ListBoxItem>
        </ListBox>
      `,
    }))
    await nextTick()
    const listbox = wrapper.get('[role="listbox"]').element as HTMLElement
    listbox.focus()
    await nextTick()
    dispatchKey(listbox, 'keydown', {key: 'd'})
    await nextTick()
    expect((document.activeElement as HTMLElement)?.textContent).toContain('Dog')
  })

  it('emits data-layout and data-orientation on ListBox', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ListBox},
      template: `<ListBox aria-label="X" layout="stack" orientation="vertical" />`,
    }))
    await nextTick()
    const lb = wrapper.get('[role="listbox"]')
    expect(lb.attributes('data-layout')).toBe('stack')
    expect(lb.attributes('data-orientation')).toBe('vertical')
  })
