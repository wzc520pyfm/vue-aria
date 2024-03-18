<template>
  <component
    :is="Component"
    :class="[bem.b(), ...buttonCls]"
    v-bind="{...getButtonProps()}"
    v-on="{...getButtonEvents()}"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import {useBEM} from '@nev-ui/utilities-bem'
import {useButton} from '@nev-ui/use-aria-button'
import {useButtonUno} from './use-button-uno'
import type {ButtonEmits, ButtonProps} from './button'

defineOptions({
  name: 'MyButton',
})

const emits = defineEmits<ButtonEmits>()
const props = defineProps<ButtonProps>()

// Provides css layer
const bem = useBEM('button')

// Provides rendering properties and events
const {Component, size, color, radius, getButtonProps, getButtonEvents} = useButton(props, emits)

// Provides uno class
const {buttonCls} = useButtonUno({size, color, radius})
</script>

<style scoped></style>
