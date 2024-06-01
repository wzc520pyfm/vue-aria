<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import PlayRepl from '@/components/PlayRepl.vue'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <main>
    <div
      class="fixed top-4 right-4 z-50 p-2 text-2xl cursor-pointer"
      @click="() => toggleDark()"
    >{{ isDark ? '🌞' : '🌛' }}</div>
    <PlayRepl />
  </main>
</template>
