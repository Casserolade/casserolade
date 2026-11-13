import type { Params } from '../engine/types.ts';

/** Toutes les règles chiffrées du jeu. Le simulateur peut les faire varier. */
export const PARAMS: Params = {
  startBudget: 3,
  budgetPerRound: 1,
  maxBudget: 10,
  buyCost: 3,
  sellValue: 1,
  rollCost: 1,
  boardSize: 7,
  handSize: 10,
  // 30 pour tous les héros (13 novembre 2026) : leur armure s'y ajoute (`armor`, le socle électoral), de 0 à 20.
  // À 28 sans armure, la partie durait 12,6 manches et s'arrêtait une manche après l'échelon 6.
  startHp: 30,
  tierMax: 6,
  tierCost: { 2: 4, 3: 6, 4: 8, 5: 9, 6: 10 },
  shopSize: { 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 6 },
  copies: { 1: 15, 2: 13, 3: 11, 4: 9, 5: 7, 6: 7 },
  spellSlots: 1,
  spellDiscount: 0,
  damagePerSurvivor: 2,
  damageCaps: [
    [1, 5],
    [4, 10],
    [8, 15],
  ],
  capOffWhenAlive: 4,
  wearinessRound: 20,
  activeCamps: 5,
  casseroleFromRound: 3,
  casseroleOnRoll: true,
  braceletChance: 0.5,
  scandalThreshold: 2,
  scandalRounds: 2,
  heroChoices: 3,
};
