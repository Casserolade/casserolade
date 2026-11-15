import type { Consigne } from '#src/histoire/tutoriel.ts';

/** One ring: selectors tried in order, the first one on the table wins. A card already in hand comes before the same card still in the shop. */
type Ring = string[];

const BUDGET: Ring = ['[data-control="budget"]'];
const READY: Ring = ['button.ready'];
const ROLL: Ring = ['[data-control="roll"]'];
const UPGRADE: Ring = ['[data-control="upgrade"]'];
const FREEZE: Ring = ['[data-control="freeze"]'];
const CASSEROLE: Ring = ['.hand-zone [data-card="casserole"]', '.shop-zone [data-card="casserole"]'];
const TO_PLAY: Ring = ['.hand-zone .card:not(.spell)'];

/** The card of a lesson: in hand once bought, in the shop before. */
function card(id: string): Ring {
  return [`.hand-zone [data-card="${id}"]`, `.shop-zone [data-card="${id}"]`];
}

/**
 * What the tutorial points at for each instruction: one ring per group. The budget is ringed whenever an instruction
 * talks about it, so that no one has to look for it. The freeze button is ringed by its own lesson only.
 */
export const TUTORIAL_TARGETS: Partial<Record<Consigne['cle'], Ring[]>> = {
  premier_achat: [BUDGET, ['.shop-zone .item.minion']],
  premiere_pose: [TO_PLAY],
  combat: [BUDGET, READY],
  annonce: [card('kazib')],
  premier_sort: [['.hand-zone [data-card="tract"]', '.hand-zone .card.spell']],
  actualise: [BUDGET, ROLL],
  echelon: [UPGRADE],
  porte_parole: [card('delogu')],
  immunite: [card('gueant')],
  fin_de_tour: [card('durif')],
  gel: [FREEZE, ['.shop-zone [data-card="kazib"]']],
  gele: [READY],
  triple: [BUDGET, ['.shop-zone [data-card="kazib"]']],
  decouvrir: [['.discover .pick', '.hand-zone [data-card="investiture"]', '.hand-zone .card.golden']],
  casserole_posee: [CASSEROLE],
  echelon_3: [UPGRADE],
  celebration: [card('morano')],
  scandale: [CASSEROLE],
  oubli: [card('bracelet_electronique'), ['.board-zone .medallion.is-scandal']],
  deplace: [['.board-zone .slot.movable']],
  renvoi: [['.board-zone']],
  choix: [['.discover .pick']],
  pose: [TO_PLAY],
  plein: [['.board-zone']],
  budget_achat: [BUDGET, ['.shop-zone .item.minion']],
  budget: [BUDGET, ROLL],
  depense: [BUDGET],
  sorts: [['.hand-zone .card.spell'], READY],
  pret: [READY],
};
