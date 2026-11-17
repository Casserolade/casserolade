/**
 * An online gesture made without a pseudo is held back once, to ask for one; made again, it goes through, under the
 * default name. True when this gesture is the one to hold back.
 */
export function shouldAskPseudo(pseudo: string, alreadyAsked: boolean): boolean {
  return pseudo.trim() === '' && !alreadyAsked;
}
