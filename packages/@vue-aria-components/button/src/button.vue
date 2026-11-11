<template>
  <component :is="Component" :class="[bem.b()]" v-bind="bindProps">
    <component :is="startContent" v-if="startContent" />
    <slot v-else name="start-content" />
    <slot />
    <component :is="endContent" v-if="endContent" />
    <slot v-else name="end-content" />
  </component>
</template>

<script setup lang="ts">
import {computed, useAttrs} from 'vue'
import {mergeProps} from '@nev-ui/shared'
import {toRefsForNonFunction} from '@nev-ui/utilities-vue'
import {useBEM} from '@nev-ui/utilities-bem'
import {useButton} from '@nev-ui/use-aria-button'
import type {ButtonEmits, ButtonProps} from './button'

defineOptions({
  name: 'AriaButton',
  inheritAttrs: false,
})

const emits = defineEmits<ButtonEmits>()
const props = defineProps<ButtonProps>()

// Provides css layer
const bem = useBEM('button')

// Provides rendering properties
const attrs = useAttrs()
const resolvedSlot = computed(() => {
  const fromProps = (props['data-slot'] ?? (props as {dataSlot?: string}).dataSlot) as
    | string
    | undefined
  const fromAttrs = (attrs['data-slot'] ?? attrs.dataSlot) as string | undefined
  return fromProps ?? fromAttrs ?? 'button'
})
const {Component, startContent, endContent, getButtonProps} = useButton(
  {
    ...toRefsForNonFunction(props),
    'data-slot': resolvedSlot,
  },
  emits,
)

const bindProps = computed(() =>
  mergeProps(attrs, getButtonProps(), {'data-slot': resolvedSlot.value}),
)
</script>

<style scoped></style>
