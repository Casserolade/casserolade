<script setup lang="ts">
import AppButton from '#src/client/components/atoms/AppButton.vue';
import DiscordCall from '#src/client/components/molecules/DiscordCall.vue';
import HomeChoice from '#src/client/components/molecules/HomeChoice.vue';
import HomeSide from '#src/client/components/molecules/HomeSide.vue';
import LiveTally from '#src/client/components/molecules/LiveTally.vue';
import RoomForm from '#src/client/components/molecules/RoomForm.vue';
import TwitchLink from '#src/client/components/molecules/TwitchLink.vue';
import { RANKED_QUEUE_OPEN } from '#src/client/const/rankedQueue.ts';
import type { LiveTallyItem } from '#src/client/tools/liveTallyItems.ts';

const MAX_PSEUDO_LENGTH = 24;

/**
 * Online, the first side of the home page: who is here right now, the community's Discord to find players, a room
 * with friends, by a link, and, quieter, the Twitch channel. The ranked games only show once they open. The pseudo
 * only matters here.
 */
defineProps<{ inviteCode: string; live: LiveTallyItem[]; discordMembers: string | null }>();
const pseudo = defineModel<string>('pseudo', { required: true });
const emit = defineEmits<{ create: []; join: [code: string]; public: [] }>();
</script>

<template>
  <HomeSide title="En ligne" icon="people" highlighted :columns="1">
    <template #aside><LiveTally :items="live" /></template>
    <DiscordCall :members="discordMembers" />
    <HomeChoice title="Entre amis">
      <p v-if="inviteCode">On vous attend au salon <strong>{{ inviteCode }}</strong>.</p>
      <RoomForm :invite-code="inviteCode" @create="emit('create')" @join="(code) => emit('join', code)">
        <label class="pseudo">Votre pseudo <input v-model="pseudo" :maxlength="MAX_PSEUDO_LENGTH" placeholder="Sans étiquette" autocomplete="nickname" /></label>
      </RoomForm>
    </HomeChoice>
    <HomeChoice v-if="RANKED_QUEUE_OPEN" title="Partie classée">
      <p>Des inconnus de votre niveau, avec un classement. Si la table vote pour, des bots prennent les places vides.</p>
      <AppButton primary @click="emit('public')">Entrer dans la file</AppButton>
    </HomeChoice>
    <TwitchLink />
  </HomeSide>
</template>

<style scoped>
.pseudo input { width: 13em; max-width: 100%; }
</style>
