/** The French ordinal mark after a place: « 1re », « 2e ». A place is feminine: « la 1re place ». */
export function ordinalSuffix(place: number): string {
  return place === 1 ? 're' : 'e';
}
