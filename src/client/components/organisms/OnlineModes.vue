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
 * Online, the first side of the home page: who is here right now, a room with friends, by a link, the community's
 * Discord to find players, and, quieter, the Twitch channel while it is live. The ranked games only show once they open. The pseudo
 * only matters here.
 */
defineProps<{ inviteCode: string; live: LiveTallyItem[]; discordMembers: string | null; twitchLive: boolean }>();
const pseudo = defineModel<string>('pseudo', { required: true });
const emit = defineEmits<{ create: []; join: [code: string]; public: [] }>();
</script>

<template>
  <HomeSide title="En ligne" icon="people" highlighted :columns="1">
    <template #aside><LiveTally :items="live" /></template>
    <HomeChoice title="Entre amis">
      <p v-if="inviteCode">On vous attend au salon <strong>{{ inviteCode }}</strong>.</p>
      <RoomForm :invite-code="inviteCode" @create="emit('create')" @join="(code) => emit('join', code)">
        <label class="pseudo">Votre pseudo <input v-model="pseudo" :maxlength="MAX_PSEUDO_LENGTH" placeholder="Sans étiquette" autocomplete="nickname" /></label>
      </RoomForm>
    </HomeChoice>
    <DiscordCall :members="discordMembers" />
    <HomeChoice v-if="RANKED_QUEUE_OPEN" title="Partie classée">
      <p>Des inconnus de votre niveau, avec un classement. Si la table vote pour, des bots prennent les places vides.</p>
      <AppButton primary @click="emit('public')">Entrer dans la file</AppButton>
    </HomeChoice>
    <TwitchLink v-if="twitchLive" />
  </HomeSide>
</template>

<style scoped>
/* The pseudo takes the room the code leaves: it is the longer of the two. */
.pseudo { flex-grow: 2; }
</style>
