<script setup lang="ts">
import { useTemplateRef } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import { HERO_BY_ID } from '#src/data/heroes.ts';
import type { Scene } from '#src/data/histoire/cinematique.ts';
import { CARRIERES, cinematiquesParEtape } from '#src/histoire/carrieres.ts';

/**
 * The cinematheque of the careers, opened by the cinema cheat (its button sits with the career screens' own buttons):
 * every cutscene of every career, step by step, to watch again. Watching one changes nothing in the campaign: it is not
 * counted as seen.
 */
const emit = defineEmits<{ play: [scene: Scene] }>();

const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const careers = [...CARRIERES]
  .sort((a, b) => a.difficulte - b.difficulte)
  .map((career) => ({ heroId: career.heros, name: HERO_BY_ID[career.heros]?.name ?? career.heros, steps: cinematiquesParEtape(career.heros) }));

function open(): void {
  dialog.value?.showModal();
}

defineExpose({ open });

function play(scene: Scene): void {
  dialog.value?.close();
  emit('play', scene);
}

/** A click on the dark around the list closes it. */
function closeOutside(event: MouseEvent): void {
  if (event.target === dialog.value) dialog.value?.close();
}
</script>

<template>
  <dialog ref="dialog" class="shelf" aria-labelledby="cinema-title" @click="closeOutside">
    <h2 id="cinema-title">Cinémathèque</h2>
    <section v-for="career in careers" :key="career.heroId" class="career" :aria-label="career.name">
      <h3>{{ career.name }}</h3>
      <ol>
        <li v-for="step in career.steps" :key="step.scene.id">
          <button type="button" class="step" @click="play(step.scene)">
            <span class="mark" aria-hidden="true">▶</span>
            <span>{{ step.etape }}</span>
          </button>
        </li>
      </ol>
    </section>
    <form method="dialog" class="actions"><AppButton type="submit">Fermer</AppButton></form>
  </dialog>
</template>

<style scoped>
.shelf {
  width: min(44rem, 94vw);
  max-height: 88dvh;
  padding: 1.2rem 1.5rem;
  border: 3px solid #d8b450;
  border-radius: 22px;
  background: linear-gradient(rgb(22 30 58 / 0.98), rgb(11 15 32 / 0.98));
  color: #fff;
  box-shadow: 0 18px 44px rgb(0 0 0 / 0.6);
}
.shelf::backdrop { background: rgb(3 5 12 / 0.72); }
h2 { margin: 0 0 0.6rem; text-align: center; }
h3 { margin: 0.8rem 0 0.3rem; color: #ffe27a; font: 400 1.4rem / 1.1 var(--font-number); letter-spacing: 1px; }
ol { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; margin: 0; padding: 0; }
.step {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  width: 100%;
  padding: 0.35rem 0.7rem;
  border: 0;
  border-radius: 10px;
  background: rgb(255 255 255 / 0.06);
  color: inherit;
  font: 600 1.05rem / 1.25 var(--font-card, inherit);
  text-align: left;
  cursor: pointer;
}
.step:hover, .step:focus-visible { background: rgb(255 226 122 / 0.18); }
.mark { color: #ffe27a; font-size: 0.85rem; }
.actions { display: flex; justify-content: center; margin-top: 1rem; }
</style>
