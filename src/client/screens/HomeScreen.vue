<script setup lang="ts">
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { ref, useTemplateRef } from 'vue';
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
import TutorialButton from '#src/client/components/molecules/TutorialButton.vue';
import PseudoField from '#src/client/components/molecules/PseudoField.vue';
import ProfileDialog from '#src/client/components/organisms/ProfileDialog.vue';
import WatchCard from '#src/client/components/molecules/WatchCard.vue';
import { useHomePage } from '#src/client/stores/useHomePage.ts';
import { usePseudoNudge } from '#src/client/stores/usePseudoNudge.ts';
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
  /** Never been through the tutorial: beside the pseudo, its button shines and asks « Première visite ? ». */
  newcomer?: boolean;
  /** The player's rating in the rooms; null before a first game against another human. */
  rating?: number | null;
  /** A local game the last reload cut short: what to say, and the button that starts it again. */
  resume?: { text: string; action: string } | null;
}>(), {
  resume: null,
  title: null,
  achievements: null,
  newcomer: false,
  rating: null,
});
const emit = defineEmits<{
  solo: [settings: { botLevel: BotLevel; contexte: string }];
  /** `open`: a public room, under a name. `create`: a private one. `join`: a room by its code. `queue`: the ranked queue. */
  open: [name: string, pseudo: string];
  create: [pseudo: string];
  join: [code: string, pseudo: string];
  queue: [pseudo: string];
  resume: [];
  story: [];
  tutorial: [];
  achievements: [];
}>();

/** The pseudo of the online modes, the TV set behind, the subtitle under the logo, the life on the server. */
const { pseudo, plateauId, tagline, live, rooms, discordMembers, twitchLive } = useHomePage();
/** Online without a pseudo: the first gesture is held back once, and the field is pointed at. */
const pseudoField = useTemplateRef<{ focus: () => void }>('pseudoField');
/** The profile's window: the rank, and what saves the profile to a file or puts one back. */
const profile = useTemplateRef<{ open: () => void }>('profile');
const { asking, withPseudo, resume: resumeGesture } = usePseudoNudge(pseudo, () => pseudoField.value?.focus());
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
  <MenuBackdrop :plateau-id="plateauId" fitted>
    <div class="home">
      <header class="top">
        <!-- Who plays: the pseudo, once for everything online, and the way to learn the game. -->
        <div class="me">
          <PseudoField ref="pseudoField" v-model="pseudo" class="pseudo" :asking="asking" @confirm="resumeGesture">
            <button type="button" class="link" @click="profile?.open()">Sauvegarder mon profil</button>
          </PseudoField>
          <p class="learn">
            <RankBadge v-if="rating !== null" :mmr="rating" detailed />
            <span v-if="title" class="title-badge">« {{ title }} »</span>
            <span v-if="newcomer">Première visite ?</span>
            <TutorialButton :newcomer="newcomer" @open="react(() => emit('tutorial'))" />
          </p>
        </div>
        <div class="brand">
          <h1 class="logo">
            <!-- An easter egg: Macron shouts « c'est notre projet ! » each time the logo is clicked. -->
            <button type="button" class="logo-button" @click="shout"><img :src="assetUrl('logo/casserolade-fr.webp')" alt="Casserolade" /></button>
          </h1>
          <p class="tagline">{{ tagline }}</p>
        </div>
        <div class="tools">
          <SoundControl />
          <nav class="shortcuts" aria-label="Le jeu">
            <AppButton @click="emit('achievements')"><GameIcon name="star" /> Succès<span v-if="achievements" class="count">{{ achievements }}</span></AppButton>
            <AppButton href="/bestiaire" target="_blank"><GameIcon name="skull" /> Le bestiaire</AppButton>
          </nav>
        </div>
      </header>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="resume" class="callout" role="status">
        <span>{{ resume.text }}</span>
        <AppButton primary @click="emit('resume')">{{ resume.action }}</AppButton>
      </p>
      <div class="sides">
        <OnlineModes
          class="online"
          :pseudo="pseudo"
          :invite-code="inviteCode"
          :live="live"
          :rooms="rooms"
          @open="(name) => withPseudo(() => react(() => emit('open', name, pseudo)))"
          @create="withPseudo(() => react(() => emit('create', pseudo)))"
          @join="(code) => withPseudo(() => react(() => emit('join', code, pseudo)))"
          @queue="withPseudo(() => react(() => emit('queue', pseudo)))"
        />
        <DiscordCall class="discord" :members="discordMembers" />
        <LocalModes class="solo" @solo="(settings) => react(() => emit('solo', settings))" @story="react(() => emit('story'))" />
        <WatchCard class="watch" :twitch-live="twitchLive" />
      </div>
      <footer class="foot">
        <nav class="links" aria-label="Le projet">
          <TipLink :caught="suitcases" />
          <button type="button" class="link" @click="profile?.open()">Sauvegarder mon profil</button>
          <a :href="DISCORD_URL" target="_blank" rel="noopener">Le Discord</a>
          <a href="/a-propos">À propos</a>
          <a :href="CODE_URL">Le code sur GitHub</a>
          <a class="version" :href="CHANGELOG_URL" title="Ce qui a changé">Mises à jour · v{{ VERSION }}</a>
          <a href="/a-propos#contribuer">Contribuer</a>
          <a v-if="touchScreen" href="/m/" @click="chooseVersion('telephone')">Version téléphone</a>
        </nav>
      </footer>
    </div>
    <ChasingReporter :host-id="hostId" :reactions="reactions" @delivered="suitcases++" />
    <ProfileDialog ref="profile" :rating="rating" />
  </MenuBackdrop>
</template>

<style scoped>
/*
 * The whole page holds in the screen, above the fold, down to a small laptop's (1280 × 683): every size follows the
 * screen (rem and dvh), nothing is framed twice, and one button only is filled: the one the page points at.
 */
.home { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.7rem; width: min(96rem, 94vw); }
.home :deep(.app-button) { padding: 0.42em 1em; border-width: 2px; font-size: 1.15rem; box-shadow: 0 3px 8px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.12); }
/* A button that is not the one pointed at: the game's gold on its words and its edge, on a dark ground. */
.home :deep(.side .app-button:not(.primary)), .top :deep(.app-button:not(.primary)) { background: linear-gradient(#232c66, #171d44); color: var(--color-title); text-shadow: none; }
/* Three zones on one row: who plays on the left, the game in the middle, its tools on the right. */
.top { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: start; gap: 0.5rem 1.5rem; width: 100%; }
.me { display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; min-width: 0; }
.pseudo { width: min(21rem, 100%); }
.title-badge { color: var(--color-title); font-size: 0.86rem; font-weight: 700; font-style: italic; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.learn { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.7rem; margin: 0; color: var(--color-text); font-size: 0.95rem; font-weight: 700; text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
/* Over the running reporter: it hides behind the logo at first, and passes behind it. */
.brand { display: flex; flex-direction: column; align-items: center; }
.logo { position: relative; z-index: 50; margin: 0; line-height: 0; }
.logo-button { padding: 0; border: 0; background: none; cursor: pointer; line-height: 0; }
.logo-button:active img { transform: scale(0.96) rotate(-2deg); }
/* The logo takes the height the page can spare: small on a small laptop, large where there is room. */
.logo img { width: auto; height: clamp(8rem, 100dvh - 37.8rem, 13rem); max-width: 60vw; object-fit: contain; filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.65)); animation: logo-in 0.7s cubic-bezier(0.3, 1.5, 0.5, 1); }
/* A subtitle drawn at random: a long one wraps, in two even, centred lines. */
/* Clear of the logo's lowest drawings: the subtitle is a line of its own, not a caption stuck to them. */
.tagline { margin-top: 0.45rem; color: var(--color-title); font: 400 1.3rem / 1 var(--font-number); letter-spacing: 1px; text-align: center; text-wrap: balance; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; }
.tools { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; min-width: 0; }
.shortcuts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.5rem; }
.count { margin-left: 0.5em; padding: 0 0.45em; border-radius: 999px; background: var(--color-title); color: var(--color-ink); font-size: 0.85em; }
.error { margin: 0; padding: 0.3rem 1rem; border-radius: 999px; background: #7a1420; color: #fff; font-weight: 700; }
.callout { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.4rem 0.9rem; max-width: 52rem; margin: 0; padding: 0.25rem 0.35rem 0.25rem 1rem; border-radius: 999px; border: 2px solid var(--color-frame); background: rgb(12 16 32 / 0.94); color: #fff; font-size: 0.95rem; font-weight: 700; text-align: center; }
/*
 * Two columns: online, wider, it is where the game lives; alone at the table beside it. Both end at the same height.
 * Under them, a slim row: the Discord and something to watch.
 */
.sides { flex: 1 1 auto; display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; grid-template-areas: 'online solo' 'discord watch'; gap: 0.7rem; width: 100%; max-height: 33.5rem; }
.online { grid-area: online; }
.solo { grid-area: solo; }
.discord { grid-area: discord; }
.watch { grid-area: watch; }
/* The trailer playing takes the height of its picture: the Discord beside it keeps its own. */
.sides:has(.watch iframe) .discord { align-self: start; }
.foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.4rem 1.6rem; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3rem 1.4rem; }
.links a, .link { color: var(--color-text-muted); font-size: var(--font-size-small); text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.links a:hover, .links a:focus-visible, .link:hover, .link:focus-visible { color: var(--color-text); }
/* A button that leads to a screen of the game, among the links: it looks like them. */
.link { padding: 0; border: 0; background: none; font-family: inherit; text-decoration: underline; cursor: pointer; }
@keyframes logo-in { from { transform: scale(0.6) rotate(-4deg); opacity: 0; } }
/* A narrower screen: the game first, then who plays and the tools side by side; one side under the other. */
@media (max-width: 1100px) {
  .top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .brand { grid-column: 1 / -1; grid-row: 1; }
  .sides { grid-template-columns: minmax(0, 1fr); grid-template-rows: none; grid-template-areas: 'online' 'discord' 'solo' 'watch'; max-height: none; }
}
</style>
