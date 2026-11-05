<script setup lang="ts">
import PaperPuppet from '#src/client/components/atoms/PaperPuppet.vue';

/**
 * The picture of a casserole card: its real photo, cut out with scissors, when it has one; otherwise its
 * owner's puppet. The pan swings over it. Drawn in card units, by its parent's --u.
 */
defineProps<{
  /** The cut-out photo, as a CSS image; 'none' when the casserole has none. */
  illustration: string;
  panImage: string;
  ownerPuppet: Record<string, string> | null;
  ownerName: string;
}>();
</script>

<template>
  <span v-if="illustration !== 'none'" class="illustration" :style="{ '--illustration': illustration }" aria-hidden="true" />
  <PaperPuppet v-else-if="ownerPuppet" class="owner" :puppet="ownerPuppet" :name="ownerName" />
  <span class="pan" :class="{ corner: illustration !== 'none' }" :style="{ '--pan-image': panImage }" />
</template>

<style scoped>
.owner { inset: 0; top: calc(var(--u) * 30); }
.illustration {
  position: absolute;
  inset: calc(var(--u) * 36) calc(var(--u) * 6) 0;
  /* A little larger than the frame: the faces count, the edges of the shoulders do not. */
  background: var(--illustration) center bottom / auto 86% no-repeat;
  filter: drop-shadow(0 calc(var(--u) * 6) calc(var(--u) * 8) rgb(0 0 0 / 0.45));
}
.pan {
  position: absolute;
  left: calc(var(--u) * 92);
  top: calc(var(--u) * -40);
  width: calc(var(--u) * 270);
  height: calc(var(--u) * 270);
  rotate: 196deg;
  animation: pan-wobble 1.6s ease-in-out infinite;
  background: var(--pan-image) center / contain no-repeat;
  filter: drop-shadow(0 calc(var(--u) * 10) calc(var(--u) * 10) rgb(0 0 0 / 0.5));
}
/* Over a photo, the pan hangs in the corner: it must not hide the faces. */
.pan.corner { left: auto; right: calc(var(--u) * -36); top: calc(var(--u) * -56); width: calc(var(--u) * 170); height: calc(var(--u) * 170); }
@keyframes pan-wobble { 50% { rotate: 186deg; translate: 0 calc(var(--u) * 6); } }
@media (prefers-reduced-motion: reduce) { .pan { animation: none; } }
</style>
