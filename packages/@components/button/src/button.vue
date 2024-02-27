<template>
  <button type="button" :class="classes" :style="style" @click="onClick">{{ label }}</button>
</template>

<script setup lang="ts">
import {computed} from 'vue'

defineOptions({
  name: 'MyButton',
})

const emits = defineEmits(['click'])

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  primary: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    validator(value: string) {
      return ['small', 'medium', 'large'].includes(value)
    },
  },
  backgroundColor: {
    type: String,
  },
})

const classes = computed(() => ({
  'storybook-button': true,
  'storybook-button--primary': props.primary,
  'storybook-button--secondary': !props.primary,
  [`storybook-button--${props.size || 'medium'}`]: true,
}))

const style = computed(() => ({
  backgroundColor: props.backgroundColor,
}))

const onClick = () => {
  emits('click')
}
</script>
