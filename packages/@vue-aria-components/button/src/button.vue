<template>
  <component
    :is="Component"
    :class="[bem.b()]"
    v-bind="{...getButtonProps()}"
    v-on="{...getButtonEvents()}"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import {toRefs} from 'vue'
import {useBEM} from '@nev-ui/utilities-bem'
import {useButton} from '@nev-ui/use-aria-button'
import type {ButtonEmits, ButtonProps} from './button'

defineOptions({
  name: 'AriaButton',
})

const emits = defineEmits<ButtonEmits>()
const props = defineProps<ButtonProps>()

// Provides css layer
const bem = useBEM('button')

// Provides rendering properties and events
const {Component, getButtonProps, getButtonEvents} = useButton(toRefs(props), emits)
</script>

<style scoped></style>
