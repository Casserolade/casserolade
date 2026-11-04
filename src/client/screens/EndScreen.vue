<script setup lang="ts">
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HeadPortrait from '#src/client/components/atoms/HeadPortrait.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import type { MmrChange } from '#src/client/stores/createGameStore.ts';
import { ordinalSuffix } from '#src/client/tools/ordinalSuffix.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { Classement } from '#src/protocol/messages.ts';

const props = withDefaults(defineProps<{
  ranking: Classement;
  seat: number;
  canReplay?: boolean;
  replayHint?: string | null;
  /** A table of the public queue: no « Rejouer », back to the queue instead. */
  publicGame?: boolean;
  mmr?: MmrChange | null;
}>(), {
  canReplay: true,
  replayHint: null,
  publicGame: false,
  mmr: null,
});
defineEmits<{ again: []; queue: []; leave: [] }>();

const ownPlace = computed(() => props.ranking.find((r) => r.seat === props.seat)?.place);
const sorted = computed(() => [...props.ranking].sort((a, b) => a.place - b.place));
const mmrDelta = computed(() => (props.mmr ? props.mmr.apres - props.mmr.avant : 0));
</script>

<template>
  <MenuBackdrop>
    <div class="end">
      <img class="logo" :src="assetUrl('logo/casserolade.webp')" alt="Casserolade" />
      <h1 class="title" :class="{ won: ownPlace === 1 }">
        <template v-if="ownPlace === 1">Élu !</template>
        <template v-else>Vous finissez {{ ownPlace }}<sup>{{ ordinalSuffix(ownPlace ?? 0) }}</sup></template>
      </h1>
      <p v-if="mmr" class="mmr" :class="{ up: mmrDelta > 0, down: mmrDelta < 0 }">
        MMR {{ mmr.avant }} → <strong>{{ mmr.apres }}</strong>
        <span class="delta">{{ mmrDelta > 0 ? '+' : '' }}{{ mmrDelta }}</span>
      </p>
      <slot />
      <ol class="ranking">
        <li v-for="row in sorted" :key="row.seat" class="row" :class="{ own: row.seat === seat, first: row.place === 1 }">
          <span class="place">{{ row.place }}</span>
          <HeadPortrait class="face" :puppet="puppetStyle(gameArt.manifest.value, row.heroId, 'civile')" />
          <span class="who"><strong>{{ HERO_BY_ID[row.heroId]?.name }}</strong><span>{{ row.pseudo }}<template v-if="row.seat === seat && row.pseudo !== 'Vous'"> (vous)</template></span></span>
        </li>
      </ol>
      <p v-if="replayHint" class="hint">{{ replayHint }}</p>
      <div class="actions">
        <AppButton v-if="publicGame" primary @click="$emit('queue')">Retourner dans la file</AppButton>
        <AppButton v-else-if="canReplay" primary @click="$emit('again')">Rejouer</AppButton>
        <AppButton @click="$emit('leave')">Accueil</AppButton>
      </div>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.end { display: flex; flex-direction: column; align-items: center; gap: 0.9rem; width: 100%; }
.logo { width: auto; height: min(140px, 12dvh); filter: drop-shadow(0 12px 24px rgb(0 0 0 / 0.6)); }
.title { margin-top: -0.6rem; color: #fff; font: 400 3.4rem / 1 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 8px var(--color-ink); paint-order: stroke fill; rotate: -2deg; }
.title sup { font-size: 0.55em; }
.won { color: #ffd84a; }
.mmr { display: flex; align-items: baseline; gap: 0.6rem; padding: 0.3rem 1.2rem; border-radius: 999px; background: rgb(12 16 32 / 0.92); border: 3px solid rgb(255 255 255 / 0.16); color: #c9cfdc; font-weight: 700; }
.mmr strong { color: #fff; font: 400 1.9rem / 1 var(--font-number); letter-spacing: 1px; }
.delta { font: 400 1.6rem / 1 var(--font-number); color: #c9cfdc; }
.up .delta { color: #7dff9e; }
.down .delta { color: #ff8a8a; }
/* Two columns: the whole table at a glance, without scrolling. */
.ranking { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: column; grid-template-rows: repeat(4, auto); gap: 0.5rem 1rem; width: min(980px, 94vw); }
.row { display: flex; align-items: center; gap: 0.8rem; min-width: 0; padding: 0.25rem 1rem 0.25rem 0.45rem; border-radius: 999px; border: 3px solid rgb(255 255 255 / 0.12); background: rgb(12 16 32 / 0.9); }
.own { border-color: var(--color-accent); box-shadow: 0 0 20px rgb(255 197 61 / 0.35); }
.place { flex: none; width: 2.4rem; text-align: center; color: #ffe27a; font: 400 2rem / 1 var(--font-number); }
.first { border-color: #ffd84a; }
.face { --portrait-size: 2.7rem; flex: none; border: 3px solid #9aa3b4; }
.who { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
.who strong { overflow: hidden; color: #fff; font-size: 1.15rem; white-space: nowrap; text-overflow: ellipsis; }
.who span { overflow: hidden; color: #b8bfcf; white-space: nowrap; text-overflow: ellipsis; }
.hint { color: #c9cfdc; }
.actions { display: flex; gap: 1rem; }
@media (max-width: 700px) { .ranking { grid-template-columns: minmax(0, 1fr); grid-auto-flow: row; grid-template-rows: none; } }
</style>
