import {Spinner} from '../src'
import type {Meta, StoryObj} from '@storybook/vue3'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: {
        type: 'select',
      },
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger'],
    },
    labelColor: {
      control: {
        type: 'select',
      },
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger'],
    },
    size: {
      control: {
        type: 'select',
      },
      options: ['sm', 'md', 'lg'],
    },
  },
}

export default meta

type Story = StoryObj<typeof Spinner>

export const Primary: Story = {
  args: {
    color: 'primary',
    label: 'Loading...',
    labelColor: 'primary',
    size: 'md',
  },
}
