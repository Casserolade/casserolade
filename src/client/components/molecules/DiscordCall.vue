<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import GameIcon from '#src/client/components/atoms/GameIcon.vue';
import { DISCORD_URL } from '#src/protocol/discord.ts';

/**
 * The call to the community's Discord, where players meet to fill online tables: the first thing of the online side.
 * `members` says how many are there, once there are enough to say it.
 */
defineProps<{ members: string | null }>();
</script>

<template>
  <article class="discord-call">
    <div class="band">
      <GameIcon name="discord" :outline="false" class="mark" />
      <div class="words">
        <p class="kicker">Le QG de campagne</p>
        <h3>Jouez avec de vrais gens</h3>
        <p>Trouvez une table, postez vos codes de salon, exhibez vos plateaux à 3k.</p>
      </div>
      <div class="action">
        <AppButton :href="DISCORD_URL" target="_blank" class="join"><GameIcon name="discord" :outline="false" /> Rejoindre le Discord</AppButton>
        <p v-if="members" class="members">{{ members }}</p>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* A band on a wide side: the mark, the words, the button on the right. On a narrow one, the button goes under. */
/* A slim band: it takes the height its row gives it, its words centred. */
.discord-call { container-type: inline-size; display: grid; }
.band {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.4rem 0.9rem;
  padding: 0.5rem 0.9rem;
  border-radius: 14px;
  border: 2px solid rgb(255 255 255 / 0.3);
  background: radial-gradient(circle at 8% 20%, rgb(255 255 255 / 0.18), transparent 50%), linear-gradient(135deg, var(--color-discord), var(--color-discord-dark));
  box-shadow: 0 6px 16px rgb(20 24 90 / 0.45);
  color: #fff;
}
.mark { width: 2.5rem; height: 2.5rem; filter: drop-shadow(0 3px 0 rgb(0 0 0 / 0.25)); animation: wobble 3.2s ease-in-out infinite; }
.words { display: flex; flex-direction: column; gap: 0.1rem; }
.kicker { margin: 0; color: rgb(255 255 255 / 0.8); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
h3 { margin: 0; font: 400 1.3rem / 1 var(--font-number); letter-spacing: 1px; -webkit-text-stroke: 3px rgb(20 22 70 / 0.9); paint-order: stroke fill; }
.words p:last-child { margin: 0; color: rgb(255 255 255 / 0.92); font-size: 0.9rem; line-height: 1.25; text-wrap: pretty; }
.action { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.discord-call .join { background: #fff; border-color: rgb(20 22 70 / 0.9); color: var(--color-discord-dark); text-shadow: none; font-size: 1.1rem; white-space: nowrap; }
.members { margin: 0; font-size: 0.9rem; font-weight: 700; }
@container (max-width: 40rem) {
  .band { grid-template-columns: auto minmax(0, 1fr); }
  .action { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; }
}
/* On a phone, the words take the whole width: the button carries the mark. */
@container (max-width: 26rem) {
  .band { grid-template-columns: minmax(0, 1fr); }
  .mark { display: none; }
}
@keyframes wobble { 0%, 80%, 100% { rotate: 0deg; } 85% { rotate: -9deg; } 90% { rotate: 7deg; } 95% { rotate: -3deg; } }
@media (prefers-reduced-motion: reduce) { .mark { animation: none; } }
</style>
