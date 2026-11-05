<script setup lang="ts">
import ContextNote from '#src/client/components/molecules/ContextNote.vue';
import CasseroleSheet from '#src/client/components/molecules/CasseroleSheet.vue';
import HeroOption from '#src/client/components/molecules/HeroOption.vue';
import KeywordNote from '#src/client/components/molecules/KeywordNote.vue';
import ShownCardFace from '#src/client/components/molecules/ShownCardFace.vue';
import SourceDetails from '#src/client/components/molecules/SourceDetails.vue';
import BestiaryFilters from '#src/client/components/organisms/BestiaryFilters.vue';
import BestiarySection from '#src/client/components/organisms/BestiarySection.vue';
import { useBestiary } from '#src/client/stores/useBestiary.ts';
import { useGameSources } from '#src/client/stores/useGameSources.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';
import { bestiaryFilterQuery } from '#src/client/tools/bestiaryFilterQuery.ts';
import { casseroleSources } from '#src/client/tools/casseroleSources.ts';
import { countLabel } from '#src/client/tools/countLabel.ts';
import { personSources } from '#src/client/tools/personSources.ts';
import { KOFI_URL } from '#src/client/const/supportLink.ts';
import { CARD_BY_ID } from '#src/data/cards.ts';
import { PARAMS } from '#src/data/params.ts';

/**
 * The bestiary, in its own tab: heroes, politicians camp by camp, casseroles, spells, tokens and contexts,
 * each with its sources, under filters kept in the link.
 */
const { filter, setFilter, resetFilter, counts, total, keywords, heroes, camps, casseroles, spells, tokens, contexts } = useBestiary();
const sources = useGameSources();
const forPerson = (id: string) => (sources.value ? personSources(sources.value, id) : null);
const forCasserole = (id: string) => (sources.value ? casseroleSources(sources.value, id) : null);
/** The politicians who carry a keyword: a link, so that it opens in a new tab too. */
const carriers = (term: string) => bestiaryFilterQuery({ kind: 'politique', camp: null, tier: null, query: term });
</script>

<template>
  <main class="bestiary">
    <header class="masthead">
      <a class="logo" href="/"><img :src="assetUrl('logo/casserolade-fr.webp')" alt="Casserolade" width="1400" height="640" /></a>
      <h1>Le bestiaire</h1>
      <p class="intro">Tout le jeu : les mots-clés expliqués, les héros, les politiques camp par camp, leurs casseroles, les sorts, les jetons et les contextes. Chaque fiche donne ses sources.</p>
    </header>
    <BestiaryFilters :model-value="filter" :counts="counts" :total="total" @update:model-value="setFilter" @reset="resetFilter" />

    <BestiarySection v-if="keywords.length" id="mots-cles" title="Les mots-clés" :count="countLabel(keywords.length, 'mot expliqué', 'mots expliqués')" wide>
      <li v-for="item in keywords" :key="item.key">
        <KeywordNote :term="item.data.term" :rule="item.data.rule" :politicians="item.data.politicians" :link="item.data.group === 'carte' ? carriers(item.data.term) : null" />
      </li>
    </BestiarySection>

    <BestiarySection v-if="heroes.length" id="heros" title="Les héros" :count="countLabel(heroes.length, 'à incarner', 'à incarner')" wide>
      <li v-for="hero in heroes" :key="hero.key">
        <HeroOption as="article" :hero="hero.data" :start-hp="PARAMS.startHp" />
        <SourceDetails :sources="forPerson(hero.key)" />
      </li>
    </BestiarySection>

    <BestiarySection v-for="camp in camps" :id="camp.camp" :key="camp.camp" :title="camp.label" :count="countLabel(camp.items.length, 'politique', 'politiques')" :color="`var(--camp-${camp.camp})`">
      <li v-for="item in camp.items" :key="item.key">
        <ShownCardFace :card="{ kind: 'minion', face: item.data.face }" />
        <p v-if="item.data.casseroles.length" class="casseroles"><strong>Casseroles</strong> {{ item.data.casseroles.join(' · ') }}</p>
        <SourceDetails :sources="forPerson(item.key)" />
      </li>
    </BestiarySection>

    <BestiarySection v-if="casseroles.length" id="casseroles" title="Les casseroles" :count="countLabel(casseroles.length, 'casserole', 'casseroles')" wide>
      <li v-for="item in casseroles" :key="item.key">
        <CasseroleSheet :casserole="item.data" :owner-name="CARD_BY_ID[item.data.owner]?.name ?? item.data.owner" :sources="forCasserole(item.key)" />
      </li>
    </BestiarySection>

    <BestiarySection v-if="spells.length" id="sorts" title="Les sorts" :count="countLabel(spells.length, 'sort en boutique', 'sorts en boutique')">
      <li v-for="item in spells" :key="item.key"><ShownCardFace :card="{ kind: 'spell', spell: item.data }" /></li>
    </BestiarySection>

    <BestiarySection v-if="tokens.length" id="jetons" title="Les jetons" :count="countLabel(tokens.length, 'créé par les effets', 'créés par les effets')">
      <li v-for="item in tokens" :key="item.key"><ShownCardFace :card="item.data" /></li>
    </BestiarySection>

    <BestiarySection v-if="contexts.length" id="contextes" title="Les contextes" :count="countLabel(contexts.length, 'règle du jour', 'règles du jour')" wide>
      <li v-for="item in contexts" :key="item.key"><ContextNote :context="item.data" /></li>
    </BestiarySection>

    <p v-if="total === 0" class="nothing">Rien ne correspond. <button type="button" class="clear" @click="resetFilter">Tout effacer</button></p>

    <footer class="links">
      <a href="/">Jouer</a>
      <a href="/a-propos">À propos</a>
      <a href="https://github.com/casserolade/casserolade">Le code sur GitHub</a>
      <a :href="KOFI_URL">Soutenir sur Ko-fi</a>
    </footer>
  </main>
</template>

<style scoped>
.bestiary { display: flex; flex-direction: column; gap: 3rem; max-width: 90rem; margin: 0 auto; padding: var(--space-5) var(--space-4) 4rem; }
.masthead { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); text-align: center; }
.logo img { width: min(100%, 26rem); height: auto; filter: drop-shadow(0 14px 24px rgb(0 0 0 / 0.6)); }
h1 { color: var(--color-accent); font: 400 3rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 6px var(--color-ink); paint-order: stroke fill; }
.intro { max-width: 40rem; color: var(--color-text-muted); font-size: 1.1rem; line-height: 1.5; }
/* A hero says a line above its head on hover: room for the bubble between rows. */
#heros :deep(.items) { row-gap: 4.5rem; padding-top: 2rem; }
#heros :deep(.hero) { width: 100%; }
.casseroles { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-small); line-height: 1.35; }
.casseroles strong { display: block; color: var(--color-accent); font-family: var(--font-card-title); }
.nothing { display: flex; align-items: center; justify-content: center; gap: var(--space-3); color: var(--color-text-muted); font-size: var(--font-size-large); }
.clear { padding: 0.2em 0.8em; border: 2px solid var(--color-border); border-radius: 999px; background: none; color: var(--color-text); font: inherit; cursor: pointer; }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-5); }
.links a { color: var(--color-accent); font-weight: 700; }
</style>
