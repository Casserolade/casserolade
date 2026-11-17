<script setup lang="ts">
import { computed } from 'vue';
import RadioChip from '#src/client/components/atoms/RadioChip.vue';
import { NOM_SALON_LONGUEUR } from '#src/protocol/publicRooms.ts';

/**
 * Who may come into the room, for its host to choose, and to change while the room waits: its guests only, by its
 * link, or anyone, from the home page's list, under a name.
 */
const props = defineProps<{ publicName: string | undefined; suggestedName: string }>();
/** The room's public name, or undefined for a private room. */
const emit = defineEmits<{ update: [publicName: string | undefined] }>();

const isPublic = computed(() => props.publicName !== undefined);

/** The name typed, once the field is left or Enter is pressed: an empty one falls back on the suggested name. */
function rename(event: Event): void {
  emit('update', (event.target as HTMLInputElement).value.trim() || props.suggestedName);
}
</script>

<template>
  <fieldset class="visibility">
    <legend>Qui peut entrer</legend>
    <div class="chips">
      <RadioChip name="visibility" :checked="!isPublic" @select="emit('update', undefined)">Mes invités</RadioChip>
      <RadioChip name="visibility" :checked="isPublic" @select="emit('update', suggestedName)">Tout le monde</RadioChip>
    </div>
    <label v-if="isPublic">Nom du salon <input :value="publicName" :maxlength="NOM_SALON_LONGUEUR" autocomplete="off" @change="rename" @keydown.enter.prevent="rename" /></label>
  </fieldset>
</template>

<style scoped>
.visibility { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; min-width: 0; margin: 0; padding: 0; border: 0; }
.visibility input { width: 100%; min-width: 0; }
legend { padding: 0 0 0.3rem; color: #c9cfdc; font-weight: 700; }
.chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
</style>
