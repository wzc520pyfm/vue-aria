<template>
  <component :is="h(Button, $attrs, $slots)" :class="[...buttonCls]" />
</template>

<script setup lang="ts">
import {h, toRefs} from 'vue'
import {Button} from '@nev-ui/aria-button'
import {useButtonUno} from './use-button-uno'
import type {ButtonProps} from './button'

defineOptions({
  name: 'Button2',
})

const props = withDefaults(defineProps<ButtonProps>(), {
  size: 'md',
  color: 'default',
  radius: 'md',
})

const {size, color, radius, isDisabled, fullWidth} = toRefs(props)

// Provides uno class
const {buttonCls} = useButtonUno({size, color, radius, isDisabled, fullWidth})
</script>

<style scoped></style>
