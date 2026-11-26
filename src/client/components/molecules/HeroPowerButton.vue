<script setup lang="ts">
import { computed } from 'vue';
import DeskButton from '#src/client/components/atoms/DeskButton.vue';
import { heroPowerCaption } from '#src/client/tools/heroPowerCaption.ts';
import type { HeroPowerStatus } from '#src/client/tools/heroPowerStatus.ts';

/**
 * The hero's activable power, beside its portrait: a desk button with its price, its name, and under it how often it
 * serves, or why it waits. Pressed, it tells the parent, which aims it.
 */
const props = defineProps<{ status: HeroPowerStatus }>();
const emit = defineEmits<{ use: [source: Element] }>();

const caption = computed(() => heroPowerCaption(props.status));
const label = computed(() => `${props.status.name} : ${caption.value}`);
</script>

<template>
  <div class="hero-power" :class="{ waiting: status.refusal }">
    <strong class="name">{{ status.name }}</strong>
    <small class="caption">{{ caption }}</small>
    <DeskButton icon="bolt" tone="gold" :label="label" :cost="status.power.cost" :disabled="Boolean(status.refusal)" data-control="pouvoir" @click="emit('use', $event.currentTarget as Element)" />
  </div>
</template>

<style scoped>
.hero-power { display: flex; flex-direction: column; align-items: center; gap: calc(var(--s) * 4); width: calc(var(--s) * 170); text-align: center; }
.hero-power :deep(.desk-button) { margin-top: calc(var(--s) * 8); }
.name { color: var(--color-title); font: 400 calc(var(--s) * 24) / 1.05 var(--font-number); letter-spacing: calc(var(--s) * 1); -webkit-text-stroke: calc(var(--s) * 4) var(--color-ink); paint-order: stroke fill; }
.caption { color: #e8eaf0; font: 600 calc(var(--s) * 18) / 1.15 var(--font-card); text-shadow: 0 calc(var(--s) * 2) calc(var(--s) * 3) rgb(0 0 0 / 0.9); }
.waiting .name { opacity: 0.7; }
</style>
