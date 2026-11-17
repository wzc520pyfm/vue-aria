/**
 * Toggle context identities shared by the package root and the
 * ToggleButton / ToggleButtonGroup entries. `splitting: false` would otherwise
 * inline a distinct `Symbol()` in each bundle. `Symbol.for` keeps one registry
 * identity, same as `DEFAULT_SLOT`.
 */

import type {InjectionKey} from 'vue'
import type {ToggleGroupState} from 'vue-stately/useToggleGroupState'

export const ToggleButtonContextKey: InjectionKey<Record<string, any> | null> = Symbol.for(
  'vue-aria-components.ToggleButtonContext',
)
export const ToggleButtonGroupContextKey: InjectionKey<Record<string, any> | null> = Symbol.for(
  'vue-aria-components.ToggleButtonGroupContext',
)
export const ToggleGroupStateContextKey: InjectionKey<ToggleGroupState | null> = Symbol.for(
  'vue-aria-components.ToggleGroupStateContext',
)
