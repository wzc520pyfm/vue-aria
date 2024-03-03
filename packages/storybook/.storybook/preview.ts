/** @type { import('@storybook/vue3').Preview } */
import {setup, Preview} from '@storybook/vue3'
import './style.css'

import 'virtual:uno.css'

setup((app) => {})

const decorators: Preview['decorators'] = [
  (story) => ({
    components: {story},
    template: '<story />',
  }),
]

const parameters: Preview['parameters'] = {
  actions: {argTypesRegex: '^on[A-Z].*'},
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
}

const preview: Preview = {
  decorators,
  parameters,
}

export default preview
