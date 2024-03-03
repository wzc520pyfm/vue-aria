<template>
  <button type="button" class="btn" @click="onClick">
    {{ label }}
  </button>
</template>

<script setup lang="ts">
defineOptions({
  name: 'MyButton',
})

interface IProps {
  label: string
}

interface IEmits {
  (e: 'click'): void
}

const emits = defineEmits<IEmits>()

const {label} = defineProps<IProps>()

const onClick = () => {
  emits('click')
}
</script>

<style scoped></style>
