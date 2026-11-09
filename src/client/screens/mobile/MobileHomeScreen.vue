<script setup lang="ts">
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import SoundControl from '#src/client/components/atoms/SoundControl.vue';
import TipLink from '#src/client/components/molecules/TipLink.vue';
import LocalModes from '#src/client/components/organisms/LocalModes.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import OnlineModes from '#src/client/components/organisms/OnlineModes.vue';
import { CHANGELOG_URL, CODE_URL } from '#src/client/const/codeLinks.ts';
import { VERSION } from '#src/client/const/version.ts';
import { shareGame } from '#src/client/services/shareGame.ts';
import { shout } from '#src/client/services/soundEffects.ts';
import { chooseVersion } from '#src/client/services/versionChoice.ts';
import { useHomePage } from '#src/client/stores/useHomePage.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';

/**
 * The home page of the phone version: the same two sides as on a computer, one above the other. A newcomer sees the
 * tutorial first; someone invited to a room sees the online side first.
 */
withDefaults(defineProps<{
  inviteCode: string;
  error: string | null;
  title?: string | null;
  achievements?: string | null;
  newcomer?: boolean;
  resume?: { text: string; action: string } | null;
}>(), { resume: null, title: null, achievements: null, newcomer: false });
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

const { pseudo, plateauId, tagline } = useHomePage();
</script>

<template>
  <MenuBackdrop :plateau-id="plateauId">
    <SoundControl class="sound" />
    <div class="home" :class="{ invited: inviteCode }">
      <h1 class="logo">
        <!-- The easter egg of the computer version: Macron shouts « c'est notre projet ! » when the logo is touched. -->
        <button type="button" class="logo-button" @click="shout"><img :src="assetUrl('logo/casserolade-fr.webp')" alt="Casserolade" /></button>
      </h1>
      <p class="tagline">{{ tagline }}</p>
      <span v-if="title" class="title-badge">« {{ title }} »</span>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="resume" class="resume" role="status">
        <span>{{ resume.text }}</span>
        <AppButton primary @click="emit('resume')">{{ resume.action }}</AppButton>
      </p>
      <AppButton v-if="newcomer" primary class="first-time" @click="emit('tutorial')"><GameIcon name="sparkle" /> Première fois ? Le tutoriel</AppButton>
      <LocalModes class="local" :highlighted="!inviteCode" @solo="(settings) => emit('solo', settings)" @story="emit('story')" />
      <OnlineModes
        v-model:pseudo="pseudo"
        class="online"
        :invite-code="inviteCode"
        :highlighted="Boolean(inviteCode)"
        :share="shareGame"
        @create="emit('create', pseudo)"
        @join="(code) => emit('join', code, pseudo)"
        @public="emit('public', pseudo)"
      />
      <nav class="extras">
        <AppButton v-if="!newcomer" @click="emit('tutorial')"><GameIcon name="sparkle" /> Tutoriel</AppButton>
        <AppButton @click="emit('achievements')"><GameIcon name="star" /> Succès<span v-if="achievements" class="count">{{ achievements }}</span></AppButton>
        <AppButton href="/bestiaire"><GameIcon name="skull" /> Le bestiaire</AppButton>
        <TipLink :caught="0" />
      </nav>
      <nav class="links" aria-label="Le projet">
        <a href="/a-propos">À propos</a>
        <a :href="CODE_URL">Le code</a>
        <a :href="CHANGELOG_URL" title="Ce qui a changé">v{{ VERSION }}</a>
        <a href="/" @click="chooseVersion('ordinateur')">Version ordinateur</a>
      </nav>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.sound { position: fixed; z-index: 5; top: max(0.6rem, env(safe-area-inset-top)); right: 0.6rem; }
.home { display: flex; flex-direction: column; align-items: stretch; gap: 1rem; width: 100%; max-width: 34rem; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
/* Invited to a room: the online side comes first. */
.invited .online { order: -1; }
.logo { margin: 0; line-height: 0; text-align: center; }
.logo-button { padding: 0; border: 0; background: none; line-height: 0; }
.logo img { width: min(82vw, 26rem); height: auto; filter: drop-shadow(0 12px 22px rgb(0 0 0 / 0.65)); }
.tagline { margin-top: -0.5rem; color: var(--color-title); font: 400 1.35rem / 1.05 var(--font-number); letter-spacing: 1px; text-align: center; text-wrap: balance; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
.title-badge { align-self: center; padding: 0.2rem 0.8rem; border-radius: 999px; background: rgb(255 216 74 / 0.15); border: 2px solid var(--color-frame); color: var(--color-title); font-weight: 700; font-style: italic; }
.error { padding: 0.4rem 1rem; border-radius: 14px; background: #7a1420; color: #fff; font-weight: 700; text-align: center; }
.resume { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.7rem; border-radius: 18px; border: 3px solid var(--color-frame); background: rgb(12 16 32 / 0.94); color: #fff; font-weight: 700; text-align: center; }
.first-time { align-self: center; animation: beckon 1.6s ease-in-out infinite; }
.extras { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
.extras :deep(.app-button) { display: flex; align-items: center; justify-content: center; gap: 0.3em; font-size: 1.05rem; text-align: center; }
.extras :deep(.tip-link) { grid-column: 1 / -1; }
.count { margin-left: 0.4em; padding: 0 0.45em; border-radius: 999px; background: var(--color-title); color: var(--color-ink); font-size: 0.85em; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem 1.2rem; }
.links a { color: var(--color-text-muted); font-size: var(--font-size-small); text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
@keyframes beckon { 50% { transform: scale(1.05); box-shadow: 0 0 26px rgb(255 216 74 / 0.7), 0 5px 12px rgb(0 0 0 / 0.5); } }
@media (prefers-reduced-motion: reduce) { .first-time { animation: none; } }
</style>
