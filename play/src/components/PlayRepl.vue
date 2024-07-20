<script setup lang="ts">
import { Button, Spinner, Icon, type ButtonProps } from '@nev-ui/vue'
import { ref } from 'vue'
import { Delete, BellFilled, Basketball } from '@element-plus/icons-vue'

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
  <Spinner color="default" class="ml-4">11</Spinner>
  <Spinner color="primary" class="ml-4">11</Spinner>
  <Spinner color="secondary" class="ml-4">11</Spinner>
  <Spinner color="success" class="ml-4">11</Spinner>
  <Spinner color="warning" class="ml-4">11</Spinner>
  <Spinner color="danger" class="ml-4">11</Spinner>
  <div class="flex">
    <!-- <Button :as="as" :size="size" :color="color" radius="none" :startContent="Delete" :endContent="Delete">Button</Button> -->
    <Button :as="as" :size="size" :color="color" radius="none">
      <template #start-content>
        <Icon color="success"><Delete /></Icon>
      </template>
      Button
      <template #end-content>
        <Icon><Delete /></Icon>
      </template>
    </Button>
    <Button :as="as" :size="size" :color="color" radius="sm">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="md">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="lg">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="full">Button</Button>
    <Button :as="as" :size="size" :color="color" radius="md" is-icon-only>
      <Icon><Basketball /></Icon>
    </Button>
    <Icon color="warning" size="lg"><BellFilled /></Icon>
  </div>
  <Spinner color="secondary" label="Loading..." labelColor="secondary" class="ml-4">
    <div class="w-25 h-25 bg-gray"></div>
  </Spinner>
  <Spinner color="secondary" label="Loading..." labelColor="secondary" class="ml-4" />
</template>

<style scoped></style>
