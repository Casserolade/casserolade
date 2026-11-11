import type { Consigne } from '#src/histoire/tutoriel.ts';

/** One ring: selectors tried in order, the first one on the table wins. A card already in hand comes before the same card still in the shop. */
type Ring = string[];

const BUDGET: Ring = ['[data-control="budget"]'];
const READY: Ring = ['button.ready'];

/**
 * What the tutorial points at for each instruction: one ring per group. The budget is ringed whenever an instruction
 * talks about it, so that no one has to look for it.
 */
export const TUTORIAL_TARGETS: Partial<Record<Consigne['cle'], Ring[]>> = {
  premier_achat: [BUDGET, ['.shop-zone .item.minion']],
  premiere_pose: [['.hand-zone .card:not(.spell)']],
  combat: [BUDGET, READY],
  echelon: [['[data-control="upgrade"]']],
  actualise: [BUDGET, ['[data-control="roll"]']],
  gel: [['[data-control="freeze"]'], ['.shop-zone [data-card="cheminade"]']],
  annonce: [['.hand-zone [data-card="kazib"]', '.shop-zone [data-card="kazib"]']],
  premier_sort: [['.hand-zone [data-card="tract"]', '.hand-zone .card.spell']],
  porte_parole: [['.hand-zone [data-card="delogu"]', '.shop-zone [data-card="delogu"]']],
  immunite: [['.hand-zone [data-card="gueant"]', '.shop-zone [data-card="gueant"]']],
  fin_de_tour: [['.hand-zone [data-card="durif"]', '.shop-zone [data-card="durif"]']],
  deplace: [['.board-zone .slot.movable']],
  casserole_posee: [['.hand-zone [data-card="casserole"]', '.shop-zone [data-card="casserole"]']],
  scandale: [['.hand-zone [data-card="casserole"]', '.shop-zone [data-card="casserole"]']],
  oubli: [['.hand-zone [data-card="bracelet_electronique"]', '.shop-zone [data-card="bracelet_electronique"]'], ['.board-zone .medallion.is-scandal']],
  triple: [BUDGET, ['.hand-zone [data-card="cheminade"]', '.shop-zone [data-card="cheminade"]']],
  decouvrir: [['.discover .pick', '.hand-zone [data-card="investiture"]', '.hand-zone .card.golden']],
  choix: [['.discover .pick']],
  plein: [['.board-zone']],
  sorts: [['.hand-zone .card.spell']],
  budget: [BUDGET, ['[data-control="roll"]']],
  pret: [READY, ['[data-control="freeze"]']],
};
