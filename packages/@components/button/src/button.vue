<template>
  <button type="button" :class="classes" :style="style" @click="onClick">{{ label }}</button>
</template>

<script setup lang="ts">
import {computed} from 'vue'

defineOptions({
  name: 'MyButton',
})

interface IProps {
  label: string
  primary?: boolean
  size?: 'small' | 'medium' | 'large'
  backgroundColor?: string
}

interface IEmits {
  (e: 'click'): void
}

const emits = defineEmits<IEmits>()

const {label, primary = false, size, backgroundColor} = defineProps<IProps>()

const classes = computed(() => ({
  'storybook-button': true,
  'storybook-button--primary': primary,
  'storybook-button--secondary': !primary,
  [`storybook-button--${size || 'medium'}`]: true,
}))

const style = computed(() => ({
  backgroundColor,
}))

const onClick = () => {
  emits('click')
}
</script>
