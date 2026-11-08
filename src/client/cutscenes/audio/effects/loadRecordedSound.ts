import { gameArt } from '#src/client/stores/gameArt.ts';
import { assetUrl } from '#src/client/tools/assetUrl.ts';

/** Each recorded sound, loaded once. */
const recordings = new Map<string, Promise<AudioBuffer | null>>();

function fetchRecording(context: BaseAudioContext, name: string, path: string): Promise<AudioBuffer | null> {
  return fetch(assetUrl(path))
    .then((response) => response.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .catch((error: unknown) => {
      console.error('Recorded sound could not load', name, error);
      return null;
    });
}

/**
 * A recorded sound effect of the manifest (`sons.bruitages`), decoded. Null when the manifest has none, or not yet,
 * or it fails to load: the made part then plays alone.
 */
export function loadRecordedSound(context: BaseAudioContext, name: string): Promise<AudioBuffer | null> {
  const known = recordings.get(name);
  if (known) return known;
  const path = gameArt.manifest.value.sons.bruitages?.[name];
  if (!path) return Promise.resolve(null);
  const loading = fetchRecording(context, name, path);
  recordings.set(name, loading);
  return loading;
}
