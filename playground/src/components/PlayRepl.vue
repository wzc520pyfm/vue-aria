<script setup lang="ts">
import { Button, type ButtonProps } from '@nev-ui/vue'
import { ref } from 'vue'

defineOptions({ name: 'PlayRepl' })

const as = ref<ButtonProps['as']>('button')
const size = ref<ButtonProps['size']>('sm')
const color = ref<ButtonProps['color']>('primary')
const radius = ref<ButtonProps['radius']>('none')

const changeSize = () => {
  console.log('changeSize', size.value)
  as.value = as.value === 'button' ? 'a' : 'button'
  size.value = size.value === 'sm' ? 'lg' : 'sm'
  color.value = color.value === 'primary' ? 'default' : 'primary'
  radius.value = radius.value === 'none' ? 'full' : 'none'
}
</script>

<template>
  <Button :as="as" :size="size" :color="color" :radius="radius" isDisabled>Button</Button>
  <Button :as="as" :size="size" :color="color" :radius="radius">Button</Button>
  <Button :as="as" :size="size" :color="color" :radius="radius" fullWidth>Button</Button>
  <button class="btn btn-primary" @click="changeSize">Button2</button>
</template>

<style scoped></style>
