<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import CardGlossary from '#src/client/components/molecules/CardGlossary.vue';
import MobileSheet from '#src/client/components/molecules/MobileSheet.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import { WORN_LABELS } from '#src/client/const/wornLabels.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import type { SheetAction } from '#src/client/tools/sheetAction.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { SheetCasserole } from '#src/client/tools/wornCasseroles.ts';

/**
 * The phone's card, opened by a touch: the card, big enough to read, what its words mean, and what can be done with
 * it. A politician lists its casseroles; each opens its own card, with what it does now. A touch outside closes it.
 */
const props = withDefaults(defineProps<{ card: ShownCard; actions?: SheetAction[]; casseroles?: SheetCasserole[] }>(), { actions: () => [], casseroles: () => [] });
const emit = defineEmits<{ choose: [id: SheetAction['id'], source: Element | null]; close: [] }>();

/** One of its casseroles, opened in place of the politician. */
const focused = ref<number | null>(null);
const current = computed<ShownCard>(() => {
  const pan = focused.value === null ? null : props.casseroles[focused.value];
  return pan ? { kind: 'casserole', casserole: pan.casserole, worn: pan.worn } : props.card;
});

function iconOf(pan: SheetCasserole): string | null {
  const icon = gameArt.manifest.value.carte[`casserole_${pan.casserole.kind}`];
  return icon ? assetUrl(icon) : null;
}
</script>

<template>
  <MobileSheet label="La carte" @close="emit('close')">
    <div class="scroll">
      <ShownCardFace :key="JSON.stringify(current)" class="face" :card="current" />
      <button v-if="focused !== null" type="button" class="back" @click="focused = null"><GameIcon name="chevrons" /> Retour au politique</button>
      <section v-else-if="casseroles.length" class="pans" aria-label="Ses casseroles">
        <h3>Ses casseroles</h3>
        <button v-for="(pan, index) in casseroles" :key="pan.key" type="button" class="pan" :class="pan.worn.state" @click="focused = index">
          <img v-if="iconOf(pan)" :src="iconOf(pan) ?? ''" alt="" />
          <span class="name">{{ pan.casserole.name }}</span>
          <span class="state">{{ WORN_LABELS[pan.worn.state] }}</span>
          <span v-if="pan.worn.owned" class="bonus">Bonus</span>
        </button>
      </section>
      <CardGlossary class="glossary" :card="current" />
    </div>
    <footer v-if="actions.length && focused === null" class="actions">
      <div v-for="action in actions" :key="action.id" class="action">
        <AppButton :primary="action.primary" :disabled="Boolean(action.reason)" @click="emit('choose', action.id, $event.currentTarget as Element)">
          {{ action.label }}
          <span v-if="action.cost !== undefined" class="price"><GameIcon name="coin" />{{ action.cost }}</span>
          <span v-if="action.gain" class="price">+{{ action.gain }}<GameIcon name="coin" /></span>
        </AppButton>
        <small v-if="action.reason" class="reason">{{ action.reason }}</small>
      </div>
    </footer>
  </MobileSheet>
</template>

<style scoped>
.scroll { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; padding: 1rem 1rem 0.6rem; overflow-y: auto; overscroll-behavior: contain; }
.face { width: min(60vw, 15rem); flex: none; filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.65)); }
.back { display: flex; align-items: center; gap: 0.4em; padding: 0.4rem 0.9rem; border: 2px solid rgb(255 255 255 / 0.2); border-radius: 999px; background: rgb(255 255 255 / 0.06); color: #fff; font-weight: 700; }
.back .game-icon { rotate: 180deg; }
.pans { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; }
h3 { margin: 0; color: var(--color-title); font: 400 1.2rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 3px var(--color-ink); paint-order: stroke fill; }
.pan { display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.45rem 0.7rem; border: 2px solid rgb(255 255 255 / 0.14); border-radius: 14px; background: rgb(255 255 255 / 0.05); color: #fff; font-weight: 700; text-align: left; }
.pan img { width: 1.6rem; height: 1.6rem; object-fit: contain; flex: none; }
.pan .name { flex: 1; }
.state { padding: 0.1rem 0.5rem; border-radius: 999px; background: rgb(255 255 255 / 0.12); font-size: 0.8rem; white-space: nowrap; }
.scandal .state { background: #8c1a1a; }
.forgotten .state { background: #6a5012; color: #ffe9a0; }
.bonus { padding: 0.1rem 0.5rem; border-radius: 999px; background: #2f7a3e; font-size: 0.8rem; }
.glossary { width: 100%; }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem 1rem; padding: 0.7rem 1rem calc(0.8rem + env(safe-area-inset-bottom)); border-top: 2px solid rgb(255 255 255 / 0.1); }
.action { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
.actions :deep(.app-button) { display: flex; align-items: center; gap: 0.5em; font-size: 1.3rem; }
.price { display: inline-flex; align-items: center; gap: 0.15em; padding: 0 0.45em; border-radius: 999px; background: rgb(0 0 0 / 0.25); }
.reason { color: var(--color-text-muted); font-weight: 700; }
</style>
