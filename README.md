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

RangeCalendar, calendar month/year pickers and heading components, DateField/TimeField/DatePicker/DateRangePicker/HiddenDateInput, Group, FieldError, Form, Autocomplete, the remaining i18n formatters/packs and SSR I18nProvider, Sheet, Storybook, and Netlify remain deferred.

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
