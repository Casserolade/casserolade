<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import InvitePanel from '#src/client/components/molecules/InvitePanel.vue';
import RoomPseudoForm from '#src/client/components/molecules/RoomPseudoForm.vue';
import RoomSettings from '#src/client/components/molecules/RoomSettings.vue';
import RoomVisibility from '#src/client/components/molecules/RoomVisibility.vue';
import SeatList from '#src/client/components/molecules/SeatList.vue';
import WaitingList from '#src/client/components/molecules/WaitingList.vue';
import ChatPanel from '#src/client/components/organisms/ChatPanel.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { useArrivalNotice } from '#src/client/stores/useArrivalNotice.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { buildInviteLink } from '#src/client/tools/buildInviteLink.ts';
import { defaultRoomName } from '#src/client/tools/defaultRoomName.ts';
import { hasDefaultPseudo } from '#src/client/tools/hasDefaultPseudo.ts';
import { roomHumans } from '#src/client/tools/roomHumans.ts';
import { withPublicName } from '#src/client/tools/withPublicName.ts';
import { DISCORD_URL } from '#src/protocol/discord.ts';
import type { MessageChat, OptionsSalon, VueSalon } from '#src/protocol/messages.ts';

/**
 * A room that waits: its table, with what launches the game, the chat, the link to share, the host's settings. On
 * each other player's seat, the host finds what mutes its chat or puts it out.
 * Private, among friends, or public: listed on the home page under its name, for anyone to walk in. While its game
 * is on, whoever came in since waits here too, talks with the table, and plays the next one.
 */
const props = withDefaults(defineProps<{ room: VueSalon; messages?: MessageChat[] }>(), { messages: () => [] });
defineEmits<{ launch: []; leave: []; settings: [options: OptionsSalon]; chat: [text: string]; rename: [pseudo: string]; mute: [pseudo: string, muted: boolean]; kick: [pseudo: string] }>();

const isHost = computed(() => props.room.estHote);
/** The host cut this player's chat. */
const chatMuted = computed(() => props.room.muets?.includes(props.room.moi) ?? false);
/** Walked in without a pseudo: the table asks for one, as long as the player is not seated in a game. */
const pseudoToChoose = computed(() => hasDefaultPseudo(props.room.moi) && (!playing.value || props.room.siege < 0));
const playing = computed(() => props.room.etat === 'en_jeu');
const publicName = computed(() => props.room.options.nomPublic);
const humanCount = computed(() => roomHumans(props.room));
const inviteLink = computed(() => buildInviteLink(window.location.origin, props.room.code));

// Someone walks in while the host looks elsewhere: a sound, and the tab's title says so.
useArrivalNotice(humanCount);
</script>

<template>
  <MenuBackdrop fitted>
    <img class="logo" :src="assetUrl('logo/casserolade.webp')" alt="Casserolade" />
    <header class="heading">
      <h1 class="title">
        <template v-if="publicName">{{ publicName }}</template>
        <template v-else>Salon <span class="code">{{ room.code }}</span></template>
      </h1>
      <p class="kind">{{ publicName ? 'Salon public : affiché sur l\'accueil, tout le monde peut entrer' : 'Salon privé : on y entre par son lien' }}</p>
    </header>
    <div class="columns room-columns">
      <div class="side">
        <section class="panel">
          <h2>Inviter</h2>
          <RoomVisibility v-if="isHost && !playing" :public-name="publicName" :suggested-name="defaultRoomName(room.moi)" @update="(name) => $emit('settings', withPublicName(room.options, name))" />
          <p class="muted">Envoyez ce lien. On entre aussi avec le code <strong class="spoken">{{ room.code }}</strong>, à taper sur l'accueil.</p>
          <InvitePanel :link="inviteLink" />
          <p v-if="publicName" class="muted small">Personne ? <a :href="DISCORD_URL" target="_blank" rel="noopener">Annoncez votre salon sur le Discord.</a></p>
        </section>
        <section v-if="!playing" class="panel">
          <h2>Réglages</h2>
          <RoomSettings :options="room.options" :is-host="isHost" :human-count="humanCount" @update="(options) => $emit('settings', options)" />
        </section>
      </div>
      <section class="panel table">
        <h2>{{ playing ? 'La table qui joue' : 'La table' }} <span v-if="!playing" class="count">{{ humanCount }} / {{ room.joueurs.length }}</span></h2>
        <RoomPseudoForm v-if="pseudoToChoose" @rename="(pseudo) => $emit('rename', pseudo)" />
        <SeatList :players="room.joueurs" :host="room.hote" :seat="room.siege" :muted="room.muets" :moderated="isHost" @mute="(pseudo, muted) => $emit('mute', pseudo, muted)" @kick="(pseudo) => $emit('kick', pseudo)" />
        <WaitingList v-if="room.enAttente" :pseudos="room.enAttente" :me="room.moi" :muted="room.muets" :moderated="isHost" @mute="(pseudo, muted) => $emit('mute', pseudo, muted)" @kick="(pseudo) => $emit('kick', pseudo)" />
        <p v-if="!playing" class="rated" role="status">{{ humanCount >= 2 ? 'Partie classée : entre joueurs, elle compte pour votre rang.' : 'À deux joueurs ou plus, la partie compte pour votre rang.' }}</p>
        <!-- What launches the game sits with the table: in view on any screen, whatever the settings' height. -->
        <footer class="actions">
          <p v-if="playing" class="wait" role="status">La partie est en cours : vous jouerez la suivante.</p>
          <template v-else-if="isHost">
            <AppButton primary @click="$emit('launch')">Lancer la partie</AppButton>
            <p class="wait">Quand vous voulez : les bots prennent les places vides.</p>
          </template>
          <p v-else class="wait" role="status">L'hôte lancera la partie.</p>
          <AppButton class="leave" @click="$emit('leave')">Quitter le salon</AppButton>
        </footer>
      </section>
      <section class="panel chat-column">
        <ChatPanel :messages="messages" :me="room.moi" :muted="chatMuted" @send="(text) => $emit('chat', text)" />
      </section>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
/*
 * The whole room holds in the screen, above the fold: its sizes follow the screen, and its buttons are those of a
 * menu, a size under the game's.
 */
.logo { width: auto; height: min(110px, 10dvh); margin-bottom: -0.9rem; filter: drop-shadow(0 8px 16px rgb(0 0 0 / 0.6)); }
.heading { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; margin-bottom: -0.7rem; }
.title { color: #fff; font: 400 2.2rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; overflow-wrap: anywhere; }
.room-columns :deep(.app-button) { padding: 0.36em 0.95em; border-width: 2px; font-size: 1.05rem; box-shadow: 0 3px 8px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.2); }
.room-columns :deep(.app-button.primary) { font-size: 1.3rem; }
.room-columns :deep(p), .room-columns :deep(label), .room-columns :deep(legend) { font-size: 0.92rem; }
.room-columns :deep(.small) { font-size: 0.82rem; }
/* A public room is known by its name, a private one by its code. */
.title:not(:has(.code)) { color: var(--color-title); }
.code { color: var(--color-title); letter-spacing: 0.12em; }
.kind { margin: 0; color: var(--color-text); font-size: 0.95rem; font-weight: 700; text-align: center; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.columns { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) minmax(0, 2.4fr); gap: 0.7rem; width: min(82rem, 96vw); }
/*
 * The chat takes the height of the table beside it, instead of pushing the buttons off the screen: its lines count
 * for nothing in that height (a basis of zero), fill what the column leaves them, and scroll.
 */
.chat-column { align-items: stretch; }
.chat-column :deep(.chat), .chat-column :deep(.panel) { flex: 1; min-height: 0; }
.chat-column :deep(.lines) { flex: 1 1 0; max-height: none; min-height: 7rem; font-size: 0.95rem; }
.chat-column :deep(.field) { font-size: 0.95rem; }
.side { display: flex; flex-direction: column; gap: 0.7rem; }
/* A container: a field and its button lay themselves out by the panel's width. */
.panel { container-type: inline-size; display: flex; flex-direction: column; align-items: flex-start; gap: 0.45rem; min-width: 0; padding: 0.7rem 0.9rem 0.9rem; border-radius: 16px; border: 2px solid rgb(255 255 255 / 0.14); background: var(--panel-background); box-shadow: var(--panel-shadow); }
.table :deep(.seats) { width: 100%; }
/* Right under the seats, in view whatever the height of the columns: what launches on the left, the way out on the right. */
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.9rem; width: 100%; margin-top: 0.3rem; padding-top: 0.7rem; border-top: 1px solid rgb(255 255 255 / 0.14); }
.wait { flex: 1 1 11rem; margin: 0; color: var(--color-text); line-height: 1.3; }
.rated { margin: 0; color: var(--color-text-muted); }
.leave { margin-left: auto; }
h2 { color: #fff; font: 400 1.35rem / 1 var(--font-number); letter-spacing: 1px; }
.count { margin-left: 0.4rem; color: var(--color-title); font-size: 0.8em; }
.spoken { color: var(--color-title); letter-spacing: 0.12em; }
.panel a { color: var(--color-title); }
@media (max-width: 1100px) {
  .columns { grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); width: min(1200px, 94vw); }
  .chat-column { grid-column: 1 / -1; }
  /* Alone on its row, the chat has no neighbour to follow: its lines take their own height, up to a few. */
  .chat-column :deep(.lines) { flex-basis: auto; max-height: 8rem; }
}
/* On a phone, one under the other: the table and what launches it first, then the chat, then the settings. */
@media (max-width: 900px) {
  .columns { grid-template-columns: minmax(0, 1fr); }
  .table { order: -2; }
  .chat-column { order: -1; }
}
</style>
