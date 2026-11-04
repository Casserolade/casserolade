<script setup lang="ts">
import HeroOption from '#src/client/components/molecules/HeroOption.vue';
import BestiaryCamp from '#src/client/components/organisms/BestiaryCamp.vue';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { bestiaryCamps } from '#src/client/tools/bestiaryCamps.ts';
import { CARDS, PARTY_CAMPS } from '#src/data/cards.ts';
import { CASSEROLES } from '#src/data/casseroles.ts';
import { HEROES } from '#src/data/heroes.ts';
import { PARAMS } from '#src/data/params.ts';

/** The bestiary, in its own tab: every hero, then every politician camp by camp, as the game draws them. */
const camps = bestiaryCamps(CARDS, CASSEROLES, [...PARTY_CAMPS, 'civile']);
</script>

<template>
  <main class="bestiary">
    <header class="masthead">
      <a class="logo" href="/"><img :src="assetUrl('logo/casserolade-fr.webp')" alt="Casserolade" width="1400" height="640" /></a>
      <h1>Le bestiaire</h1>
      <p class="intro">Tous les politiques du jeu, camp par camp, avec leur échelon, leur texte et leurs casseroles. Et les héros, candidats à la présidentielle compris.</p>
    </header>
    <nav class="jump" aria-label="Aller à">
      <a href="#heros">Les héros</a>
      <a v-for="camp in camps" :key="camp.camp" :href="`#${camp.camp}`" :style="{ '--camp-color': `var(--camp-${camp.camp})` }">{{ camp.label }}</a>
    </nav>
    <section id="heros" class="heroes-section">
      <h2>Les héros <span class="count">{{ HEROES.length }} à incarner</span></h2>
      <ul class="heroes">
        <li v-for="hero in HEROES" :key="hero.id"><HeroOption as="article" :hero="hero" :start-hp="PARAMS.startHp" /></li>
      </ul>
    </section>
    <BestiaryCamp v-for="camp in camps" :key="camp.camp" :camp="camp" />
    <footer class="links">
      <a href="/">Jouer</a>
      <a href="/a-propos">À propos</a>
      <a href="https://github.com/casserolade/casserolade">Le code sur GitHub</a>
    </footer>
  </main>
</template>

<style scoped>
.bestiary { display: flex; flex-direction: column; gap: 3rem; max-width: 90rem; margin: 0 auto; padding: var(--space-5) var(--space-4) 4rem; }
.masthead { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); text-align: center; }
.logo img { width: min(100%, 26rem); height: auto; filter: drop-shadow(0 14px 24px rgb(0 0 0 / 0.6)); }
h1 { color: var(--color-accent); font: 400 3rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 6px var(--color-ink); paint-order: stroke fill; }
.intro { max-width: 40rem; color: var(--color-text-muted); font-size: 1.1rem; line-height: 1.5; }
.jump { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2); padding: var(--space-3) 0; background: color-mix(in srgb, var(--color-background) 92%, transparent); backdrop-filter: blur(6px); }
.jump a { padding: 0.3em 0.9em; border-radius: 999px; border: 2px solid var(--camp-color, var(--color-accent)); color: var(--color-text); font-weight: 700; text-decoration: none; }
.jump a:hover, .jump a:focus-visible { background: var(--camp-color, var(--color-accent)); color: #fff; }
.heroes-section { scroll-margin-top: 4rem; }
.heroes-section h2 { display: flex; align-items: baseline; gap: var(--space-3); margin-bottom: var(--space-4); padding-bottom: var(--space-2); border-bottom: 4px solid var(--color-accent); font: 400 2.2rem / 1 var(--font-number); letter-spacing: 1px; }
.count { color: var(--color-text-muted); font: 500 var(--font-size-normal) / 1 var(--font-card); letter-spacing: 0; }
.heroes { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 4.5rem var(--space-4); margin: 0; padding: 2rem 0 0; list-style: none; }
.heroes :deep(.hero) { width: 100%; height: 100%; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-5); }
.links a { color: var(--color-accent); font-weight: 700; }
</style>
