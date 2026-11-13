import {defineComponent, nextTick, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchClick, dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {
  ComboBox,
  ComboBoxContext,
  ComboBoxStateContext,
  ComboBoxValue,
  ComboBoxValueContext,
  Input,
  InputContext,
  Button,
  Label,
  Text,
  Popover,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  useFilter,
} from 'vue-aria-components'
import {useComboBox, useFilter as ariaUseFilter, useTextField} from 'vue-aria'
import {useComboBox as useComboBoxSub} from 'vue-aria/useComboBox'
import {useFilter as useFilterSub} from 'vue-aria/useFilter'
import {useTextField as useTextFieldSub} from 'vue-aria/useTextField'
import {useComboBoxState as useComboBoxStateSub} from 'vue-stately/useComboBoxState'
import {ComboBox as ComboBoxComponent, Input as InputComponent} from 'vue-aria-components/ComboBox'
import type {
  AriaComboBoxProps,
  AriaComboBoxOptions,
  ComboBoxAria,
  Filter,
  AriaTextFieldOptions,
  AriaTextFieldProps,
  TextFieldAria,
  TextFieldProps,
} from 'vue-aria'
import {useComboBoxState} from 'vue-stately'
import type {
  ComboBoxProps,
  ComboBoxStateOptions,
  ComboBoxState,
  ComboBoxValidationValue,
  MenuTriggerAction,
} from 'vue-stately'
import * as components from 'vue-aria-components'

function mountInDoc(component: any, options: any = {}) {
  return mount(component, {attachTo: document.body, ...options})
}

async function click(el: Element) {
  dispatchPointer(el, 'pointerdown')
  dispatchPointer(el, 'pointerup')
  // Real user clicks have a non-zero detail; detail=0 is treated as a virtual
  // (screen reader) click by usePress and would toggle multi-select twice.
  dispatchClick(el, {detail: 1})
  await nextTick()
}

async function type(el: HTMLInputElement, value: string) {
  el.value = value
  el.dispatchEvent(new Event('input', {bubbles: true}))
  await nextTick()
}

async function tick(n = 3) {
  for (let i = 0; i < n; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 20))
}

function getInput(wrapper: any): HTMLInputElement {
  return wrapper.find('input[role="combobox"]').element as HTMLInputElement
}
function getButton(wrapper: any): HTMLButtonElement {
  return wrapper.find('button').element as HTMLButtonElement
}
function getOptions(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[role="option"]')) as HTMLElement[]
}

const AnimalList = {
  components: {ListBox, ListBoxItem},
  template: `
    <ListBox>
      <ListBoxItem id="1">Cat</ListBoxItem>
      <ListBoxItem id="2">Dog</ListBoxItem>
      <ListBoxItem id="3">Kangaroo</ListBoxItem>
    </ListBox>
  `,
}

describe('ComboBox', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('1. composition slots: Label, Input role=combobox, Button, Text description+errorMessage on aria-describedby, Popover data-trigger=ComboBox, select updates input and closes', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Text, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Text slot="description">Choose your favorite</Text>
          <Text slot="errorMessage">Required!</Text>
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)

    const input = getInput(wrapper)
    expect(input.getAttribute('role')).toBe('combobox')
    expect(input.getAttribute('aria-expanded')).toBe('false')

    const label = wrapper.find('.react-aria-Label').element as HTMLElement
    expect(label.textContent).toContain('Favorite Animal')
    const inputId = input.getAttribute('aria-labelledby') || ''
    expect(inputId).toContain(label.id)

    const button = getButton(wrapper)
    expect(button.getAttribute('aria-label')).toBe('Show suggestions')

    // Description + errorMessage text are wired into aria-describedby.
    const description = wrapper.find('[slot="description"]').element as HTMLElement
    const errorMessage = wrapper.find('[slot="errorMessage"]').element as HTMLElement
    const describedBy = input.getAttribute('aria-describedby') || ''
    expect(describedBy.split(' ')).toContain(description.id)
    expect(describedBy.split(' ')).toContain(errorMessage.id)

    // Button is not tabbable and does not take focus on press.
    expect(button.getAttribute('tabindex')).toBe('-1')

    // Open with ArrowDown, options appear with data-foo untouched.
    input.focus()
    dispatchKey(input, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-controls')).toBeTruthy()
    const popover = document.querySelector('.react-aria-Popover') as HTMLElement | null
    expect(popover?.getAttribute('data-trigger')).toBe('ComboBox')
    const options = getOptions()
    expect(options.map(o => o.textContent?.trim())).toEqual(['Cat', 'Dog'])

    // Select Dog (second option).
    await click(options[1])
    await tick(4)
    expect(input.value).toBe('Dog')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[role="listbox"]')).toBeFalsy()
    wrapper.unmount()
  })

  it('2. root class react-aria-ComboBox; user data-* on the outer element only', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox data-foo="bar">
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const root = wrapper.find('.react-aria-ComboBox')
    expect(root.exists()).toBe(true)
    expect(root.attributes('data-foo')).toBe('bar')
    // user data-* stays on the root, not on the input
    expect(getInput(wrapper).getAttribute('data-foo')).toBeFalsy()
    expect(wrapper.find('input[role="combobox"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('3. Button data-pressed only when open, tabIndex=-1, does not steal focus', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const button = getButton(wrapper)
    expect(button.getAttribute('data-pressed')).toBeFalsy()
    expect(button.getAttribute('tabindex')).toBe('-1')

    const input = getInput(wrapper)
    input.focus()
    // Open via button click.
    await click(button)
    await tick(4)
    expect(button.getAttribute('data-pressed')).toBe('true')
    // Focus must remain on the input, not the button.
    expect(document.activeElement).toBe(input)
    // Close via button click again.
    await click(button)
    await tick(4)
    expect(button.getAttribute('data-pressed')).toBeFalsy()
    expect(document.activeElement).toBe(input)
    wrapper.unmount()
  })

  it('4. keyboard: ArrowDown opens, focus stays on input, aria-activedescendant tracks, Enter selects (Dog / key 2), fires change+selectionchange once', async () => {
    const events: string[] = []
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      setup() {
        return {
          onSelectionChange: (key: any) => events.push(`selectionchange:${String(key)}`),
          onChange: (value: any) => events.push(`change:${String(value)}`),
        }
      },
      template: `
        <ComboBox @selectionchange="onSelectionChange" @change="onChange">
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
              <ListBoxItem id="3">Kangaroo</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)

    const input = getInput(wrapper)
    input.focus()
    dispatchKey(input, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect(document.activeElement).toBe(input)
    const options = getOptions()
    expect(options.length).toBeGreaterThan(0)
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].getAttribute('id'))

    // Arrow down to Dog.
    dispatchKey(input, 'keydown', {key: 'ArrowDown'})
    await tick(3)
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].getAttribute('id'))

    dispatchKey(input, 'keydown', {key: 'Enter'})
    await tick(4)
    expect(input.value).toBe('Dog')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(events.filter(e => e.startsWith('selectionchange:'))).toEqual(['selectionchange:2'])
    expect(events.filter(e => e.startsWith('change:'))).toEqual(['change:2'])
    wrapper.unmount()
  })

  it('5. ArrowUp on closed focuses last; Escape reverts/closes; typing with menuTrigger=input opens and filters', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem, ListBoxSection},
      template: `
        <ComboBox>
          <Label>Favorite Food</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Apple</ListBoxItem>
              <ListBoxItem id="2">Banana</ListBoxItem>
              <ListBoxItem id="3">Cherry</ListBoxItem>
              <ListBoxSection title="Vegetables">
                <ListBoxItem id="4">Carrot</ListBoxItem>
                <ListBoxItem id="5">Kale</ListBoxItem>
              </ListBoxSection>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)

    const input = getInput(wrapper)
    input.focus()
    // ArrowUp on a closed menu opens it at the last item (Kale, key 5).
    dispatchKey(input, 'keydown', {key: 'ArrowUp'})
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const options = getOptions()
    const kale = options.find(o => o.textContent?.trim() === 'Kale')!
    expect(input.getAttribute('aria-activedescendant')).toBe(kale.getAttribute('id'))

    // Escape closes and reverts the input.
    dispatchKey(input, 'keydown', {key: 'Escape'})
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.value).toBe('')

    // Typing "p" opens and filters (Apple only; the Vegetable section is dropped).
    await type(input, 'p')
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const filtered = getOptions()
    expect(filtered.map(o => o.textContent?.trim())).toEqual(['Apple'])
    wrapper.unmount()
  })

  it('6. defaultFilter={undefined} still uses contains', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox :default-filter="undefined">
          <Label>Favorite Food</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Apple</ListBoxItem>
              <ListBoxItem id="2">Banana</ListBoxItem>
              <ListBoxItem id="3">Cherry</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const input = getInput(wrapper)
    input.focus()
    await type(input, 'p')
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(getOptions().map(o => o.textContent?.trim())).toEqual(['Apple'])
    wrapper.unmount()
  })

  it('7. controlled items are not auto-filtered by input text', async () => {
    const items = [{id: '1', name: 'Apple'}, {id: '2', name: 'Banana'}]
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      setup() {
        return {items}
      },
      template: `
        <ComboBox :items="items">
          <Label>Favorite Food</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <template #default="{ item }">
                <ListBoxItem :id="item.id">{{ item.name }}</ListBoxItem>
              </template>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const input = getInput(wrapper)
    input.focus()
    await type(input, 'p')
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    // Controlled items: no filtering applied.
    expect(getOptions().map(o => o.textContent?.trim())).toEqual(['Apple', 'Banana'])
    wrapper.unmount()
  })

  it('8. menuTrigger=focus opens on focus; menuTrigger=manual does not open on type/focus, only button/arrows; isReadOnly never opens; root data-readonly', async () => {
    // menuTrigger="focus"
    const focusWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox menuTrigger="focus">
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const focusInput = getInput(focusWrapper)
    focusInput.focus()
    await tick(4)
    expect(focusInput.getAttribute('aria-expanded')).toBe('true')
    focusWrapper.unmount()

    // menuTrigger="manual"
    const manualWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox menuTrigger="manual">
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const manualInput = getInput(manualWrapper)
    manualInput.focus()
    await tick(3)
    expect(manualInput.getAttribute('aria-expanded')).toBe('false')
    await type(manualInput, 'c')
    await tick(3)
    expect(manualInput.getAttribute('aria-expanded')).toBe('false')
    // Arrow keys open even in manual mode.
    dispatchKey(manualInput, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect(manualInput.getAttribute('aria-expanded')).toBe('true')
    manualWrapper.unmount()

    // isReadOnly + menuTrigger="focus": never opens.
    const readOnlyWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox menuTrigger="focus" isReadOnly>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    expect(readOnlyWrapper.find('.react-aria-ComboBox').attributes('data-readonly')).toBe('true')
    const readOnlyInput = getInput(readOnlyWrapper)
    readOnlyInput.focus()
    await tick(4)
    expect(readOnlyInput.getAttribute('aria-expanded')).toBe('false')
    // Button is disabled under readOnly.
    expect((getButton(readOnlyWrapper) as HTMLButtonElement).disabled).toBe(true)
    readOnlyWrapper.unmount()
  })

  it('9. input click while open does not close; button click closes and second click reopens; focus stays on input', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const input = getInput(wrapper)
    input.focus()
    dispatchKey(input, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')

    // Clicking the input does not close the menu.
    await click(input)
    await tick(3)
    expect(input.getAttribute('aria-expanded')).toBe('true')

    // Button click closes; focus remains on the input.
    const button = getButton(wrapper)
    // Re-focus the input first (clicking the button moves focus per press handler).
    input.focus()
    await click(button)
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(input)

    // Second click reopens.
    input.focus()
    await click(button)
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('10. formValue default key: no name on visible input; hidden input has name and key; formValue=text puts name on visible input; allowsCustomValue uses text submission; form attr forwarded', async () => {
    // Default formValue='key'.
    const keyWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox name="animal" :default-value="'2'">
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const keyInput = getInput(keyWrapper)
    expect(keyInput.getAttribute('name')).toBeFalsy()
    expect(keyInput.value).toBe('Dog')
    const hidden = keyWrapper.find('input[type="hidden"]')
    expect(hidden.exists()).toBe(true)
    expect(hidden.attributes('name')).toBe('animal')
    expect((hidden.element as HTMLInputElement).value).toBe('2')

    // form attribute is forwarded to the hidden input.
    const formWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox name="animal" form="myForm" :default-value="'2'">
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    expect(formWrapper.find('input[type="hidden"]').attributes('form')).toBe('myForm')

    // formValue="text": name on visible input, no hidden input.
    const textWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox name="animal" formValue="text">
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const textInput = getInput(textWrapper)
    expect(textInput.getAttribute('name')).toBe('animal')
    expect(textWrapper.find('input[type="hidden"]').exists()).toBe(false)

    // allowsCustomValue forces text submission.
    const customWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      setup() {
        let form: HTMLFormElement | null = null
        return {setForm: (el: any) => { form = el }, getForm: () => form}
      },
      template: `
        <form :ref="setForm">
          <ComboBox name="pet" allowsCustomValue>
            <Label>Pet</Label>
            <Input />
            <Button />
            <Popover>
              <ListBox>
                <ListBoxItem id="1">Cat</ListBoxItem>
              </ListBox>
            </Popover>
          </ComboBox>
        </form>
      `,
    }))
    await tick(4)
    const customInput = getInput(customWrapper)
    expect(customInput.getAttribute('name')).toBe('pet')
    expect(customWrapper.find('input[type="hidden"]').exists()).toBe(false)
    // Custom values are submitted as text.
    await type(customInput, 'Iguana')
    const form = (customWrapper as any).vm.getForm() as HTMLFormElement
    expect(new FormData(form).get('pet')).toBe('Iguana')
    wrapperUnmountAll([keyWrapper, formWrapper, textWrapper, customWrapper])
  })

  it('11. form reset restores defaultValue / default input text; empty required single ComboBox: input required, checkValidity false, FormData empty string, validity true after selection', async () => {
    let form: HTMLFormElement | null = null
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      setup() {
        return {setForm: (el: any) => { form = el }}
      },
      template: `
        <form :ref="setForm">
          <ComboBox name="animal" :default-value="'2'">
            <Label>Favorite Animal</Label>
            <Input />
            <Button />
            <Popover>
              <ListBox>
                <ListBoxItem id="1">Cat</ListBoxItem>
                <ListBoxItem id="2">Dog</ListBoxItem>
              </ListBox>
            </Popover>
          </ComboBox>
        </form>
      `,
    }))
    await tick(4)
    const input = getInput(wrapper)
    expect(input.value).toBe('Dog')

    // Change the selection to Cat (first option), then reset the form.
    input.focus()
    dispatchKey(input, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    await click(getOptions()[0])
    await tick(4)
    expect(input.value).toBe('Cat')
    ;(form as unknown as HTMLFormElement).reset()
    await tick(3)
    expect(input.value).toBe('Dog')
    expect((wrapper.find('input[type="hidden"]').element as HTMLInputElement).value).toBe('2')
    wrapper.unmount()

    // Required empty single ComboBox.
    const form2: {el: HTMLFormElement | null} = {el: null}
    const requiredWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      setup() {
        return {setForm: (el: any) => { form2.el = el }}
      },
      template: `
        <form :ref="setForm">
          <ComboBox name="animal" isRequired>
            <Label>Favorite Animal</Label>
            <Input />
            <Button />
            <Popover>
              <ListBox>
                <ListBoxItem id="1">Cat</ListBoxItem>
                <ListBoxItem id="2">Dog</ListBoxItem>
              </ListBox>
            </Popover>
          </ComboBox>
        </form>
      `,
    }))
    await tick(4)
    const requiredForm = form2.el!
    const requiredInput = getInput(requiredWrapper)
    expect(requiredInput.required).toBe(true)
    expect(requiredForm.checkValidity()).toBe(false)
    expect(new FormData(requiredForm).get('animal')).toBe('')

    // Select Cat; validity is now true.
    requiredInput.focus()
    dispatchKey(requiredInput, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    dispatchKey(requiredInput, 'keydown', {key: 'Enter'})
    await tick(4)
    expect(requiredForm.checkValidity()).toBe(true)
    expect(new FormData(requiredForm).get('animal')).toBe('1')
    requiredWrapper.unmount()
  })

  it('12. multi-select: list multiselectable, stays open, placeholder then Cat then Cat and Dog, FormData getAll, deselect, isRequired required only when empty', async () => {
    const form = {el: null as HTMLFormElement | null}
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, ComboBoxValue, Popover, ListBox, ListBoxItem},
      setup() {
        return {setForm: (el: any) => { form.el = el }}
      },
      template: `
        <form :ref="setForm">
          <ComboBox selectionMode="multiple" name="pets">
            <Label>Pets</Label>
            <Input />
            <Button />
            <ComboBoxValue placeholder="Pick pets" />
            <Popover>
              <ListBox>
                <ListBoxItem id="1">Cat</ListBoxItem>
                <ListBoxItem id="2">Dog</ListBoxItem>
              </ListBox>
            </Popover>
          </ComboBox>
        </form>
      `,
    }))
    await tick(4)
    const input = getInput(wrapper)
    const value = wrapper.find('.react-aria-ComboBoxValue')
    expect(value.text()).toBe('Pick pets')
    expect(value.attributes('data-placeholder')).toBe('true')

    input.focus()
    dispatchKey(input, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true')

    // Select Cat.
    let options = getOptions()
    await click(options[0])
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.value).toBe('')
    expect(value.text()).toBe('Cat')
    expect(value.attributes('data-placeholder')).toBeFalsy()

    // Select Dog as well.
    options = getOptions()
    await click(options[1])
    await tick(4)
    expect(value.text()).toBe('Cat and Dog')

    // FormData contains both keys.
    expect(new FormData(form.el!).getAll('pets')).toEqual(['1', '2'])

    // Deselect Dog.
    options = getOptions()
    await click(options[1])
    await tick(4)
    expect(value.text()).toBe('Cat')
    expect(new FormData(form.el!).getAll('pets')).toEqual(['1'])

    // Deselect Cat -> placeholder again; one hidden input with empty string.
    options = getOptions()
    await click(options[0])
    await tick(4)
    expect(value.text()).toBe('Pick pets')
    expect(new FormData(form.el!).getAll('pets')).toEqual([''])
    wrapper.unmount()

    // isRequired is only enforced while the selection is empty.
    const form2 = {el: null as HTMLFormElement | null}
    const reqWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, ComboBoxValue, Popover, ListBox, ListBoxItem},
      setup() {
        return {setForm: (el: any) => { form2.el = el }}
      },
      template: `
        <form :ref="setForm">
          <ComboBox selectionMode="multiple" name="pets" isRequired>
            <Label>Pets</Label>
            <Input />
            <Button />
            <ComboBoxValue placeholder="Pick pets" />
            <Popover>
              <ListBox>
                <ListBoxItem id="1">Cat</ListBoxItem>
                <ListBoxItem id="2">Dog</ListBoxItem>
              </ListBox>
            </Popover>
          </ComboBox>
        </form>
      `,
    }))
    await tick(4)
    const requiredForm = form2.el!
    const reqInput = getInput(reqWrapper)
    expect(reqInput.required).toBe(true)
    expect(requiredForm.checkValidity()).toBe(false)
    expect(new FormData(requiredForm).get('pets')).toBe('')

    // Select Cat -> required is lifted, validity passes, FormData has the key.
    reqInput.focus()
    dispatchKey(reqInput, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    const reqOptions = getOptions()
    await click(reqOptions[0])
    await tick(4)
    expect(getInput(reqWrapper).required).toBe(false)
    expect(requiredForm.checkValidity()).toBe(true)
    expect(new FormData(requiredForm).getAll('pets')).toEqual(['1'])
    reqWrapper.unmount()
  })

  it('13. aria-describedby includes description, errorMessage when invalid, and ComboBoxValue id in multi-select; live isInvalid / data-invalid', async () => {
    const wrapper = mountInDoc(defineComponent({
      props: {isInvalid: {type: Boolean, default: true}},
      components: {ComboBox, Label, Input, Button, ComboBoxValue, Text, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox selectionMode="multiple" :isInvalid="isInvalid">
          <Label>Pets</Label>
          <Input />
          <Button />
          <ComboBoxValue placeholder="Pick pets" />
          <Text slot="description">Pick some pets</Text>
          <Text slot="errorMessage">Required!</Text>
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }), {props: {isInvalid: true}})
    await tick(4)

    const input = getInput(wrapper)
    const root = wrapper.find('.react-aria-ComboBox')
    expect(root.attributes('data-invalid')).toBe('true')

    const description = wrapper.find('[slot="description"]').element as HTMLElement
    const errorMessage = wrapper.find('[slot="errorMessage"]').element as HTMLElement
    const value = wrapper.find('.react-aria-ComboBoxValue').element as HTMLElement
    const describedBy = input.getAttribute('aria-describedby') || ''
    const ids = describedBy.split(/\s+/).filter(Boolean)
    expect(ids).toContain(description.id)
    expect(ids).toContain(errorMessage.id)
    expect(ids).toContain(value.id)

    // isInvalid is live: flipping the prop clears data-invalid.
    await wrapper.setProps({isInvalid: false})
    await tick(2)
    expect(wrapper.find('.react-aria-ComboBox').attributes('data-invalid')).toBeFalsy()
    wrapper.unmount()
  })

  it('14. render props expose isOpen (button text open/close); contexts are cleared inside the Popover', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox v-slot="co">
          <Label>Favorite Animal</Label>
          <Input />
          <Button>{{ co.isOpen ? 'Close' : 'Show' }}</Button>
          <Popover>
            <Label>Inside Label</Label>
            <Input />
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const button = getButton(wrapper)
    expect(button.textContent).toContain('Show')

    button.focus()
    await click(button)
    await tick(4)
    expect(button.textContent).toContain('Close')
    expect(getInput(wrapper).getAttribute('aria-expanded')).toBe('true')

    // Contexts are cleared inside the Popover: the inner Label is not the field label,
    // the inner Input is not the field input.
    const fieldLabel = wrapper.find('.react-aria-ComboBox > .react-aria-Label').element as HTMLElement
    const innerLabel = document.querySelector('.react-aria-Popover .react-aria-Label') as HTMLElement
    expect(innerLabel).toBeTruthy()
    expect(innerLabel.getAttribute('id')).not.toBe(fieldLabel.getAttribute('id'))

    const innerInput = document.querySelector('.react-aria-Popover input') as HTMLInputElement
    expect(innerInput).toBeTruthy()
    expect(innerInput.getAttribute('role')).not.toBe('combobox')
    expect(innerInput.getAttribute('aria-expanded')).toBeFalsy()
    wrapper.unmount()
  })

  it('15. allowsEmptyCollection shows renderEmptyState; uncontrolled empty filter closes; controlled items going empty -> non-empty reopen while focused; Escape revert does not reopen', async () => {
    // allowsEmptyCollection + empty state renders.
    const emptyWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox allowsEmptyCollection>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <template #empty><div class="empty-state">No results</div></template>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const emptyInput = getInput(emptyWrapper)
    emptyInput.focus()
    dispatchKey(emptyInput, 'keydown', {key: 'ArrowDown'})
    await tick(4)
    expect(emptyInput.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.empty-state')?.textContent).toContain('No results')
    emptyWrapper.unmount()

    // Uncontrolled filter that matches nothing closes the menu.
    const filterWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const filterInput = getInput(filterWrapper)
    filterInput.focus()
    await type(filterInput, 'zzzz')
    await tick(4)
    expect(filterInput.getAttribute('aria-expanded')).toBe('false')
    filterWrapper.unmount()

    // Controlled items going from empty to non-empty can reopen while focused.
    const items = ref([{id: '1', name: 'Apple'}])
    const controlledWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      setup() {
        return {items}
      },
      template: `
        <ComboBox :items="items">
          <Label>Favorite Food</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <template #default="{ item }">
                <ListBoxItem :id="item.id">{{ item.name }}</ListBoxItem>
              </template>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const controlledInput = getInput(controlledWrapper)
    controlledInput.focus()
    const controlledButton = getButton(controlledWrapper)
    await click(controlledButton)
    await tick(4)
    expect(controlledInput.getAttribute('aria-expanded')).toBe('true')

    // Go empty: menu closes.
    items.value = []
    await tick(4)
    expect(controlledInput.getAttribute('aria-expanded')).toBe('false')

    // Go non-empty again while focused: menu reopens.
    items.value = [{id: '1', name: 'Apple'}]
    await tick(4)
    expect(controlledInput.getAttribute('aria-expanded')).toBe('true')
    controlledWrapper.unmount()

    // Escape revert does not immediately reopen the menu.
    const escapeWrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const escapeInput = getInput(escapeWrapper)
    escapeInput.focus()
    await type(escapeInput, 'zzzz')
    await tick(3)
    expect(escapeInput.getAttribute('aria-expanded')).toBe('false')
    dispatchKey(escapeInput, 'keydown', {key: 'Escape'})
    await tick(4)
    expect(escapeInput.getAttribute('aria-expanded')).toBe('false')
    expect(escapeInput.value).toBe('')
    escapeWrapper.unmount()
  })

  it('16. root/export tests: useComboBox/useFilter/useTextField from vue-aria; useComboBoxState from vue-stately; ComboBox family + useFilter from vue-aria-components; type probes; no deferred stubs', async () => {
    // Runtime exports.
    expect(typeof useComboBox).toBe('function')
    expect(typeof useFilter).toBe('function')
    expect(typeof ariaUseFilter).toBe('function')
    expect(typeof useTextField).toBe('function')
    expect(typeof useComboBoxState).toBe('function')
    // Official-style subpath runtime imports (existing via package exports "./*").
    expect(typeof useComboBoxSub).toBe('function')
    expect(typeof useFilterSub).toBe('function')
    expect(typeof useTextFieldSub).toBe('function')
    expect(typeof useComboBoxStateSub).toBe('function')
    expect(typeof ComboBoxComponent).toBe('object')
    expect(typeof InputComponent).toBe('object')
    expect(typeof ComboBox).toBe('object')
    expect(typeof ComboBoxValue).toBe('object')
    expect(typeof Input).toBe('object')
    expect(InputContext).toBeDefined()
    expect(ComboBoxContext).toBeDefined()
    expect(ComboBoxStateContext).toBeDefined()
    expect(ComboBoxValueContext).toBeDefined()

    // ComboBox internals and deferred stubs are not exported.
    expect((components as any).useComboBoxState).toBeUndefined()
    expect((components as any).useComboBox).toBeUndefined()
    expect((components as any).useTextField).toBeUndefined()
    for (const name of ['FieldError', 'Form', 'Group', 'Autocomplete', 'useTreeState', 'useAsyncList', 'HiddenSelect', 'I18nProvider', 'useLocale']) {
      expect((components as any)[name]).toBeUndefined()
    }

    // Type-probe official type names.
    const typeProbe = (
      _filter: Filter | null,
      _ariaProps: AriaComboBoxProps<any> | null,
      _ariaOptions: AriaComboBoxOptions<any> | null,
      _aria: ComboBoxAria<any> | null,
      _tfProps: TextFieldProps | null,
      _tfAriaProps: AriaTextFieldProps | null,
      _tfOptions: AriaTextFieldOptions | null,
      _tfAria: TextFieldAria | null,
      _comboProps: ComboBoxProps<any> | null,
      _comboStateOptions: ComboBoxStateOptions<any> | null,
      _comboState: ComboBoxState<any> | null,
      _comboValidation: ComboBoxValidationValue | null,
      _menuTrigger: MenuTriggerAction | null,
    ) =>
      [_filter, _ariaProps, _ariaOptions, _aria, _tfProps, _tfAriaProps, _tfOptions, _tfAria, _comboProps, _comboStateOptions, _comboState, _comboValidation, _menuTrigger]
    expect(typeof typeProbe).toBe('function')

    // useFilter basics: contains/startsWith/endsWith with base sensitivity.
    const filter = ariaUseFilter({sensitivity: 'base'})
    expect(filter.contains('Apple', 'ppl')).toBe(true)
    expect(filter.contains('Apple', 'p')).toBe(true)
    expect(filter.contains('Apple', 'z')).toBe(false)
    expect(filter.startsWith('Apple', 'app')).toBe(true)
    expect(filter.startsWith('Apple', 'ple')).toBe(false)
    expect(filter.endsWith('Apple', 'ple')).toBe(true)
    expect(filter.endsWith('Apple', 'app')).toBe(false)
    // Empty substring matches everything.
    expect(filter.contains('Apple', '')).toBe(true)
    expect(filter.startsWith('Apple', '')).toBe(true)
    expect(filter.endsWith('Apple', '')).toBe(true)
  })

  it('17. open popover is not aria-hidden/inert and input remains unhidden while open', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem},
      template: `
        <ComboBox>
          <Label>Favorite Animal</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <ListBoxItem id="1">Cat</ListBoxItem>
              <ListBoxItem id="2">Dog</ListBoxItem>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)

    const input = getInput(wrapper)
    input.focus()
    // Open via keyboard.
    dispatchKey(input, 'keydown', {key: 'ArrowDown'})
    await tick(4)

    const popover = document.querySelector('.react-aria-Popover') as HTMLElement | null
    expect(popover).toBeTruthy()
    // The open popover must not be hidden from assistive tech.
    expect(popover!.getAttribute('aria-hidden')).toBeFalsy()
    expect((popover as any).inert ?? popover!.getAttribute?.('inert')).toBeFalsy()

    // The input stays unhidden (it is an ariaHideOutside target).
    expect(input.getAttribute('aria-hidden')).toBeFalsy()
    expect((input as any).inert ?? input.getAttribute?.('inert')).toBeFalsy()
    wrapper.unmount()
  })

  it('18. defaultItems are auto-filtered by typed input (typed "p" keeps Apple, drops Banana, empty sections dropped)', async () => {
    const wrapper = mountInDoc(defineComponent({
      components: {ComboBox, Label, Input, Button, Popover, ListBox, ListBoxItem, ListBoxSection},
      setup() {
        const items = ref([
          {id: '1', name: 'Apple'},
          {id: '2', name: 'Banana'},
          {type: 'section', title: 'Vegetables', items: [{id: '3', name: 'Carrot'}, {id: '4', name: 'Kale'}]},
        ])
        return {items}
      },
      template: `
        <ComboBox :default-items="items">
          <Label>Favorite Food</Label>
          <Input />
          <Button />
          <Popover>
            <ListBox>
              <template #default="{ item }">
                <ListBoxItem :id="item.id">{{ item.name }}</ListBoxItem>
              </template>
            </ListBox>
          </Popover>
        </ComboBox>
      `,
    }))
    await tick(4)
    const input = getInput(wrapper)
    input.focus()
    // Type "p": auto-filter over defaultItems keeps Apple and drops Banana.
    await type(input, 'p')
    await tick(4)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const filtered = getOptions()
    expect(filtered.map(o => o.textContent?.trim())).toEqual(['Apple'])
    wrapper.unmount()
  })
})

function wrapperUnmountAll(wrappers: Array<{unmount: () => void}>) {
  for (const w of wrappers) w.unmount()
}
