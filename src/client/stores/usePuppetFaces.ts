import { onUnmounted, ref } from 'vue';

/**
 * The face a table puppet shows for a moment, South Park style: another face at once, turned the other way,
 * then back to its own face, the right way round, so that the card stays easy to recognise.
 */
export function usePuppetFaces() {
  const face = ref<string | null>(null);
  const turned = ref(false);
  let timer = 0;

  function show(name: string, milliseconds: number): void {
    window.clearTimeout(timer);
    face.value = name;
    turned.value = true;
    timer = window.setTimeout(() => {
      face.value = null;
      turned.value = false;
    }, milliseconds);
  }

  onUnmounted(() => window.clearTimeout(timer));
  return { face, turned, show };
}
