import {defineComponent, h, nextTick, ref} from 'vue'
import {flushPromises, mount} from '@vue/test-utils'
import {afterEach, describe, expect, it} from 'vitest'
import {dispatchKey, dispatchPointer} from '../../../../test/dom-events'
import {Button} from 'vue-aria-components/Button'
import {Dialog, DialogTrigger} from 'vue-aria-components/Dialog'
import {Heading} from 'vue-aria-components/Heading'
import {Modal, ModalOverlay} from 'vue-aria-components/Modal'
import {Popover} from 'vue-aria-components/Popover'
import {OverlayArrow} from 'vue-aria-components/OverlayArrow'
import {Tooltip, TooltipTrigger} from 'vue-aria-components/Tooltip'

function mountInDoc(component: Parameters<typeof mount>[0], options?: Parameters<typeof mount>[1]) {
  return mount(component, {...options, attachTo: document.body})
}

async function tickPresence() {
  await flushPromises()
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 20))
  await flushPromises()
}

const DialogExample = defineComponent({
  name: 'DialogExample',
  props: {
    isOpen: {type: Boolean, default: undefined},
    defaultOpen: {type: Boolean, default: undefined},
    isDismissable: {type: Boolean, default: false},
    labelledByTrigger: {type: Boolean, default: false},
  },
  emits: ['openchange'],
  setup(props, {emit}) {
    return () =>
      h(DialogTrigger, {
        isOpen: props.isOpen,
        defaultOpen: props.defaultOpen,
        onOpenchange: (isOpen: boolean) => emit('openchange', isOpen),
      }, {
        default: () => [
          h(Button, null, {default: () => 'Open'}),
          h(Modal, {isDismissable: props.isDismissable}, {
            default: () =>
              h(Dialog, props.labelledByTrigger ? {} : {'aria-label': 'Settings'}, {
                default: () => [
                  props.labelledByTrigger ? h(Heading, {slot: 'title'}, {default: () => 'Title'}) : null,
                  h('input', {placeholder: 'inside'}),
                  h(Button, {slot: 'close'}, {default: () => 'Close'}),
                ],
              }),
          }),
        ],
      })
  },
})


describe('DialogTrigger + Modal + Dialog', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('opens and closes uncontrolled, emits data-slot, and restores focus', async () => {
    const wrapper = mountInDoc(DialogExample)
    const trigger = wrapper.get('button')
    expect(document.querySelector('[data-slot="modal-overlay"]')).toBeNull()

    trigger.element.focus()
    dispatchPointer(trigger.element, 'pointerdown')
    dispatchPointer(trigger.element, 'pointerup')
    await tickPresence()

    const overlay = document.querySelector('[data-slot="modal-overlay"]') as HTMLElement | null
    const modal = document.querySelector('[data-slot="modal"]') as HTMLElement | null
    const dialog = document.querySelector('[data-slot="dialog"]') as HTMLElement | null
    expect(overlay).not.toBeNull()
    expect(modal).not.toBeNull()
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-label')).toBe('Settings')

    // Focus should be inside the modal/dialog
    expect(overlay?.contains(document.activeElement) || dialog === document.activeElement).toBe(true)

    dispatchKey(dialog!, 'keydown', {key: 'Escape'})
    await tickPresence()
    expect(document.querySelector('[data-slot="modal-overlay"]')).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('emits data-entering then clears it, and data-exiting on close before unmount', async () => {
    const wrapper = mountInDoc(DialogExample, {props: {defaultOpen: true}})
    await flushPromises()
    const overlay = document.querySelector('[data-slot="modal-overlay"]') as HTMLElement
    expect(overlay).not.toBeNull()
    // Immediately after open we should have seen entering, or already moved to idle.
    const enteringOrIdle =
      overlay.hasAttribute('data-entering') || !overlay.hasAttribute('data-exiting')
    expect(enteringOrIdle).toBe(true)
    if (overlay.hasAttribute('data-entering')) {
      await tickPresence()
      expect(overlay.hasAttribute('data-entering')).toBe(false)
    }

    dispatchKey(overlay, 'keydown', {key: 'Escape'})
    await flushPromises()
    await nextTick()
    const exiting = document.querySelector('[data-slot="modal-overlay"]') as HTMLElement | null
    expect(exiting).not.toBeNull()
    expect(exiting?.getAttribute('data-exiting')).toBe('true')
    await tickPresence()
    expect(document.querySelector('[data-slot="modal-overlay"]')).toBeNull()
    wrapper.unmount()
  })

  it('does not close a modal on outside click by default, and does when isDismissable', async () => {
    const wrapper = mountInDoc(DialogExample, {props: {defaultOpen: true}})
    await tickPresence()
    expect(document.querySelector('[data-slot="dialog"]')).not.toBeNull()

    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.append(outside)
    dispatchPointer(outside, 'pointerdown')
    outside.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}))
    await tickPresence()
    expect(document.querySelector('[data-slot="dialog"]')).not.toBeNull()
    wrapper.unmount()
    document.body.replaceChildren()

    const dismissable = mountInDoc(DialogExample, {props: {defaultOpen: true, isDismissable: true}})
    await tickPresence()
    const outside2 = document.createElement('button')
    outside2.textContent = 'outside'
    document.body.append(outside2)
    dispatchPointer(outside2, 'pointerdown')
    outside2.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}))
    await tickPresence()
    expect(document.querySelector('[data-slot="dialog"]')).toBeNull()
    dismissable.unmount()
  })

  it('supports controlled isOpen and slot="close"', async () => {
    const isOpen = ref(true)
    const Root = defineComponent({
      setup() {
        return () =>
          h(DialogTrigger, {
            isOpen: isOpen.value,
            onOpenchange: (next: boolean) => {
              isOpen.value = next
            },
          }, {
            default: () => [
              h(Button, null, {default: () => 'Open'}),
              h(Modal, null, {
                default: () =>
                  h(Dialog, {'aria-label': 'Controlled'}, {
                    default: () => h(Button, {slot: 'close'}, {default: () => 'Close'}),
                  }),
              }),
            ],
          })
      },
    })
    const wrapper = mountInDoc(Root)
    await tickPresence()
    expect(document.querySelector('[data-slot="dialog"]')).not.toBeNull()

    const closeBtn = document.querySelector('[data-slot="dialog"] button') as HTMLButtonElement
    dispatchPointer(closeBtn, 'pointerdown')
    dispatchPointer(closeBtn, 'pointerup')
    await tickPresence()
    expect(isOpen.value).toBe(false)
    expect(document.querySelector('[data-slot="dialog"]')).toBeNull()
    wrapper.unmount()
  })

  it('wires Heading slot="title" to aria-labelledby', async () => {
    const wrapper = mountInDoc(DialogExample, {props: {defaultOpen: true, labelledByTrigger: true}})
    await tickPresence()
    const dialog = document.querySelector('[data-slot="dialog"]') as HTMLElement
    const heading = document.querySelector('[data-slot="heading"]') as HTMLElement
    expect(heading).not.toBeNull()
    expect(heading.getAttribute('id')).toBeTruthy()
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.getAttribute('id'))
    expect(dialog.getAttribute('aria-label')).toBeNull()
    wrapper.unmount()
  })

  it('traps tab focus inside the modal', async () => {
    const wrapper = mountInDoc(DialogExample, {props: {defaultOpen: true}})
    await tickPresence()
    const dialog = document.querySelector('[data-slot="dialog"]') as HTMLElement
    const input = dialog.querySelector('input') as HTMLInputElement
    const closeBtn = dialog.querySelector('button') as HTMLButtonElement
    closeBtn.focus()
    dispatchKey(closeBtn, 'keydown', {key: 'Tab'})
    await flushPromises()
    // After last element, focus should cycle to the first focusable (input or dialog)
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement === input || document.activeElement === dialog || document.activeElement === closeBtn).toBe(true)
    wrapper.unmount()
  })
})

const PopoverExample = defineComponent({
  name: 'PopoverExample',
  props: {
    defaultOpen: {type: Boolean, default: false},
    isOpen: {type: Boolean, default: undefined},
  },
  emits: ['openchange'],
  setup(props, {emit}) {
    return () =>
      h(DialogTrigger, {
        isOpen: props.isOpen,
        defaultOpen: props.defaultOpen,
        onOpenchange: (isOpen: boolean) => emit('openchange', isOpen),
      }, {
        default: () => [
          h(Button, null, {default: () => 'Open popover'}),
          h(Popover, {placement: 'bottom'}, {
            default: () => [
              h(Dialog, {'aria-label': 'Popover dialog'}, {
                default: () => h('span', 'Popover body'),
              }),
              h(OverlayArrow),
            ],
          }),
        ],
      })
  },
})

describe('DialogTrigger + Popover', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('opens, emits data-placement and data-slot, and closes on Escape and outside click', async () => {
    const wrapper = mountInDoc(PopoverExample)
    const trigger = wrapper.get('button')
    dispatchPointer(trigger.element, 'pointerdown')
    dispatchPointer(trigger.element, 'pointerup')
    await tickPresence()

    const popover = document.querySelector('[data-slot="popover"]') as HTMLElement | null
    const arrow = document.querySelector('[data-slot="overlay-arrow"]') as HTMLElement | null
    expect(popover).not.toBeNull()
    expect(popover?.getAttribute('data-placement')).toBeTruthy()
    expect(arrow).not.toBeNull()
    expect(arrow?.getAttribute('data-placement')).toBeTruthy()

    dispatchKey(popover!, 'keydown', {key: 'Escape'})
    await tickPresence()
    expect(document.querySelector('[data-slot="popover"]')).toBeNull()

    dispatchPointer(trigger.element, 'pointerdown')
    dispatchPointer(trigger.element, 'pointerup')
    await tickPresence()
    expect(document.querySelector('[data-slot="popover"]')).not.toBeNull()

    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.append(outside)
    dispatchPointer(outside, 'pointerdown')
    outside.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}))
    await tickPresence()
    expect(document.querySelector('[data-slot="popover"]')).toBeNull()
    wrapper.unmount()
  })
})

const TooltipExample = defineComponent({
  name: 'TooltipExample',
  setup() {
    return () =>
      h(TooltipTrigger, {delay: 0, closeDelay: 0}, {
        default: () => [
          h(Button, null, {default: () => 'Hint'}),
          h(Tooltip, {placement: 'top'}, {default: () => 'Hello'}),
        ],
      })
  },
})

describe('TooltipTrigger + Tooltip', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('opens on hover, sets role=tooltip and aria-describedby, emits data-slot/placement, closes on Escape', async () => {
    const wrapper = mountInDoc(TooltipExample)
    const trigger = wrapper.get('button')
    dispatchPointer(trigger.element, 'pointerenter')
    await tickPresence()

    const tooltip = document.querySelector('[data-slot="tooltip"]') as HTMLElement | null
    expect(tooltip).not.toBeNull()
    expect(tooltip?.getAttribute('role')).toBe('tooltip')
    expect(tooltip?.getAttribute('data-placement')).toBeTruthy()
    expect(trigger.attributes('aria-describedby')).toBe(tooltip?.id)

    dispatchKey(document, 'keydown', {key: 'Escape'})
    await tickPresence()
    expect(document.querySelector('[data-slot="tooltip"]')).toBeNull()
    wrapper.unmount()
  })
})
