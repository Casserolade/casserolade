<script setup lang="ts">
import { ref } from 'vue';
import RoundButton from '#src/client/components/atoms/RoundButton.vue';
import SoundSheet from '#src/client/components/organisms/SoundSheet.vue';

/**
 * The settings of a touch screen: one round button, which opens the settings' sheet (SoundSheet). What the slot holds
 * goes at the foot of the sheet (the door to leave a game, on the phone). Sized by --size on a parent.
 */
defineOptions({ inheritAttrs: false });
defineProps<{ label: string }>();
const open = ref(false);
</script>

<template>
  <RoundButton v-bind="$attrs" icon="settings" :label="label" aria-haspopup="dialog" @click="open = true" />
  <SoundSheet v-if="open" @close="open = false"><slot /></SoundSheet>
</template>
