<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import { tableFx } from '#src/client/stores/tableFx.ts';

/**
 * The short effects of the gestures, over everything: a recruit jumping into the hand,
 * a spell burning toward its target, coins bursting toward the budget. Nothing waits for them.
 */
const { effects } = tableFx;
const COINS = 7;

function travel(from: { x: number; y: number }, to: { x: number; y: number }): Record<string, string> {
  return { left: `${from.x}px`, top: `${from.y}px`, '--dx': `${to.x - from.x}px`, '--dy': `${to.y - from.y}px` };
}

/** Each coin first bursts out in its own direction, then all of them rush to the budget. */
const coinScatter = Array.from({ length: COINS }, (_, index) => {
  const angle = -Math.PI / 2 + ((index - (COINS - 1) / 2) / COINS) * Math.PI * 1.3;
  const reach = 70 + (index % 3) * 22;
  return { '--sx': `calc(var(--s) * ${Math.round(Math.cos(angle) * reach)})`, '--sy': `calc(var(--s) * ${Math.round(Math.sin(angle) * reach)})`, '--i': index };
});
</script>

<template>
  <div class="fx" aria-hidden="true">
    <template v-for="effect in effects" :key="effect.id">
      <template v-if="effect.kind === 'recruit'">
        <span class="recruit" :style="travel(effect.from, effect.to)">
          <span v-if="effect.minion" class="flying-medal">
            <MedallionToken
              :card-id="effect.minion.cardId"
              :name="effect.minion.name"
              :camp="effect.minion.camp"
              :atk="effect.minion.atk"
              :hp="effect.minion.hp"
              :keywords="effect.minion.keywords"
              :golden="effect.minion.golden"
              bare
            />
          </span>
          <span v-else-if="effect.card" class="flying-card"><ShownCardFace :card="effect.card" /></span>
        </span>
        <span class="burst arrive" :style="{ left: `${effect.to.x}px`, top: `${effect.to.y}px`, '--burst': '#ffe680' }" />
      </template>
      <template v-else-if="effect.kind === 'spell'">
        <span class="spell" :style="travel(effect.from, effect.to)">
          <span class="spell-card"><ShownCardFace :card="effect.card" /></span>
        </span>
        <span class="flash late" :style="{ left: `${effect.to.x}px`, top: `${effect.to.y}px` }" />
        <span class="burst late" :style="{ left: `${effect.to.x}px`, top: `${effect.to.y}px`, '--burst': '#ffe680' }" />
      </template>
      <template v-else-if="effect.kind === 'coins'">
        <span class="burst small" :style="{ left: `${effect.from.x}px`, top: `${effect.from.y}px`, '--burst': '#ffd23a' }" />
        <span v-for="(scatter, index) in coinScatter" :key="index" class="coin" :style="{ ...travel(effect.from, effect.to), ...scatter }"><GameIcon name="coin" /></span>
      </template>
      <span v-else-if="effect.kind === 'burst'" class="burst" :style="{ left: `${effect.at.x}px`, top: `${effect.at.y}px`, '--burst': effect.color }" />
    </template>
  </div>
</template>

<style scoped>
.fx { position: fixed; inset: 0; z-index: 55; pointer-events: none; }
.fx > * { position: absolute; }
/* Bought: the medallion leaps in an arc into the hand, shrinking as it goes. */
.recruit { width: 0; height: 0; animation: jump 0.42s cubic-bezier(0.45, 0, 0.7, 1) forwards; }
.flying-medal { --medal-w: calc(var(--s) * 150); position: absolute; left: calc(var(--s) * -75); top: calc(var(--s) * -90); filter: drop-shadow(0 calc(var(--s) * 16) calc(var(--s) * 12) rgb(0 0 0 / 0.5)) drop-shadow(0 0 calc(var(--s) * 10) rgb(255 230 120 / 0.8)); }
.flying-card { position: absolute; left: calc(var(--s) * -70); top: calc(var(--s) * -100); width: calc(var(--s) * 140); filter: drop-shadow(0 0 calc(var(--s) * 10) rgb(255 230 120 / 0.8)); }
.spell { width: 0; height: 0; animation: fly 0.4s cubic-bezier(0.4, 0, 0.8, 0.6) forwards; }
.spell-card { position: absolute; left: calc(var(--s) * -70); top: calc(var(--s) * -100); width: calc(var(--s) * 140); animation: consume 0.4s ease-in forwards; }
.burst {
  width: calc(var(--s) * 220);
  height: calc(var(--s) * 220);
  margin: calc(var(--s) * -110);
  border-radius: 50%;
  background:
    repeating-conic-gradient(from 0deg, var(--burst) 0 6deg, transparent 6deg 22deg),
    radial-gradient(circle, #fff 0 12%, var(--burst) 22%, transparent 60%);
  mask: radial-gradient(circle, #000 30%, transparent 70%);
  animation: burst 0.45s ease-out forwards;
}
.small { scale: 0.6; }
/* After the flight: these wait for the card or the medallion to arrive. */
.fx .late { animation-delay: 0.34s; animation-duration: 0.26s; opacity: 0; }
.fx .arrive { animation-delay: 0.34s; animation-duration: 0.26s; opacity: 0; scale: 0.7; }
/* The ally a spell lands on lights up white for an instant. */
.flash {
  width: calc(var(--s) * 200);
  height: calc(var(--s) * 240);
  margin: calc(var(--s) * -120) calc(var(--s) * -100);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(255 255 255 / 0.95) 20%, rgb(255 240 170 / 0.6) 45%, transparent 70%);
  mix-blend-mode: screen;
  animation: flash 0.3s ease-out forwards;
}
.coin {
  width: 0;
  height: 0;
  color: #f5c02a;
  --icon-edge: #5a3a06;
  font-size: calc(var(--s) * 40);
  animation: coin 0.48s cubic-bezier(0.3, 0, 0.7, 1) forwards;
  animation-delay: calc(var(--i) * 18ms);
  opacity: 0;
}
.coin :deep(.game-icon) { position: absolute; left: -0.5em; top: -0.5em; filter: drop-shadow(0 0 calc(var(--s) * 6) rgb(255 210 60 / 0.9)); }
@keyframes jump {
  0% { transform: translate(0, 0) scale(1.1); }
  45% { transform: translate(calc(var(--dx) * 0.45), calc(var(--dy) * 0.45 - var(--s) * 120)) scale(1) rotate(-10deg); }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.45) rotate(8deg); opacity: 0.4; }
}
@keyframes fly { to { transform: translate(var(--dx), var(--dy)); } }
@keyframes consume {
  0% { transform: rotate(-6deg) scale(1); filter: brightness(1); }
  60% { filter: brightness(2) sepia(1) hue-rotate(-20deg) saturate(4); }
  100% { transform: rotate(12deg) scale(0.2); filter: brightness(3) blur(calc(var(--s) * 6)); opacity: 0; }
}
@keyframes burst { 0% { transform: scale(0.2) rotate(0); opacity: 1; } 100% { transform: scale(1.4) rotate(40deg); opacity: 0; } }
@keyframes flash { 0% { opacity: 1; transform: scale(0.6); } 100% { opacity: 0; transform: scale(1.15); } }
@keyframes coin {
  0% { transform: translate(0, 0) scale(0.3); opacity: 1; }
  30% { transform: translate(var(--sx), var(--sy)) scale(1.1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.6); opacity: 0.6; }
}
@media (prefers-reduced-motion: reduce) {
  .recruit, .spell, .coin { display: none; }
  .burst, .flash, .fx .late, .fx .arrive { animation-duration: 0.01s; }
}
</style>
