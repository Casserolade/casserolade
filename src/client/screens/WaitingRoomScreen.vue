<script setup lang="ts">
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { computed, ref, useTemplateRef } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import RoomSettings from '#src/client/components/molecules/RoomSettings.vue';
import SeatList from '#src/client/components/molecules/SeatList.vue';
import ChatPanel from '#src/client/components/organisms/ChatPanel.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { buildInviteLink } from '#src/client/tools/buildInviteLink.ts';
import type { MessageChat, OptionsSalon, VueSalon } from '#src/protocol/messages.ts';

const COPIED_MS = 2000;

/** A private room before the game: the link to share, the table, the host's settings. */
const props = withDefaults(defineProps<{ room: VueSalon; messages?: MessageChat[] }>(), { messages: () => [] });
defineEmits<{ launch: []; leave: []; settings: [options: OptionsSalon]; chat: [text: string] }>();

const copied = ref(false);
/** The browser refused to copy (no permission, or a plain http page): the link is selected, to copy by hand. */
const copyRefused = ref(false);
const linkField = useTemplateRef<HTMLInputElement>('linkField');
const isHost = computed(() => props.room.siege === props.room.hote);
const humanCount = computed(() => props.room.joueurs.filter((player) => !player.bot).length);
const inviteLink = computed(() => buildInviteLink(window.location.origin, props.room.code));

function showCopied(): void {
  copied.value = true;
  copyRefused.value = false;
  window.setTimeout(() => (copied.value = false), COPIED_MS);
}

/** The old way, for pages the clipboard API refuses: copy what is selected in the field. */
function copySelection(): boolean {
  const field = linkField.value;
  if (!field) return false;
  field.focus();
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

async function copyLink(): Promise<void> {
  try {
    if (!navigator.clipboard) throw new Error('No clipboard on this page');
    await navigator.clipboard.writeText(inviteLink.value);
    showCopied();
  } catch (error) {
    if (copySelection()) {
      showCopied();
      return;
    }
    console.warn('Could not copy the invite link', error);
    copyRefused.value = true;
  }
}
</script>

<template>
  <MenuBackdrop>
    <img class="logo" :src="assetUrl('logo/casserolade.webp')" alt="Casserolade" />
    <h1 class="title">Salon <span class="code">{{ room.code }}</span></h1>
    <div class="columns">
      <div class="side">
        <section class="panel">
          <h2>Inviter</h2>
          <p class="muted">Envoyez ce lien, ou dictez le code.</p>
          <input ref="linkField" class="link" :value="inviteLink" readonly aria-label="Lien d'invitation" @focus="($event.target as HTMLInputElement).select()" />
          <AppButton @click="copyLink">{{ copied ? 'Lien copié' : 'Copier le lien' }}</AppButton>
          <p v-if="copyRefused" class="refused" role="status">Le navigateur refuse de copier : le lien est sélectionné ci-dessus, copiez-le à la main.</p>
        </section>
        <section class="panel">
          <h2>Réglages</h2>
          <RoomSettings :options="room.options" :is-host="isHost" :human-count="humanCount" @update="(options) => $emit('settings', options)" />
        </section>
      </div>
      <section class="panel table">
        <h2>La table <span class="count">{{ humanCount }} / {{ room.joueurs.length }}</span></h2>
        <SeatList :players="room.joueurs" :host="room.hote" :seat="room.siege" />
      </section>
      <section class="panel chat-column">
        <ChatPanel :messages="messages" :seat="room.siege" @send="(text) => $emit('chat', text)" />
      </section>
    </div>
    <div class="actions">
      <AppButton v-if="isHost" primary @click="$emit('launch')">Lancer la partie</AppButton>
      <p v-else class="muted wait">L'hôte lancera la partie.</p>
      <AppButton @click="$emit('leave')">Quitter le salon</AppButton>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.logo { width: auto; height: min(130px, 14dvh); filter: drop-shadow(0 12px 24px rgb(0 0 0 / 0.6)); }
.title { margin-top: -0.6rem; color: #fff; font: 400 3rem / 1 var(--font-number); letter-spacing: 2px; -webkit-text-stroke: 7px var(--color-ink); paint-order: stroke fill; }
.code { color: #ffe27a; letter-spacing: 0.12em; }
.columns { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) minmax(0, 2.4fr); gap: 1rem; width: min(1560px, 96vw); }
/* The chat takes the height of the table beside it, instead of pushing the buttons off the screen. */
.chat-column { align-items: stretch; }
.chat-column :deep(.chat), .chat-column :deep(.panel) { flex: 1; min-height: 0; }
.chat-column :deep(.lines) { flex: 1; max-height: none; min-height: 7rem; }
.side { display: flex; flex-direction: column; gap: 1rem; }
.panel { display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem; padding: 1rem 1.2rem; border-radius: 22px; border: 3px solid rgb(255 255 255 / 0.14); background: linear-gradient(rgb(22 30 58 / 0.94), rgb(11 15 32 / 0.94)); box-shadow: 0 16px 40px rgb(0 0 0 / 0.55); }
.table :deep(.seats) { width: 100%; }
h2 { color: #fff; font: 400 1.7rem / 1 var(--font-number); letter-spacing: 1px; }
.count { margin-left: 0.4rem; color: #ffe27a; font-size: 0.8em; }
.link { width: 100%; color: #ffe27a; font-size: 0.95rem; }
.actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem; }
.wait { font-size: 1.1rem; }
.refused { color: #ffe27a; font-weight: 700; }
@media (max-width: 1250px) {
  .columns { grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); width: min(1200px, 94vw); }
  .chat-column { grid-column: 1 / -1; }
  .chat-column :deep(.lines) { max-height: 8rem; }
}
@media (max-width: 900px) { .columns { grid-template-columns: minmax(0, 1fr); } }
</style>
