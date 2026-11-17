<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import SoundControl from '#src/client/components/organisms/SoundControl.vue';
import DiscordCall from '#src/client/components/molecules/DiscordCall.vue';
import TipLink from '#src/client/components/molecules/TipLink.vue';
import LocalModes from '#src/client/components/organisms/LocalModes.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import OnlineModes from '#src/client/components/organisms/OnlineModes.vue';
import RankBadge from '#src/client/components/atoms/RankBadge.vue';
import PseudoField from '#src/client/components/molecules/PseudoField.vue';
import ProfileDialog from '#src/client/components/organisms/ProfileDialog.vue';
import TutorialButton from '#src/client/components/molecules/TutorialButton.vue';
import WatchCard from '#src/client/components/molecules/WatchCard.vue';
import { CHANGELOG_URL, CODE_URL } from '#src/client/const/codeLinks.ts';
import { DISCORD_URL } from '#src/protocol/discord.ts';
import { VERSION } from '#src/protocol/version.ts';
import { shout } from '#src/client/services/soundEffects.ts';
import { chooseVersion } from '#src/client/services/versionChoice.ts';
import { useHomePage } from '#src/client/stores/useHomePage.ts';
import { usePseudoNudge } from '#src/client/stores/usePseudoNudge.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';

/**
 * The home page of the phone version: the same two sides as on a computer, one above the other, online first with
 * the Discord under it, then something to watch. A newcomer is offered the tutorial first, at the top; it stays first of the extras, under the
 * ways to play.
 */
withDefaults(defineProps<{
  inviteCode: string;
  error: string | null;
  title?: string | null;
  achievements?: string | null;
  newcomer?: boolean;
  /** The player's rating in the rooms; null before a first game against another human. */
  rating?: number | null;
  resume?: { text: string; action: string } | null;
}>(), { resume: null, title: null, achievements: null, newcomer: false, rating: null });
const emit = defineEmits<{
  solo: [settings: { botLevel: BotLevel; contexte: string }];
  open: [name: string, pseudo: string];
  create: [pseudo: string];
  join: [code: string, pseudo: string];
  queue: [pseudo: string];
  resume: [];
  story: [];
  tutorial: [];
  achievements: [];
}>();

const { pseudo, plateauId, tagline, live, rooms, discordMembers, twitchLive } = useHomePage();
/** Online without a pseudo: the first gesture is held back once, and the field is pointed at. */
const pseudoField = useTemplateRef<{ focus: () => void }>('pseudoField');
/** The profile's window: the rank, and what saves the profile to a file or puts one back. */
const profile = useTemplateRef<{ open: () => void }>('profile');
const { asking, withPseudo, resume: resumeGesture } = usePseudoNudge(pseudo, () => pseudoField.value?.focus());
</script>

<template>
  <MenuBackdrop :plateau-id="plateauId">
    <SoundControl class="sound" />
    <div class="home">
      <h1 class="logo">
        <!-- The easter egg of the computer version: Macron shouts « c'est notre projet ! » when the logo is touched. -->
        <button type="button" class="logo-button" @click="shout"><img :src="assetUrl('logo/casserolade-fr.webp')" alt="Casserolade" /></button>
      </h1>
      <p class="tagline">{{ tagline }}</p>
      <span v-if="title" class="title-badge">« {{ title }} »</span>
      <RankBadge v-if="rating !== null" class="rank" :mmr="rating" detailed />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="resume" class="callout" role="status">
        <span>{{ resume.text }}</span>
        <AppButton primary @click="emit('resume')">{{ resume.action }}</AppButton>
      </p>
      <p v-else-if="newcomer" class="callout">
        <span>Première visite ? Quelques minutes pour apprendre à jouer.</span>
        <TutorialButton newcomer @open="emit('tutorial')" />
      </p>
      <PseudoField ref="pseudoField" v-model="pseudo" class="pseudo" :asking="asking" @confirm="resumeGesture">
            <button type="button" class="link" @click="profile?.open()">Sauvegarder mon profil</button>
          </PseudoField>
      <OnlineModes
        :pseudo="pseudo"
        :invite-code="inviteCode"
        :live="live"
        :rooms="rooms"
        @open="(name) => withPseudo(() => emit('open', name, pseudo))"
        @create="withPseudo(() => emit('create', pseudo))"
        @join="(code) => withPseudo(() => emit('join', code, pseudo))"
        @queue="withPseudo(() => emit('queue', pseudo))"
      />
      <DiscordCall :members="discordMembers" />
      <LocalModes @solo="(settings) => emit('solo', settings)" @story="emit('story')" />
      <WatchCard :twitch-live="twitchLive" />
      <nav class="extras">
        <TutorialButton class="tutorial" @open="emit('tutorial')" />
        <AppButton @click="emit('achievements')"><GameIcon name="star" /> Succès<span v-if="achievements" class="count">{{ achievements }}</span></AppButton>
        <AppButton href="/bestiaire"><GameIcon name="skull" /> Le bestiaire</AppButton>
      </nav>
      <nav class="links" aria-label="Le projet">
        <TipLink :caught="0" />
        <button type="button" class="link" @click="profile?.open()">Sauvegarder mon profil</button>
        <a :href="DISCORD_URL" target="_blank" rel="noopener">Le Discord</a>
        <a href="/a-propos">À propos</a>
        <a :href="CODE_URL">Le code</a>
        <a :href="CHANGELOG_URL" :title="`Version ${VERSION} : ce qui a changé`">Mises à jour</a>
        <a href="/" @click="chooseVersion('ordinateur')">Version ordinateur</a>
      </nav>
    </div>
    <ProfileDialog ref="profile" :rating="rating" />
  </MenuBackdrop>
</template>

<style scoped>
.sound { position: fixed; z-index: 5; top: max(0.6rem, env(safe-area-inset-top)); right: 0.6rem; }
.home { display: flex; flex-direction: column; align-items: stretch; gap: 1rem; width: 100%; max-width: 34rem; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
.logo { margin: 0; line-height: 0; text-align: center; }
.logo-button { padding: 0; border: 0; background: none; line-height: 0; }
.logo img { width: min(82vw, 26rem); height: auto; filter: drop-shadow(0 12px 22px rgb(0 0 0 / 0.65)); }
.tagline { margin-top: -0.5rem; color: var(--color-title); font: 400 1.35rem / 1.05 var(--font-number); letter-spacing: 1px; text-align: center; text-wrap: balance; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
.title-badge { align-self: center; padding: 0.2rem 0.8rem; border-radius: 999px; background: rgb(255 216 74 / 0.15); border: 2px solid var(--color-frame); color: var(--color-title); font-weight: 700; font-style: italic; }
.error { padding: 0.4rem 1rem; border-radius: 14px; background: #7a1420; color: #fff; font-weight: 700; text-align: center; }
.callout { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.7rem; border-radius: 18px; border: 3px solid var(--color-frame); background: rgb(12 16 32 / 0.94); color: #fff; font-weight: 700; text-align: center; }
.rank { align-self: center; font-size: 0.9rem; }
/* The pseudo, once for everything online, above the online side. */
.pseudo { padding: 0 0.3rem; }
/* Under the thumb: the buttons of the ways to play keep a size one can press, in the game's gold on a dark ground. */
.home :deep(.side .app-button) { padding: 0.5em 1em; border-width: 2px; font-size: 1.2rem; }
.home :deep(.side .app-button:not(.primary)) { background: linear-gradient(#232c66, #171d44); color: var(--color-title); text-shadow: none; }
.extras { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
.extras :deep(.app-button) { display: flex; align-items: center; justify-content: center; gap: 0.3em; font-size: 1.05rem; text-align: center; }
/* The tutorial and the Ko-fi take the whole width, the achievements and the bestiary share a row between them. */
.extras .tutorial { grid-column: 1 / -1; }
.count { margin-left: 0.4em; padding: 0 0.45em; border-radius: 999px; background: var(--color-title); color: var(--color-ink); font-size: 0.85em; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem 1.2rem; }
.links a, .link { color: var(--color-text-muted); font-size: var(--font-size-small); text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
/* A button that leads to a screen of the game, among the links: it looks like them. */
.link { padding: 0; border: 0; background: none; font-family: inherit; text-decoration: underline; cursor: pointer; }
</style>
