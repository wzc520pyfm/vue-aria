import {Button} from '../src'
import type {Meta, StoryObj} from '@storybook/vue3'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    onClick: {},
    size: {
      control: {
        type: 'select',
      },
      options: ['sm', 'md', 'lg'],
    },
    color: {
      control: {
        type: 'select',
      },
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger'],
    },
    radius: {
      control: {
        type: 'select',
      },
      options: ['none', 'sm', 'md', 'lg', 'full'],
    },
    fullWidth: {
      control: {
        type: 'boolean',
      },
    },
    disableAnimation: {
      control: {
        type: 'boolean',
      },
    },
    isIconOnly: {
      control: {
        type: 'boolean',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof Button>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    size: 'md',
    color: 'primary',
  },
  render: (args) => ({
    components: {Button},
    setup() {
      return {args}
    },
    template: '<Button v-bind="args">Button</Button>',
  }),
}

export const Secondary: Story = {
  args: {
    size: 'md',
    color: 'secondary',
  },
  render: (args) => ({
    components: {Button},
    setup() {
      return {args}
    },
    template: '<Button v-bind="args">Button</Button>',
  }),
}

export const Large: Story = {
  args: {
    size: 'lg',
    color: 'primary',
  },
  render: (args) => ({
    components: {Button},
    setup() {
      return {args}
    },
    template: '<Button v-bind="args">Button</Button>',
  }),
}

export const Small: Story = {
  args: {
    size: 'sm',
    color: 'primary',
  },
  render: (args) => ({
    components: {Button},
    setup() {
      return {args}
    },
    template: '<Button v-bind="args">Button</Button>',
  }),
}
