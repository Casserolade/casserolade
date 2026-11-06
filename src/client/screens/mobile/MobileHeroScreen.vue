<script setup lang="ts">
import { computed, toRef } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import CampChips from '#src/client/components/molecules/CampChips.vue';
import ContextBadge from '#src/client/components/molecules/ContextBadge.vue';
import MobileHeroOption from '#src/client/components/molecules/MobileHeroOption.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { useCountdown } from '#src/client/stores/useCountdown.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { PlayerView } from '#src/engine/game.ts';

const HURRY_SECONDS = 10;

/** The choice of a hero on a phone: the three on top of each other, all on the screen at once, with the game's camps. */
const props = withDefaults(defineProps<{ view: PlayerView; deadline?: number | null }>(), { deadline: null });
const emit = defineEmits<{ choose: [index: number] }>();

const offers = computed(() => (props.view.heroOffers ?? []).map((id) => HERO_BY_ID[id]));
const secondsLeft = useCountdown(toRef(props, 'deadline'));
</script>

<template>
  <MenuBackdrop :plateau-id="view.plateau.id">
    <div class="choice">
      <h1 class="title">Votre héros</h1>
      <p v-if="offers.length > 0 && secondsLeft !== null" class="timer" :class="{ hurry: secondsLeft <= HURRY_SECONDS }" role="timer" :aria-label="`${secondsLeft} secondes pour choisir`">
        <GameIcon name="hourglass" /> <strong>{{ secondsLeft }}</strong> s, puis le jeu choisit pour vous
      </p>
      <p v-if="offers.length === 0" class="waiting">En attente des autres joueurs…</p>
      <div class="offers">
        <MobileHeroOption v-for="(hero, index) in offers" :key="hero.id" class="offer" :style="{ '--i': index }" :hero="hero" :start-hp="view.params.startHp" @choose="emit('choose', index)" />
      </div>
      <CampChips class="camps" :camps="view.camps" />
      <ContextBadge :context-id="view.contextId" />
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.choice { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; width: 100%; max-width: 32rem; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
.title { margin-top: 0.4rem; color: var(--color-title); font: 400 2.3rem / 1 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 6px var(--color-ink); paint-order: stroke fill; rotate: -2deg; }
.timer { display: flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.9rem; border-radius: 999px; border: 2px solid rgb(255 255 255 / 0.16); background: rgb(12 16 32 / 0.92); color: #c9cfdc; font-size: 0.9rem; font-weight: 700; }
.timer strong { color: #fff; font: 400 1.4rem / 1 var(--font-number); }
.timer :deep(.game-icon) { color: var(--color-title); }
.hurry { border-color: #e0503a; }
.hurry strong { color: #ff8a8a; }
.waiting { color: #fff; font-size: 1.1rem; }
.offers { display: flex; flex-direction: column; gap: 0.6rem; width: 100%; }
.offer { animation: deal 0.4s cubic-bezier(0.3, 1.4, 0.5, 1) backwards; animation-delay: calc(var(--i) * 0.08s); }
.camps { padding: 0.3rem 0.8rem; border-radius: 18px; background: rgb(12 16 32 / 0.85); }
@keyframes deal { from { transform: translateY(40px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .offer { animation: none; } }
</style>
