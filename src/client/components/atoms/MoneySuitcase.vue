<script setup lang="ts">
/**
 * A suitcase of banknotes, overstuffed: notes of 100, 500 and 50 euros sticking out of its lid and its side.
 * The reporter of the home page throws it into the Ko-fi link.
 */
</script>

<template>
  <svg class="money-suitcase" viewBox="0 0 68 50" aria-hidden="true">
    <g stroke-width="1.4">
      <rect x="9" y="9" width="24" height="11" rx="1.5" fill="#7cc36a" stroke="#2f5a26" transform="rotate(-14 21 14)" />
      <rect x="31" y="6" width="24" height="11" rx="1.5" fill="#a77bd6" stroke="#4a2a70" transform="rotate(9 43 11)" />
      <rect x="21" y="8" width="24" height="11" rx="1.5" fill="#f0a050" stroke="#7a3e10" transform="rotate(-3 33 13)" />
    </g>
    <path d="M26 15v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6" fill="none" stroke="#1a0d04" stroke-width="5" />
    <path d="M26 15v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6" fill="none" stroke="#8a4c1c" stroke-width="2" />
    <rect x="4" y="15" width="60" height="31" rx="5" fill="#6b3a16" stroke="#1a0d04" stroke-width="2.5" />
    <rect x="8" y="17.5" width="52" height="3" rx="1.5" fill="#a0602c" opacity="0.75" />
    <path d="M4.5 24h59" stroke="#2e1606" stroke-width="2" />
    <rect x="58" y="21" width="13" height="7" rx="1" fill="#7cc36a" stroke="#2f5a26" stroke-width="1.2" transform="rotate(16 64 24)" />
    <rect x="15" y="20.5" width="7" height="7.5" rx="1.5" fill="#ffd84a" stroke="#5a3a00" stroke-width="1.2" />
    <rect x="46" y="20.5" width="7" height="7.5" rx="1.5" fill="#ffd84a" stroke="#5a3a00" stroke-width="1.2" />
    <path d="M10 42h48" stroke="#4a2509" stroke-width="1.5" opacity="0.8" />
  </svg>
</template>

<style scoped>
.money-suitcase { display: block; width: 100%; height: auto; overflow: visible; filter: drop-shadow(0 3px 2px rgb(0 0 0 / 0.45)); }
</style>
