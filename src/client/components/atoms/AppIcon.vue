<script setup lang="ts">
import { ICON_GLYPHS } from '#src/client/const/iconGlyphs.ts';
import type { IconName } from '#src/client/const/iconGlyphs.ts';

defineProps<{ name: IconName }>();
</script>

<template>
  <span aria-hidden="true">{{ ICON_GLYPHS[name] }}</span>
</template>
