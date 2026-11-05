<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '#src/client/components/atoms/AppIcon.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { tripleStars } from '#src/client/tools/tripleStars.ts';

/** The state of a card on the table, in small labels at the top of its window. Drawn in card units. */
const props = withDefaults(defineProps<{
  tier: number;
  campLabel?: string;
  locked?: boolean;
  bracelet?: boolean;
  copies?: number;
  /** Casseroles not yet forgotten, toward a scandal. */
  charges?: number;
  scandalThreshold?: number;
  /** Rounds of scandal left; 0 without a scandal. */
  scandalLeft?: number;
}>(), {
  copies: 0,
  charges: 0,
  scandalThreshold: 0,
  scandalLeft: 0,
});

const stars = computed(() => tripleStars(props.copies));
</script>

<template>
  <span class="chips">
    <span class="chip tier"><AppIcon name="tier" /><span class="sr-only">Échelon </span>{{ tier }}</span>
    <span v-if="campLabel" class="chip">{{ campLabel }}</span>
    <span v-if="locked" class="chip"><GameIcon v-if="bracelet" name="bracelet" /><AppIcon v-else name="lock" /><span class="sr-only">{{ bracelet ? 'Sous bracelet : ni déplacé ni renvoyé avant la prochaine manche' : 'Ne bouge plus' }}</span></span>
    <span v-if="scandalLeft > 0" class="chip scandal">Scandale {{ scandalLeft }}<span class="sr-only"> manches avant l'oubli</span></span>
    <span v-else-if="charges > 0" class="chip danger"><GameIcon name="pan" /> {{ charges }}/{{ scandalThreshold }}<span class="sr-only"> casseroles avant le scandale</span></span>
    <span v-if="copies > 0" class="chip stars" :class="{ ready: copies >= 2 }" :title="`${copies} sur 3 vers le triple`">
      <span class="sr-only">{{ copies }} sur 3 vers le triple</span><span aria-hidden="true">{{ stars }}</span>
    </span>
  </span>
</template>

<style scoped>
.chips { position: absolute; left: calc(var(--u) * 36); right: calc(var(--u) * 36); top: calc(var(--u) * 36); display: flex; flex-wrap: wrap; gap: calc(var(--u) * 6); }
.chip { padding: 0 calc(var(--u) * 12); border-radius: calc(var(--u) * 12); background: rgb(11 14 24 / 0.86); color: var(--color-paper); font: 700 calc(var(--u) * 36) / 1.35 var(--font-card); text-shadow: none; }
.tier { color: var(--color-accent); }
.danger { color: #ff9a9a; }
.scandal { background: #c8102e; color: #fff; text-transform: uppercase; letter-spacing: calc(var(--u) * 1); }
.stars { margin-left: auto; }
.ready { color: var(--color-gold); }
</style>
