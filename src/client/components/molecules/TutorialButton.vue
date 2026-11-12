<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';

/** The tutorial, first of the home page's extras: for a newcomer, it is the button that shines. */
withDefaults(defineProps<{ newcomer?: boolean }>(), { newcomer: false });
const emit = defineEmits<{ open: [] }>();
</script>

<template>
  <AppButton :primary="newcomer" :class="{ beckon: newcomer }" @click="emit('open')"><GameIcon name="sparkle" /> Le tutoriel</AppButton>
</template>

<style scoped>
.beckon { animation: beckon 1.6s ease-in-out infinite; }
@keyframes beckon { 50% { transform: scale(1.06); box-shadow: 0 0 26px rgb(255 216 74 / 0.7), 0 5px 12px rgb(0 0 0 / 0.5); } }
@media (prefers-reduced-motion: reduce) { .beckon { animation: none; } }
</style>
