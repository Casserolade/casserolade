<script setup lang="ts">
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { ref } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import SoundControl from '#src/client/components/atoms/SoundControl.vue';
import TipLink from '#src/client/components/molecules/TipLink.vue';
import LocalModes from '#src/client/components/organisms/LocalModes.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import OnlineModes from '#src/client/components/organisms/OnlineModes.vue';
import ShareButton from '#src/client/components/molecules/ShareButton.vue';
import { shareGame } from '#src/client/services/shareGame.ts';
import { useHomePage } from '#src/client/stores/useHomePage.ts';
import { shout } from '#src/client/services/soundEffects.ts';
import { chooseVersion } from '#src/client/services/versionChoice.ts';
import { CHANGELOG_URL, CODE_URL } from '#src/client/const/codeLinks.ts';
import { DISCORD_URL } from '#src/protocol/discord.ts';
import { VERSION } from '#src/protocol/version.ts';
import ChasingReporter from '#src/client/components/organisms/ChasingReporter.vue';
import { ANIMATEURS } from '#src/data/animateurs.ts';

withDefaults(defineProps<{
  inviteCode: string;
  error: string | null;
  title?: string | null;
  achievements?: string | null;
  /** Never been through the tutorial: the solo side offers it first. */
  newcomer?: boolean;
  /** A local game the last reload cut short: what to say, and the button that starts it again. */
  resume?: { text: string; action: string } | null;
}>(), {
  resume: null,
  title: null,
  achievements: null,
  newcomer: false,
});
const emit = defineEmits<{
  solo: [settings: { botLevel: BotLevel; contexte: string }];
  create: [pseudo: string];
  join: [code: string, pseudo: string];
  public: [pseudo: string];
  resume: [];
  story: [];
  tutorial: [];
  achievements: [];
}>();

/** The pseudo of the online modes, the TV set behind, the subtitle under the logo, the life on the server. */
const { pseudo, plateauId, tagline, live, discordMembers } = useHomePage();
/** A touch screen that chose this version, a tablet or a phone: the phone version stays one link away. */
const touchScreen = window.matchMedia('(pointer: coarse)').matches;

/** The host of that set runs after the mouse; it pulls a face at each game mode clicked. */
const hostId = ANIMATEURS.find((host) => host.plateau === plateauId)?.id ?? 'bouleau';
const reactions = ref(0);
/** The time of its face before the mode opens: short, but long enough to be seen. */
const REACTION_DELAY_MS = 450;
function react(then: () => void): void {
  reactions.value++;
  window.setTimeout(then, REACTION_DELAY_MS);
}
/** The suitcases of banknotes it has thrown into the Ko-fi link: the link jolts at each one. */
const suitcases = ref(0);

// No greeting on arrival: Macron's shout is only the logo's easter egg (5 November 2026).
</script>

<template>
  <MenuBackdrop :plateau-id="plateauId">
    <SoundControl class="sound" />
    <div class="home">
      <h1 class="logo">
        <!-- An easter egg: Macron shouts « c'est notre projet ! » each time the logo is clicked. -->
        <button type="button" class="logo-button" @click="shout"><img :src="assetUrl('logo/casserolade-fr.webp')" alt="Casserolade" /></button>
      </h1>
      <p class="tagline">{{ tagline }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="resume" class="resume" role="status">
        <span>{{ resume.text }}</span>
        <AppButton primary @click="emit('resume')">{{ resume.action }}</AppButton>
      </p>
      <span v-if="title" class="title-badge">« {{ title }} »</span>
      <div class="sides">
        <OnlineModes
          v-model:pseudo="pseudo"
          :invite-code="inviteCode"
          :live="live"
          :discord-members="discordMembers"
          @create="react(() => emit('create', pseudo))"
          @join="(code) => react(() => emit('join', code, pseudo))"
          @public="react(() => emit('public', pseudo))"
        />
        <LocalModes
          :newcomer="newcomer"
          @solo="(settings) => react(() => emit('solo', settings))"
          @story="react(() => emit('story'))"
          @tutorial="react(() => emit('tutorial'))"
        />
      </div>
      <nav class="extras">
        <AppButton @click="emit('achievements')"><GameIcon name="star" /> Succès<span v-if="achievements" class="count">{{ achievements }}</span></AppButton>
        <AppButton href="/bestiaire" target="_blank"><GameIcon name="skull" /> Le bestiaire</AppButton>
        <ShareButton :share="shareGame" :primary="false" />
        <TipLink :caught="suitcases" />
      </nav>
      <nav class="links" aria-label="Le projet">
        <a :href="DISCORD_URL" target="_blank" rel="noopener">Le Discord</a>
        <a href="/a-propos">À propos</a>
        <a :href="CODE_URL">Le code sur GitHub</a>
        <a class="version" :href="CHANGELOG_URL" title="Ce qui a changé">v{{ VERSION }}</a>
        <a href="/a-propos#contribuer">Contribuer</a>
        <a v-if="touchScreen" href="/m/" @click="chooseVersion('telephone')">Version téléphone</a>
      </nav>
    </div>
    <ChasingReporter :host-id="hostId" :reactions="reactions" @delivered="suitcases++" />
  </MenuBackdrop>
</template>

<style scoped>
.sound { position: fixed; top: 1rem; right: 1rem; z-index: 5; }
.home { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: min(92rem, 96vw); }
/* Over the running reporter: it hides behind the logo at first, and passes behind it. */
.logo { position: relative; z-index: 50; margin: 0; line-height: 0; }
.logo-button { padding: 0; border: 0; background: none; cursor: pointer; line-height: 0; }
.logo-button:active img { transform: scale(0.96) rotate(-2deg); }
.logo img { width: auto; height: min(300px, 27dvh); max-width: 88vw; object-fit: contain; filter: drop-shadow(0 18px 30px rgb(0 0 0 / 0.65)); animation: logo-in 0.7s cubic-bezier(0.3, 1.5, 0.5, 1); }
/* A subtitle drawn at random: a long one wraps on a phone, in two even, centred lines. */
.tagline { margin-top: -0.9rem; color: #ffe27a; font: 400 1.7rem / 1 var(--font-number); letter-spacing: 1px; text-align: center; text-wrap: balance; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; }
.error { padding: 0.4rem 1rem; border-radius: 999px; background: #7a1420; color: #fff; font-weight: 700; }
.resume { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem 1rem; max-width: 52rem; padding: 0.5rem 0.6rem 0.5rem 1.2rem; border-radius: 999px; border: 3px solid #d8b450; background: rgb(12 16 32 / 0.94); color: #fff; font-weight: 700; text-align: center; }
.resume :deep(.app-button) { font-size: 1.2rem; }
.title-badge { margin-top: -0.4rem; padding: 0.25rem 0.9rem; border-radius: 999px; background: rgb(255 216 74 / 0.15); border: 2px solid var(--color-frame); color: var(--color-title); font-weight: 700; font-style: italic; }
/* Two sides, alone or online: next to each other on a wide screen, one above the other below. */
/* Online first and wider: it is where the game lives. */
.sides { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); align-items: start; gap: 1.2rem; width: 100%; }
.extras { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: center; gap: 1rem; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem 1.4rem; }
.links a { color: var(--color-text-muted); font-size: var(--font-size-small); text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.links a:hover, .links a:focus-visible { color: var(--color-text); }
.count { margin-left: 0.5em; padding: 0 0.45em; border-radius: 999px; background: #ffe27a; color: var(--color-ink); font-size: 0.85em; }
@keyframes logo-in { from { transform: scale(0.6) rotate(-4deg); opacity: 0; } }
@media (max-width: 1180px) { .sides { grid-template-columns: minmax(0, 1fr); } }
</style>
