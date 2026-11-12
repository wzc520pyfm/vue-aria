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

This overlays batch adds:

- `vue-stately`: `useOverlayTriggerState`, `useTooltipTriggerState` (official delays 1500 / 500)
- `vue-aria`: `useOverlayTrigger`, `useDialog`, `useModal`, `useModalOverlay`, `usePopover`, `useTooltip` / `useTooltipTrigger`, `usePreventScroll`, `useFocusScope`, `useInteractOutside`
- `vue-aria-components`: `Dialog`, `DialogTrigger`, `Modal`, `ModalOverlay`, `Popover`, `OverlayArrow`, `Tooltip`, `TooltipTrigger`, and a minimal `Heading` (`slot="title"`)

Menu, Select, ComboBox, Sheet, collections, dates, a full `I18nProvider`, and Storybook / Netlify remain deferred.

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
