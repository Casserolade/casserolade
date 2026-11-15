<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import PollsCrash from '#src/client/components/atoms/PollsCrash.vue';
import GameTable from '#src/client/components/organisms/GameTable.vue';
import { ParticlePreview } from '#src/client/pixi/particlePreview.ts';
import type { PreviewEffect } from '#src/client/pixi/particlePreview.ts';
import { music } from '#src/client/services/music.ts';
import { playSample, playSound } from '#src/client/services/soundEffects.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import { studioShock } from '#src/client/stores/studioShock.ts';
import { visualEffects } from '#src/client/stores/visualEffects.ts';
import type { DeathKind } from '#src/client/tools/deathKind.ts';
import { PLATEAUX, SECOND_TOUR } from '#src/data/plateaux.ts';

/** The candidates on the set's screens, for the preview. */
const FACES = ['macron', 'lepen', 'melenchon', 'bardella'];
const BURSTS: { kind: PreviewEffect; label: string }[] = [
  { kind: 'genkidama', label: 'Genkidama (élimination)' },
  { kind: 'strike', label: 'Frappe du héros battu' },
  { kind: 'tracts', label: 'Pluie de tracts' },
  { kind: 'ballots', label: 'Bulletins de vote' },
  { kind: 'sparks', label: 'Étincelles' },
  { kind: 'coins', label: 'Pièces' },
  { kind: 'chips', label: 'Éclats de médaillon' },
  { kind: 'smoke', label: 'Fumée' },
];

/**
 * The preview page (development only): every TV set with its lights, its screens and its dressing, and each effect
 * at a click, without playing a game. The table's own switches (music, visual effects, sound) are in its corner.
 */
const DEATHS: { kind: DeathKind; label: string }[] = [
  { kind: 'eject', label: 'Éjecté' },
  { kind: 'shatter', label: 'Brisé' },
  { kind: 'explode', label: 'Explosé' },
  { kind: 'burn', label: 'Brûlé (Polémique)' },
  { kind: 'gold', label: 'Doré en pièces' },
  { kind: 'tv-off', label: 'Coupé à l\'antenne' },
  { kind: 'pop', label: 'Jeton' },
  { kind: 'light', label: 'Dans la lumière' },
];
const plateaux = [...PLATEAUX, SECOND_TOUR];
/** Counts the falls of the polls' curve: each click draws it again. */
const crashes = ref(0);
/** Each click shows another loss: a dip for one point, the bottom of the frame for a rout. */
const CRASH_LOSSES = [3, 1, 6, 12];
const crashLoss = computed(() => CRASH_LOSSES[(crashes.value - 1 + CRASH_LOSSES.length) % CRASH_LOSSES.length]);
/** The panel steps aside to let an effect be seen whole. */
const panelHidden = ref(false);
const plateauId = ref(plateaux[0].id);
const musicOn = ref(false);
const stageHost = useTemplateRef<HTMLDivElement>('stage');
const particles = new ParticlePreview({ manifest: gameArt.manifest.value, playSound, onShock: (strength) => studioShock.hit(strength) });

function toggleMusic(): void {
  musicOn.value = !musicOn.value;
  if (musicOn.value) music.play();
  else music.stop();
}

onMounted(() => {
  if (stageHost.value) void particles.start(stageHost.value).catch((error: unknown) => console.error('Particle preview could not start', error));
});
onUnmounted(() => {
  particles.destroy();
  music.stop();
});
</script>

<template>
  <GameTable :plateau-id="plateauId" :faces="FACES">
    <div ref="stage" class="particles" aria-hidden="true" />
    <PollsCrash v-if="crashes" :key="crashes" class="crash" :lost="crashLoss" :still="visualEffects.calm.value" />
    <button type="button" class="hide" :aria-pressed="panelHidden" @click="panelHidden = !panelHidden">{{ panelHidden ? 'Montrer le panneau' : 'Cacher le panneau' }}</button>
    <section class="panel" :class="{ aside: panelHidden }">
      <h1>Plateaux et effets</h1>
      <fieldset>
        <legend>Plateau</legend>
        <label v-for="plateau in plateaux" :key="plateau.id" class="choice">
          <input v-model="plateauId" type="radio" name="plateau" :value="plateau.id" />
          <span><b>{{ plateau.chaine }}</b><small>{{ plateau.emission }}</small></span>
        </label>
      </fieldset>
      <fieldset>
        <legend>Choc du combat (lumières, écrans, tapis)</legend>
        <button type="button" @click="studioShock.hit(0.5)">Petit choc</button>
        <button type="button" @click="studioShock.hit(1)">Gros choc</button>
      </fieldset>
      <fieldset>
        <legend>Effets du combat</legend>
        <button v-for="burst in BURSTS" :key="burst.kind" type="button" @click="particles.play(burst.kind)">{{ burst.label }}</button>
      </fieldset>
      <fieldset>
        <legend>Morts d'un politique</legend>
        <button v-for="death in DEATHS" :key="death.kind" type="button" @click="particles.die(death.kind)">{{ death.label }}</button>
      </fieldset>
      <fieldset>
        <legend>Résultat</legend>
        <button type="button" @click="crashes++">Courbe des sondages perdus (3, 1, 6, 12)</button>
      </fieldset>
      <fieldset>
        <legend>Sons</legend>
        <button type="button" :aria-pressed="musicOn" @click="toggleMusic">{{ musicOn ? 'Arrêter la musique' : 'Lancer la musique' }}</button>
        <button type="button" @click="playSample('wilhelm', 0.6)">Cri de Wilhelm</button>
        <button type="button" @click="playSound('hit', 1.5)">Coup</button>
        <button type="button" @click="playSound('celebrate')">Célébration</button>
      </fieldset>
    </section>
  </GameTable>
</template>

<style scoped>
.particles { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
.crash { position: absolute; left: calc(var(--s) * 580); top: calc(var(--s) * 250); z-index: 6; }
.hide { position: absolute; left: calc(var(--s) * 340); top: calc(var(--s) * 104); z-index: 7; }
/* Stepped aside: a strip of buttons under the table's carpet, the stage left clear. */
.aside { opacity: 0.12; }
.aside:hover, .aside:focus-within { opacity: 1; }
.panel {
  position: absolute;
  left: calc(var(--s) * 340);
  top: calc(var(--s) * 190);
  width: calc(var(--s) * 1240);
  display: flex;
  flex-direction: column;
  gap: calc(var(--s) * 8);
  color: #f4f6fb;
  transition: opacity 0.2s;
  font: 400 calc(var(--s) * 18) / 1.2 var(--font-card);
}
h1 { margin: 0; color: #ffe27a; font: 400 calc(var(--s) * 30) / 1 var(--font-number); letter-spacing: 0.04em; }
fieldset { display: flex; flex-wrap: wrap; gap: calc(var(--s) * 6); margin: 0; padding: calc(var(--s) * 4) calc(var(--s) * 10) calc(var(--s) * 8); border: calc(var(--s) * 2) solid rgb(255 255 255 / 0.18); border-radius: calc(var(--s) * 12); }
legend { padding: 0 calc(var(--s) * 8); color: #c9cfdc; font-weight: 700; }
button, .choice span {
  display: inline-flex;
  flex-direction: column;
  padding: calc(var(--s) * 5) calc(var(--s) * 12);
  border: calc(var(--s) * 2) solid #d8b450;
  border-radius: calc(var(--s) * 10);
  background: #16204a;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
button:hover, .choice span:hover { filter: brightness(1.25); }
button:focus-visible, .choice input:focus-visible + span { outline: 3px solid var(--color-accent); outline-offset: 2px; }
.choice input { position: absolute; opacity: 0; }
.choice small { color: #c9cfdc; font-size: calc(var(--s) * 14); font-weight: 400; }
/* The chosen set: a filled chip and a mark, not its colour alone. */
.choice input:checked + span { background: #d8b450; color: #10131f; }
.choice input:checked + span b::before { content: '✓ '; }
.choice input:checked + span small { color: #10131f; }
</style>
