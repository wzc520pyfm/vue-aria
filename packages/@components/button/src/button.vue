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

// bem系统提供dom层级的css划分
const bem = useBEM('button')

// 必要的渲染属性和事件由 useButton 提供
const {Component, size, color, radius, getButtonProps, getButtonEvents} = useButton(props, emits)

// 基于unocss的class由另一套逻辑系统提供，它基于已知的属性进行class的生成
const {buttonCls} = useButtonUno({size, color, radius})
</script>

<style scoped></style>
