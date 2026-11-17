# vue-aria

Vue 3 port of [React Aria](https://react-spectrum.adobe.com/react-aria/) as three monopackages, matching the current official layout (not the older `@react-aria/*` split packages).

| Package | Official counterpart | Role |
| --- | --- | --- |
| `vue-aria` | `react-aria@3.53.1` | Interaction and component hooks |
| `vue-stately` | `react-stately@3.51.0` | State hooks |
| `vue-aria-components` | `react-aria-components@1.22.1` | Styled-agnostic Vue components |

```ts
import {usePress, useButton} from 'vue-aria'
import {usePress as usePressSubpath} from 'vue-aria/usePress'
import {Button} from 'vue-aria-components'
import {Button as ButtonSubpath} from 'vue-aria-components/Button'
```

## Status

The first batch covers the monorepo scaffold, `usePress` / `useHover` / `useFocusVisible`, Button hooks, the `vue-aria-components` `Button`, and a Hero UI Vue behavior-layer contract.

The overlays batch adds:

- `vue-stately`: `useOverlayTriggerState`, `useTooltipTriggerState` (official delays 1500 / 500)
- `vue-aria`: `useOverlayTrigger`, `useDialog`, `useModal`, `useModalOverlay`, `usePopover`, `useTooltip` / `useTooltipTrigger`, `usePreventScroll`, `useFocusScope`, `useInteractOutside`
- `vue-aria-components`: `Dialog`, `DialogTrigger`, `Modal`, `ModalOverlay`, `Popover`, `OverlayArrow`, `Tooltip`, `TooltipTrigger`, and a minimal `Heading` (`slot="title"`)

This collections batch adds the collection foundation and a usable `ListBox`:

- `vue-stately`: `useMultipleSelectionState`, `useListState`, `Selection`, `SelectionManager`, `ListCollection`, `equalSets`
- `vue-aria`: `useListBox`, `useOption`, `useListBoxSection`, `ListKeyboardDelegate`
- `vue-aria-components`: `ListBox`, `ListBoxItem`, `ListBoxSection`, `Collection`, `Header`, `Text`

This Menu batch adds a usable Menu slice, including SubmenuTrigger:

- `vue-stately`: `useMenuTriggerState` (root menu trigger state and submenu stack), `useSubmenuTriggerState`
- `vue-aria`: `useMenu`, `useMenuItem`, `useMenuSection`, `useMenuTrigger`, `useSubmenuTrigger`, `useSeparator`, `useKeyboard`
- `vue-aria-components`: `Menu`, `MenuItem`, `MenuSection`, `MenuTrigger`, `SubmenuTrigger`, `Separator`, `Keyboard` (and Collection support in menus)

SubmenuTrigger hoists its trigger MenuItem into the parent list collection and renders its Popover as the submenu. `useSafelyMouseToSubmenu` is internal (not exported). RTL arrow behavior follows element/document direction (`dir`), not a full I18nProvider.

This Select batch adds:

- `vue-stately`: `useSelectState`
- `vue-aria`: `useSelect`, `useHiddenSelect`, `HiddenSelect`, `useField`
- `vue-aria-components`: `Select`, `SelectValue`, `SelectContext`, `SelectValueContext`, `SelectStateContext`, `Label`, `LabelContext`

This ComboBox batch adds:

- `vue-stately`: `useComboBoxState`
- `vue-aria`: `useComboBox`, `useFilter`, `useTextField`
- `vue-aria-components`: `ComboBox`, `ComboBoxValue`, `ComboBoxContext`, `ComboBoxStateContext`, `ComboBoxValueContext`, `Input`, `InputContext` (and `useFilter` re-exported from the root / ComboBox entry)

Generated collection keys for id-less items/sections are path-based: `$$va-item-<path>` and `$$va-section-<path>` (with path segments reflecting nesting and indices).

This dates slice adds the first usable `Calendar` vertical:

- `vue-stately`: `useCalendarState`
- `vue-aria`: `I18nProvider`, `useLocale`, `isRTL`, `useDateFormatter`, `useLocalizedStringFormatter`, `useLocalizedStringDictionary`, `useCalendar`, `useCalendarGrid`, `useCalendarCell`, `VisuallyHidden`, `useVisuallyHidden`
- `vue-aria-components`: `Calendar`, `CalendarGrid`, `CalendarGridHeader`, `CalendarGridBody`, `CalendarHeaderCell`, `CalendarCell`, `CalendarContext`, `CalendarStateContext`, plus re-exports of `I18nProvider` / `useLocale` / `isRTL`

This DateField slice adds the first usable `DateField` / `TimeField` vertical (segments, placeholders, `IncompleteDate`):

- `vue-stately`: `useDateFieldState`, `useTimeFieldState`
- `vue-aria`: `useDateField`, `useDateSegment`, `useTimeField`, `useFocusWithin`
- `vue-aria-components`: `DateField`, `TimeField`, `DateInput`, `DateSegment`, `DateFieldContext`, `TimeFieldContext`, `DateFieldStateContext`, `TimeFieldStateContext`, plus a minimal exported `Group` / `GroupContext`; each `DateField` / `TimeField` entry also re-exports `Label` and `Text`; `TimeField` uses a hidden input for the `timeValue` string and renders no `HiddenDateInput`

This DatePicker slice adds the single-value `DatePicker` (date and date+time), composed from a `DateField`-style inner field, a calendar popover, and a trigger button:

- `vue-stately`: `useDatePickerState`
- `vue-aria`: `useDatePicker`
- `vue-aria-components`: `DatePicker`, `DatePickerContext`, `DatePickerStateContext`; reuses `DateField` / `DateInput` / `DateSegment` / `Group` / `Button` / `Popover` / `Dialog` / `Calendar` / `Label` / `Text`

Scope: single-value DatePicker only (date and date+time). Selecting a date from the calendar and typing in the segments stay in sync, the popover commits a pending date (plus a placeholder time) on close when a time has not been chosen, and `shouldCloseOnSelect` accepts a boolean, getter, ref, or callback and is re-read on every selection. Form, `FieldError`, and their context stubs remain deferred and are not exported.

This RangeCalendar slice adds:

- `vue-stately`: `useRangeCalendarState`
- `vue-aria`: `useRangeCalendar`
- `vue-aria-components`: `RangeCalendar`, `RangeCalendarContext`, `RangeCalendarStateContext`; reuses `CalendarGrid` / `CalendarGridBody` / `CalendarCell` from the Calendar slice; Grid/Cell also fall back to `RangeCalendarStateContext` when no single `CalendarStateContext` is present

Scope: RangeCalendar only. Range selection works by two clicks or by mouse drag (touch drags are delayed 200 ms); keyboard selection (Enter/Space) uses `focusNearestAvailableDate`; dragging the start or end of the highlighted range adjusts the existing range; `commitBehavior` defaults to `'select'` when a pointer is released outside the calendar or focus leaves it, and is not triggered by the previous/next month buttons; `isDateUnavailable(date, anchorDate)` receives the live anchor date on every call; `allowsNonContiguousRanges` tightens the available range to the nearest unavailable date on each side when `false`; emitted dates keep the input calendar system (otherwise Gregorian) and preserve time. Form, `FieldError`, and their context stubs remain deferred and are not exported.

This DateRangePicker slice adds the two-value `DateRangePicker` (date and date+time), composed from two `DateField`-style inner fields, a range calendar popover, and a trigger button:

- `vue-stately`: `useDateRangePickerState`
- `vue-aria`: `useDateRangePicker`
- `vue-aria-components`: `DateRangePicker`, `DateRangePickerContext`, `DateRangePickerStateContext`; reuses `DateField` / `DateInput` / `DateSegment` / `Group` / `Button` / `Popover` / `Dialog` / `RangeCalendar` / `Label` / `Text`

Scope: DateRangePicker only (date and date+time). Two standalone `DateInput slot="start"` / `slot="end"` resolve the start/end field contexts provided by the picker (the flat DateField context is kept for the single-value `DatePicker`); hidden inputs carry `startName` / `endName` and the popover is anchored to the group while focus restores to the trigger button on close; `shouldCloseOnSelect` accepts a boolean, getter, ref, or callback and is re-read on every selection; closing the popover with a complete range and `hasTime` commits a placeholder time; `isDateUnavailable(date, anchorDate)` receives the live anchor date on every call and `allowsNonContiguousRanges` flows to the calendar; reversed ranges surface `rangeReversed` and start/end validation errors are merged. Form, `FieldError`, calendar month/year pickers, heading components, and a public `useEvent` remain deferred and are not exported.

This NumberField slice adds:

- `vue-stately`: `useNumberFieldState`
- `vue-aria`: `useNumberField`, `useNumberFormatter`, `useFocus`
- `vue-aria-components`: `NumberField`, `NumberFieldContext`, `NumberFieldStateContext`; reuses `Group` / `Input` / `Label` / `Button` / `Text`

Scope: NumberField only. Controlled/uncontrolled values, typing, blur commit/format, `commitBehavior` (`snap` default vs `validate`), increment/decrement buttons with press-and-hold, keyboard and wheel stepping, min/max/step, format options and locale, validation, and an optional hidden input for form submission. Form, `FieldError`, and their context stubs remain deferred and are not exported.

This TextField slice adds:

- `vue-stately`: `useSearchFieldState`
- `vue-aria`: completed `useTextField` (controlled/uncontrolled values, full native/ARIA form-validation machinery via the internal `useFormValidationState` / `useFormValidation` / `useFormReset`, live `inputElementType` for `Input` / `TextArea`) and new `useSearchField` (`Escape` clears a non-empty value and emits lowercase `clear`; `Enter` submits only when `onSubmit` is provided, otherwise the native form submit proceeds)
- `vue-aria-components`: `TextField` / `TextFieldContext`, `TextArea` / `TextAreaContext`, `SearchField` / `SearchFieldContext`; reuses `Group` / `Input` / `TextArea` / `Label` / `Button` (clear button via `ButtonContext`, `aria-label` "Clear search") / `Text`

Scope: TextField / TextArea / SearchField only. `TextField` supports both `Input` and `TextArea` (detected via the input ref; a textarea never receives `type` / `pattern`); controlled and uncontrolled values; typing with a lowercase Vue `change` event; label / description / errorMessage; `form` / `name` / `id` (`id` only on the input); outer `data-disabled` / `data-invalid` / `data-readonly` / `data-required` / `data-empty` (SearchField) as the string `"true"` or omitted; custom `data-*` only on the outer element; hover / focus data-* still work on the input / textarea. `*Props` and contexts are plain objects with live getters. `isRequired` with the default `'native'` validationBehavior renders `required` (not `aria-required`) at the component level; the hook default is `'aria'`. Official has no `TextFieldStateContext` / `SearchFieldStateContext` — none are provided. Form, `FieldError`, and their context stubs remain deferred and are not exported; `FieldErrorContext` is not backfilled into existing field components, and RAC cases that rely on `FieldError` are covered with native validity + `Text slot="errorMessage"` / `isInvalid` instead.

This Checkbox / Radio / Switch slice adds the toggle-family components and hooks:

- `vue-stately`: `useToggleState`, `useCheckboxGroupState`, `useRadioGroupState`
- `vue-aria`: internal `useToggle` (not exported), `useCheckbox`, `useCheckboxGroup`, `useCheckboxGroupItem`, `useRadio`, `useRadioGroup`, `useSwitch`
- `vue-aria-components`: `CheckboxGroup` / `CheckboxGroupStateContext` / `CheckboxGroupContext` / `CheckboxFieldContext`, `CheckboxField`, deprecated `Checkbox` / `CheckboxContext`, `CheckboxButton`; `RadioGroup` / `RadioGroupStateContext` / `RadioGroupContext` / `RadioFieldContext`, `RadioField`, deprecated `Radio` / `RadioContext`, `RadioButton`; `SwitchField` / `SwitchFieldContext`, deprecated `Switch` / `SwitchContext`, `SwitchButton`; each entry re-exports `Label` and `Text`

Scope: Checkbox / CheckboxGroup / Radio / RadioGroup / Switch only. Because Vue setup cannot conditionally call `useCheckbox` vs `useCheckboxGroupItem`, the field/wrapper components split into inner components that each call exactly one hook set; group items register per-item validity through the group state and roving tabIndex with arrow-key navigation (RTL-aware) follows the official radio group. `*Props` and contexts are plain objects with live getters; `data-*` booleans render the string `"true"` or are omitted; change events are lowercase Vue `change`; `isRequired` with the component-default `'native'` validationBehavior renders `required` (not `aria-required`) while the hook default stays `'aria'`. Form, `FieldError`, and their context stubs remain deferred and are not exported; `FieldErrorContext` is not backfilled into existing field components, and RAC cases that rely on `FieldError` are covered with native validity + `Text slot="errorMessage"` / `isInvalid` instead.

This Disclosure slice adds `Disclosure` / `DisclosureGroup` / `DisclosurePanel`:

- `vue-stately`: `useDisclosureState`, `useDisclosureGroupState` (live `allowsMultipleExpanded` / `isDisabled` / `expandedKeys`, plus `toggleKey` / `setExpandedKeys`)
- `vue-aria`: `useDisclosure` (`buttonProps` / `panelProps` are plain objects with live getters; `buttonProps` are behavior options for `Button` / `useButton`, not DOM `onPress` bindings)
- `vue-aria-components`: `Disclosure`, `DisclosurePanel`, `DisclosureGroup`, `DisclosureContext`, `DisclosureStateContext`, `DisclosureGroupStateContext`

Scope: Disclosure only. Standalone and grouped disclosures support controlled and uncontrolled expansion, single-expand accordions that may collapse fully, `allowsMultipleExpanded`, numeric keys, and nested isolation. Disabled blocks user input only. The trigger toggles on pointer `press` and keyboard `pressstart` (release does not toggle twice; arrow keys do not navigate). Panels use `hidden="until-found"` (not `display: none`), including `beforematch`, the SSR boolean `hidden`, and the no-WAAPI / measure-then-auto / hidden-after-collapse lifecycle. `data-focus-visible-within` follows descendant focus via local `focusin` / `focusout`. The component event is lowercase `expandedchange`; the hook option remains `onExpandedChange`. There is no `DisclosurePanel` subpath, no `useDisclosureGroup`, and no `DisclosureGroupContext`. Form, `FieldError`, ToggleButton, Toolbar, and Tabs remain deferred.

This Slider slice adds single-value and multi-thumb sliders:

- `vue-stately`: `useSliderState`
- `vue-aria`: `useSlider`, `useSliderThumb` (both from the root and from `vue-aria/useSlider`; there is no `useSliderThumb` subpath)
- `vue-aria-components`: `Slider`, `SliderOutput`, `SliderTrack`, `SliderThumb`, `SliderFill`, plus `SliderContext`, `SliderOutputContext`, `SliderTrackContext`, `SliderFillContext`, and `SliderStateContext`. The `Slider` entry also re-exports `Label`. There is no `SliderThumb` or `SliderFill` subpath and no `SliderThumbContext`.

Scope: Slider only. Defaults are min 0, max 100, step 1, and horizontal. An omitted value is an array callback; a numeric `value` or `defaultValue` stays scalar. Thumbs do not cross, track clicks move the nearest thumb (an equal distance selects the end thumb), and drags commit `change` then lowercase `changeend` (`onChange` / `onChangeend` on the component, `onChange` / `onChangeEnd` on the hooks). A visually hidden native `input[type=range]` keeps focus, name, form submission, reset, and the accessible value. Horizontal RTL and vertical axes, Arrow / Shift+Arrow / Home / End / PageUp / PageDown (including key repeat), per-thumb disabled, localized range output, and fill offsets are included. `className` accepts a string or a state function. A string `style` is kept together with the default thumb, track, and fill position. Context values are the default and local values override them, including an explicit `false`. `data-*` booleans render `"true"` or are omitted; `data-orientation` is the orientation string. Form, `FieldError`, ColorSlider, and a public `useMove` remain deferred and are not exported.

This ProgressBar and Meter slice adds read-only progress and meter:

- `vue-aria`: `useProgressBar` (root and `vue-aria/useProgressBar`) and `useMeter` (root and `vue-aria/useMeter`). `useMeter` reuses `useProgressBar` and overrides the role to `meter` while keeping the progress prop getters live.
- `vue-aria-components`: `ProgressBar`, `ProgressBarContext`, `Meter`, and `MeterContext` from the package root. `vue-aria-components/ProgressBar` also exports `Meter` and does not export `MeterContext`. `vue-aria-components/Meter` exports `Meter` and `Label` and does not export `MeterContext`.

Scope: ProgressBar and Meter only. Defaults are value 0, min 0, and max 100. Values are clamped. A zero-width range formats as 0%. Percent formatting uses the normalized 0–1 ratio; other formats use the actual value. A falsy `valueLabel` falls back to that formatted value. Determinate progress exposes a 0–100 `percentage` plus `aria-valuenow` and `aria-valuetext`. Indeterminate progress omits those two attributes, keeps min and max, and passes `percentage` and `valueText` as `undefined`. Meter stays determinate and its render props are only `percentage` and `valueText`. The label is a `span` with no `for`. There is no track, fill, `aria-live`, input, tabindex, keyboard handling, form participation, or added window listener. Context values are the defaults and local props override them, including an explicit `isIndeterminate` of `false`. A string context `style` is kept when the local style is a function. `className` may be a string or a render-state function. An explicit empty `className` (string or function result) is preserved instead of restoring the default class, matching `computedClassName ?? defaultClassName` in the official sources.

This slice is not complete RAC parity. Pin omissions that remain undocumented elsewhere: the official `dom.div` DOM render customization (including the `render` prop that replaces the rendered element) is not ported, the `data-rac` attribute emitted by official components for CSS targeting is not rendered, and the official development-mode warning for a missing accessible name (`If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute...`) is not implemented.

This Toolbar slice adds arrow-key focus navigation for a toolbar:

- `vue-aria`: `useToolbar` (root and `vue-aria/useToolbar`), with `AriaToolbarProps` and `ToolbarAria`. `toolbarProps` is a plain object with live getters.
- `vue-aria-components`: `Toolbar` and `ToolbarContext` from the package root and from `vue-aria-components/Toolbar`, with `ToolbarProps` and `ToolbarRenderProps`. The Toolbar subpath does not export `Label` or `DEFAULT_SLOT`. The package root also exports `DEFAULT_SLOT` for the default entry of a `slots` object. The built root and `Toolbar` bundles share that token through `Symbol.for('vue-aria-components.DEFAULT_SLOT')`, because `splitting: false` would otherwise inline a distinct `Symbol('default')` in each entry. `Provider`, `useContextProps`, and `useSlottedContext` are not exported.

Scope: Toolbar focus navigation and composition only. The default orientation is horizontal. Horizontal arrow keys move between focusable descendants; vertical orientation uses Up and Down. RTL reverses horizontal arrows only. Arrow navigation does not wrap and does not implement Home, End, roving tabindex, or a tabindex on the toolbar root. Recognized arrows are captured on the toolbar, call `preventDefault` and `stopPropagation` before the focused child sees them, and leave other keys alone. Tab records the previously focused child and moves focus to the absolute last focusable descendant (the absolute first when Shift is held) without cancelling the browser default. jsdom does not perform the browser's subsequent Tab exit or Shift+Tab reentry; tests move focus outside and back in and check restoration. A real browser's Tab exit and reentry was not verified. External reentry restores the remembered child. Arrow moves inside the toolbar do not restore, and a remembered child that was removed is not focused. Focusable targets include `tabindex="-1"` and exclude disabled controls, the `hidden` attribute, CSS `display: none` / `visibility: hidden` / `collapse`, `inert` subtrees, `data-react-aria-prevent-focus`, and non-summary content inside a closed `details`. The walker is rebuilt from the current root on each key. Nested toolbars render `role="toolbar"` on the server and on the first client render, then the inner toolbar becomes `role="group"` after mount and does not install navigation capture. Ancestor `role`, orientation, locale, and root replacement update the active toolbar and drop listeners, remembered focus, and observers from the previous root. Native inputs, links, and the existing Button and Checkbox compose without changes to those components. A non-null `aria-label` suppresses `aria-labelledby`; description and details attributes remain. There is no label slot or label registration. A context without a `slots` object is flat. A `slots` object resolves `slots[slot]` or, when `slot` is omitted, `slots[DEFAULT_SLOT]` using the symbol exported from `vue-aria-components`. A missing entry throws instead of inheriting the flat props. `slot={null}` still opts out completely, including after a named slot, and restoring the slot brings that slot's context back. Context and local DOM listeners each run once. `className` and `style` accept a string, object, or function of `{orientation, defaultClassName}` / `{orientation, defaultStyle}`. An explicit empty class string or function result stays empty. `ToolbarRenderProps` is orientation only.

This Toolbar slice is not complete RAC parity. The official `dom.div` DOM render customization, including the `render` prop that replaces the rendered element, is not implemented. The `data-rac` attribute is not rendered. The official development warning for a missing accessible name is not implemented. Experimental shadow DOM traversal (`ShadowTreeWalker` and the shadowDOM flag, which official builds disable by default) is not implemented; traversal uses an ordinary DOM TreeWalker scoped to the current root.

This ToggleButton slice adds selection and interaction for toggle buttons:

- `vue-stately`: `useToggleGroupState` (root and `vue-stately/useToggleGroupState`), with `ToggleGroupProps` and `ToggleGroupState`. `toggleKey` / `setSelected` / `setSelectedKeys` follow the pinned helpers: they do not normalize empty selection, they do not consult `isDisabled`, and they do not mutate the caller's `Set`. A controlled parent that ignores `onSelectionChange` keeps that public set as the base for the next operation. The shared `useControlledState` helper stores values in `ref()`, which wraps a `Set` in a deep proxy, so this hook keeps the raw `Set` in a `shallowRef` while using the same control rules.
- `vue-aria`: `useToggleButton` (root and `vue-aria/useToggleButton`) and `useToggleButtonGroup` / `useToggleButtonGroupItem` (root and `vue-aria/useToggleButtonGroup`). Returned props are plain objects with live getters. The existing Hero `useButton` is not modified and is not used here, because it has no ref, autofocus, or keyboard callbacks; this path composes the existing `usePress` and `useFocusable` instead.
- `vue-aria-components`: `ToggleButton`, `ToggleButtonContext`, `ToggleButtonGroup`, `ToggleButtonGroupContext`, and `ToggleGroupStateContext` from the package root. `vue-aria-components/ToggleButton` exports the button, its context, and `ToggleState`. `vue-aria-components/ToggleButtonGroup` exports the group, both group contexts, `ToggleButton`, the button prop types, `ToggleGroupState`, and `Key`. It does not export `ToggleButtonContext`. The three contexts use `Symbol.for('vue-aria-components.ToggleButtonContext' | 'ToggleButtonGroupContext' | 'ToggleGroupStateContext')` so the root bundle and the subpath bundles share one identity. `DEFAULT_SLOT` stays the existing root `Symbol.for('vue-aria-components.DEFAULT_SLOT')`.

Scope: selection and press behavior only. The default mode is single. Single mode is `role="radiogroup"` with `role="radio"` and `aria-checked`, and no `aria-pressed`. Multiple mode keeps toolbar container semantics and `aria-pressed`. A button participates in the group only when a group is present and `id != null` (`0` participates; a missing id stays a standalone `aria-pressed` button). The group item id is not written as a DOM id; a standalone id is stringified onto the button. Group `isDisabled` wins over an item `isDisabled` of `false`. Arrow keys move focus only, do not change selection, do not wrap, and do not implement Home, End, or selected-only Tab. RTL reverses horizontal arrows. Vertical orientation uses Up and Down. Recognized arrows are captured. Tab still follows `useToolbar`: jsdom does not perform the browser's subsequent Tab exit or Shift+Tab reentry, and a real browser's Tab exit was not verified. Nested multiple groups render `role="toolbar"` on the server and become `role="group"` after mount when they sit inside a toolbar; nested single groups stay `radiogroup`. A native button's `type` is `button`. Pointer, Space, and Enter select once; a virtual click that follows that press in the same task does not select again. Cancelling the pointer, disabling during the press, replacing the host, or unmounting does not apply a late selection. The hook also supports a non-native `elementType`. `slot={null}` opts out of the props context only. A `slots` object resolves `DEFAULT_SLOT` or the named slot and throws when the entry is missing. `className` and `style` accept a string, object, or function. An explicit empty class stays empty. Render props for the button are the button interaction fields plus `isSelected` and `ToggleState`, without `isPending`. The component events are lowercase (`change`, `press`, `pressstart`, `pressend`, `pressup`, `presschange`, `selectionchange`).

This ToggleButton slice is not complete RAC parity. The official `dom.button` / `dom.div` render customization, including the `render` prop that replaces the rendered element, is not implemented; a toggle button is always a native `button` and a group is always a `div`. The `data-rac` attribute is not rendered. The official development warning for a missing accessible name is not implemented. Experimental shadow DOM traversal is not implemented. `SelectionIndicator`, `SelectionIndicatorContext`, `SharedElementTransition`, and the animation types are not implemented and are not given a non-animated stand-in. The official `ToggleButtonGroup` subpath exports `SelectionIndicator` and `SelectionIndicatorProps`; this slice omits both on purpose. There is no `Tabs`, `Form`, `FieldError`, hidden form input, or reset behavior.

Form, `FieldError`, calendar month/year pickers and heading components, a public `useEvent`, the remaining i18n formatters/packs and SSR I18nProvider, Sheet, Storybook, and Netlify remain deferred. Tabs, Link, and Breadcrumbs remain deferred. SelectionIndicator remains deferred.

Versions are `0.0.1`. Packages are not published to npm yet.

## Development

Requires [pnpm](https://pnpm.io/) 9.x (see `packageManager` and `engines.pnpm`).

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
