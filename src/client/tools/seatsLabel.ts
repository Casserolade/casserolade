/** How many sit at a table, out of its seats, in words: « 3 joueurs sur 8 ». */
export function seatsLabel(players: number, seats: number): string {
  return `${players} ${players > 1 ? 'joueurs' : 'joueur'} sur ${seats}`;
}
