<script setup lang="ts">
/** A button, or a link that looks like one when it has an `href` (`target: '_blank'` opens a new tab). */
withDefaults(defineProps<{ primary?: boolean; pressed?: boolean; disabled?: boolean; type?: 'button' | 'submit'; href?: string; target?: string }>(), {
  type: 'button',
  primary: false,
  pressed: undefined,
  disabled: false,
});
</script>

<template>
  <a v-if="href" :href="href" :target="target" :rel="target === '_blank' ? 'noopener' : undefined" class="app-button" :class="{ primary }">
    <slot />
  </a>
  <button v-else :type="type" class="app-button" :class="{ primary }" :aria-pressed="pressed" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  padding: 0.45em 1.1em;
  border: 3px solid #d8b450;
  border-radius: 999px;
  background: linear-gradient(#2e3f74, #141c3c);
  color: #fff;
  font: 400 1.35rem / 1.1 var(--font-number);
  letter-spacing: 1px;
  text-shadow: 0 2px 0 rgb(0 0 0 / 0.6);
  box-shadow: 0 5px 12px rgb(0 0 0 / 0.5), inset 0 2px 0 rgb(255 255 255 / 0.2);
  cursor: pointer;
  transition: transform 0.1s, filter 0.1s;
}
a.app-button { display: inline-block; text-decoration: none; }
.app-button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.15); }
.app-button:active:not(:disabled) { transform: scale(0.97); }
.app-button:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
.app-button:disabled { opacity: 0.5; cursor: not-allowed; }
.app-button[aria-pressed='true'] { background: linear-gradient(#ffe27a, #e8a612); color: var(--color-ink); text-shadow: none; }
.primary { background: linear-gradient(#ffe27a, #e8a612); border-color: #7a5208; color: var(--color-ink); text-shadow: none; font-size: 1.6rem; }
</style>
