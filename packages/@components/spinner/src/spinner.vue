<template>
  <component
    :is="h(Spinner, {classNames, ...mergeProps($attrs, toValues(otherProps))}, $slots)"
    :class="[...spinnerCls]"
  />
</template>

<script setup lang="ts">
import {h, toRefs} from 'vue'
import {Spinner} from '@nev-ui/aria-spinner'
import {toValues} from '@nev-ui/utilities-vue'
import {mergeProps} from '@nev-ui/shared'
import {useSpinnerUno} from './use-spinner-uno'
import {SPINNER_DEFAULT} from './spinner'
import type {SpinnerProps} from './spinner'

defineOptions({
  name: 'NvSpinner',
})

const props = withDefaults(defineProps<SpinnerProps>(), SPINNER_DEFAULT)

const {size, color, labelColor, classNames: classNamesProp, ...otherProps} = toRefs(props)

// Provides uno class
const {spinnerCls, classNames} = useSpinnerUno({
  size,
  color,
  labelColor,
  classNames: classNamesProp,
})
</script>

<style scoped></style>
