<template>
  <component
    :is="h(Button, {isDisabled, ...mergeProps($attrs, toValues(otherProps))}, $slots)"
    :class="[...buttonCls]"
  />
</template>

<script setup lang="ts">
import {h, toRefs} from 'vue'
import {Button} from '@nev-ui/aria-button'
import {toValues} from '@nev-ui/utilities-vue'
import {mergeProps} from '@nev-ui/shared'
import {useButtonUno} from './use-button-uno'
import {BUTTON_DEFAULT} from './button'
import type {ButtonEmits, ButtonProps} from './button'

defineOptions({
  name: 'NvButton',
})

defineEmits<ButtonEmits>()
const props = withDefaults(defineProps<ButtonProps>(), BUTTON_DEFAULT)

const {size, color, radius, isDisabled, fullWidth, disableAnimation, isIconOnly, ...otherProps} =
  toRefs(props)

// Provides uno class
const {buttonCls} = useButtonUno({
  size,
  color,
  radius,
  isDisabled,
  fullWidth,
  disableAnimation,
  isIconOnly,
})
</script>

<style scoped></style>
