<script setup lang="ts">
import { computed, toRef } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import CampChips from '#src/client/components/molecules/CampChips.vue';
import HeroOption from '#src/client/components/molecules/HeroOption.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { useCountdown } from '#src/client/stores/useCountdown.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';

const HURRY_SECONDS = 10;

/** `deadline`: when the game chooses for the player, as the store keeps it; null without a timer. */
const props = withDefaults(defineProps<{ view: PlayerView; deadline?: number | null }>(), { deadline: null });
defineEmits<{ choose: [index: number] }>();

const offers = computed(() => (props.view.heroOffers ?? []).map((id) => HERO_BY_ID[id]));
const secondsLeft = useCountdown(toRef(props, 'deadline'));
</script>

<template>
  <MenuBackdrop :plateau-id="view.plateau.id">
    <h1 class="title">Choisissez votre héros</h1>
    <p v-if="offers.length > 0 && secondsLeft !== null" class="timer" :class="{ hurry: secondsLeft <= HURRY_SECONDS }" role="timer" :aria-label="`${secondsLeft} secondes pour choisir`">
      <GameIcon name="hourglass" /> <strong>{{ secondsLeft }}</strong> s, puis le jeu choisit pour vous
    </p>
    <CampChips class="camps" :camps="view.camps" />
    <p v-if="offers.length === 0" class="waiting">En attente des autres joueurs…</p>
    <div class="offers">
      <HeroOption v-for="(hero, index) in offers" :key="hero.id" class="offer" :style="{ '--i': index }" :hero="hero" :start-hp="view.params.startHp" @click="$emit('choose', index)" />
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.title { margin-top: 3rem; color: #ffe27a; font: 400 3.4rem / 1 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 8px var(--color-ink); paint-order: stroke fill; rotate: -2deg; }
.timer { display: flex; align-items: center; gap: 0.5rem; margin-top: -0.6rem; padding: 0.3rem 1.2rem; border-radius: 999px; border: 3px solid rgb(255 255 255 / 0.16); background: rgb(12 16 32 / 0.92); color: #c9cfdc; font-weight: 700; }
.timer strong { color: #fff; font: 400 1.9rem / 1 var(--font-number); letter-spacing: 1px; }
.timer :deep(.game-icon) { color: #ffe27a; font-size: 1.5rem; }
.hurry { border-color: #e0503a; }
.hurry strong { color: #ff8a8a; }
.waiting { color: #fff; font-size: 1.3rem; }
.camps { padding: 0.4rem 1rem; border-radius: 999px; background: rgb(12 16 32 / 0.85); }
.offers { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; margin-top: 1rem; }
.offer { animation: deal 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) backwards; animation-delay: calc(var(--i) * 0.1s); }
@keyframes deal { from { transform: translateY(120px) rotate(8deg); opacity: 0; } }
</style>
