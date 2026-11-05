import type { Declencheur } from '#src/data/histoire/chapitres.ts';

/**
 * What the tutorial points at for each step, as selectors tried in order: the first one on the
 * table wins. A card already in hand comes before the same card still in the shop.
 */
export const TUTORIAL_TARGETS: Partial<Record<Declencheur, string[]>> = {
  premier_achat: ['.shop-zone .item.minion'],
  premiere_pose: ['.hand-zone .card:not(.spell)'],
  combat: ['button.ready'],
  echelon: ['[data-control="upgrade"]'],
  actualise: ['[data-control="roll"]'],
  gel: ['[data-control="freeze"]'],
  annonce: ['.hand-zone [data-card="kazib"]', '.shop-zone [data-card="kazib"]'],
  premier_sort: ['.hand-zone [data-card="tract"]', '.hand-zone .card.spell', '.shop-zone .item.card:not([data-card="casserole"])'],
  porte_parole: ['.hand-zone [data-card="delogu"]', '.shop-zone [data-card="delogu"]'],
  immunite: ['.hand-zone [data-card="gueant"]', '.shop-zone [data-card="gueant"]'],
  fin_de_tour: ['.hand-zone [data-card="durif"]', '.shop-zone [data-card="durif"]', 'button.ready'],
  deplace: ['.board-zone .slot.movable'],
  casserole_posee: ['.hand-zone [data-card="casserole"]', '.shop-zone [data-card="casserole"]'],
  scandale: ['.hand-zone [data-card="casserole"]', '.shop-zone [data-card="casserole"]'],
  triple: ['.hand-zone [data-card="cheminade"]', '.shop-zone [data-card="cheminade"]'],
  decouvrir: ['.discover .pick', '.hand-zone [data-card="investiture"]', '.hand-zone .card.golden'],
  oubli: ['.board-zone .medallion.is-scandal', '.board-zone'],
};
