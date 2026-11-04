<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '#src/client/components/atoms/AppButton.vue';
import ArchPortrait from '#src/client/components/atoms/ArchPortrait.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { cssImage } from '#src/client/tools/cssImage.ts';
import { puppetStyle } from '#src/client/tools/puppetStyle.ts';
import { CHAPITRES } from '#src/data/histoire/chapitres.ts';
import type { Chapitre } from '#src/data/histoire/chapitres.ts';
import { CONTEXTS, HERO_BY_ID } from '#src/data/heroes.ts';
import type { Campagne } from '#src/histoire/campagne.ts';
import { texteObjectif } from '#src/histoire/campagne.ts';

/**
 * Before an election: the road so far, the challenge of this one, its special rule, who stands
 * against you and what earns the stars. One button to go.
 */
const props = defineProps<{ chapter: Chapitre; campaign: Campagne }>();

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
defineEmits<{ play: []; abandon: []; leave: [] }>();

const hero = computed(() => HERO_BY_ID[props.campaign.heroId]);
const index = computed(() => CHAPITRES.indexOf(props.chapter));
const archImage = computed(() => cssImage(gameArt.manifest.value.carte.arche));
const heroPuppet = computed(() => puppetStyle(gameArt.manifest.value, props.campaign.heroId, 'civile'));
const boss = computed(() => (props.chapter.boss ? HERO_BY_ID[props.chapter.id === 'outre_tombe' ? 'giscard' : props.campaign.bossId] : null));
const bossPuppet = computed(() => (boss.value ? puppetStyle(gameArt.manifest.value, boss.value.id, 'civile') : null));
const rule = computed(() => {
  if (props.chapter.contexteId) return CONTEXTS.find((c) => c.id === props.chapter.contexteId) ?? null;
  return null;
});
const goal = computed(() => (props.chapter.placeRequise === 1 ? 'Finir premier' : `Finir dans les ${props.chapter.placeRequise} premiers`));
const rivals = computed(() => props.chapter.adversaires.length);
const road = computed(() => CHAPITRES.map((c, i) => ({
  id: c.id,
  name: capitalize(c.election.replace(/^(Les?|La|L') ?/u, '')),
  state: i < index.value ? 'done' : i === index.value ? 'current' : 'later',
  stars: props.campaign.etoiles[c.id] ?? 0,
})));
</script>

<template>
  <MenuBackdrop :plateau-id="chapter.plateaux[0]">
    <ol v-if="index >= 0" class="road" aria-label="La carrière">
      <li v-for="(step, i) in road" :key="step.id" class="stop" :class="step.state">
        <span class="dot">{{ i + 1 }}</span>
        <span class="stop-name">{{ step.name }}</span>
        <span v-if="step.state === 'done'" class="stars" :aria-label="`${step.stars} étoiles`"><GameIcon v-for="n in step.stars" :key="n" name="star" /></span>
      </li>
    </ol>

    <section class="ballot">
      <div class="candidate">
        <ArchPortrait class="arch" :puppet="heroPuppet" :name="hero?.name ?? ''" :frame-image="archImage" hide-name />
        <strong>{{ hero?.name }}</strong>
        <span class="muted">candidat</span>
      </div>
      <div class="election">
        <p class="kicker">{{ index >= 0 ? `Élection ${index + 1} sur ${CHAPITRES.length}` : 'Épilogue' }}</p>
        <h1 class="name">{{ chapter.election }}</h1>
        <p class="challenge">{{ chapter.decouverte }}</p>
        <p v-if="rule" class="rule"><span class="tag">Règle spéciale</span> <strong>{{ rule.name }}</strong> : {{ rule.desc }}</p>
        <p v-else-if="chapter.contexte" class="rule"><span class="tag">Règle spéciale</span> tirée au sort au début de la partie.</p>
        <ul class="terms">
          <li><GameIcon name="crown" /> {{ goal }}</li>
          <li><GameIcon name="people" /> {{ rivals }} {{ rivals > 1 ? 'adversaires' : 'adversaire' }}</li>
        </ul>
        <div class="objectives">
          <span class="tag">Pour les étoiles</span>
          <ul>
            <li v-for="objective in chapter.objectifs" :key="objective.type"><GameIcon name="star" /> {{ texteObjectif(objective) }}</li>
          </ul>
        </div>
      </div>
      <div v-if="boss && bossPuppet" class="candidate boss">
        <ArchPortrait class="arch" :puppet="bossPuppet" :name="boss.name" :frame-image="archImage" hide-name />
        <strong>{{ boss.name }}</strong>
        <span class="muted">le boss</span>
      </div>
    </section>

    <div class="actions">
      <AppButton primary @click="$emit('play')">Entrer en campagne</AppButton>
      <AppButton @click="$emit('abandon')">Changer de politique</AppButton>
      <AppButton @click="$emit('leave')">Accueil</AppButton>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.road { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3rem; }
.stop { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; width: 8.5rem; color: #8a90a2; font-size: 0.9rem; text-align: center; }
.stop:not(:last-child)::after { content: ''; position: absolute; top: 1.15rem; left: calc(50% + 1.4rem); width: calc(100% - 2.5rem); height: 3px; background: rgb(255 255 255 / 0.18); }
.done:not(:last-child)::after { background: #d8b450; }
.dot { display: grid; place-items: center; width: 2.3rem; height: 2.3rem; border-radius: 50%; border: 3px solid rgb(255 255 255 / 0.25); background: #141a30; color: #c9cfdc; font: 400 1.3rem / 1 var(--font-number); }
.done .dot { border-color: #d8b450; background: #5a4410; color: #ffe27a; }
.current .dot { border-color: #ffe27a; background: #ffe27a; color: var(--color-ink); box-shadow: 0 0 18px rgb(255 216 74 / 0.7); }
.current { color: #fff; font-weight: 700; }
.done { color: #e0d8c0; }
.stars { color: #ffd84a; font-size: 0.85rem; }

.ballot { display: flex; align-items: center; justify-content: center; gap: 2rem; width: min(1200px, 94vw); padding: 1.5rem 2rem; border-radius: 26px; border: 3px solid #d8b450; background: linear-gradient(rgb(22 30 58 / 0.95), rgb(11 15 32 / 0.95)); box-shadow: 0 0 34px rgb(255 200 60 / 0.18), 0 18px 44px rgb(0 0 0 / 0.6); }
.candidate { flex: none; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; color: #fff; text-align: center; }
.candidate strong { font: 400 1.5rem / 1.05 var(--font-number); letter-spacing: 1px; }
.arch { --arch-width: 9.5rem; }
.boss .arch { filter: drop-shadow(0 0 18px rgb(255 60 60 / 0.6)); }
.election { flex: 1; display: flex; flex-direction: column; gap: 0.7rem; min-width: 0; }
.kicker { color: #c9cfdc; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.9rem; }
.name { text-align: left; font-size: 3.2rem; }
.challenge { color: #fff; font-size: 1.35rem; line-height: 1.3; font-weight: 600; }
.rule { color: #e0d8c0; font-size: 1.1rem; }
.rule strong { color: #ffe27a; }
.tag { display: inline-block; padding: 0.05rem 0.6rem; border-radius: 8px; background: #c8102e; color: #fff; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; vertical-align: 0.15em; }
.terms { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.6rem; }
.terms li { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.9rem; border-radius: 999px; background: rgb(255 255 255 / 0.08); color: #fff; font-weight: 700; }
.terms :deep(.game-icon) { color: #ffe27a; }
.objectives ul { list-style: none; margin: 0.4rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; color: #c9cfdc; }
.objectives :deep(.game-icon) { color: #ffd84a; }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
@media (max-width: 900px) { .ballot { flex-direction: column; } .name { text-align: center; } }
</style>
