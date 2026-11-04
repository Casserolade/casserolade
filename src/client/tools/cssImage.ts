import { assetUrl } from '#src/client/tools/assetUrl.ts';

/** A manifest path as a CSS image, or nothing at all when the asset does not exist. */
export function cssImage(relativePath: string | undefined): string {
  return relativePath ? `url("${assetUrl(relativePath)}")` : 'none';
}
