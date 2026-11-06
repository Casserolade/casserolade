import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { ANSWER_MOMENTS, CELEBRATION_MOMENTS } from '#src/client/const/speechMoments.ts';
import type { CombatStage } from '#src/client/pixi/combatStage.ts';
import { playSound, playVoice, preloadVoice } from '#src/client/services/soundEffects.ts';
import { CombatPlayback } from '#src/client/stores/createCombatPlayback.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { heardVoices } from '#src/client/stores/heardVoices.ts';
import { lastSpokenLines } from '#src/client/stores/lastSpokenLines.ts';
import { startedCombats } from '#src/client/stores/startedCombats.ts';
import { afterCombatSpeaker } from '#src/client/tools/afterCombatSpeaker.ts';
import type { AfterCombatSpeaker } from '#src/client/tools/afterCombatSpeaker.ts';
import { speechForEvent } from '#src/client/tools/afterCombatSpeech.ts';
import type { CombatSpeech } from '#src/client/tools/afterCombatSpeech.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { celebrationNotices } from '#src/client/tools/celebrationNotices.ts';
import { combatCharacterIds } from '#src/client/tools/combatCharacterIds.ts';
import { combatHp } from '#src/client/tools/combatHp.ts';
import { combatLayout } from '#src/client/tools/combatLayout.ts';
import { drainSteps } from '#src/client/tools/drainSteps.ts';
import { freshVoice } from '#src/client/tools/freshVoice.ts';
import { hostQuote } from '#src/client/tools/hostQuote.ts';
import { longTextBonusMs } from '#src/client/tools/longTextBonusMs.ts';
import { pickCriticalKills } from '#src/client/tools/pickCriticalKills.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { quotesFor } from '#src/client/tools/quotesFor.ts';
import { readingDelayMs } from '#src/client/tools/readingDelayMs.ts';
import { rivalLineForCombat } from '#src/client/tools/rivalLineForCombat.ts';
import { sheetSpriteStyle } from '#src/client/tools/sheetSpriteStyle.ts';
import { summarizeCombatOutcome } from '#src/client/tools/summarizeCombatOutcome.ts';
import { voicedSpeaker } from '#src/client/tools/voicedSpeaker.ts';
import { voixPourPhrase } from '#src/data/trouverVoix.ts';
import type { CombatView, PlayerView } from '#src/engine/game.ts';
import type { CombatSides } from '#src/engine/replay.ts';
import type { CombatEvent } from '#src/engine/types.ts';
import { combatEventDuration } from '#src/protocol/combatDuration.ts';

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
/** A Célébration is short: a recording of 6 seconds at most first (5 November 2026: Morano's took 8), a longer one when none is left. */
const SPEECH_VOICE_MAX_SECONDS = 6;

/** What a combat screen shows, on a computer or a phone: `view` is the player's view when the combat began. */
export interface CombatShowProps {
  combat: CombatView;
  view: PlayerView | null;
  line: string | null;
}

/**
 * Everything a combat screen plays, whatever its layout: the stage drawn in `stageHost` with `layout`, the journal
 * played event by event, the voices and the bubbles, the Célébrations, the result and the polls that drain. The
 * screen only places it: the computer's table, or the phone held upright. `onClose` is called once it is all seen.
 */
export function useCombatShow(props: CombatShowProps, onClose: () => void, stageHost: Readonly<Ref<HTMLElement | null>>, layout: typeof combatLayout = combatLayout) {
  let stage: CombatStage | null = null;
  let hasLeft = false;
  let closeTimer = 0;
  let resultTimer = 0;
  let waitTimer = 0;
  let speechTimer = 0;
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
  /** A single politician is heard after the combat: the one who celebrates, or else the one who answers. */
  let politicianHeard = false;
  /** Already started before this mount (a hot reload on the dev server): it is not played again from the top. */
  const startedBefore = startedCombats.has(props.combat);
  startedCombats.add(props.combat);

  const playback = new CombatPlayback(props.combat.log, {
    handleEvent: (event, sides) => stage?.handleEvent(event, sides),
    jumpTo: (sides) => stage?.jumpTo(sides),
    handleFinished: scheduleClose,
  });
  const { sides, current, narration, finished, speed, played } = playback;
  /** What each Célébration gives, all at once, as the one who celebrates starts to speak (or when the combat is skipped). */
  const allNotices = celebrationNotices(props.combat.log);
  const celebrationAt = props.combat.log.findIndex((event) => event.e === 'celebration');
  const notices = computed(() => (celebrationAt >= 0 && played.value > celebrationAt ? allNotices : []));
  /** The head of each politician who celebrates, on its notice. */
  const noticeHeads = computed(() => Object.fromEntries(allNotices.map((notice) => [notice.cardId, puppetStyle(gameArt.manifest.value, notice.cardId, 'civile')])));
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
    onClose();
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

  /**
   * The voice that can say this line after the combat: never heard yet in this game, only one per combat, and no
   * longer than `maxSeconds`.
   */
  function voiceFor(cardId: string, line: string, maxSeconds = Infinity): string | null {
    return politicianHeard ? null : freshVoice(cardId, line, heardVoices.has, maxSeconds);
  }

  /**
   * What is said for this event, with voices of `maxSeconds` at most: who takes the floor (one whose line can be heard,
   * when there is one), and never the line this politician said last time, when it has another one.
   */
  function speechWithin(event: CombatEvent, maxSeconds: number): CombatSpeech | null {
    if (event.e !== 'celebration' && event.e !== 'reponse') return null;
    const moments = event.e === 'celebration' ? CELEBRATION_MOMENTS : ANSWER_MOMENTS;
    const canVoice = (cardId: string, line: string) => voiceFor(cardId, line, maxSeconds) !== null;
    const speaker = voicedSpeaker(event, props.combat.log, (cardId) => quotesFor(cardId, moments).some((line) => canVoice(cardId, line)));
    return speechForEvent(speaker, speechRoll, lastSpokenLines.lastOf(speaker.cardId), canVoice);
  }

  /** After the combat, the survivor who celebrates speaks over its medallion; the one who answers, over its hero. A short voice first; when none is left, a longer one rather than none. */
  function speechFor(event: CombatEvent): CombatSpeech | null {
    const short = speechWithin(event, SPEECH_VOICE_MAX_SECONDS);
    if (!short?.line || voiceFor(short.cardId, short.line, SPEECH_VOICE_MAX_SECONDS)) return short;
    return speechWithin(event, Infinity);
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
    // A politician is heard after the combat only, and only one: the one who celebrates, or else the one who answers.
    const voice = said.line && !said.chant ? voiceFor(said.cardId, said.line) : null;
    if (!voice) return;
    politicianHeard = true;
    // Its real voice, when its words were recorded: the combat waits for it, and the bubble stays as long.
    void playVoice(voice).then((voiceMs) => {
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
        layout,
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
    // The one voice heard after this combat loads with the stage, so that it starts with its bubble.
    for (const event of props.combat.log) {
      const said = speechFor(event);
      const voice = said?.line && !said.chant ? voiceFor(said.cardId, said.line) : null;
      if (!voice) continue;
      preloadVoice(voice);
      break;
    }
    await startStage(stageHost.value as HTMLElement);
    // The player may have skipped or left while the stage was loading.
    if (hasLeft) return;
    if (startedBefore) playback.skip();
    else if (finished.value) stage?.jumpTo(sides.value);
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

  return {
    SPEEDS, playback, narration, finished, speed, stageReady, stageFailed, waitingNext, resultShown, speaker, speech, speakerPuppet, speechText,
    notices, noticeHeads, own, enemy, ownHp, opponentHp, draining, hurt, fatalBlow, rivalShaken, fatalSprite, eliminated, outcome, rivalLine,
    host, won, lost, hostLine, plateauId, hostPuppet, hostTalking, lecternMic,
  };
}
