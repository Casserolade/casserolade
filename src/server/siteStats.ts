import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * La fréquentation du site, jour par jour (heure de Paris). Seulement des nombres : aucune adresse n'est
 * gardée. Les visiteurs uniques sont comptés par une empreinte salée de leur adresse, en mémoire, le jour
 * même ; le sel change à chaque démarrage, et l'empreinte n'est jamais écrite.
 */
export interface DayStats {
  jour: string;
  /** Pages du jeu chargées. */
  visites: number;
  /** Adresses différentes ce jour-là (un redémarrage les recompte). */
  visiteurs: number;
  /** Parties lancées sur le serveur (les parties solo tournent dans la page, elles ne sont pas comptées ici). */
  parties: number;
  partiesPubliques: number;
  /** Humains assis dans ces parties. */
  joueurs: number;
  salonsCrees: number;
  picConnexions: number;
  incidents: number;
}

export interface StatsIncident {
  at: string;
  kind: string;
  code: string;
  round: number;
  message: string;
}

export interface LiveStats {
  connexions: number;
  adresses: number;
  salons: number;
  enJeu: number;
  enFile: number;
}

export interface StatsSnapshot {
  generatedAt: string;
  startedAt: string;
  version: string | null;
  memoryMb: number;
  live: LiveStats;
  days: DayStats[];
  incidents: StatsIncident[];
}

/** Ce qui est gardé : deux mois de jours, les vingt derniers incidents. */
const KEEP_DAYS = 62;
const KEEP_INCIDENTS = 20;
/** L'écriture sur le disque, au plus une fois par minute. */
const FLUSH_MS = 60_000;
const PARIS_DAY = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });

function emptyDay(jour: string): DayStats {
  return { jour, visites: 0, visiteurs: 0, parties: 0, partiesPubliques: 0, joueurs: 0, salonsCrees: 0, picConnexions: 0, incidents: 0 };
}

export interface SiteStatsOptions {
  /** Le fichier JSON des jours et des incidents, sur le volume privé. Sans lui, tout s'oublie au redémarrage. */
  file: string | null;
  now?: () => Date;
  /** Le sel des empreintes de visiteurs : aléatoire, propre à ce démarrage. */
  salt: string;
}

export class SiteStats {
  private readonly options: SiteStatsOptions;
  private readonly now: () => Date;
  private days: DayStats[] = [];
  private incidents: StatsIncident[] = [];
  private visitorsDay = '';
  private readonly visitors = new Set<string>();
  private dirty = false;
  private lastFlush = 0;
  readonly startedAt: Date;

  constructor(options: SiteStatsOptions) {
    this.options = options;
    this.now = options.now ?? (() => new Date());
    this.startedAt = this.now();
    if (options.file && existsSync(options.file)) {
      try {
        const saved = JSON.parse(readFileSync(options.file, 'utf8')) as { days?: DayStats[]; incidents?: StatsIncident[] };
        this.days = (saved.days ?? []).map((day) => ({ ...emptyDay(day.jour), ...day }));
        this.incidents = saved.incidents ?? [];
      } catch {
        // A damaged file: the statistics start again, the game does not care.
      }
    }
  }

  /** Une page du jeu chargée, depuis cette adresse. */
  visit(address: string): void {
    const day = this.today();
    day.visites++;
    if (this.visitorsDay !== day.jour) {
      this.visitors.clear();
      this.visitorsDay = day.jour;
    }
    const print = createHash('sha256').update(this.options.salt).update(address).digest('base64url');
    if (!this.visitors.has(print)) {
      this.visitors.add(print);
      day.visiteurs++;
    }
    this.dirty = true;
  }

  partie(publique: boolean, humains: number): void {
    const day = this.today();
    day.parties++;
    if (publique) day.partiesPubliques++;
    day.joueurs += humains;
    this.dirty = true;
  }

  salonCree(): void {
    this.today().salonsCrees++;
    this.dirty = true;
  }

  connexions(count: number): void {
    const day = this.today();
    if (count <= day.picConnexions) return;
    day.picConnexions = count;
    this.dirty = true;
  }

  incident(kind: string, code: string, round: number, message: string): void {
    this.today().incidents++;
    this.incidents = [{ at: this.now().toISOString(), kind, code, round, message }, ...this.incidents].slice(0, KEEP_INCIDENTS);
    this.dirty = true;
  }

  snapshot(live: LiveStats, version: string | null): StatsSnapshot {
    this.today();
    return {
      generatedAt: this.now().toISOString(),
      startedAt: this.startedAt.toISOString(),
      version,
      memoryMb: Math.round(process.memoryUsage().rss / 1_048_576),
      live,
      days: this.days.map((day) => ({ ...day })),
      incidents: this.incidents.map((incident) => ({ ...incident })),
    };
  }

  /** Écrit le fichier s'il a changé : à l'arrêt, et au plus une fois par minute sinon. */
  flush(force = true): void {
    const at = this.now().getTime();
    if (!this.dirty || !this.options.file || (!force && at - this.lastFlush < FLUSH_MS)) return;
    try {
      mkdirSync(dirname(this.options.file), { recursive: true });
      writeFileSync(this.options.file, JSON.stringify({ days: this.days, incidents: this.incidents }));
      this.dirty = false;
      this.lastFlush = at;
    } catch {
      // The disk refuses: the counts stay in memory, the next flush tries again.
    }
  }

  private today(): DayStats {
    const jour = PARIS_DAY.format(this.now());
    const last = this.days.at(-1);
    if (last?.jour === jour) return last;
    const day = emptyDay(jour);
    this.days = [...this.days, day].slice(-KEEP_DAYS);
    return day;
  }
}
