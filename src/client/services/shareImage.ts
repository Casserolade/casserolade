/** A canvas as a PNG file; null when the browser cannot make one. */
export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch (error) {
      console.error('The picture could not be made', error);
      resolve(null);
    }
  });
}

/** Copies a picture to the clipboard, to paste in a chat or a post. False when the browser refuses. */
export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch (error) {
    console.warn('The picture could not be copied', error);
    return false;
  }
}

function pictureFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/** The device has its own sharing sheet that takes a picture (a phone, mostly). */
export function canSharePicture(blob: Blob, filename: string): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [pictureFile(blob, filename)] });
  } catch {
    return false;
  }
}

/**
 * Hands the picture and its words to the device's sharing sheet: the player picks the app. False when nothing was
 * shared (refused, or closed without choosing).
 */
export async function sharePicture(blob: Blob, filename: string, text: string, url: string): Promise<boolean> {
  try {
    await navigator.share({ files: [pictureFile(blob, filename)], text, url });
    return true;
  } catch (error) {
    console.warn('The picture was not shared', error);
    return false;
  }
}
