<script setup lang="ts">
import TrailerCard from '#src/client/components/molecules/TrailerCard.vue';
import TwitchLink from '#src/client/components/molecules/TwitchLink.vue';

/** Something to watch, beside the ways to play: the Twitch channel while it is live, the trailer otherwise. */
defineProps<{ twitchLive: boolean }>();
</script>

<template>
  <aside class="watch-card" aria-label="À regarder">
    <TwitchLink v-if="twitchLive" />
    <TrailerCard v-else />
  </aside>
</template>

<style scoped>
/* A slim panel: it takes the height its row gives it, what it shows centred. */
.watch-card { display: flex; flex-direction: column; justify-content: center; min-width: 0; padding: 0.4rem; border-radius: 14px; border: 2px solid rgb(255 255 255 / 0.14); background: var(--panel-background); box-shadow: var(--panel-shadow); }
</style>
