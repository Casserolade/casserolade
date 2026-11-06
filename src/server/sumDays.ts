import { LOCAL_MODES } from '../protocol/counterEvent.ts';
import type { LocalMode } from '../protocol/counterEvent.ts';
import { emptyGameCount } from './statsData.ts';
import type { DayStats, GameCount } from './statsData.ts';

export interface DayTotals {
  jours: number;
  /** Visitor-days: a browser that came back on another day counts again. */
  visiteurs: number;
  /** Browsers that came for the first time: across days, each counts once. */
  nouveaux: number;
  pages: number;
  local: Record<LocalMode, GameCount>;
  parties: number;
  joueurs: number;
}

/** The totals of a run of days, the whole history for one. */
export function sumDays(days: readonly DayStats[]): DayTotals {
  const local = Object.fromEntries(LOCAL_MODES.map((mode) => [mode, emptyGameCount()])) as Record<LocalMode, GameCount>;
  const totals: DayTotals = { jours: days.length, visiteurs: 0, nouveaux: 0, pages: 0, local, parties: 0, joueurs: 0 };
  for (const day of days) {
    totals.visiteurs += day.visiteurs;
    totals.nouveaux += day.nouveaux;
    totals.pages += Object.values(day.pages).reduce((sum, value) => sum + value, 0);
    totals.parties += day.parties;
    totals.joueurs += day.joueurs;
    for (const mode of LOCAL_MODES) {
      totals.local[mode].lancees += day.local[mode].lancees;
      totals.local[mode].finies += day.local[mode].finies;
      totals.local[mode].gagnees += day.local[mode].gagnees;
    }
  }
  return totals;
}
