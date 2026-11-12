import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { DASHBOARD_NAMES } from '../src/server/dashboardNames.ts';
import type { ArchivedGame } from '../src/server/gameArchive.ts';
import type { LiveGame } from '../src/server/liveGames.ts';
import { SiteStats } from '../src/server/siteStats.ts';

/** Just enough of an element for the dashboard's scripts: attributes, children, text and classes. */
class FakeNode {
  tag: string;
  children: (FakeNode | string)[] = [];
  attributes = new Map<string, string>();
  classes = new Set<string>();
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  hidden = false;
  text = '';
  constructor(tag: string) {
    this.tag = tag;
  }
  set textContent(value: string) {
    this.children = [];
    this.text = value;
  }
  get textContent(): string {
    return this.text + this.children.map((child) => (typeof child === 'string' ? child : child.textContent)).join(' ');
  }
  get classList() {
    return { add: (name: string) => this.classes.add(name), remove: (name: string) => this.classes.delete(name) };
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
    if (name === 'class') this.classes = new Set(String(value).split(' '));
  }
  append(...nodes: (FakeNode | string)[]): void {
    this.children.push(...nodes);
  }
  prepend(...nodes: (FakeNode | string)[]): void {
    this.children.unshift(...nodes);
  }
  replaceChildren(...nodes: (FakeNode | string)[]): void {
    this.text = '';
    this.children = [...nodes];
  }
  addEventListener(): void {}
  /** Every element under this one, itself included. */
  all(): FakeNode[] {
    return [this, ...this.children.flatMap((child) => (typeof child === 'string' ? [] : child.all()))];
  }
}

/** The page's ids, an EventSource that the test feeds, and the two scripts run as the browser runs them. */
function openDashboard() {
  const elements = new Map<string, FakeNode>();
  const document = Object.assign(new EventTarget(), {
    body: Object.assign(new FakeNode('body'), { dataset: { base: '/stats/jeton' } }),
    createElement: (tag: string) => new FakeNode(tag),
    createElementNS: (_ns: string, tag: string) => new FakeNode(tag),
    getElementById(id: string): FakeNode {
      if (!elements.has(id)) elements.set(id, new FakeNode('div'));
      return elements.get(id) as FakeNode;
    },
  });
  const handlers = new Map<string, (message: { data: string }) => void>();
  class FakeEventSource {
    addEventListener(type: string, handler: (message: { data: string }) => void): void {
      handlers.set(type, handler);
    }
  }
  const context = { document, Node: FakeNode, CustomEvent, EventSource: FakeEventSource, localStorage: { getItem: () => null }, console };
  for (const name of ['frequentation.js', 'tableau.js']) runInNewContext(readFileSync(new URL(`../src/server/stats/${name}`, import.meta.url), 'utf8'), context);
  const emit = (type: string, data: unknown) => (handlers.get(type) as (message: { data: string }) => void)({ data: JSON.stringify(data) });
  return { emit, element: (id: string) => document.getElementById(id) };
}

const LIVE_GAME: LiveGame = {
  publique: false,
  minuteur: true,
  depuisMs: 5 * 60_000,
  manche: 6,
  phase: 'recrutement',
  sieges: [
    { heros: 'bardella', humain: true, connecte: false, repris: true, vivant: true, sondages: 21, echelon: 3, place: 0 },
    { heros: 'hollande', humain: false, connecte: false, repris: false, vivant: false, sondages: 0, echelon: 2, place: 8 },
  ],
};

test('the dashboard draws every section from the stream: games in progress, hours, the thirty days, solo and online results', () => {
  const stats = new SiteStats({ file: null, now: () => new Date('2026-11-10T19:30:00Z') });
  stats.record({ type: 'page', page: 'jeu', appareil: 'telephone', nouveau: true, premier: true, source: '' });
  stats.record({ type: 'fin', mode: 'solo', niveau: 'moyen', place: 2, manches: 12, heros: 'macron', gagnee: false, version: '0.3e' });
  stats.partieFinie({
    version: '0.3e', manches: 12, dureeMs: 20 * 60_000,
    joueurs: [{ siege: 0, niveau: null, repris: false, heros: 'bardella', place: 1, sondages: 9, echelon: 5, camp: 'rn', campCount: 5, plateau: [], casseroles: 1, scandales: 0, triples: 1, sorts: 2, actions: {} }],
  } as unknown as ArchivedGame);
  const snapshot = stats.snapshot({ connexions: 1, adresses: 1, salons: 1, enJeu: 1, enFile: 0, locales: 0, presents: 0 }, 'abc1234');
  const { emit, element } = openDashboard();
  emit('bonjour', {
    samples: [], events: [], jours: snapshot.days, totaux: snapshot.totaux, cumul: snapshot.cumul, incidents: [],
    parties: [LIVE_GAME], noms: DASHBOARD_NAMES, version: 'abc1234', demarrage: snapshot.startedAt,
  });
  const games = element('parties').textContent;
  assert.match(games, /Jordan Bardella 21 · éch\. 3/);
  assert.match(games, /François Hollande 8e/);
  assert.ok(element('parties').all().some((node) => node.classes.has('deco') && node.classes.has('repris')));
  assert.ok(element('heures').all().some((node) => node.tag === 'rect'), 'the hour bars are drawn');
  assert.match(element('jours').textContent, /10 nov/, 'the thirty days are drawn');
  assert.match(element('heros').textContent, /Emmanuel Macron/, 'the solo heroes come after the days, and are drawn too');
  assert.match(element('enligne').textContent, /Version 0\.3e/);
  assert.match(element('enligne').textContent, /Jordan Bardella/);
  assert.match(element('jour').textContent, /20 min/, 'the average length of the day\'s online games');
  emit('parties', []);
  assert.match(element('parties').textContent, /Aucune partie en ligne en ce moment/);
});
