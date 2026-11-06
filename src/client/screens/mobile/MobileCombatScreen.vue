<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import ConfettiBurst from '#src/client/components/atoms/ConfettiBurst.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import SheetSprite from '#src/client/components/atoms/SheetSprite.vue';
import SpeechBubble from '#src/client/components/atoms/SpeechBubble.vue';
import CelebrationNotices from '#src/client/components/molecules/CelebrationNotices.vue';
import HostLectern from '#src/client/components/molecules/HostLectern.vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import MobileHeroBadge from '#src/client/components/molecules/MobileHeroBadge.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { useCombatShow } from '#src/client/stores/useCombatShow.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { portraitCombatLayout } from '#src/client/tools/portraitCombatLayout.ts';
import type { CombatView, PlayerView } from '#src/engine/game.ts';

/**
 * The combat on a phone held upright: the rival and the host on top, the two rows of medallions in the middle, your
 * hero at the bottom. The same show as on a computer (useCombatShow): only the places change.
 */
const props = defineProps<{ combat: CombatView; view: PlayerView | null; line: string | null }>();
const emit = defineEmits<{ close: [] }>();

const stageHost = useTemplateRef<HTMLElement>('stageHost');
const {
  SPEEDS, playback, narration, finished, speed, stageReady, stageFailed, waitingNext, resultShown, speaker, speech, speakerPuppet, speechText,
  notices, noticeHeads, own, enemy, ownHp, opponentHp, draining, hurt, fatalBlow, rivalShaken, fatalSprite, eliminated, outcome, rivalLine,
  host, won, lost, hostLine, plateauId, hostPuppet, hostTalking, lecternMic,
} = useCombatShow(props, () => emit('close'), stageHost, portraitCombatLayout);

const decor = computed(() => cssImage(gameArt.manifest.value.plateaux[plateauId]?.decor));
/** Without its medallion on the stage (dead, or no WebGL), the line comes from its hero: yours below, the rival's above. */
const speechStyle = computed(() => {
  const said = speech.value;
  if (!said) return {};
  if (said.at) return { left: `${said.at.x}px`, top: `${said.at.y}px` };
  return said.side === props.combat.side ? { left: '34vw', top: '84dvh' } : { left: '50vw', top: '20dvh' };
});
</script>

<template>
  <div class="mobile-combat">
    <div class="decor" :style="{ backgroundImage: decor }" aria-hidden="true" />
    <div class="rival" :class="{ shaken: rivalShaken }">
      <MobileHeroBadge :hero-id="combat.opponent.heroId" :hp="opponentHp ?? 0" :start-hp="view?.params.startHp ?? 30" />
      <SheetSprite v-if="fatalBlow && fatalSprite" class="fatal-blow" :sprite="fatalSprite" />
      <div v-if="resultShown && speaker === 'rival' && rivalLine" class="rival-line"><SpeechBubble tail="up">{{ rivalLine }}</SpeechBubble></div>
    </div>
    <div v-if="host" class="booth" aria-hidden="true">
      <HostLectern class="host" :puppet="hostPuppet" :name="host.nom" :talking="hostTalking" :mic-image="lecternMic" />
      <SpeechBubble v-if="hostTalking" class="host-line" tail="up">{{ hostLine }}</SpeechBubble>
    </div>
    <div v-if="view" class="me" :class="{ draining, hurt }">
      <MobileHeroBadge :hero-id="view.heroId" :hp="ownHp" :start-hp="view.params.startHp" />
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

    <div class="notices-spot">
      <CelebrationNotices :notices="notices" :side="props.combat.side" :heads="noticeHeads" />
    </div>
    <div v-if="resultShown" class="outcome" :class="{ won, lost: lost || eliminated }" role="status">
      <strong class="result">{{ eliminated ? 'Éliminé !' : won ? 'Victoire !' : lost ? 'Défaite…' : 'Égalité' }}</strong>
      <span class="detail">{{ outcome }}</span>
    </div>

    <div ref="stageHost" class="stage-host" aria-hidden="true" />
    <div v-if="speech" :key="`${speech.kind}-${speech.uid}`" class="speech" :class="[speech.kind, { below: speech.below }]" :style="speechStyle" role="status">
      <ConfettiBurst v-if="speech.kind === 'celebration'" class="confetti" />
      <span v-if="speech.kind === 'celebration'" class="speed-lines" aria-hidden="true" />
      <span class="speech-bubble">
        <HeadPortrait v-if="!speech.at" class="speaker" :puppet="speakerPuppet" />
        <SpeechBubble v-if="speechText" :tail="speech.below ? 'up' : 'down'" :shout="speech.kind === 'celebration'">{{ speechText }}</SpeechBubble>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* --s sizes what was drawn for the computer's table (bubbles, notices): at a reading size on a phone. */
.mobile-combat { --s: 0.62px; position: fixed; inset: 0; overflow: hidden; background: #0b0e18; color: var(--color-text); user-select: none; -webkit-user-select: none; }
.decor { position: absolute; inset: -2%; background: center / cover no-repeat; filter: blur(2px) brightness(0.55) saturate(1.1); }
.rival { --u: 0.6px; --badge-size: 56px; position: absolute; z-index: 25; left: 50%; top: calc(env(safe-area-inset-top) + 8px); translate: -50% 0; }
.fatal-blow { position: absolute; left: 50%; top: -70px; translate: -50% 0; z-index: 3; }
.rival.shaken { animation: rival-shake 0.45s linear; }
.rival-line { position: absolute; z-index: 20; left: 50%; top: calc(100% + 10px); translate: -50% 0; width: max-content; max-width: 84vw; }
.booth { position: absolute; z-index: 24; left: 6px; top: calc(env(safe-area-inset-top) + 2px); }
.host { --lectern-width: 84px; }
.host-line { position: absolute; left: 6px; top: calc(100% + 6px); width: max-content; max-width: 62vw; }
.me { --badge-size: 64px; position: absolute; z-index: 25; left: 10px; bottom: calc(env(safe-area-inset-bottom) + 14px); transform-origin: 0 100%; transition: transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1); }
/* The loss is felt: the hero comes forward while its polls drain, then flashes red and shakes. */
.me.draining { transform: scale(1.35); }
.me.hurt { animation: hurt-shake 0.45s linear; }
.me.hurt :deep(.health) { background: #ff2a3a; box-shadow: 0 0 18px #ff2a3a; }
.stage-host { position: fixed; inset: 0; z-index: 10; pointer-events: none; }
.stage-host :deep(canvas) { display: block; }
/* While the stage loads: the boards are there, where the stage will draw them, a little dimmed. */
.plain { --medal-w: min(13vw, 62px); position: absolute; inset: 0; }
.plain.loading { opacity: 0.8; filter: saturate(0.85); }
.plain-row { position: absolute; left: 0; right: 0; display: flex; justify-content: center; gap: 5px; margin: 0; padding: 0; list-style: none; translate: 0 -50%; }
.plain-row.enemy { top: 36%; }
.plain-row.own { top: 63%; }
.controls { position: absolute; z-index: 20; right: 8px; bottom: calc(env(safe-area-inset-bottom) + 14px); display: flex; gap: 6px; }
.control { min-width: 44px; min-height: 40px; padding: 0 10px; border-radius: 999px; border: 2px solid var(--color-frame); background: linear-gradient(#2a3a6a, #121a38); color: #fff; font: 400 1.05rem / 1 var(--font-number); letter-spacing: 1px; }
.control[aria-pressed='true'] { background: linear-gradient(#ffe27a, #e8a612); color: var(--color-ink); }
.stage-loading { position: absolute; z-index: 5; left: 50%; top: 50%; translate: -50% -50%; color: var(--color-title); font: 400 1.6rem / 1 var(--font-number); letter-spacing: 1px; white-space: nowrap; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; pointer-events: none; animation: stage-loading 1.2s ease-in-out infinite; }
.waiting-next { position: absolute; z-index: 5; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 96px); translate: -50% 0; padding: 6px 14px; border-radius: 20px; background: rgb(10 12 22 / 0.88); color: #c9cfdc; font: 700 0.95rem / 1.2 var(--font-card); white-space: nowrap; pointer-events: none; }
/* The Célébrations, above the controls, at a reading size. */
.notices-spot { --s: 0.78px; position: absolute; z-index: 21; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom) + 64px); height: 0; }
.outcome { position: absolute; z-index: 20; left: 50%; top: 49.5%; translate: -50% -50%; display: flex; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; animation: outcome-in 0.4s cubic-bezier(0.3, 1.6, 0.5, 1); }
.result { color: #e8ecf4; font: 400 3.4rem / 1 var(--font-number); letter-spacing: 2px; white-space: nowrap; -webkit-text-stroke: 8px var(--color-ink); paint-order: stroke fill; rotate: -3deg; }
.won .result { color: #ffd84a; }
.lost .result { color: #ff6a6a; }
.detail { max-width: 90vw; padding: 4px 12px; border-radius: 14px; border: 2px solid rgb(255 255 255 / 0.18); background: #0a0c16; color: #fff; font: 700 0.95rem / 1.25 var(--font-card); text-align: center; }
.speech { position: fixed; z-index: 30; width: 0; height: 0; pointer-events: none; }
.speech-bubble { position: absolute; left: 0; bottom: calc(var(--s) * 70); translate: -40% 0; display: flex; align-items: flex-end; gap: calc(var(--s) * 8); width: max-content; max-width: min(84vw, calc(var(--s) * 560)); }
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
.outcome.won { top: 30%; }
.outcome.lost { top: 70%; }
@keyframes stage-loading { 50% { opacity: 0.5; } }
@keyframes outcome-in { from { transform: scale(0.3); opacity: 0; } }
@keyframes speed-lines { 50% { rotate: 4deg; } }
@keyframes rival-shake { 0%, 100% { translate: -50% 0; } 20% { translate: calc(-50% - 6px) 4px; } 45% { translate: calc(-50% + 5px) 1px; } 70% { translate: calc(-50% - 3px) 0; } }
@keyframes hurt-shake { 0%, 100% { translate: 0 0; } 15% { translate: -7px 3px; } 35% { translate: 6px -2px; } 55% { translate: -4px 1px; } 75% { translate: 3px 0; } }
@media (prefers-reduced-motion: reduce) {
  .me { transition: none; }
  .me.draining { transform: none; }
  .me.hurt, .rival.shaken, .stage-loading { animation: none; }
}
</style>
