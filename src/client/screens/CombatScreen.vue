<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import ConfettiBurst from '#src/client/components/atoms/ConfettiBurst.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import SheetSprite from '#src/client/components/atoms/SheetSprite.vue';
import SpeechBubble from '#src/client/components/atoms/SpeechBubble.vue';
import CelebrationNotices from '#src/client/components/molecules/CelebrationNotices.vue';
import HeroCorner from '#src/client/components/molecules/HeroCorner.vue';
import HostLectern from '#src/client/components/molecules/HostLectern.vue';
import MedallionToken from '#src/client/components/molecules/MedallionToken.vue';
import GameTable from '#src/client/components/organisms/GameTable.vue';
import type { CombatStage } from '#src/client/pixi/combatStage.ts';
import { pickCriticalKills } from '#src/client/tools/pickCriticalKills.ts';
import { playSound, playVoice, preloadVoice } from '#src/client/services/soundEffects.ts';
import { CombatPlayback } from '#src/client/stores/createCombatPlayback.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { ANSWER_MOMENTS, CELEBRATION_MOMENTS } from '#src/client/const/speechMoments.ts';
import { speechForEvent } from '#src/client/tools/afterCombatSpeech.ts';
import { hasRecordedLine } from '#src/client/tools/hasRecordedLine.ts';
import { voicedSpeaker } from '#src/client/tools/voicedSpeaker.ts';
import { lastSpokenLines } from '#src/client/stores/lastSpokenLines.ts';
import { longTextBonusMs } from '#src/client/tools/longTextBonusMs.ts';
import { afterCombatSpeaker } from '#src/client/tools/afterCombatSpeaker.ts';
import type { AfterCombatSpeaker } from '#src/client/tools/afterCombatSpeaker.ts';
import { celebrationNotices } from '#src/client/tools/celebrationNotices.ts';
import type { CombatSpeech } from '#src/client/tools/afterCombatSpeech.ts';
import { combatCharacterIds } from '#src/client/tools/combatCharacterIds.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { combatHp } from '#src/client/tools/combatHp.ts';
import { drainSteps } from '#src/client/tools/drainSteps.ts';
import { hostQuote } from '#src/client/tools/hostQuote.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { readingDelayMs } from '#src/client/tools/readingDelayMs.ts';
import { rivalLineForCombat } from '#src/client/tools/rivalLineForCombat.ts';
import { sheetSpriteStyle } from '#src/client/tools/sheetSpriteStyle.ts';
import { summarizeCombatOutcome } from '#src/client/tools/summarizeCombatOutcome.ts';
import { combatEventDuration } from '#src/protocol/combatDuration.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';
import type { CombatView, PlayerView } from '#src/engine/game.ts';
import type { CombatSides } from '#src/engine/replay.ts';
import type { CombatEvent } from '#src/engine/types.ts';

const SPEEDS = [1, 2, 4];
/** The last blows settle (the gag, the numbers that rise) before the result is written over them. */
const RESULT_DELAY_MS = 700;
/** Seen, the combat stays until the next round comes: past this, the screen says what it waits for. */
const WAIT_HINT_MS = 1500;
/** A speaker whose top is in the upper part of the screen, as a share of its height, speaks below itself. */
const HIGH_SPEAKER = 0.4;
/** The polls a loss takes drain one by one under a zoom: the zoom first, then each step, then the blow. */
const DRAIN = { zoomMs: 250, stepMs: 130, hurtMs: 550 };
/** The giant casserole of the fatal blow, in table pixels, and how long the rival shakes under it. */
const FATAL_BLOW = { width: 200, shakeMs: 450, afterMs: 600 };

/** `view`: the player's view when the combat began. The next round's view never changes what is shown here. */
const props = defineProps<{ combat: CombatView; view: PlayerView | null; line: string | null }>();
const emit = defineEmits<{ close: [] }>();

let stage: CombatStage | null = null;
let hasLeft = false;
let closeTimer = 0;
let resultTimer = 0;
let waitTimer = 0;
let speechTimer = 0;
const stageHost = useTemplateRef<HTMLElement>('stageHost');
/** Without WebGL, the combat is still readable with the plain medallions. */
const stageFailed = ref(false);
/** The stage is drawing: until then, the plain medallions hold the table, never an empty arena. */
const stageReady = ref(false);
/** The boards as the combat opens them: what the table shows while the stage loads. */
const openingSides: CombatSides = props.combat.log[0]?.e === 'debut' ? props.combat.log[0].sides : [[], []];
/** The result is written once the last blows have settled. */
const resultShown = ref(false);
/** Seen to the end, and the next round is not there yet: the other debates are still going. */
const waitingNext = ref(false);
/** One voice at a time: who speaks once the combat is over, chosen when the result shows. */
const speaker = ref<AfterCombatSpeaker>(null);
/** A medallion said its line during the combat: the hero then keeps quiet. */
let minionSpoke = false;
/** When the bubble of the medallion that speaks goes away, on the page's clock: the result waits for it. */
let speechEndsAt = 0;
const speech = shallowRef<(CombatSpeech & { at: { x: number; y: number } | null; below: boolean }) | null>(null);
/** Drawn once per combat: which of its quotes the celebrant (and the one who answers) says, so that the voice loaded ahead is the one heard. */
const speechRoll = Math.random();

const playback = new CombatPlayback(props.combat.log, {
  handleEvent: (event, sides) => stage?.handleEvent(event, sides),
  jumpTo: (sides) => stage?.jumpTo(sides),
  handleFinished: scheduleClose,
});
const { sides, current, narration, finished, speed, played } = playback;
/** What each Célébration gives, shown as it plays: all of them at once when the combat is skipped. */
const allNotices = celebrationNotices(props.combat.log);
const notices = computed(() => allNotices.filter((notice) => notice.at < played.value));
const plainSides = computed(() => (stageReady.value || stageFailed.value || finished.value ? sides.value : openingSides));
const own = computed(() => plainSides.value[props.combat.side]);
const enemy = computed(() => plainSides.value[props.combat.side === 0 ? 1 : 0]);
/** Both players' polls before the combat, and after it once it is over: what the combat costs shows at the end. */
const polls = props.view ? combatHp(props.combat, props.view) : null;
/** The polls shown on the heroes: those before the combat, until the result drains them. */
const ownHp = ref(polls?.own.before ?? 0);
const opponentHp = ref(polls?.enemy?.before ?? null);
/** The player's polls are draining, zoomed in; then the blow lands, red. */
const draining = ref(false);
const hurt = ref(false);
/** Our victory takes the rival's last polls: the casserole falls on its head, and it shakes under the blow. */
const fatalBlow = ref(false);
const rivalShaken = ref(false);
const fatalSprite = computed(() => {
  const art = gameArt.manifest.value.effets.coup_fatal;
  return art?.atlas ? sheetSpriteStyle(art, FATAL_BLOW.width) : null;
});
let drainTimers: number[] = [];
const eliminated = polls?.eliminated ?? false;
const outcome = computed(() => summarizeCombatOutcome(props.combat, { eliminated }));
const rivalLine = computed(() => rivalLineForCombat(props.combat, polls?.enemy?.before ?? null));
/** The set and its host stay those of this round: the next round's view may arrive before the end. */
const host = props.view?.animateur ?? null;
const won = computed(() => props.combat.winner === props.combat.side);
const lost = computed(() => props.combat.winner !== null && props.combat.winner !== props.combat.side);
/** The host's word on the result: a real line when there is one for it, the stock one otherwise. */
const hostLine = (host && (won.value ? hostQuote(host.id, 'victoire', props.combat.round) : lost.value ? hostQuote(host.id, 'defaite', props.combat.round) : null)) ?? props.line;
const plateauId = props.view?.plateau.id ?? '';
const hostPuppet = computed(() => (host ? puppetStyle(gameArt.manifest.value, host.id, 'civile') : {}));
/** The host speaks the result: the bubble shows, its jaw moves and its hands go wild. */
const hostTalking = computed(() => Boolean(resultShown.value && speaker.value === 'host' && hostLine));
const lecternMic = computed(() => {
  const mic = gameArt.manifest.value.carte.mot_cle_porte_parole;
  return mic ? assetUrl(mic) : null;
});

/**
 * When a combat costs polls, they drain on screen with the result, one by one under a zoom, with a tick
 * each, then a red blow; the rival's go at the same pace. Never below 0: an elimination drains to 0.
 * Returns how long it lasts, so that the result stays at least that long.
 */
function drainPolls(): number {
  if (!polls) return 0;
  const own = drainSteps(polls.own.before, polls.own.after);
  const enemy = polls.enemy ? drainSteps(polls.enemy.before, polls.enemy.after) : [];
  const at = (ms: number, callback: () => void) => drainTimers.push(window.setTimeout(callback, ms));
  enemy.forEach((value, index) => at(DRAIN.zoomMs + index * DRAIN.stepMs, () => (opponentHp.value = value)));
  const enemyEnd = enemy.length ? DRAIN.zoomMs + enemy.length * DRAIN.stepMs : 0;
  const blowEnd = won.value && polls.enemy && polls.enemy.after <= 0 ? dropFatalBlow(enemyEnd) : 0;
  if (own.length === 0) return Math.max(enemyEnd, blowEnd);
  draining.value = true;
  own.forEach((value, index) => at(DRAIN.zoomMs + index * DRAIN.stepMs, () => {
    ownHp.value = value;
    playSound('tick', 0.7);
  }));
  const end = DRAIN.zoomMs + own.length * DRAIN.stepMs;
  at(end, () => {
    hurt.value = true;
    playSound('hit', 0.8);
  });
  at(end + DRAIN.hurtMs, () => {
    hurt.value = false;
    draining.value = false;
  });
  return Math.max(end + DRAIN.hurtMs, blowEnd);
}

/**
 * The one big gag of the game (rule of 3 November 2026): once the rival's polls are gone, a giant
 * casserole, rendered in 3D, falls on its head; « clang » and a shake at the impact. Returns when it is over.
 */
function dropFatalBlow(startMs: number): number {
  const art = gameArt.manifest.value.effets.coup_fatal;
  if (!art?.atlas) return 0;
  const frameMs = 1000 / (art.fps ?? 12);
  const impactMs = startMs + (art.impact ?? 0) * frameMs;
  drainTimers.push(window.setTimeout(() => (fatalBlow.value = true), startMs));
  drainTimers.push(window.setTimeout(() => {
    playSound('clang');
    rivalShaken.value = true;
  }, impactMs));
  drainTimers.push(window.setTimeout(() => (rivalShaken.value = false), impactMs + FATAL_BLOW.shakeMs));
  return startMs + (art.images ?? 1) * frameMs + FATAL_BLOW.afterMs;
}

function close(): void {
  emit('close');
  waitTimer = window.setTimeout(() => (waitingNext.value = true), WAIT_HINT_MS);
}

/**
 * The result, once the last word of the combat is said: the outcome, and at most one voice, the
 * rival's or now and then the host's. It stays long enough to be read, and heard.
 */
function showResult(): void {
  const wait = speechEndsAt - performance.now();
  if (wait > 50) {
    resultTimer = window.setTimeout(showResult, wait);
    return;
  }
  resultShown.value = true;
  speaker.value = afterCombatSpeaker({ minionSpoke, rivalLine: rivalLine.value, hostLine, roll: Math.random() });
  const line = speaker.value === 'rival' ? rivalLine.value : speaker.value === 'host' ? hostLine : null;
  const drainMs = drainPolls();
  const readMs = Math.max(readingDelayMs([outcome.value, line ?? ''].join(' ')), drainMs + 400);
  const shownAt = performance.now();
  closeTimer = window.setTimeout(close, readMs);
  const person = speaker.value === 'rival' ? props.combat.opponent.heroId : host?.id;
  if (!line || !person) return;
  void playVoice(voixPourPhrase(person, line)).then((voiceMs) => {
    if (hasLeft || voiceMs === 0) return;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(close, Math.max(readMs - (performance.now() - shownAt), voiceMs + 300));
  });
}

/** The game moves on by itself: the result stays just long enough to be read. */
function scheduleClose(): void {
  resultTimer = window.setTimeout(showResult, RESULT_DELAY_MS);
}

/** After the combat, the survivor who celebrates speaks over its medallion; the one who answers, over its hero. */
/** Who takes the floor for this event: one with a recorded line when there is one, so that its voice is heard. */
function withVoiceFirst(event: CombatEvent): CombatEvent {
  if (event.e !== 'celebration' && event.e !== 'reponse') return event;
  const moments = event.e === 'celebration' ? CELEBRATION_MOMENTS : ANSWER_MOMENTS;
  return voicedSpeaker(event, props.combat.log, (cardId) => hasRecordedLine(cardId, moments));
}

/** What is said for this event: never the line this politician said last time, when it has another one. */
function speechFor(event: CombatEvent): CombatSpeech | null {
  const speaker = withVoiceFirst(event);
  const cardId = 'cardId' in speaker ? speaker.cardId : '';
  return speechForEvent(speaker, speechRoll, lastSpokenLines.lastOf(cardId));
}

watch(current, (event) => {
  if (!event) return;
  const said = speechFor(event);
  if (!said) return;
  const seconds = combatEventDuration(event) / 1000 / speed.value;
  const at = stage?.unitPosition(said.uid) ?? null;
  if (said.kind === 'celebration') {
    stage?.celebrate(said.uid, seconds);
    playSound('celebrate');
  }
  // A medallion high on the screen speaks below itself: above, a long line would run off the top.
  const below = at ? at.top < window.innerHeight * HIGH_SPEAKER : said.side !== props.combat.side;
  const shown = { ...said, below, at: at ? { x: at.x, y: below ? at.y : at.top } : null };
  speech.value = shown;
  if (said.line) minionSpoke = true;
  if (said.line && !said.chant) lastSpokenLines.remember(said.cardId, said.line);
  const readMore = longTextBonusMs(said.line ?? '');
  hideSpeechAfter(seconds * 1000 + 300 + readMore);
  // A politician is heard after the combat only: when it celebrates, or has the last word with its Droit de réponse.
  if (!said.line) return;
  // Its real voice, when its words were recorded: the combat waits for it, and the bubble stays as long.
  void playVoice(voixPourPhrase(said.cardId, said.line)).then((voiceMs) => {
    if (hasLeft || voiceMs === 0 || speech.value !== shown) return;
    playback.hold(voiceMs);
    hideSpeechAfter(voiceMs + 300 + readMore);
    if (said.kind === 'celebration') stage?.celebrate(said.uid, voiceMs / 1000);
  });
});

function hideSpeechAfter(ms: number): void {
  window.clearTimeout(speechTimer);
  speechEndsAt = performance.now() + ms;
  speechTimer = window.setTimeout(() => (speech.value = null), ms);
}

const speakerPuppet = computed(() => (speech.value ? puppetStyle(gameArt.manifest.value, speech.value.cardId, 'civile') : {}));
/** A camp's chant is sung, between notes; the audience's applause is a caption. */
const speechText = computed(() => {
  const said = speech.value;
  if (!said?.line || !said.chant) return said?.line ?? null;
  return said.line.startsWith('(') ? said.line : `♪ ${said.line} ♪`;
});
/** Without its medallion on the stage (dead, or no WebGL), the line comes from its side of the table. */
const speechStyle = computed(() => {
  const said = speech.value;
  if (!said) return {};
  if (said.at) return { left: `${said.at.x}px`, top: `${said.at.y}px` };
  const isOwn = said.side === props.combat.side;
  return isOwn ? { left: 'calc(var(--s) * 560 + (100vw - var(--s) * 1920) / 2)', top: 'calc(var(--s) * 880 + (100dvh - var(--s) * 1080) / 2)' } : { left: '50vw', top: 'calc(var(--s) * 150 + (100dvh - var(--s) * 1080) / 2)' };
});

async function startStage(host: HTMLElement): Promise<void> {
  try {
    const { CombatStage: Stage } = await import('#src/client/pixi/combatStage.ts');
    const created = new Stage({
      host,
      manifest: gameArt.manifest.value,
      side: props.combat.side,
      characterIds: combatCharacterIds(props.combat.log),
      criticalKills: pickCriticalKills(props.combat.log),
      speed: () => speed.value,
      playSound,
    });
    stage = created;
    await created.start();
    stageReady.value = !hasLeft;
  } catch (error) {
    console.error('Combat stage failed to start', error);
    stage = null;
    stageFailed.value = true;
  }
}

onMounted(async () => {
  // The voices of the lines said in this combat load with the stage: each starts with its bubble.
  for (const event of props.combat.log) {
    const said = speechFor(event);
    if (said?.line) preloadVoice(voixPourPhrase(said.cardId, said.line));
  }
  await startStage(stageHost.value as HTMLElement);
  // The player may have skipped or left while the stage was loading.
  if (hasLeft) return;
  if (finished.value) stage?.jumpTo(sides.value);
  else playback.start();
});
onUnmounted(() => {
  hasLeft = true;
  window.clearTimeout(closeTimer);
  window.clearTimeout(resultTimer);
  window.clearTimeout(waitTimer);
  drainTimers.forEach((timer) => window.clearTimeout(timer));
  drainTimers = [];
  window.clearTimeout(speechTimer);
  playback.destroy();
  stage?.destroy();
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
      <div v-if="resultShown" class="outcome" :class="{ won, lost: lost || eliminated }" role="status">
        <strong class="result">{{ eliminated ? 'Éliminé !' : won ? 'Victoire !' : lost ? 'Défaite…' : 'Égalité' }}</strong>
        <span class="detail">{{ outcome }}</span>
      </div>
    </template>
      <CelebrationNotices :notices="notices" :side="props.combat.side" />

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
