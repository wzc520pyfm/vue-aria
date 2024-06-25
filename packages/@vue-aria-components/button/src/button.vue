<template>
  <component
    :is="Component"
    :class="[bem.b()]"
    v-bind="{...getButtonProps(), ...getButtonEvents()}"
    v-on="{...getButtonEvents()}"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import {toRefsForNonFunction} from '@nev-ui/utilities-vue'
// todo: 删除v-on，事件仍可生效（包括事件修饰符），所以，是否不需要将emit和prop分开设置？
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
const {Component, getButtonProps, getButtonEvents} = useButton(toRefsForNonFunction(props), emits)
</script>

<style scoped></style>
