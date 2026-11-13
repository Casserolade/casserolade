<script setup lang="ts">
import { computed } from 'vue';
import CardChange from '#src/client/components/molecules/CardChange.vue';
import RuleChange from '#src/client/components/molecules/RuleChange.vue';
import BestiarySection from '#src/client/components/organisms/BestiarySection.vue';
import { countLabel } from '#src/client/tools/countLabel.ts';
import { patchNoteSections } from '#src/client/tools/patchNoteSections.ts';
import type { PatchNote } from '#src/data/misesAJour.ts';

const PAIR_WIDTH = '22rem';
const CARD_WIDTH = '10rem';

/** One version of the update notes: in short, the rules, then every card that came or changed, before and after. */
const props = defineProps<{ note: PatchNote }>();

const sections = computed(() => patchNoteSections(props.note));
const anchor = computed(() => `v${props.note.version.replaceAll('.', '-')}`);
</script>

<template>
  <article :id="anchor" class="version">
    <header class="heading">
      <h2>Version {{ note.version }}</h2>
      <p class="date">{{ note.date }}</p>
      <p class="title">{{ note.title }}</p>
    </header>
    <ul class="summary">
      <li v-for="line in note.summary" :key="line">{{ line }}</li>
    </ul>

    <BestiarySection v-if="note.rules.length" :id="`${anchor}-regles`" title="Règles et mots-clés" :count="countLabel(note.rules.length, 'changement', 'changements')" :level="3" wide>
      <li v-for="rule in note.rules" :key="rule.term"><RuleChange v-bind="rule" /></li>
    </BestiarySection>

    <BestiarySection v-if="sections.newCards.length" :id="`${anchor}-nouveaux`" title="Nouveaux politiques" :count="countLabel(sections.newCards.length, 'politique', 'politiques')" :level="3" :item-width="CARD_WIDTH">
      <li v-for="change in sections.newCards" :key="change.key"><CardChange v-bind="change" /></li>
    </BestiarySection>

    <BestiarySection v-if="sections.changedCards.length" :id="`${anchor}-politiques`" title="Politiques retouchés" :count="countLabel(sections.changedCards.length, 'politique', 'politiques')" :level="3" :item-width="PAIR_WIDTH">
      <li v-for="change in sections.changedCards" :key="change.key"><CardChange v-bind="change" /></li>
    </BestiarySection>

    <BestiarySection v-if="sections.newCasseroles.length" :id="`${anchor}-casseroles`" title="Nouvelles casseroles" :count="countLabel(sections.newCasseroles.length, 'casserole', 'casseroles')" :level="3" :item-width="CARD_WIDTH">
      <li v-for="change in sections.newCasseroles" :key="change.key"><CardChange v-bind="change" /></li>
    </BestiarySection>

    <details v-if="sections.changedCasseroles.length" class="more">
      <summary>{{ countLabel(sections.changedCasseroles.length, 'casserole retouchée', 'casseroles retouchées') }}<template v-if="note.casserolesWhy"> : {{ note.casserolesWhy }}</template></summary>
      <BestiarySection :id="`${anchor}-casseroles-retouchees`" title="Casseroles retouchées" :count="countLabel(sections.changedCasseroles.length, 'casserole', 'casseroles')" :level="3" :item-width="PAIR_WIDTH">
        <li v-for="change in sections.changedCasseroles" :key="change.key"><CardChange v-bind="change" /></li>
      </BestiarySection>
    </details>

    <BestiarySection v-if="sections.spells.length" :id="`${anchor}-sorts`" title="Sorts" :count="countLabel(sections.spells.length, 'sort', 'sorts')" :level="3" :item-width="CARD_WIDTH">
      <li v-for="change in sections.spells" :key="change.key"><CardChange v-bind="change" /></li>
    </BestiarySection>
  </article>
</template>

<style scoped>
.version { display: flex; flex-direction: column; gap: 2.5rem; }
.heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2) var(--space-4); }
h2 { margin: 0; color: var(--color-accent); font: 400 2.6rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 5px var(--color-ink); paint-order: stroke fill; }
.date { margin: 0; color: var(--color-text-muted); }
.title { flex-basis: 100%; margin: 0; color: var(--color-text); font: 800 var(--font-size-large) / 1.2 var(--font-card-title); }
.summary { display: flex; flex-direction: column; gap: var(--space-2); max-width: 52rem; margin: 0; padding-left: 1.2em; color: var(--color-text); font-size: 1.05rem; line-height: 1.45; }
.more > summary { color: var(--color-accent); font: 800 var(--font-size-large) / 1.3 var(--font-card-title); cursor: pointer; }
.more[open] > summary { margin-bottom: var(--space-4); }
</style>
