<template>
  <component
    :is="Component"
    :class="[bem.b(), ...toClassName(classNames.spinner)]"
    v-bind="{...$attrs, ...getSpinnerProps()}"
  >
    <div :class="[bem.e('wrapper'), ...toClassName(classNames.wrapper)]">
      <div :class="[bem.e('circle-wrapper'), ...toClassName(classNames.circleWrapper)]">
        <i :class="[bem.e('circle1'), ...toClassName(classNames.circle1)]" />
        <i :class="[bem.e('circle2'), ...toClassName(classNames.circle2)]" />
      </div>
      <span v-if="label" :class="[bem.e('label'), ...toClassName(classNames.label)]">{{
        label
      }}</span>
    </div>
    <slot />
  </component>
</template>

<script setup lang="ts">
import {toClassName, toRefsForNonFunction} from '@nev-ui/utilities-vue'
import {useBEM} from '@nev-ui/utilities-bem'
import {useSpinner} from '@nev-ui/use-aria-spinner'
import type {SpinnerProps} from './spinner'

defineOptions({
  name: 'AriaSpinner',
})

const props = defineProps<SpinnerProps>()

// Provides css layer
const bem = useBEM('spinner')

// Provides rendering properties
const {Component, label, classNames, getSpinnerProps} = useSpinner(toRefsForNonFunction(props))
</script>

<style scoped></style>
