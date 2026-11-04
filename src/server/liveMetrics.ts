import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import type { EventLoopUtilization } from 'node:perf_hooks';
import type { LiveStats } from './siteStats.ts';

/**
 * Le serveur en temps réel, une mesure par seconde : la salle (connexions, parties, joueurs), le trafic
 * (messages et octets par seconde), et la santé du processus (latence et occupation de la boucle
 * d'événements, CPU, mémoire). Les cinq dernières minutes restent en mémoire pour le tableau de bord.
 */
export interface LiveSample extends LiveStats {
  /** Millisecondes depuis l'époque. */
  t: number;
  joueurs: number;
  messagesIn: number;
  messagesOut: number;
  kioOut: number;
  /** Latence de la boucle d'événements sur la seconde écoulée, en millisecondes. */
  boucleP50: number;
  boucleP99: number;
  boucleMax: number;
  /** Part du temps où la boucle travaillait, sur la seconde écoulée, en pour cent. */
  occupation: number;
  /** CPU du processus, en pour cent d'un cœur. */
  cpu: number;
  memoireMo: number;
  tasMo: number;
}

/** Un événement de la salle, poussé au tableau de bord dès qu'il arrive. */
export interface LiveEvent {
  t: number;
  type: 'partie' | 'salon' | 'incident' | 'demarrage';
  texte: string;
}

const HISTORY_SECONDS = 300;
/** La période d'échantillonnage de la latence : l'histogramme la compte dans chaque mesure, on la retranche. */
const LOOP_RESOLUTION_MS = 10;
const KEEP_EVENTS = 60;
const NS_PER_MS = 1e6;
const round1 = (value: number) => Math.round(value * 10) / 10;

export class LiveMetrics {
  private readonly loop: ReturnType<typeof monitorEventLoopDelay> = monitorEventLoopDelay({ resolution: LOOP_RESOLUTION_MS });
  private utilization: EventLoopUtilization = performance.eventLoopUtilization();
  private cpu = process.cpuUsage();
  private cpuAt = performance.now();
  private messagesIn = 0;
  private messagesOut = 0;
  private bytesOut = 0;
  private readonly samples: LiveSample[] = [];
  private readonly events: LiveEvent[] = [];
  private readonly listeners = new Set<(kind: 'sample' | 'event', payload: LiveSample | LiveEvent) => void>();

  constructor() {
    this.loop.enable();
  }

  received(): void {
    this.messagesIn++;
  }

  sent(bytes: number): void {
    this.messagesOut++;
    this.bytesOut += bytes;
  }

  /** La mesure de la seconde écoulée : appelée chaque seconde par le serveur, avec l'état de la salle. */
  sample(live: LiveStats, players: number, now = Date.now()): LiveSample {
    const elapsed = performance.now() - this.cpuAt;
    const cpu = process.cpuUsage(this.cpu);
    const utilization = performance.eventLoopUtilization(this.utilization);
    const memory = process.memoryUsage();
    // Le retard réel de la boucle : la mesure moins la période de l'échantillonneur, jamais négatif.
    const loopValue = (value: number) => (Number.isFinite(value) ? round1(Math.max(0, value / NS_PER_MS - LOOP_RESOLUTION_MS)) : 0);
    const sample: LiveSample = {
      ...live,
      t: now,
      joueurs: players,
      messagesIn: this.messagesIn,
      messagesOut: this.messagesOut,
      kioOut: round1(this.bytesOut / 1024),
      boucleP50: loopValue(this.loop.percentile(50)),
      boucleP99: loopValue(this.loop.percentile(99)),
      boucleMax: loopValue(this.loop.max),
      occupation: round1(utilization.utilization * 100),
      cpu: elapsed > 0 ? round1(((cpu.user + cpu.system) / 1000 / elapsed) * 100) : 0,
      memoireMo: round1(memory.rss / 1_048_576),
      tasMo: round1(memory.heapUsed / 1_048_576),
    };
    this.loop.reset();
    this.utilization = performance.eventLoopUtilization();
    this.cpu = process.cpuUsage();
    this.cpuAt = performance.now();
    this.messagesIn = 0;
    this.messagesOut = 0;
    this.bytesOut = 0;
    this.samples.push(sample);
    if (this.samples.length > HISTORY_SECONDS) this.samples.shift();
    for (const listener of this.listeners) listener('sample', sample);
    return sample;
  }

  event(type: LiveEvent['type'], texte: string, now = Date.now()): void {
    const event: LiveEvent = { t: now, type, texte };
    this.events.unshift(event);
    if (this.events.length > KEEP_EVENTS) this.events.pop();
    for (const listener of this.listeners) listener('event', event);
  }

  history(): { samples: LiveSample[]; events: LiveEvent[] } {
    return { samples: [...this.samples], events: [...this.events] };
  }

  /** Un abonné au flux : il reçoit chaque mesure et chaque événement. Renvoie de quoi le désabonner. */
  subscribe(listener: (kind: 'sample' | 'event', payload: LiveSample | LiveEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get subscribers(): number {
    return this.listeners.size;
  }

  stop(): void {
    this.loop.disable();
    this.listeners.clear();
  }
}
