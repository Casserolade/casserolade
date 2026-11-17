<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { SITE_URL } from '#src/client/const/victoryCard.ts';
import { downloadFile } from '#src/client/services/downloadFile.ts';
import { canSharePicture, canvasBlob, copyImage, sharePicture } from '#src/client/services/shareImage.ts';
import { renderVictoryCard } from '#src/client/services/victoryCardImage.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { postIntentUrl } from '#src/client/tools/postIntentUrl.ts';
import { victoryCardModel } from '#src/client/tools/victoryCardModel.ts';
import { victoryPostText } from '#src/client/tools/victoryPostText.ts';
import type { PlayerView } from '#src/engine/game.ts';

const FILE_NAME = 'casserolade-elu.png';

/**
 * A winner's board, to show off: the victory card, drawn as a picture, and what shares it. Copied, it is pasted in a
 * Discord channel or a post; on a phone, the device's own sharing sheet takes it. `pseudo`: the winner's name online.
 */
const props = defineProps<{ view: PlayerView; pseudo: string | null }>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const card = computed(() => victoryCardModel(props.view, gameArt.manifest.value, props.pseudo));
/** The picture as a file, once drawn: nothing can be shared before. */
const picture = shallowRef<Blob | null>(null);
const notice = ref<string | null>(null);
const postText = computed(() => victoryPostText(card.value));
const postUrl = computed(() => postIntentUrl(postText.value, SITE_URL));
const hasSharingSheet = computed(() => picture.value !== null && canSharePicture(picture.value, FILE_NAME));
const boardNames = computed(() => card.value.board.map((m) => `${m.name} ${m.atk}/${m.hp}`).join(', '));

async function draw(): Promise<void> {
  if (!canvas.value) return;
  await renderVictoryCard(canvas.value, card.value);
  picture.value = await canvasBlob(canvas.value);
}
onMounted(draw);
watch(card, draw);

async function copy(pasteWhere: string): Promise<void> {
  if (!picture.value) return;
  notice.value = (await copyImage(picture.value)) ? `Image copiée : collez-la ${pasteWhere}.` : 'Le navigateur refuse de copier l\'image : téléchargez-la.';
}

function download(): void {
  if (!picture.value) return;
  downloadFile(picture.value, FILE_NAME);
  notice.value = 'Image téléchargée.';
}

async function share(): Promise<void> {
  if (picture.value) await sharePicture(picture.value, FILE_NAME, postText.value, SITE_URL);
}
</script>

<template>
  <section class="victory-share" aria-label="Partager votre plateau">
    <canvas ref="canvas" class="card" role="img" :aria-label="`Votre carte de victoire. ${card.byline}. ${card.facts}. Plateau : ${boardNames}.`" />
    <div class="ways">
      <AppButton :disabled="!picture" @click="copy('sur Discord, avec Ctrl+V')"><GameIcon name="discord" :outline="false" /> Copier pour Discord</AppButton>
      <!-- A plain link: the post opens in a new tab, and the picture, copied on the way, is pasted in it. -->
      <AppButton :href="postUrl" target="_blank" @click="copy('dans votre post')">Poster sur X</AppButton>
      <AppButton v-if="hasSharingSheet" @click="share">Partager</AppButton>
      <AppButton :disabled="!picture" @click="download">Télécharger</AppButton>
    </div>
    <p class="notice" role="status">{{ notice }}</p>
  </section>
</template>

<style scoped>
.victory-share { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; min-width: 0; }
/* The card at the width its place gives it, in its own proportions. */
.card { display: block; width: 100%; height: auto; aspect-ratio: 1200 / 630; border-radius: 12px; border: 2px solid var(--color-frame); background: #0b0e18; box-shadow: var(--panel-shadow); }
.ways { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
.notice { min-height: 1.3em; margin: 0; color: var(--color-title); font-size: 0.92rem; font-weight: 700; text-align: center; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
</style>
