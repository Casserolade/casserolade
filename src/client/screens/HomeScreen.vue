<script setup lang="ts">
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { ref, watch } from 'vue';
import type { BotLevel } from '#src/bots/bots.ts';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import SoundControl from '#src/client/components/atoms/SoundControl.vue';
import RoomForm from '#src/client/components/molecules/RoomForm.vue';
import SoloForm from '#src/client/components/molecules/SoloForm.vue';
import TipLink from '#src/client/components/molecules/TipLink.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { savePseudo, savedPseudo } from '#src/client/services/localProfile.ts';
import { shout } from '#src/client/services/soundEffects.ts';
import { pickOne } from '#src/client/tools/pickOne.ts';
import { TAGLINES } from '#src/client/const/taglines.ts';
import { VERSION } from '#src/client/const/version.ts';
import ChasingReporter from '#src/client/components/organisms/ChasingReporter.vue';
import { ANIMATEURS } from '#src/data/animateurs.ts';
import { PLATEAUX, SECOND_TOUR } from '#src/data/plateaux.ts';

const MAX_PSEUDO_LENGTH = 24;

withDefaults(defineProps<{
  inviteCode: string;
  error: string | null;
  title?: string | null;
  achievements?: string | null;
  /** Never been through the tutorial: it is offered first. */
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

/** One pseudo for every online mode, kept for the next visit. */
const pseudo = ref(savedPseudo());
watch(pseudo, (value) => savePseudo(value));

/** Behind the home page, one of the game's TV sets at random, a new one at each visit. */
const plateauId = pickOne([...PLATEAUX, SECOND_TOUR].map((plateau) => plateau.id), Math.random()) ?? SECOND_TOUR.id;

/** Under the logo, one of the game's subtitles, a new one at each visit. */
const tagline = pickOne(TAGLINES, Math.random()) ?? TAGLINES[0];

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
      <div class="profile">
        <label class="pseudo">Votre pseudo <input v-model="pseudo" :maxlength="MAX_PSEUDO_LENGTH" placeholder="Sans étiquette" autocomplete="nickname" /></label>
        <span v-if="title" class="title-badge">« {{ title }} »</span>
      </div>
      <div class="modes">
        <section class="mode main-mode">
          <h2>Jeu solo contre l'ordinateur</h2>
          <p>Une partie tout de suite, contre des politiques pilotés par la machine.</p>
          <SoloForm @start="(settings) => react(() => emit('solo', settings))" />
        </section>
        <section class="mode">
          <h2>Partie publique</h2>
          <p>Des inconnus de votre niveau, sans compte. Si la table vote pour, des bots prennent les places vides.</p>
          <AppButton primary @click="react(() => emit('public', pseudo))">Entrer dans la file</AppButton>
        </section>
        <section class="mode" :class="{ invited: inviteCode }">
          <h2>Entre amis</h2>
          <p v-if="inviteCode">On vous attend au salon <strong>{{ inviteCode }}</strong>.</p>
          <p v-else>Un lien à partager, sans compte. Les bots prennent les places vides.</p>
          <RoomForm :invite-code="inviteCode" @create="react(() => emit('create', pseudo))" @join="(code) => react(() => emit('join', code, pseudo))" />
        </section>
        <section class="mode">
          <h2>Jeu solo – Mode carrière</h2>
          <p>Un politique, sept élections, du canton au second tour. Chacune a sa règle spéciale.</p>
          <AppButton primary @click="react(() => emit('story'))">Jouer la carrière</AppButton>
        </section>
      </div>
      <nav class="extras">
        <AppButton :primary="newcomer" :class="{ beckon: newcomer }" @click="react(() => emit('tutorial'))"><GameIcon name="sparkle" /> {{ newcomer ? 'Première fois ? Le tutoriel' : 'Tutoriel' }}</AppButton>
        <AppButton @click="emit('achievements')"><GameIcon name="star" /> Succès<span v-if="achievements" class="count">{{ achievements }}</span></AppButton>
        <AppButton href="/bestiaire" target="_blank"><GameIcon name="skull" /> Le bestiaire</AppButton>
        <TipLink :caught="suitcases" />
      </nav>
      <nav class="links" aria-label="Le projet">
        <a href="/a-propos">À propos</a>
        <a href="https://github.com/casserolade/casserolade">Le code sur GitHub</a>
        <a class="version" href="https://github.com/casserolade/casserolade/blob/main/CHANGELOG.md" title="Ce qui a changé">v{{ VERSION }}</a>
        <a href="/a-propos#contribuer">Contribuer</a>
      </nav>
    </div>
    <ChasingReporter :host-id="hostId" :reactions="reactions" @delivered="suitcases++" />
  </MenuBackdrop>
</template>

<style scoped>
.sound { position: fixed; top: 1rem; right: 1rem; z-index: 5; }
.home { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: min(84rem, 96vw); }
/* Over the running reporter: it hides behind the logo at first, and passes behind it. */
.logo { position: relative; z-index: 50; margin: 0; line-height: 0; }
.logo-button { padding: 0; border: 0; background: none; cursor: pointer; line-height: 0; }
.logo-button:active img { transform: scale(0.96) rotate(-2deg); }
.logo img { width: auto; height: min(330px, 30dvh); max-width: 88vw; object-fit: contain; filter: drop-shadow(0 18px 30px rgb(0 0 0 / 0.65)); animation: logo-in 0.7s cubic-bezier(0.3, 1.5, 0.5, 1); }
/* A subtitle drawn at random: a long one wraps on a phone, in two even, centred lines. */
.tagline { margin-top: -0.9rem; color: #ffe27a; font: 400 1.7rem / 1 var(--font-number); letter-spacing: 1px; text-align: center; text-wrap: balance; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; }
.error { padding: 0.4rem 1rem; border-radius: 999px; background: #7a1420; color: #fff; font-weight: 700; }
.resume { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem 1rem; max-width: 52rem; padding: 0.5rem 0.6rem 0.5rem 1.2rem; border-radius: 999px; border: 3px solid #d8b450; background: rgb(12 16 32 / 0.94); color: #fff; font-weight: 700; text-align: center; }
.resume :deep(.app-button) { font-size: 1.2rem; }
.profile { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem 1.2rem; }
.pseudo { flex-direction: row; align-items: center; gap: 0.7rem; color: #fff; font: 400 1.4rem / 1 var(--font-number); letter-spacing: 1px; }
.pseudo input { width: 15em; font-family: var(--font-card); font-size: 1.05rem; letter-spacing: 0; }
.title-badge { padding: 0.25rem 0.9rem; border-radius: 999px; background: rgb(255 216 74 / 0.15); border: 2px solid #d8b450; color: #ffe27a; font-weight: 700; font-style: italic; }
.modes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; width: 100%; }
.mode {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 1.1rem 1.2rem 1.2rem;
  border-radius: 22px;
  border: 3px solid rgb(255 255 255 / 0.14);
  background: linear-gradient(rgb(22 30 58 / 0.94), rgb(11 15 32 / 0.94));
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.55);
}
/* The button sits at the bottom of every card, whatever the text above it. */
.mode > :last-child { margin-top: auto; }
.mode :deep(form) { width: 100%; margin-top: auto; }
.main-mode, .invited { border-color: #d8b450; box-shadow: 0 0 30px rgb(255 200 60 / 0.25), 0 16px 40px rgb(0 0 0 / 0.55); }
h2 { color: #fff; font: 400 1.85rem / 1.05 var(--font-number); text-wrap: balance; letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; }
.main-mode h2, .invited h2 { color: #ffe27a; }
.mode :deep(.app-button) { white-space: nowrap; font-size: 1.45rem; }
.mode p { color: #c9cfdc; font-size: 1.02rem; line-height: 1.3; }
.mode p strong { color: #ffe27a; letter-spacing: 0.1em; }
.extras { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem 1.4rem; }
.links a { color: var(--color-text-muted); font-size: var(--font-size-small); text-shadow: 0 1px 3px rgb(0 0 0 / 0.8); }
.links a:hover, .links a:focus-visible { color: var(--color-text); }
.beckon { animation: beckon 1.6s ease-in-out infinite; }
@keyframes beckon { 50% { transform: scale(1.06); box-shadow: 0 0 26px rgb(255 216 74 / 0.7), 0 5px 12px rgb(0 0 0 / 0.5); } }
.count { margin-left: 0.5em; padding: 0 0.45em; border-radius: 999px; background: #ffe27a; color: var(--color-ink); font-size: 0.85em; }
@keyframes logo-in { from { transform: scale(0.6) rotate(-4deg); opacity: 0; } }
@media (max-width: 1100px) { .modes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .modes { grid-template-columns: minmax(0, 1fr); } }
</style>
