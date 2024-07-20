<template>
  <component :is="h(Icon, $attrs, $slots)" :class="[...iconCls]" />
</template>

<script setup lang="ts">
import {h, toRefs} from 'vue'
import {Icon} from '@nev-ui/aria-icon'
import {useIconUno} from './use-icon-uno'
import {ICON_DEFAULT} from './icon'
import type {IconProps} from './icon'

defineOptions({
  name: 'NvIcon',
})

const props = withDefaults(defineProps<IconProps>(), ICON_DEFAULT)

const {size, color} = toRefs(props)

// Provides uno class
const {iconCls} = useIconUno({
  size,
  color,
})
</script>

<style scoped></style>
