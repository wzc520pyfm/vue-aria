import {defineComponent, isRef, ref} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {
  BehaviorElement,
  behaviorAdapter,
  chain,
  HiddenSelect,
  mergeProps,
  toHeroDataAttrs,
  useButton,
  useCheckbox,
  useCheckboxGroup,
  useCheckboxGroupItem,
  useDialog,
  useFocusScope,
  useFocusVisible,
  useHiddenSelect,
  useHover,
  useInteractOutside,
  useInvalid,
  useListBox,
  useListBoxSection,
  useOption,
  ListKeyboardDelegate,
  useModal,
  useModalOverlay,
  useOverlayTrigger,
  usePlacement,
  usePopover,
  usePresenceState,
  usePress,
  usePreventScroll,
  useRadio,
  useRadioGroup,
  useSelect,
  useSelectable,
  useSwitch,
  useToolbar,
  useTooltip,
  useTooltipTrigger,
} from 'vue-aria'
import type {
  AriaHiddenSelectOptions,
  AriaHiddenSelectProps,
  AriaSelectOptions,
  AriaSelectProps,
  AriaToolbarProps,
  HiddenSelectAria,
  HiddenSelectProps,
  SelectAria,
  ToolbarAria,
} from 'vue-aria'
import type {ToolbarProps, ToolbarRenderProps} from 'vue-aria-components'
import {useToolbar as useToolbarSubpath} from 'vue-aria/useToolbar'
import {Toolbar as ToolbarSubpath, ToolbarContext as ToolbarContextSubpath} from 'vue-aria-components/Toolbar'
import * as vueAriaRoot from 'vue-aria'
import * as vueAriaComponentsRoot from 'vue-aria-components'
import * as vueStatelyRoot from 'vue-stately'
import {
  useCheckboxGroupState,
  useOverlayTriggerState,
  useRadioGroupState,
  useToggleState,
  useTooltipTriggerState,
} from 'vue-stately'

describe('vue-aria main entry', () => {
  it('re-exports the first-batch public surface and overlay hooks', () => {
    expect(typeof usePress).toBe('function')
    expect(typeof useHover).toBe('function')
    expect(typeof useFocusVisible).toBe('function')
    expect(typeof useButton).toBe('function')
    expect(typeof useSelectable).toBe('function')
    expect(typeof usePresenceState).toBe('function')
    expect(typeof useInvalid).toBe('function')
    expect(typeof usePlacement).toBe('function')
    expect(typeof toHeroDataAttrs).toBe('function')
    expect(typeof mergeProps).toBe('function')
    expect(typeof chain).toBe('function')
    expect(BehaviorElement).toBeDefined()
    expect(behaviorAdapter.name).toBe('vue-aria')
    expect(typeof useOverlayTrigger).toBe('function')
    expect(typeof useDialog).toBe('function')
    expect(typeof useModal).toBe('function')
    expect(typeof useModalOverlay).toBe('function')
    expect(typeof usePopover).toBe('function')
    expect(typeof useTooltip).toBe('function')
    expect(typeof useTooltipTrigger).toBe('function')
    expect(typeof usePreventScroll).toBe('function')
    expect(typeof useFocusScope).toBe('function')
    expect(typeof useInteractOutside).toBe('function')
    expect(typeof useListBox).toBe('function')
    expect(typeof useOption).toBe('function')
    expect(typeof useListBoxSection).toBe('function')
    expect(typeof ListKeyboardDelegate).toBe('function')
    expect(typeof useSelect).toBe('function')
    expect(typeof useHiddenSelect).toBe('function')
    expect(HiddenSelect).toBeDefined()
    // Type-level presence check (compile-time): the official root re-exports
    // these types, and so must the vue-aria root.
    const typeProbe = (
      _selectProps: AriaSelectProps | null,
      _selectOptions: AriaSelectOptions | null,
      _selectAria: SelectAria | null,
      _hiddenProps: AriaHiddenSelectProps | null,
      _hiddenOptions: AriaHiddenSelectOptions | null,
      _hiddenPropsFull: HiddenSelectProps | null,
      _hiddenAria: HiddenSelectAria | null,
    ) => [_selectProps, _selectOptions, _selectAria, _hiddenProps, _hiddenOptions, _hiddenPropsFull, _hiddenAria]
    expect(typeof typeProbe).toBe('function')
    expect(typeof useToolbar).toBe('function')
    expect(useToolbarSubpath).toBe(useToolbar)
    expect(ToolbarSubpath).toBe((vueAriaComponentsRoot as Record<string, unknown>).Toolbar)
    expect(ToolbarContextSubpath).toBe((vueAriaComponentsRoot as Record<string, unknown>).ToolbarContext)
    const toolbarOptions: AriaToolbarProps = {orientation: 'vertical', 'aria-label': 'Tools'}
    const toolbarStyle: ToolbarProps = {
      orientation: 'horizontal',
      className: (values) => values.defaultClassName ?? values.orientation,
      style: (values) => values.defaultStyle,
    }
    const toolbarRender: ToolbarRenderProps = {orientation: 'vertical'}
    const toolbarProbe = (_aria: ToolbarAria | null, _props: ToolbarProps | null) => toolbarRender.orientation
    expect(toolbarStyle.className).toBeTypeOf('function')
    expect(toolbarStyle.style).toBeTypeOf('function')
    expect(toolbarOptions.orientation).toBe('vertical')
    expect(toolbarOptions['aria-label']).toBe('Tools')
    expect(toolbarProbe(null, toolbarStyle)).toBe('vertical')
  })

  it('keeps all three interaction *Props objects unwrapped', () => {
    let pressProps: ReturnType<typeof usePress>['pressProps'] | undefined
    let hoverProps: ReturnType<typeof useHover>['hoverProps'] | undefined
    let focusProps: ReturnType<typeof useFocusVisible>['focusProps'] | undefined

    const Probe = defineComponent({
      setup() {
        pressProps = usePress().pressProps
        hoverProps = useHover().hoverProps
        focusProps = useFocusVisible().focusProps
        return () => null
      },
    })
    mount(Probe)

    expect(isRef(pressProps)).toBe(false)
    expect(isRef(hoverProps)).toBe(false)
    expect(isRef(focusProps)).toBe(false)
    expect(typeof pressProps?.onPointerdown).toBe('function')
    expect(typeof hoverProps?.onPointerenter).toBe('function')
    expect(typeof focusProps?.onFocus).toBe('function')
  })

  it('keeps new overlay *Props objects unwrapped (not ComputedRef)', () => {
    let triggerProps: ReturnType<typeof useOverlayTrigger>['triggerProps'] | undefined
    let overlayProps: ReturnType<typeof useOverlayTrigger>['overlayProps'] | undefined
    let dialogProps: ReturnType<typeof useDialog>['dialogProps'] | undefined
    let titleProps: ReturnType<typeof useDialog>['titleProps'] | undefined
    let modalProps: ReturnType<typeof useModal>['modalProps'] | undefined
    let modalOverlayProps: ReturnType<typeof useModalOverlay>['modalProps'] | undefined
    let popoverProps: ReturnType<typeof usePopover>['popoverProps'] | undefined
    let tooltipProps: ReturnType<typeof useTooltip>['tooltipProps'] | undefined
    let tooltipTriggerProps: ReturnType<typeof useTooltipTrigger>['triggerProps'] | undefined

    const Probe = defineComponent({
      setup() {
        const overlayState = useOverlayTriggerState()
        const tooltipState = useTooltipTriggerState()
        const overlayRef = ref<HTMLElement | null>(null)
        const triggerRef = ref<Element | null>(null)
        const popoverRef = ref<HTMLElement | null>(null)
        const overlay = useOverlayTrigger({type: 'dialog'}, overlayState)
        triggerProps = overlay.triggerProps
        overlayProps = overlay.overlayProps
        dialogProps = useDialog({role: 'dialog'}).dialogProps
        titleProps = useDialog({role: 'dialog'}).titleProps
        modalProps = useModal({ref: overlayRef}).modalProps
        modalOverlayProps = useModalOverlay({}, overlayState, overlayRef).modalProps
        popoverProps = usePopover({triggerRef, popoverRef}, overlayState).popoverProps
        tooltipProps = useTooltip({}, tooltipState).tooltipProps
        tooltipTriggerProps = useTooltipTrigger({}, tooltipState, triggerRef).triggerProps
        return () => null
      },
    })
    mount(Probe)

    expect(isRef(triggerProps)).toBe(false)
    expect(isRef(overlayProps)).toBe(false)
    expect(isRef(dialogProps)).toBe(false)
    expect(isRef(titleProps)).toBe(false)
    expect(isRef(modalProps)).toBe(false)
    expect(isRef(modalOverlayProps)).toBe(false)
    expect(isRef(popoverProps)).toBe(false)
    expect(isRef(tooltipProps)).toBe(false)
    expect(isRef(tooltipTriggerProps)).toBe(false)
    expect(typeof triggerProps?.onPress).toBe('function')
    expect(typeof dialogProps?.role).toBe('string')
    expect(tooltipProps?.role).toBe('tooltip')
  })

  it('keeps ListBox hook *Props objects unwrapped (not ComputedRef)', async () => {
    const {useListState} = await import('vue-stately')
    let listBoxProps: any
    let optionProps: any
    let labelProps: any
    let descriptionProps: any
    let sectionItemProps: any
    let sectionHeadingProps: any
    let sectionGroupProps: any

    const Probe = defineComponent({
      setup() {
        const state = useListState({
          selectionMode: 'single',
          items: [{id: 'a', name: 'A'}],
        } as any)
        const refEl = ref<HTMLElement | null>(null)
        listBoxProps = useListBox({'aria-label': 'x'}, state as any, refEl).listBoxProps
        const opt = useOption({key: 'a'} as any, state as any, refEl)
        optionProps = opt.optionProps
        labelProps = opt.labelProps
        descriptionProps = opt.descriptionProps
        const sec = useListBoxSection({heading: 'H'})
        sectionItemProps = sec.itemProps
        sectionHeadingProps = sec.headingProps
        sectionGroupProps = sec.groupProps
        return () => null
      },
    })
    mount(Probe)

    expect(isRef(listBoxProps)).toBe(false)
    expect(isRef(optionProps)).toBe(false)
    expect(isRef(labelProps)).toBe(false)
    expect(isRef(descriptionProps)).toBe(false)
    expect(isRef(sectionItemProps)).toBe(false)
    expect(isRef(sectionHeadingProps)).toBe(false)
    expect(isRef(sectionGroupProps)).toBe(false)
    expect(listBoxProps.role).toBe('listbox')
    expect(optionProps.role).toBe('option')
  })

  it('exposes the Checkbox / Radio / Switch hook slice and its state hooks', () => {
    expect(typeof useCheckbox).toBe('function')
    expect(typeof useCheckboxGroup).toBe('function')
    expect(typeof useCheckboxGroupItem).toBe('function')
    expect(typeof useRadio).toBe('function')
    expect(typeof useRadioGroup).toBe('function')
    expect(typeof useSwitch).toBe('function')
    expect(typeof useToggleState).toBe('function')
    expect(typeof useCheckboxGroupState).toBe('function')
    expect(typeof useRadioGroupState).toBe('function')
    expect(typeof vueStatelyRoot.useToggleState).toBe('function')
    expect(typeof vueStatelyRoot.useCheckboxGroupState).toBe('function')
    expect(typeof vueStatelyRoot.useRadioGroupState).toBe('function')
  })

  it('exposes the Checkbox / Radio / Switch components and contexts', () => {
    const names = [
      'Checkbox',
      'CheckboxGroup',
      'CheckboxField',
      'CheckboxButton',
      'CheckboxContext',
      'CheckboxFieldContext',
      'CheckboxGroupContext',
      'CheckboxGroupStateContext',
      'RadioGroup',
      'Radio',
      'RadioField',
      'RadioButton',
      'RadioGroupContext',
      'RadioContext',
      'RadioFieldContext',
      'RadioGroupStateContext',
      'Switch',
      'SwitchField',
      'SwitchButton',
      'SwitchContext',
      'SwitchFieldContext',
    ]
    for (const name of names) {
      expect((vueAriaComponentsRoot as Record<string, unknown>)[name], name).toBeDefined()
    }
  })

  it('keeps internal and deferred names off the public surface', () => {
    // Must-not-export list from the checkbox/radio/switch slice brief, plus
    // the previously established deferred names.
    const vueAriaAbsent = [
      'useToggle',
      'useToggleGroupState',
      'useFocusable',
      'Focusable',
      'FocusableProvider',
      'filterDOMProps',
      'useFormValidation',
      'useFormValidationState',
      'FormValidationContext',
      'Form',
      'FormContext',
      'FieldError',
      'FieldErrorContext',
      'useEvent',
      'SelectionIndicator',
      'SharedElementTransition',
      'getFocusableTreeWalker',
      'createFocusManager',
      'isFocusable',
      'isElementVisible',
      'isTabbable',
      'ShadowTreeWalker',
      'createShadowTreeWalker',
      'focusableNext',
      'focusablePrevious',
      'focusableFirst',
      'focusableLast',
      'ToggleButton',
      'ToggleButtonGroup',
      'Tabs',
      'TabList',
      'TabPanel',
      'Link',
      'Breadcrumbs',
      'useMove',
    ]
    for (const name of vueAriaAbsent) {
      expect(vueAriaRoot as Record<string, unknown>, name).not.toHaveProperty(name)
    }

    const vueStatelyAbsent = ['useToggle', 'useToggleGroupState', 'useFormValidationState', 'useEvent']
    for (const name of vueStatelyAbsent) {
      expect(vueStatelyRoot as Record<string, unknown>, name).not.toHaveProperty(name)
    }

    const componentsAbsent = [
      'useToggle',
      'useFocusable',
      'Focusable',
      'FocusableProvider',
      'filterDOMProps',
      'useFormValidation',
      'useFormValidationState',
      'FormValidationContext',
      'Form',
      'FormContext',
      'FieldError',
      'FieldErrorContext',
      'useEvent',
      'SelectionIndicator',
      'SharedElementTransition',
      'getFocusableTreeWalker',
      'createFocusManager',
      'isFocusable',
      'isElementVisible',
      'ShadowTreeWalker',
      'createShadowTreeWalker',
      'focusableNext',
      'ToggleButton',
      'ToggleButtonGroup',
      'Tabs',
      'TabList',
      'TabPanel',
      'Link',
      'Breadcrumbs',
      'useMove',
      'useToolbar',
    ]
    for (const name of componentsAbsent) {
      expect(vueAriaComponentsRoot as Record<string, unknown>, name).not.toHaveProperty(name)
    }
  })
})
