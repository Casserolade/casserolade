<script setup lang="ts">
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
/** A head in an arched niche: the host at the top of the table, the heroes at both ends. */
defineProps<{ puppet: Record<string, string>; name: string; frameImage: string; /** Shown in the niche when nobody stands in it. */ channel?: string; /** The name stays for screen readers only. */ hideName?: boolean }>();
</script>

<template>
  <figure class="arch" :style="{ ...puppet, '--arch-frame': frameImage }">
    <span class="window">
      <span v-if="puppet['--atlas-image']" class="head">
        <span class="head-piece" />
        <span class="jaw" />
      </span>
      <span v-else-if="hideName" class="on-air silhouette" aria-hidden="true"><GameIcon name="mic" /></span>
      <span v-else class="on-air">{{ channel ?? name }}</span>
    </span>
    <span class="frame" :class="{ 'has-frame': frameImage !== 'none' }" aria-hidden="true" />
    <figcaption class="name" :class="{ 'sr-only': hideName }">{{ name }}</figcaption>
    <slot />
  </figure>
</template>

<style scoped>
.arch {
  --u: calc(var(--arch-width, 120px) / 300);
  position: relative;
  flex: none;
  width: var(--arch-width, 120px);
  height: calc(var(--arch-width, 120px) * 1.14);
  margin: 0;
}
.window, .frame { position: absolute; inset: 0; border-radius: 50% 50% 8% 8% / 42% 42% 6% 6%; }
.window { inset: 8.8% 10% 5.5% 10%; overflow: hidden; background: radial-gradient(circle at 50% 35%, #33415f, #101626); }
.has-frame { border: none !important; border-radius: 0 !important; box-shadow: none !important; background: var(--arch-frame) center / 100% 100% no-repeat; }
.frame { border: calc(var(--u) * 12) solid var(--color-metal); box-shadow: inset 0 0 0 calc(var(--u) * 3) var(--color-metal-dark), 0 calc(var(--u) * 10) calc(var(--u) * 26) rgb(0 0 0 / 0.65); }
.head { position: absolute; left: calc(var(--u) * (120 - var(--head-width) / 2)); top: calc(var(--u) * 14); width: calc(var(--u) * var(--head-width)); height: calc(var(--u) * var(--head-height)); }
.head-piece, .jaw { position: absolute; display: block; background-image: var(--atlas-image); background-repeat: no-repeat; background-size: calc(var(--u) * var(--atlas-width)) calc(var(--u) * var(--atlas-height)); }
.head-piece { inset: 0; background-position: calc(var(--u) * var(--head-atlas-x) * -1) calc(var(--u) * var(--head-atlas-y) * -1); }
.jaw { left: calc(var(--u) * var(--jaw-left)); top: calc(var(--u) * var(--jaw-top)); width: calc(var(--u) * var(--jaw-width)); height: calc(var(--u) * var(--jaw-height)); background-position: calc(var(--u) * var(--jaw-atlas-x) * -1) calc(var(--u) * var(--jaw-atlas-y) * -1); }
.on-air { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: calc(var(--u) * 16); background: repeating-linear-gradient(transparent 0 3px, rgb(255 255 255 / 0.06) 3px 6px), radial-gradient(circle at 50% 40%, #3b5a9a, #0e1730); background-size: 100% 12px, auto; color: #fff; font: 400 calc(var(--u) * 54) / 1.05 var(--font-number); letter-spacing: 1px; text-align: center; animation: scan 0.8s steps(4, end) infinite; }

.silhouette { font-size: calc(var(--u) * 130); color: rgb(255 255 255 / 0.85); }
@keyframes scan { to { background-position: 0 12px, 0 0; } }
.name {
  position: absolute;
  left: 50%;
  bottom: calc(var(--u) * -8);
  translate: -50% 0;
  padding: 0 var(--space-2);
  white-space: nowrap;
  border: 1px solid var(--color-metal);
  border-radius: 4px;
  background: var(--color-ink);
  color: var(--color-paper);
  font: 800 var(--font-size-normal) / 1.4 var(--font-card-title);
}
</style>
