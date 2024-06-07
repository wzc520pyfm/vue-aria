<script setup lang="ts">
import { Button, type ButtonProps } from '@nev-ui/vue'
import { ref } from 'vue'

defineOptions({ name: 'PlayRepl' })

const as = ref<ButtonProps['as']>('button')
const size = ref<ButtonProps['size']>('md')
const color = ref<ButtonProps['color']>('primary')
const radius = ref<ButtonProps['radius']>('md')

const changeSize = () => {
  console.log('changeSize', size.value)
  as.value = as.value === 'button' ? 'a' : 'button'
  size.value = size.value === 'md' ? 'sm' : 'md'
  color.value = color.value === 'primary' ? 'default' : 'primary'
  radius.value = radius.value === 'md' ? 'full' : 'md'
}
</script>

<template>
  <Button :as="as" :size="size" color="default" :radius="radius">Button</Button>
  <Button :as="as" :size="size" :color="color" :radius="radius" isDisabled>Button</Button>
  <Button :as="as" :size="size" color="secondary" :radius="radius">Button</Button>
  <Button :as="as" :size="size" color="success" :radius="radius">Button</Button>
  <Button :as="as" :size="size" color="warning" :radius="radius">Button</Button>
  <Button :as="as" :size="size" color="danger" :radius="radius">Button</Button>
  <Button :as="as" :size="size" :color="color" :radius="radius" fullWidth>Button</Button>
  <button class="btn btn-primary" @click="changeSize">Button2</button>
  <Button :as="as" size="sm" :color="color" :radius="radius">Button</Button>
  <Button :as="as" size="md" :color="color" :radius="radius">Button</Button>
  <Button :as="as" size="lg" :color="color" :radius="radius">Button</Button>
  <div>
    <Button :as="as" :size="size" :color="color" radius="none">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="sm">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="md">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="lg">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="full">Button</Button>
  </div>
</template>

<style scoped></style>
