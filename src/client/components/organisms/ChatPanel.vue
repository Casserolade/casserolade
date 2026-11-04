<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { CHAT_LONGUEUR } from '#src/protocol/messages.ts';
import type { MessageChat } from '#src/protocol/messages.ts';

/** In game, a new line shows by the closed chat this long, then goes away by itself. */
const PEEK_MS = 5000;

/**
 * The chat between players. `docked`: always open, in the waiting room's layout. `floating`: in game,
 * a button in the corner of the table that the player opens and closes; nothing ever opens by itself,
 * and a new line only peeks out for a few seconds. Lines are plain text, never interpreted.
 */
const props = withDefaults(defineProps<{ messages: MessageChat[]; seat: number; floating?: boolean }>(), { floating: false });
const emit = defineEmits<{ send: [text: string] }>();

const draft = ref('');
const open = ref(!props.floating);
const seenId = ref(props.messages.at(-1)?.id ?? 0);
const peek = ref<MessageChat | null>(null);
const list = useTemplateRef<HTMLElement>('list');
const field = useTemplateRef<HTMLInputElement>('field');
let peekTimer = 0;

const unread = computed(() => (open.value ? 0 : props.messages.filter((line) => line.id > seenId.value && line.siege !== props.seat).length));

function scrollDown(): void {
  void nextTick(() => {
    if (list.value) list.value.scrollTop = list.value.scrollHeight;
  });
}

watch(() => props.messages.at(-1)?.id, (last) => {
  if (last === undefined) return;
  if (open.value) {
    seenId.value = last;
    scrollDown();
    return;
  }
  const line = props.messages.at(-1);
  if (!line || line.siege === props.seat) return;
  peek.value = line;
  window.clearTimeout(peekTimer);
  peekTimer = window.setTimeout(() => (peek.value = null), PEEK_MS);
});

function toggle(): void {
  open.value = !open.value;
  if (!open.value) return;
  peek.value = null;
  seenId.value = props.messages.at(-1)?.id ?? seenId.value;
  scrollDown();
  void nextTick(() => field.value?.focus());
}

function send(): void {
  const text = draft.value.trim();
  if (!text) return;
  emit('send', text);
  draft.value = '';
}

/** The game's own keys stay out of the field; Escape leaves it, and closes the floating chat. */
function onKey(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.key !== 'Escape') return;
  field.value?.blur();
  if (props.floating) open.value = false;
}

onUnmounted(() => window.clearTimeout(peekTimer));
scrollDown();
</script>

<template>
  <div class="chat" :class="{ floating, open }">
    <button v-if="floating" type="button" class="toggle" :aria-expanded="open" :aria-label="open ? 'Fermer le chat' : `Ouvrir le chat${unread ? `, ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : ''}`" @click="toggle">
      <GameIcon name="speech" />
      <span v-if="unread" class="badge">{{ unread > 9 ? '9+' : unread }}</span>
    </button>
    <p v-if="floating && !open && peek" class="peek" aria-hidden="true"><strong>{{ peek.pseudo }}</strong> {{ peek.texte }}</p>
    <section v-if="open" class="panel" aria-label="Chat">
      <h2 v-if="!floating">Chat</h2>
      <ol ref="list" class="lines" role="log" aria-live="polite">
        <li v-if="messages.length === 0" class="empty">Personne n'a encore rien dit.</li>
        <li v-for="line in messages" :key="line.id" :class="{ mine: line.siege === seat }">
          <strong class="who">{{ line.pseudo }}</strong> <span class="text">{{ line.texte }}</span>
        </li>
      </ol>
      <form class="write" @submit.prevent="send">
        <input
          ref="field"
          v-model="draft"
          class="field"
          type="text"
          :maxlength="CHAT_LONGUEUR"
          placeholder="Écrire à la table…"
          aria-label="Message pour la table"
          autocomplete="off"
          @keydown="onKey"
        />
        <button type="submit" class="send" :disabled="!draft.trim()">Envoyer</button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.chat { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
.panel { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; }
h2 { color: #fff; font: 400 1.7rem / 1 var(--font-number); letter-spacing: 1px; }
.lines { display: flex; flex-direction: column; gap: 0.3rem; max-height: 14rem; overflow-y: auto; margin: 0; padding: 0.5rem 0.7rem; list-style: none; border-radius: 12px; background: rgb(0 0 0 / 0.35); color: #e8ebf3; font-size: 1rem; line-height: 1.3; overflow-wrap: anywhere; }
.who { color: #8fc4ff; }
.mine .who { color: #ffe27a; }
.empty { color: #9aa3b8; font-style: italic; }
.write { display: flex; gap: 0.5rem; }
.field { flex: 1; min-width: 0; padding: 0.45rem 0.7rem; border-radius: 10px; border: 2px solid rgb(255 255 255 / 0.2); background: rgb(8 12 26 / 0.9); color: #fff; font-size: 1rem; }
.send { padding: 0.45rem 0.9rem; border-radius: 10px; border: 3px solid var(--color-ink); background: #ffe27a; color: var(--color-ink); font-weight: 800; cursor: pointer; }
.send:disabled { opacity: 0.5; cursor: default; }

/* In game: table coordinates (--s), top left corner, over the decor. */
.floating { position: absolute; left: calc(var(--s) * 26); top: calc(var(--s) * 22); width: auto; gap: calc(var(--s) * 10); pointer-events: none; }
.floating > * { pointer-events: auto; }
.toggle {
  position: relative;
  width: calc(var(--s) * 64);
  height: calc(var(--s) * 64);
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: calc(var(--s) * 4) solid #c9a227;
  background: radial-gradient(circle at 35% 30%, #2c3c78, #121a3a);
  color: #fff;
  font-size: calc(var(--s) * 34);
  box-shadow: 0 calc(var(--s) * 4) 0 rgb(0 0 0 / 0.4);
  cursor: pointer;
}
.badge {
  position: absolute;
  right: calc(var(--s) * -8);
  top: calc(var(--s) * -8);
  min-width: calc(var(--s) * 30);
  padding: 0 calc(var(--s) * 6);
  border-radius: 999px;
  border: calc(var(--s) * 3) solid var(--color-ink);
  background: #e0503a;
  color: #fff;
  font: 400 calc(var(--s) * 20) / calc(var(--s) * 26) var(--font-number);
}
.peek {
  position: absolute;
  left: calc(var(--s) * 78);
  top: calc(var(--s) * 8);
  width: max-content;
  max-width: calc(var(--s) * 420);
  padding: calc(var(--s) * 8) calc(var(--s) * 14);
  border-radius: calc(var(--s) * 14);
  background: rgb(12 16 32 / 0.92);
  color: #e8ebf3;
  font-size: calc(var(--s) * 20);
  line-height: 1.3;
  overflow-wrap: anywhere;
  pointer-events: none;
  animation: peek 0.25s ease-out;
}
.peek strong { color: #8fc4ff; }
.floating .panel {
  width: calc(var(--s) * 460);
  padding: calc(var(--s) * 12);
  border-radius: calc(var(--s) * 18);
  border: calc(var(--s) * 3) solid rgb(255 255 255 / 0.16);
  background: rgb(12 16 32 / 0.94);
  box-shadow: 0 calc(var(--s) * 12) calc(var(--s) * 30) rgb(0 0 0 / 0.5);
}
.floating .lines { max-height: calc(var(--s) * 360); font-size: calc(var(--s) * 20); }
.floating .field, .floating .send { font-size: calc(var(--s) * 20); }
@keyframes peek { from { opacity: 0; translate: calc(var(--s) * -10) 0; } }
</style>
