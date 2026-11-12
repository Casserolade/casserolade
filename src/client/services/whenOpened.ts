/** A page the browser prepares in advance (Chrome's prerendering, while an address is typed) is not yet open. */
function isPrerendering(): boolean {
  return Boolean((document as Document & { prerendering?: boolean }).prerendering);
}

/**
 * Runs what counts a visit once the page is really opened: right away, or when the browser shows the page it had
 * prepared. A prepared page nobody opens counts nothing.
 */
export function whenOpened(callback: () => void): void {
  if (isPrerendering()) document.addEventListener('prerenderingchange', callback, { once: true });
  else callback();
}
