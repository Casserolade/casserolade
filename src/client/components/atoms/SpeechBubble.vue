<script setup lang="ts">
import { useSlots } from 'vue';
import type { VNode } from 'vue';

/** Past two lines, an oval cuts the first and the last one: the bubble squares off, its corners still round. */
const LONG_TEXT = 64;

/** A manga speech bubble: white, thick black outline, the tail toward whoever speaks. */
withDefaults(defineProps<{ tail?: 'left' | 'right' | 'down' | 'up'; shout?: boolean }>(), { tail: 'left' });
const slots = useSlots();

function textOf(nodes: VNode[] | undefined): string {
  return (nodes ?? []).map((node) => {
    if (typeof node.children === 'string') return node.children;
    return Array.isArray(node.children) ? textOf(node.children as VNode[]) : '';
  }).join('');
}

/** Read at each render: the words may change while the bubble stays. */
function isLong(): boolean {
  return textOf(slots.default?.()).length > LONG_TEXT;
}
</script>

<template>
  <span class="bubble" :class="[`tail-${tail}`, { shout, long: isLong() }]"><span class="words"><slot /></span></span>
</template>

<style scoped>
.bubble {
  position: relative;
  display: inline-block;
  max-width: 100%;
  padding: calc(var(--s) * 12) calc(var(--s) * 20);
  border: calc(var(--s) * 4) solid #111;
  border-radius: 50% / 46%;
  background: #fff;
  color: #111;
  font: 700 calc(var(--s) * 24) / 1.18 var(--font-card);
  text-align: center;
  text-shadow: none;
  box-shadow: calc(var(--s) * 5) calc(var(--s) * 6) 0 rgb(0 0 0 / 0.35);
  animation: bubble-pop 0.28s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.words { display: block; padding: 0 calc(var(--s) * 6); }
.shout { border-radius: calc(var(--s) * 22); background: #fffbe0; font-weight: 800; }
.long { border-radius: calc(var(--s) * 34); padding: calc(var(--s) * 14) calc(var(--s) * 22); }
.bubble::before, .bubble::after { content: ''; position: absolute; width: 0; height: 0; border-style: solid; }
.tail-left::before { left: calc(var(--s) * -26); top: 50%; border-width: calc(var(--s) * 12) calc(var(--s) * 30) calc(var(--s) * 12) 0; border-color: transparent #111 transparent transparent; translate: 0 -30%; rotate: -12deg; }
.tail-left::after { left: calc(var(--s) * -18); top: 50%; border-width: calc(var(--s) * 8) calc(var(--s) * 22) calc(var(--s) * 8) 0; border-color: transparent #fff transparent transparent; translate: 0 -10%; rotate: -12deg; }
.tail-right::before { right: calc(var(--s) * -26); top: 50%; border-width: calc(var(--s) * 12) 0 calc(var(--s) * 12) calc(var(--s) * 30); border-color: transparent transparent transparent #111; translate: 0 -30%; rotate: 12deg; }
.tail-right::after { right: calc(var(--s) * -18); top: 50%; border-width: calc(var(--s) * 8) 0 calc(var(--s) * 8) calc(var(--s) * 22); border-color: transparent transparent transparent #fff; translate: 0 -10%; rotate: 12deg; }
.tail-down::before { left: 30%; bottom: calc(var(--s) * -30); border-width: calc(var(--s) * 30) calc(var(--s) * 14) 0 calc(var(--s) * 6); border-color: #111 transparent transparent transparent; }
.tail-down::after { left: calc(30% + var(--s) * 4); bottom: calc(var(--s) * -20); border-width: calc(var(--s) * 22) calc(var(--s) * 9) 0 calc(var(--s) * 3); border-color: #fff transparent transparent transparent; }
.tail-up::before { left: 30%; top: calc(var(--s) * -30); border-width: 0 calc(var(--s) * 14) calc(var(--s) * 30) calc(var(--s) * 6); border-color: transparent transparent #111 transparent; }
.tail-up::after { left: calc(30% + var(--s) * 4); top: calc(var(--s) * -20); border-width: 0 calc(var(--s) * 9) calc(var(--s) * 22) calc(var(--s) * 3); border-color: transparent transparent #fff transparent; }
@keyframes bubble-pop { from { transform: scale(0.3); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .bubble { animation: none; } }
</style>
