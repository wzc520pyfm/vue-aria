<template>
  <component :is="Component" :class="[bem.b()]" v-bind="{...$attrs, ...getButtonProps()}">
    <component :is="startContent" v-if="startContent" />
    <slot v-else name="start-content" />
    <slot />
    <component :is="endContent" v-if="startContent" />
    <slot v-else name="end-content" />
  </component>
</template>

<script setup lang="ts">
import {toRefsForNonFunction} from '@nev-ui/utilities-vue'
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

// Provides rendering properties
const {Component, startContent, endContent, getButtonProps} = useButton(
  toRefsForNonFunction(props),
  emits,
)
</script>

<style scoped></style>
