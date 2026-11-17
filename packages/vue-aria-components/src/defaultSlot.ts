/**
 * Official slot name `DEFAULT_SLOT`
 * (`packages/react-aria-components/src/utils.tsx` and the root export in
 * `packages/react-aria-components/exports/index.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc).
 *
 * tsup builds the package root and `vue-aria-components/Toolbar` as separate
 * bundles with `splitting: false`, so `Symbol('default')` would be a different
 * value in each file. `Symbol.for` keeps one registry identity for a consumer
 * who imports this token from the root and the component from the Toolbar entry.
 * The Toolbar subpath does not re-export the token.
 */
export const DEFAULT_SLOT: unique symbol = Symbol.for('vue-aria-components.DEFAULT_SLOT')
