import { emptyDay, emptyRunningTotals, STATS_FORMAT } from './statsData.ts';
import type { DayStats, StatsData } from './statsData.ts';

/** The fields of a day the server itself counts: they read the same in both formats. */
const SERVER_FIELDS = ['parties', 'partiesPubliques', 'joueurs', 'salonsCrees', 'picConnexions', 'incidents'] as const;

type SavedDay = Partial<DayStats> & { jour: string; visites?: number };

function count(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0;
}

/** A day of the first format: its server counts stay, its visits and visitors go apart, as the old measure. */
function fromFirstFormat(saved: SavedDay): DayStats {
  const day = emptyDay(saved.jour);
  for (const field of SERVER_FIELDS) day[field] = count(saved[field]);
  day.ancienneMesure = { visites: count(saved.visites), visiteurs: count(saved.visiteurs) };
  return day;
}

/** A day of the current format, completed with any field a later version added. */
function fromCurrentFormat(saved: SavedDay): DayStats {
  const day = emptyDay(saved.jour);
  return {
    ...day,
    ...saved,
    appareils: { ...day.appareils, ...saved.appareils },
    pages: { ...day.pages, ...saved.pages },
    local: { ...day.local, ...saved.local },
    heures: { ...day.heures, ...saved.heures },
    sources: { ...saved.sources },
  };
}

/**
 * The statistics file as saved, in either format. A damaged or unreadable file gives empty statistics: the game
 * does not depend on them.
 */
export function readStatsData(text: string): StatsData {
  let saved: { format?: number; days?: SavedDay[]; incidents?: StatsData['incidents']; cumul?: Partial<StatsData['cumul']> };
  try {
    saved = JSON.parse(text) as typeof saved;
  } catch {
    return { days: [], incidents: [], cumul: emptyRunningTotals() };
  }
  const days = (saved.days ?? []).filter((day) => typeof day?.jour === 'string');
  const current = saved.format === STATS_FORMAT;
  return {
    days: days.map(current ? fromCurrentFormat : fromFirstFormat),
    incidents: saved.incidents ?? [],
    cumul: { ...emptyRunningTotals(), ...(current ? saved.cumul : {}) },
  };
}
