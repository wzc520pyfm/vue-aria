<template>
  <component :is="Component" :class="[bem.b()]" v-bind="$attrs">
    <slot />
  </component>
</template>

<script setup lang="ts">
import {toRefsForNonFunction} from '@nev-ui/utilities-vue'
import {useBEM} from '@nev-ui/utilities-bem'
import {useIcon} from '@nev-ui/use-aria-icon'
import type {IconProps} from './icon'

defineOptions({
  name: 'AriaIcon',
  inheritAttrs: false,
})

const props = defineProps<IconProps>()

// Provides css layer
const bem = useBEM('icon')

// Provides rendering properties
const {Component} = useIcon(toRefsForNonFunction(props))
</script>

<style scoped></style>
