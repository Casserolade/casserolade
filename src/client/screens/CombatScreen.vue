<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import ConfettiBurst from '#src/client/components/atoms/ConfettiBurst.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import SheetSprite from '#src/client/components/atoms/SheetSprite.vue';
import SpeechBubble from '#src/client/components/atoms/SpeechBubble.vue';
import CelebrationNotices from '#src/client/components/molecules/CelebrationNotices.vue';
import HeroCorner from '#src/client/components/molecules/HeroCorner.vue';
import HostLectern from '#src/client/components/molecules/HostLectern.vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import GameTable from '#src/client/components/organisms/GameTable.vue';
import { useCombatShow } from '#src/client/stores/useCombatShow.ts';
import type { CombatView, PlayerView } from '#src/engine/game.ts';

/** `view`: the player's view when the combat began. The next round's view never changes what is shown here. */
const props = defineProps<{ combat: CombatView; view: PlayerView | null; line: string | null }>();
const emit = defineEmits<{ close: [] }>();

const stageHost = useTemplateRef<HTMLElement>('stageHost');
const {
  SPEEDS, playback, narration, finished, speed, stageReady, stageFailed, waitingNext, resultShown, speaker, speech, speakerPuppet, speechText,
  notices, noticeHeads, own, enemy, ownHp, opponentHp, draining, hurt, fatalBlow, rivalShaken, fatalSprite, eliminated, outcome, rivalLine,
  host, won, lost, hostLine, plateauId, hostPuppet, hostTalking, lecternMic,
} = useCombatShow(props, () => emit('close'), stageHost);

/** Without its medallion on the stage (dead, or no WebGL), the line comes from its side of the table. */
const speechStyle = computed(() => {
  const said = speech.value;
  if (!said) return {};
  if (said.at) return { left: `${said.at.x}px`, top: `${said.at.y}px` };
  const isOwn = said.side === props.combat.side;
  return isOwn ? { left: 'calc(var(--s) * 560 + (100vw - var(--s) * 1920) / 2)', top: 'calc(var(--s) * 880 + (100dvh - var(--s) * 1080) / 2)' } : { left: '50vw', top: 'calc(var(--s) * 150 + (100dvh - var(--s) * 1080) / 2)' };
});
</script>

<template>
  <GameTable :plateau-id="plateauId">
    <div class="opponent" :class="{ shaken: rivalShaken }">
      <HeroCorner :hero-id="combat.opponent.heroId" :hp="opponentHp ?? 0" :start-hp="view?.params.startHp ?? 30" />
      <SheetSprite v-if="fatalBlow && fatalSprite" class="fatal-blow" :sprite="fatalSprite" />
      <div v-if="resultShown && speaker === 'rival' && rivalLine" class="rival-line">
        <SpeechBubble tail="left">{{ rivalLine }}</SpeechBubble>
      </div>
    </div>
    <div v-if="host" class="booth" aria-hidden="true">
      <HostLectern class="host" :puppet="hostPuppet" :name="host.nom" :talking="hostTalking" :mic-image="lecternMic" />
      <SpeechBubble v-if="hostTalking" class="host-line" tail="left">{{ hostLine }}</SpeechBubble>
    </div>
    <div v-if="view" class="hero-spot" :class="{ draining, hurt }">
      <HeroCorner :hero-id="view.heroId" :hp="ownHp" :start-hp="view.params.startHp" />
    </div>

    <div v-if="!stageReady" class="plain" :class="{ loading: !stageFailed }">
      <ol class="plain-row enemy">
        <li v-for="unit in enemy" :key="unit.uid"><MedallionToken v-bind="unit" /></li>
      </ol>
      <ol class="plain-row own">
        <li v-for="unit in own" :key="unit.uid"><MedallionToken v-bind="unit" /></li>
      </ol>
    </div>

    <div v-if="!finished" class="controls">
      <button v-for="value in SPEEDS" :key="value" type="button" class="control" :aria-pressed="speed === value" @click="playback.setSpeed(value)">×{{ value }}</button>
      <button type="button" class="control skip" @click="playback.skip()">Passer</button>
    </div>
    <p class="sr-only" aria-live="polite">{{ narration }}</p>
    <p v-if="!stageReady && !stageFailed" class="stage-loading" role="status">Le plateau s'installe…</p>
    <p v-if="waitingNext" class="waiting-next" role="status">Les autres débats se terminent…</p>

    <template #front>
      <CelebrationNotices :notices="notices" :side="props.combat.side" :heads="noticeHeads" />
      <div v-if="resultShown" class="outcome" :class="{ won, lost: lost || eliminated }" role="status">
        <strong class="result">{{ eliminated ? 'Éliminé !' : won ? 'Victoire !' : lost ? 'Défaite…' : 'Égalité' }}</strong>
        <span class="detail">{{ outcome }}</span>
      </div>
    </template>

    <template #overlay>
      <div ref="stageHost" class="stage-host" aria-hidden="true" />
      <div v-if="speech" :key="`${speech.kind}-${speech.uid}`" class="speech" :class="[speech.kind, { below: speech.below }]" :style="speechStyle" role="status">
        <ConfettiBurst v-if="speech.kind === 'celebration'" class="confetti" />
        <span v-if="speech.kind === 'celebration'" class="speed-lines" aria-hidden="true" />
        <span class="speech-bubble">
          <HeadPortrait v-if="!speech.at" class="speaker" :puppet="speakerPuppet" />
          <SpeechBubble v-if="speechText" :tail="speech.below ? 'up' : 'down'" :shout="speech.kind === 'celebration'">{{ speechText }}</SpeechBubble>
        </span>
      </div>
    </template>
  </GameTable>
</template>

<style scoped>
/* Above the combat stage, like the player's own hero: its power shows on hover, over the stage. */
.opponent { --u: var(--s); position: absolute; z-index: 25; left: 50%; top: calc(var(--s) * 4); translate: -50% 0; }
/* The casserole lands on the rival's head: its rim sits low on the forehead, the pan tilted like a hat. */
.fatal-blow { left: 50%; top: calc(var(--s) * -170); translate: -50% 0; z-index: 3; }
.opponent.shaken :deep(.hero-corner) { animation: rival-shake 0.45s linear; }
@keyframes rival-shake { 0%, 100% { translate: 0 0; } 20% { translate: calc(var(--s) * -8) calc(var(--s) * 6); } 45% { translate: calc(var(--s) * 7) calc(var(--s) * 2); } 70% { translate: calc(var(--s) * -4) 0; } }
.opponent :deep(.arch) { --arch-width: calc(var(--s) * 124); }
/* The rival sits at the top of the screen: its power opens downward, never above the edge. */
.opponent :deep(.power) { bottom: auto; top: calc(var(--s) * 8); }
/* The host at its lectern, on the left of the table, between the corner and our hero. */
.booth { position: absolute; left: calc(var(--s) * 14); top: calc(var(--s) * 236); }
.host { --lectern-width: calc(var(--s) * 280); }
.host-line { position: absolute; left: calc(var(--s) * 236); top: calc(var(--s) * 40); width: max-content; max-width: calc(var(--s) * 420); }
.hero-spot { position: absolute; z-index: 25; left: calc(var(--s) * 52); bottom: calc(var(--s) * 22); transform-origin: 0 100%; transition: transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1); }
/* The loss is felt: the hero comes forward while its polls drain, then flashes red and shakes. */
.hero-spot.draining { transform: scale(1.55) translate(calc(var(--s) * 30), calc(var(--s) * -40)); }
.hero-spot.hurt { animation: hurt-shake 0.45s linear; }
.hero-spot.hurt :deep(.polls .count) { background: #ff2a3a; box-shadow: 0 0 calc(var(--s) * 30) #ff2a3a; }
.hero-spot.hurt :deep(.arch) { filter: drop-shadow(0 0 calc(var(--s) * 24) rgb(255 40 50 / 0.9)) sepia(0.5) saturate(3) hue-rotate(-30deg); }
@keyframes hurt-shake { 0%, 100% { translate: 0 0; } 15% { translate: calc(var(--s) * -10) calc(var(--s) * 4); } 35% { translate: calc(var(--s) * 9) calc(var(--s) * -3); } 55% { translate: calc(var(--s) * -6) calc(var(--s) * 2); } 75% { translate: calc(var(--s) * 4) 0; } }
@media (prefers-reduced-motion: reduce) { .hero-spot { transition: none; } .hero-spot.draining { transform: none; } .hero-spot.hurt, .opponent.shaken :deep(.hero-corner) { animation: none; } }
.stage-host { position: fixed; inset: 0; z-index: 10; pointer-events: none; }
.stage-host :deep(canvas) { display: block; }
.plain { position: absolute; left: calc(var(--s) * 300); top: calc(var(--s) * 156); width: calc(var(--s) * 1320); height: calc(var(--s) * 640); display: flex; flex-direction: column; justify-content: space-around; --medal-w: calc(var(--s) * 150); }
.plain-row { list-style: none; margin: 0; padding: 0; display: flex; justify-content: center; gap: calc(var(--s) * 34); }
/* While the stage loads: the boards are there, a little dimmed. */
.plain.loading { opacity: 0.8; filter: saturate(0.85); }
.stage-loading { position: absolute; left: 50%; top: calc(var(--s) * 462); translate: -50% -50%; z-index: 5; color: #ffe27a; font: 400 calc(var(--s) * 40) / 1 var(--font-number); letter-spacing: calc(var(--s) * 1); -webkit-text-stroke: calc(var(--s) * 6) var(--color-ink); paint-order: stroke fill; pointer-events: none; animation: stage-loading 1.2s ease-in-out infinite; }
@keyframes stage-loading { 50% { opacity: 0.5; } }
.waiting-next { position: absolute; left: 50%; bottom: calc(var(--s) * 60); translate: -50% 0; z-index: 5; padding: calc(var(--s) * 8) calc(var(--s) * 24); border-radius: calc(var(--s) * 30); background: rgb(10 12 22 / 0.88); color: #c9cfdc; font: 700 calc(var(--s) * 26) / 1.2 var(--font-card); pointer-events: none; }
.controls { position: absolute; right: calc(var(--s) * 40); top: calc(var(--s) * 400); display: flex; flex-direction: column; gap: calc(var(--s) * 12); z-index: 20; }
.control {
  min-width: calc(var(--s) * 110);
  padding: calc(var(--s) * 8) calc(var(--s) * 16);
  border-radius: calc(var(--s) * 30);
  border: calc(var(--s) * 3) solid #d8b450;
  background: linear-gradient(#2a3a6a, #121a38);
  color: #fff;
  font: 400 calc(var(--s) * 30) / 1 var(--font-number);
  letter-spacing: calc(var(--s) * 1);
  cursor: pointer;
}
.control[aria-pressed='true'] { background: linear-gradient(#ffe27a, #e8a612); color: var(--color-ink); }
.control:hover { filter: brightness(1.2); }
.skip { margin-top: calc(var(--s) * 10); }
.outcome {
  position: absolute;
  left: 50%;
  top: calc(var(--s) * 462);
  /* Over the side that was wiped out, not over the survivors. */
  translate: -50% -50%;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--s) * 4);
  pointer-events: none;
  animation: outcome-in 0.4s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.result { color: #e8ecf4; font: 400 calc(var(--s) * 110) / 1 var(--font-number); letter-spacing: calc(var(--s) * 3); -webkit-text-stroke: calc(var(--s) * 12) var(--color-ink); paint-order: stroke fill; rotate: -3deg; }
.won .result { color: #ffd84a; }
.lost .result { color: #ff6a6a; }
.detail { padding: calc(var(--s) * 6) calc(var(--s) * 18); border-radius: calc(var(--s) * 20); border: calc(var(--s) * 3) solid rgb(255 255 255 / 0.18); background: #0a0c16; color: #fff; font: 700 calc(var(--s) * 26) / 1.2 var(--font-card); }
/* Beside the rival's portrait, above the table: the blows on its medallions never land on its words. */
.rival-line { position: absolute; left: calc(100% + var(--s) * 28); top: calc(var(--s) * 18); z-index: 20; width: max-content; max-width: calc(var(--s) * 480); }
.speech { position: fixed; z-index: 30; width: 0; height: 0; pointer-events: none; }
.speech-bubble { position: absolute; left: 0; bottom: calc(var(--s) * 70); translate: -30% 0; display: flex; align-items: flex-end; gap: calc(var(--s) * 8); width: max-content; max-width: calc(var(--s) * 560); }
/* Below a medallion high on the screen: under its stats, the tail up toward it. */
.below .speech-bubble { bottom: auto; top: calc(var(--s) * 100); align-items: flex-start; }
.celebration .speech-bubble :deep(.bubble) { font-size: calc(var(--s) * 32); padding: calc(var(--s) * 14) calc(var(--s) * 26); }
.speaker { --portrait-size: calc(var(--s) * 90); border: calc(var(--s) * 4) solid #fff; }
.confetti { left: 0; top: calc(var(--s) * 60); }
.speed-lines {
  position: absolute;
  left: calc(var(--s) * -300);
  top: calc(var(--s) * -220);
  width: calc(var(--s) * 600);
  height: calc(var(--s) * 600);
  background: repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.55) 0 1.5deg, transparent 1.5deg 9deg);
  mask: radial-gradient(circle, transparent 22%, #000 40%, transparent 70%);
  animation: speed-lines 0.25s steps(2, end) infinite;
}
.outcome.won { top: calc(var(--s) * 300); }
.outcome.lost { top: calc(var(--s) * 610); }
@keyframes outcome-in { from { transform: scale(0.3); opacity: 0; } }
@keyframes speed-lines { 50% { rotate: 4deg; } }
</style>
