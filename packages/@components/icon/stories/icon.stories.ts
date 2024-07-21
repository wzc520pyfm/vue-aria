import {Icon} from '../src'
import Apple from './apple.vue'
import type {Meta, StoryObj} from '@storybook/vue3'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<typeof Icon> = {
  title: 'Components/Icon',
  component: Icon,
  tags: ['autodocs'],
  argTypes: {
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
  },
}

export default meta

type Story = StoryObj<typeof Icon>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    size: 'md',
    color: 'primary',
  },
  render: (args) => ({
    components: {Icon, Apple},
    setup() {
      return {args}
    },
    template: '<Icon v-bind="args"><Apple /></Icon>',
  }),
}

export const Secondary: Story = {
  args: {
    size: 'md',
    color: 'secondary',
  },
  render: (args) => ({
    components: {Icon, Apple},
    setup() {
      return {args}
    },
    template: '<Icon v-bind="args"><Apple /></Icon>',
  }),
}

export const Large: Story = {
  args: {
    size: 'lg',
    color: 'primary',
  },
  render: (args) => ({
    components: {Icon, Apple},
    setup() {
      return {args}
    },
    template: '<Icon v-bind="args"><Apple /></Icon>',
  }),
}

export const Small: Story = {
  args: {
    size: 'sm',
    color: 'primary',
  },
  render: (args) => ({
    components: {Icon, Apple},
    setup() {
      return {args}
    },
    template: '<Icon v-bind="args"><Apple /></Icon>',
  }),
}
