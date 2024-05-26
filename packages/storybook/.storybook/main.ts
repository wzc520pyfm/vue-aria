import type {StorybookConfig} from '@storybook/vue3-vite'
import vue from '@vitejs/plugin-vue'
import {mergeConfig} from 'vite'
import UnoCSS from 'unocss/vite'

/** @type { import('@storybook/vue3-vite').StorybookConfig } */
const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../@components/**/stories/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  staticDirs: ['../public'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-dark-mode',
    '@chromatic-com/storybook',
  ],
  core: {
    builder: '@storybook/builder-vite',
  },
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(config, {configType}) {
    if (configType === 'DEVELOPMENT') {
      // Your development configuration goes here
    }
    if (configType === 'PRODUCTION') {
      // Your production configuration goes here.
    }
    return mergeConfig(config, {
      // Your environment configuration here
      plugins: [vue(), UnoCSS()],
    })
  },
  docs: {
    autodocs: 'tag',
  },
}
export default config