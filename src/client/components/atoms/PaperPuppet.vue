<script setup lang="ts">
/** A puppet standing in a card: tiny paper body, big cut-out head. Drawn in card units, by its parent's --u. */
withDefaults(defineProps<{
  puppet: Record<string, string>;
  name: string;
  /** Drawn eyes over the real ones. */
  eyesUrl?: string | null;
  starsUrl?: string | null;
}>(), { eyesUrl: null, starsUrl: null });
</script>

<template>
  <span class="puppet" :style="puppet" aria-hidden="true">
    <span class="body" />
    <span v-if="puppet['--atlas-image']" class="head">
      <span class="head-piece" />
      <span class="jaw" />
      <template v-if="eyesUrl">
        <img class="eye left-eye" :src="eyesUrl" alt="" />
        <img class="eye right-eye" :src="eyesUrl" alt="" />
      </template>
      <template v-if="starsUrl">
        <img v-for="index in 3" :key="index" class="star" :style="{ '--star-index': index }" :src="starsUrl" alt="" />
      </template>
    </span>
    <span v-else class="placard">{{ name }}</span>
  </span>
</template>

<style scoped>
.puppet {
  position: absolute;
  inset: 0;
  transform-origin: calc(var(--u) * 256) calc(var(--u) * 434);
  will-change: transform;
  animation: puppet-idle 1s linear infinite;
  animation-delay: var(--idle-delay, 0s);
}
.puppet > *, .head > * { position: absolute; display: block; }
.body {
  left: calc(var(--u) * var(--body-left));
  top: calc(var(--u) * var(--body-top));
  width: calc(var(--u) * var(--body-width));
  height: calc(var(--u) * var(--body-height));
  background: var(--body-image) center / 100% 100% no-repeat;
}
.head {
  left: calc(var(--u) * var(--head-left));
  top: calc(var(--u) * var(--head-top));
  width: calc(var(--u) * var(--head-width));
  height: calc(var(--u) * var(--head-height));
}
.head-piece, .jaw {
  background-image: var(--atlas-image);
  background-repeat: no-repeat;
  background-size: calc(var(--u) * var(--atlas-width)) calc(var(--u) * var(--atlas-height));
}
.head-piece {
  inset: 0;
  background-position: calc(var(--u) * var(--head-atlas-x) * -1) calc(var(--u) * var(--head-atlas-y) * -1);
}
.jaw {
  left: calc(var(--u) * var(--jaw-left));
  top: calc(var(--u) * var(--jaw-top));
  width: calc(var(--u) * var(--jaw-width));
  height: calc(var(--u) * var(--jaw-height));
  background-position: calc(var(--u) * var(--jaw-atlas-x) * -1) calc(var(--u) * var(--jaw-atlas-y) * -1);
  transform-origin: calc(var(--u) * var(--jaw-pivot-x)) calc(var(--u) * var(--jaw-pivot-y));
}
/* Without a photo: a cardboard sign where the head would be. */
.placard {
  left: calc(var(--u) * 116);
  top: calc(var(--u) * 150);
  width: calc(var(--u) * 280);
  padding: calc(var(--u) * 24) calc(var(--u) * 12);
  background: var(--color-paper);
  color: var(--color-ink);
  border: calc(var(--u) * 6) solid var(--color-ink);
  font: 800 calc(var(--u) * 40) / 1.05 var(--font-card-title);
  text-align: center;
  transform: rotate(-4deg);
}

.eye { width: calc(var(--u) * 64); height: calc(var(--u) * 64); translate: -50% -50%; }
.left-eye { left: calc(var(--u) * var(--eye-left-x)); top: calc(var(--u) * var(--eye-left-y)); }
.right-eye { left: calc(var(--u) * var(--eye-right-x)); top: calc(var(--u) * var(--eye-right-y)); }
.star {
  left: 50%;
  top: 8%;
  width: calc(var(--u) * 46);
  height: calc(var(--u) * 46);
  animation: star-spin 0.75s linear infinite;
  animation-delay: calc(var(--star-index) * -0.25s);
}

/* Twelve drawings per second: the choppiness is the style. */
@keyframes puppet-idle {
  0%, 100% { transform: translateY(0) rotate(-1.4deg) scale(1, 1); animation-timing-function: steps(6, end); }
  50% { transform: translateY(calc(var(--u) * -5)) rotate(1.4deg) scale(0.98, 1.03); animation-timing-function: steps(6, end); }
}
@keyframes star-spin {
  from { transform: rotate(0deg) translateX(calc(var(--u) * 110)) scaleY(0.6); }
  to { transform: rotate(360deg) translateX(calc(var(--u) * 110)) scaleY(0.6); }
}
@media (prefers-reduced-motion: reduce) { .puppet, .star { animation: none !important; } }
</style>
