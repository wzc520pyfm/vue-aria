import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'vue-aria-components/Button': `${root}packages/vue-aria-components/exports/Button.ts`,
      'vue-aria-components': `${root}packages/vue-aria-components/exports/index.ts`,
      'vue-stately': `${root}packages/vue-stately/exports/index.ts`,
      'vue-aria/usePress': `${root}packages/vue-aria/exports/usePress.ts`,
      'vue-aria/useHover': `${root}packages/vue-aria/exports/useHover.ts`,
      'vue-aria/useFocusVisible': `${root}packages/vue-aria/exports/useFocusVisible.ts`,
      'vue-aria/useButton': `${root}packages/vue-aria/exports/useButton.ts`,
      'vue-aria/useSelectable': `${root}packages/vue-aria/exports/useSelectable.ts`,
      'vue-aria/usePresenceState': `${root}packages/vue-aria/exports/usePresenceState.ts`,
      'vue-aria/useInvalid': `${root}packages/vue-aria/exports/useInvalid.ts`,
      'vue-aria/usePlacement': `${root}packages/vue-aria/exports/usePlacement.ts`,
      'vue-aria/toHeroDataAttrs': `${root}packages/vue-aria/exports/toHeroDataAttrs.ts`,
      'vue-aria/BehaviorElement': `${root}packages/vue-aria/exports/BehaviorElement.ts`,
      'vue-aria/behaviorAdapter': `${root}packages/vue-aria/exports/behaviorAdapter.ts`,
      'vue-aria/mergeProps': `${root}packages/vue-aria/exports/mergeProps.ts`,
      'vue-aria/chain': `${root}packages/vue-aria/exports/chain.ts`,
      'vue-aria': `${root}packages/vue-aria/exports/index.ts`,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/**/src/**/*.{test,spec}.ts', 'packages/**/src/__tests__/**/*.{test,spec}.ts'],
  },
})
