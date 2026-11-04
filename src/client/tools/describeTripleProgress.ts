/** For a card in the shop, given how many copies count toward a triple, in hand or on the board. */
export function describeTripleProgress(ownedCopies: number): string {
  return ownedCopies >= 2 ? 'Triple si vous recrutez !' : `${ownedCopies}/3 déjà à vous`;
}
