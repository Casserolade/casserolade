/** Saves a file on the player's device, through the browser's own download. */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // The download has its own copy once started.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
