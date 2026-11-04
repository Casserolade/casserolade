<script setup lang="ts">
import { computed } from 'vue';
import { parseRichText } from '#src/client/tools/richText.ts';

/** Card text: the words between **double asterisks** are keywords, in bold. Never HTML. */
const props = defineProps<{ text: string }>();

const segments = computed(() => parseRichText(props.text));
</script>

<template>
  <span class="rich"><template v-for="(segment, index) in segments" :key="index"><strong v-if="segment.bold">{{ segment.text }}</strong><template v-else>{{ segment.text }}</template></template></span>
</template>

<style scoped>
strong { font-weight: 700; }
</style>
