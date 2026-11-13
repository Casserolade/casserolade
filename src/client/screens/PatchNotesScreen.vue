<script setup lang="ts">
import PageLinks from '#src/client/components/molecules/PageLinks.vue';
import PageMasthead from '#src/client/components/molecules/PageMasthead.vue';
import PatchNoteArticle from '#src/client/components/organisms/PatchNoteArticle.vue';
import { CHANGELOG_FILE_URL } from '#src/client/const/codeLinks.ts';
import { MISES_A_JOUR } from '#src/data/misesAJour.ts';

/** The update notes, in their own page: version by version, the rules and the cards, before and after. */
</script>

<template>
  <main class="notes">
    <PageMasthead title="Mises à jour et équilibrages" intro="Ce qui change à chaque version : les règles, les mots-clés, et chaque carte avant et après." />
    <PatchNoteArticle v-for="note in MISES_A_JOUR" :key="note.version" :note="note" />
    <p class="history">Les versions d'avant, en texte : <a :href="CHANGELOG_FILE_URL">l'historique complet</a>.</p>
    <footer><PageLinks current="mises-a-jour" /></footer>
  </main>
</template>

<style scoped>
.notes { display: flex; flex-direction: column; gap: 3rem; max-width: 90rem; margin: 0 auto; padding: var(--space-5) var(--space-4) 4rem; }
.history { margin: 0; color: var(--color-text-muted); text-align: center; }
.history a { color: var(--color-accent); font-weight: 700; }
</style>
