<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import MoneySuitcase from '#src/client/components/atoms/MoneySuitcase.vue';
import PaperPuppet from '#src/client/components/atoms/PaperPuppet.vue';
import FlyingSuitcase from '#src/client/components/molecules/FlyingSuitcase.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { usePuppetFaces } from '#src/client/stores/usePuppetFaces.ts';
import { useSuitcaseThrow } from '#src/client/stores/useSuitcaseThrow.ts';
import { chaseMood, RESTED } from '#src/client/tools/chaseMood.ts';
import type { ChaseMood } from '#src/client/tools/chaseMood.ts';
import { chaseStep } from '#src/client/tools/chaseStep.ts';
import type { Chaser } from '#src/client/tools/chaseStep.ts';
import { pickOne } from '#src/client/tools/pickOne.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';

/** Beside the pointer, not under it: it runs to stand just below and to the left. */
const OFFSET = { x: -70, y: 110 };
const REACTION_MS = 1200;
const SWEAT_DROPS = 2;

/**
 * The home page's reporter: the host of the TV set behind. It comes out from behind the logo and runs after
 * the mouse at its one plodding pace,
 * arms flailing, body rocking, head wobbling. After a long run it sweats; when it stops, pouf, it sits, and gets
 * up again to run. `reactions` counts the game modes clicked: at each one it pulls a face and jumps. Near the
 * Ko-fi link, it throws a suitcase of banknotes into it (useSuitcaseThrow.ts), and says when it has `delivered`.
 * Only with a mouse, and never when the player asked for less motion.
 */
const props = defineProps<{ hostId: string; reactions: number }>();
const emit = defineEmits<{ delivered: [] }>();

const faces = usePuppetFaces();
const puppet = computed(() => puppetStyle(gameArt.manifest.value, props.hostId, 'civile', faces.face.value));
const enabled = ref(false);
const chaser = ref<Chaser>({ x: 120, y: window.innerHeight - 80, facing: 1, running: false, speed: 0 });
/**
 * One stride, in seconds: quicker as it sprints. Three paces only, a trot, a run and a sprint: a stride that
 * changed length at every frame would make the legs jump.
 */
const stride = computed(() => (chaser.value.speed < 380 ? 0.4 : chaser.value.speed < 500 ? 0.31 : 0.24));
const mood = ref<ChaseMood>(RESTED);
/** Bumped at each flop: the dust cloud plays once per sitting down. */
const flops = ref(0);
const jumping = ref(false);
let target = { x: chaser.value.x, y: chaser.value.y };
let frame = 0;
let last = 0;
let jumpTimer = 0;
/** The suitcase in its hand, measured when it lets go. */
const hand = ref<HTMLElement | null>(null);
const { phase, aim, flight, notice, deliver, clearFlight } = useSuitcaseThrow({
  reporterX: () => chaser.value.x,
  hand: () => hand.value?.getBoundingClientRect() ?? null,
  onDelivered: () => emit('delivered'),
});

function follow(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') return;
  target = { x: event.clientX + OFFSET.x, y: event.clientY + OFFSET.y };
  notice({ x: event.clientX, y: event.clientY });
}

function tick(now: number): void {
  const seconds = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  chaser.value = chaseStep(chaser.value, target, seconds);
  const next = chaseMood(mood.value, chaser.value.running, seconds);
  if (next.sitting && !mood.value.sitting) flops.value++;
  mood.value = next;
  frame = requestAnimationFrame(tick);
}

/** A mode was clicked: a face, laughing or shocked, and a jump. */
watch(() => props.reactions, () => {
  const art = gameArt.manifest.value.personnages[props.hostId]?.visages ?? {};
  const face = pickOne(['rire', 'choc', 'aie'].filter((name) => art[name]), Math.random());
  if (face) faces.show(face, REACTION_MS);
  jumping.value = false;
  requestAnimationFrame(() => (jumping.value = true));
  window.clearTimeout(jumpTimer);
  jumpTimer = window.setTimeout(() => (jumping.value = false), 600);
});

/** Where it hides at first: behind the middle of the logo, which passes over it (HomeScreen.vue). */
function hidingPlace(): { x: number; y: number } | null {
  const logo = document.querySelector('.logo img')?.getBoundingClientRect();
  return logo ? { x: logo.left + logo.width / 2, y: logo.top + logo.height * 0.9 } : null;
}

onMounted(() => {
  enabled.value = window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!enabled.value) return;
  const hidden = hidingPlace();
  if (hidden) {
    chaser.value = { ...chaser.value, ...hidden };
    target = hidden;
  }
  window.addEventListener('pointermove', follow);
  frame = requestAnimationFrame(tick);
});
onUnmounted(() => {
  window.removeEventListener('pointermove', follow);
  cancelAnimationFrame(frame);
  window.clearTimeout(jumpTimer);
});
</script>

<template>
  <div
    v-if="enabled"
    class="reporter"
    :class="{ running: chaser.running, sitting: mood.sitting && !chaser.running, sweating: mood.sweating, jumping, holding: phase !== 'idle', throwing: phase === 'throwing', left: (aim || chaser.facing) < 0 }"
    :style="{ translate: `${chaser.x}px ${chaser.y}px`, '--stride': `${stride}s` }"
    aria-hidden="true"
  >
    <span v-if="flops" :key="flops" class="pouf"><i /><i /><i /><i /></span>
    <!-- The suit cut into paper pieces, South Park style: each one pivots on its joint. The far limbs come first,
         behind the torso; the head of the puppet comes last, over everything. -->
    <span class="figure" :style="puppet">
      <span class="piece leg far"><span class="cut" /></span>
      <span class="piece arm far"><span class="cut" /></span>
      <span class="piece torso"><span class="cut" /></span>
      <span class="piece leg near"><span class="cut" /></span>
      <span class="puppet-head"><PaperPuppet :puppet="puppet" name="" /></span>
      <span class="piece arm near"><span class="cut" /><span class="mic" /><span ref="hand" class="in-hand"><MoneySuitcase /></span></span>
      <span class="sweat"><i v-for="n in SWEAT_DROPS" :key="n" :style="{ '--n': n }" /></span>
    </span>
  </div>
  <FlyingSuitcase v-if="enabled && flight" :flight="flight" @landed="deliver" @done="clearFlight" />
</template>

<style scoped>
/* Its feet on the point it runs to; in card units, like every puppet. */
.reporter { --u: calc(200px / 512); position: fixed; left: 0; top: 0; z-index: 40; width: calc(var(--u) * 512); height: calc(var(--u) * 480); margin: calc(var(--u) * -434) 0 0 calc(var(--u) * -256); pointer-events: none; }
/* Facing left: the mirror sits on the whole reporter, so that the run's own scaling never undoes it. */
.reporter.left { scale: -1 1; }
.figure { position: absolute; inset: 0; transform-origin: 50% 92%; }
/* The puppet's own body is hidden: its pieces below draw it, each able to move. */
.puppet-head { position: absolute; inset: 0; }
.puppet-head :deep(.body) { visibility: hidden; }

/* Every piece is the whole suit in the body's box, cut down to its part, turning about its joint (percent of the suit). */
.piece { position: absolute; left: calc(var(--u) * var(--body-left)); top: calc(var(--u) * var(--body-top)); width: calc(var(--u) * var(--body-width)); height: calc(var(--u) * var(--body-height)); }
.cut { position: absolute; inset: 0; background: var(--body-image) center / 100% 100% no-repeat; }
.torso .cut { clip-path: inset(0 23.5% 26% 23.5%); }
.torso { transform-origin: 50% 70%; }
.leg.far .cut { clip-path: inset(72% 50% 0 22%); }
.leg.far { transform-origin: 36% 74%; }
.leg.near .cut { clip-path: inset(72% 22% 0 50%); }
.leg.near { transform-origin: 64% 74%; }
.arm.far .cut { clip-path: inset(27% 76% 40% 5%); }
.arm.far { transform-origin: 24% 33%; }
.arm.near .cut { clip-path: inset(27% 5% 40% 76%); }
.arm.near { transform-origin: 76% 33%; }
.mic { position: absolute; left: 82%; top: 52%; width: calc(var(--u) * 12); height: calc(var(--u) * 36); border-radius: calc(var(--u) * 5); background: linear-gradient(#3a3f52, #111522); rotate: -20deg; }
.mic::before { content: ''; position: absolute; left: 50%; top: calc(var(--u) * -24); width: calc(var(--u) * 28); height: calc(var(--u) * 28); translate: -50% 0; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #9aa3b8, #2b3042); }

/* The run, side-on as South Park draws it: the torso squeezed in width, the head still facing us; both legs on one
   hip, both arms on one shoulder, swinging fore and aft against each other, the far ones darker. */
.running .torso { scale: 0.62 1; }
/* Long strides: the legs stretch from the hip while running, so that the feet are seen going out and back. */
.running .leg.far { translate: 14% 0; scale: 1 1.35; }
.running .leg.near { translate: -14% 0; scale: 1 1.35; }
.running .arm.far { translate: 26% 0; }
.running .arm.near { translate: -26% 0; }
.running .far { filter: brightness(0.62); }
.running .figure { animation: bounce calc(var(--stride) / 2) ease-in-out infinite alternate; }
.running .puppet-head :deep(.head) { animation: bobble var(--stride) ease-in-out infinite alternate; }
.running .leg.near { animation: stride var(--stride) ease-in-out infinite alternate; }
.running .leg.far { animation: stride var(--stride) ease-in-out infinite alternate-reverse; }
.running .arm.near { animation: pump var(--stride) ease-in-out infinite alternate-reverse; }
.running .arm.far { animation: pump var(--stride) ease-in-out infinite alternate; }
@keyframes bounce { from { rotate: 10deg; translate: 0 0; } to { rotate: 14deg; translate: 0 calc(var(--u) * -40); } }
@keyframes bobble { from { rotate: -8deg; } to { rotate: 8deg; } }
@keyframes stride { from { rotate: 58deg; } to { rotate: -58deg; } }
@keyframes pump { from { rotate: 55deg; } to { rotate: -55deg; } }

/* Pouf: it sits, legs straight out in front, arms dangling, slumped, breathing hard. */
.sitting .figure { translate: 0 calc(var(--u) * 50); rotate: -6deg; }
.sitting .torso { animation: pant 0.7s ease-in-out infinite alternate; }
.sitting .leg { rotate: -80deg; }
.sitting .arm.near { rotate: 25deg; }
.sitting .arm.far { rotate: -25deg; }
@keyframes pant { from { scale: 1 1; } to { scale: 1.04 0.95; } }
.pouf { position: absolute; left: calc(var(--u) * 256); top: calc(var(--u) * 450); width: 0; height: 0; }
.pouf i { position: absolute; width: calc(var(--u) * 70); height: calc(var(--u) * 46); margin: calc(var(--u) * -23) 0 0 calc(var(--u) * -35); border-radius: 50%; background: rgb(230 225 214 / 0.85); animation: puff 0.6s ease-out forwards; }
.pouf i:nth-child(1) { --dx: -110; } .pouf i:nth-child(2) { --dx: -40; } .pouf i:nth-child(3) { --dx: 40; } .pouf i:nth-child(4) { --dx: 110; }
@keyframes puff { from { translate: 0 0; scale: 0.3; opacity: 0.9; } to { translate: calc(var(--u) * var(--dx)) calc(var(--u) * -40); scale: 1.4; opacity: 0; } }

/* A bead of sweat or two on its forehead, after a long run. */
.sweat { position: absolute; left: calc(var(--u) * 200); top: calc(var(--u) * 150); width: calc(var(--u) * 120); height: 0; opacity: 0; transition: opacity 0.3s; }
.sweating .sweat { opacity: 1; }
.sweat i { position: absolute; left: calc(var(--u) * (var(--n) * 40)); width: calc(var(--u) * 18); height: calc(var(--u) * 26); border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%; background: radial-gradient(circle at 35% 35%, #fff, #8fd3ff 60%); animation: drop 1.1s ease-in infinite; animation-delay: calc(var(--n) * -0.55s); }
@keyframes drop { from { translate: 0 0; opacity: 1; } to { translate: calc(var(--u) * (var(--n) * 14 - 35)) calc(var(--u) * 110); opacity: 0; } }

.jumping .figure { animation: jump 0.6s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes jump { 40% { translate: 0 calc(var(--u) * -170); scale: 1.15; rotate: -10deg; } }

/* The suitcase of banknotes, out of nowhere, in place of the mic; then the arm winds back and flings it over its head. */
.in-hand { position: absolute; left: 84%; top: 56%; width: calc(var(--u) * 145); translate: -50% -30%; scale: 0; transition: scale 0.25s cubic-bezier(0.3, 1.6, 0.5, 1); }
.holding .in-hand { scale: 1; }
.holding .mic { visibility: hidden; }
.holding .arm.near { animation: none; rotate: 35deg; }
.throwing .arm.near { animation: fling 0.24s ease-in forwards; }
@keyframes fling { from { rotate: 70deg; } to { rotate: -150deg; } }
</style>
