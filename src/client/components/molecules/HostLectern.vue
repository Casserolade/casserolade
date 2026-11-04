<script setup lang="ts">
import PaperPuppet from '#src/client/components/atoms/PaperPuppet.vue';

/**
 * The host during the combat: standing behind its debate lectern on the side of the table, waving its paper
 * hands at what happens. While it talks, the jaw moves and the hands go faster. Drawn in card units (--u).
 */
defineProps<{ puppet: Record<string, string>; name: string; talking: boolean; micImage: string | null }>();
</script>

<template>
  <figure class="lectern-host" :class="{ talking }" aria-hidden="true">
    <span class="puppet-box"><PaperPuppet :puppet="puppet" :name="name" /></span>
    <span class="arm left"><span class="hand" /></span>
    <span class="arm right"><span class="hand" /></span>
    <span class="desk"><span class="stripe" /></span>
    <img v-if="micImage" class="mic" :src="micImage" alt="" />
  </figure>
</template>

<style scoped>
.lectern-host {
  /* The suit and the hands of the paper bodies (assets/game/corps/societe_civile.webp). */
  --sleeve: #6d6a60;
  --skin: #ebc7a6;
  --u: calc(var(--lectern-width, 260px) / 512);
  position: relative;
  width: var(--lectern-width, 260px);
  height: calc(var(--u) * 620);
  margin: 0;
}
.lectern-host > * { position: absolute; display: block; }
.puppet-box { left: 0; top: 0; width: calc(var(--u) * 512); height: calc(var(--u) * 460); }
/* The forearms come out from behind the lectern, the hands above it: paper with a white cut edge. */
.arm {
  bottom: calc(var(--u) * 250);
  width: calc(var(--u) * 46);
  height: calc(var(--u) * 150);
  border: calc(var(--u) * 5) solid #fff;
  border-radius: calc(var(--u) * 18);
  background: var(--sleeve);
  transform-origin: 50% 100%;
}
.left { left: calc(var(--u) * 150); rotate: -30deg; animation: wave-left 1.3s steps(6, end) infinite; }
.right { left: calc(var(--u) * 316); rotate: 30deg; animation: wave-right 1.3s steps(6, end) infinite; animation-delay: -0.55s; }
.hand {
  left: 50%;
  top: calc(var(--u) * -46);
  width: calc(var(--u) * 66);
  height: calc(var(--u) * 62);
  translate: -50% 0;
  border: calc(var(--u) * 5) solid #fff;
  border-radius: 50% 50% 46% 46%;
  background: var(--skin);
}
.hand::before { content: ''; position: absolute; left: calc(var(--u) * -14); top: calc(var(--u) * 20); width: calc(var(--u) * 26); height: calc(var(--u) * 20); border: inherit; border-radius: 50%; background: inherit; }
.right .hand::before { left: auto; right: calc(var(--u) * -14); }
/* Talking: the jaw opens and closes, the hands go faster and wider. */
.talking :deep(.jaw) { animation: jaw-talk 0.18s steps(2, end) infinite alternate; }
.talking .left { animation-name: wave-left-wide; animation-duration: 0.7s; }
.talking .right { animation-name: wave-right-wide; animation-duration: 0.7s; }
/* The debate lectern: a gold rim, the dark face, a stripe in the colour of the set. */
.desk {
  left: calc(var(--u) * 40);
  right: calc(var(--u) * 40);
  top: calc(var(--u) * 370);
  height: calc(var(--u) * 250);
  clip-path: polygon(0 0, 100% 0, 90% 100%, 10% 100%);
  background: linear-gradient(#e2c56a, #8a6418);
}
.desk::after { content: ''; position: absolute; inset: calc(var(--u) * 8) calc(var(--u) * 8) 0; clip-path: inherit; background: linear-gradient(#2a3a6a, #172248 70%, #101836); }
.stripe { position: absolute; z-index: 1; left: 12%; right: 12%; top: calc(var(--u) * 50); height: calc(var(--u) * 16); border-radius: calc(var(--u) * 8); background: var(--accent, #ffd23a); box-shadow: 0 0 calc(var(--u) * 18) var(--accent, #ffd23a); }
/* The microphone stands on the corner of the lectern, not in front of the face. */
.mic { left: 68%; top: calc(var(--u) * 318); width: calc(var(--u) * 74); rotate: -12deg; }
@keyframes wave-left { 0%, 100% { rotate: -34deg; } 50% { rotate: 8deg; } }
@keyframes wave-right { 0%, 100% { rotate: 34deg; } 50% { rotate: -8deg; } }
@keyframes wave-left-wide { 0%, 100% { rotate: -52deg; } 50% { rotate: 18deg; } }
@keyframes wave-right-wide { 0%, 100% { rotate: 52deg; } 50% { rotate: -18deg; } }
@keyframes jaw-talk { from { translate: 0 0; } to { translate: 0 calc(var(--u) * 18); } }
@media (prefers-reduced-motion: reduce) { .arm, .talking :deep(.jaw) { animation: none; } }
</style>
