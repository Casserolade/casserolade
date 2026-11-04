<script setup lang="ts">
/** A cut-out head alone, for lists and speech. It takes its size from --portrait-size. */
defineProps<{ puppet: Record<string, string> }>();
</script>

<template>
  <span v-if="puppet['--atlas-image']" class="portrait" :style="puppet" aria-hidden="true">
    <span class="head">
      <span class="head-piece" />
      <span class="jaw" />
    </span>
  </span>
</template>

<style scoped>
.portrait {
  --u: calc(var(--portrait-size, 40px) / 280);
  position: relative;
  display: inline-block;
  flex: none;
  width: var(--portrait-size, 40px);
  height: var(--portrait-size, 40px);
  overflow: hidden;
  border-radius: 50%;
  background: var(--color-surface-raised);
}
.head {
  position: absolute;
  left: calc(var(--u) * (140 - var(--head-width) / 2));
  top: calc(var(--u) * 8);
  width: calc(var(--u) * var(--head-width));
  height: calc(var(--u) * var(--head-height));
}
.head-piece, .jaw {
  position: absolute;
  display: block;
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
}
</style>
