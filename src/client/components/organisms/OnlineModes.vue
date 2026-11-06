<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import HomeChoice from '#src/client/components/molecules/HomeChoice.vue';
import HomeSide from '#src/client/components/molecules/HomeSide.vue';
import RoomForm from '#src/client/components/molecules/RoomForm.vue';
import ShareButton from '#src/client/components/molecules/ShareButton.vue';
import { RANKED_QUEUE_OPEN } from '#src/client/const/rankedQueue.ts';
import type { ShareOutcome } from '#src/client/services/shareGame.ts';

const MAX_PSEUDO_LENGTH = 24;

/**
 * Online: a room with friends, by a link, and the ranked games, which open once enough people play at the same time.
 * The pseudo only matters here.
 */
defineProps<{ inviteCode: string; highlighted?: boolean; share: () => Promise<ShareOutcome> }>();
const pseudo = defineModel<string>('pseudo', { required: true });
const emit = defineEmits<{ create: []; join: [code: string]; public: [] }>();
</script>

<template>
  <HomeSide title="En ligne" icon="people" :highlighted="highlighted">
    <template #before>
      <label class="pseudo">Votre pseudo <input v-model="pseudo" :maxlength="MAX_PSEUDO_LENGTH" placeholder="Sans étiquette" autocomplete="nickname" /></label>
    </template>
    <HomeChoice title="Entre amis">
      <p v-if="inviteCode">On vous attend au salon <strong>{{ inviteCode }}</strong>.</p>
      <p v-else>Un lien à partager, sans compte. Les bots prennent les places vides.</p>
      <RoomForm :invite-code="inviteCode" @create="emit('create')" @join="(code) => emit('join', code)" />
    </HomeChoice>
    <HomeChoice title="Partie classée">
      <template v-if="RANKED_QUEUE_OPEN">
        <p>Des inconnus de votre niveau, avec un classement. Si la table vote pour, des bots prennent les places vides.</p>
        <AppButton primary @click="emit('public')">Entrer dans la file</AppButton>
      </template>
      <template v-else>
        <p>Des inconnus de votre niveau, avec un classement. Elle ouvrira quand il y aura assez de monde en ligne : faites passer le mot !</p>
        <ShareButton :share="share" />
      </template>
    </HomeChoice>
  </HomeSide>
</template>

<style scoped>
.pseudo { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.7rem; color: #fff; font: 400 1.3rem / 1 var(--font-number); letter-spacing: 1px; }
.pseudo input { flex: 1; min-width: 10em; max-width: 18em; font-family: var(--font-card); font-size: 1.05rem; letter-spacing: 0; }
</style>
