<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import MenuBackdrop from '#src/client/components/organisms/MenuBackdrop.vue';

/**
 * The server is out of reach for a while. The game keeps trying by itself and comes back on its own:
 * « Réessayer » only tries now. Leaving gives the seat to a bot: only the player decides that.
 */
defineProps<{ holdsSeat: boolean }>();
defineEmits<{ retry: []; leave: [] }>();
</script>

<template>
  <MenuBackdrop>
    <h1 class="title">Coupure du direct</h1>
    <p class="message" role="alert">
      Connexion au serveur perdue. Le jeu réessaie tout seul<template v-if="holdsSeat"> : votre place vous attend, un bot la tient en votre absence</template>.
    </p>
    <p class="trying" role="status">Reconnexion en cours…</p>
    <div class="actions">
      <AppButton primary @click="$emit('retry')">Réessayer</AppButton>
      <AppButton @click="$emit('leave')">{{ holdsSeat ? 'Quitter la partie' : 'Retour à l\'accueil' }}</AppButton>
    </div>
  </MenuBackdrop>
</template>

<style scoped>
.title { margin-top: 20dvh; font-size: 3.4rem; rotate: -2deg; }
.message { max-width: 36rem; padding: 0.8rem 1.4rem; border-radius: 18px; background: rgb(12 16 32 / 0.92); border: 3px solid #c8102e; color: #fff; font-size: 1.2rem; text-align: center; }
.trying { color: #ffe27a; font: 400 1.6rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 4px var(--color-ink); paint-order: stroke fill; animation: trying 1.2s ease-in-out infinite; }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
@keyframes trying { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .trying { animation: none; } }
</style>
