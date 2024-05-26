<template>
  <component
    :is="h(Button, {...$attrs, isDisabled, ...toValues(otherProps), ...emits}, $slots)"
    :class="[...buttonCls]"
  />
</template>

<script setup lang="ts">
import {h, toRefs} from 'vue'
import {Button} from '@nev-ui/aria-button'
import {toValues} from '@nev-ui/utilities-vue'
import {useButtonUno} from './use-button-uno'
import {BUTTON_DEFAULT} from './button'
import type {ButtonEmits, ButtonProps} from './button'

defineOptions({
  name: 'NvButton',
})

const emits = defineEmits<ButtonEmits>()
const props = withDefaults(defineProps<ButtonProps>(), BUTTON_DEFAULT)

const {size, color, radius, isDisabled, fullWidth, ...otherProps} = toRefs(props)

// Provides uno class
const {buttonCls} = useButtonUno({size, color, radius, isDisabled, fullWidth})
</script>

<style scoped></style>
