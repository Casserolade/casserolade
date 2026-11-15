import { STUDIO_TICKER_LINES } from '#src/client/const/studioTickerLines.ts';

/**
 * The broadcast dressing of each TV set, on top of its picture: what a viewer would see on the channel. A ticker that
 * scrolls at the foot of the screen, a card in the lower left corner (a sign that changes, a counter, a running
 * clock), and small things that float up from it. Everything here mocks the show, never a person: no fact about
 * anyone is written in these lines.
 */
export interface StudioTicker {
  label: string;
  /** All the channel's lines (studioTickerLines.ts): each visit draws a few of them. */
  lines: string[];
}

export type StudioCard =
  /** Texts that take turns. */
  | { kind: 'sign'; texts: string[]; seconds: number }
  /** A label, and a value that changes every `seconds`. `note`: a word under it. */
  | { kind: 'counter'; label: string; values: string[]; seconds: number; note?: string }
  /** A clock from `from` seconds: it counts up, or down to zero and starts again. */
  | { kind: 'clock'; label: string; from: number; direction: 'up' | 'down' }
  /** Two speaking times: one runs while the other waits, and they swap every `swapSeconds`. */
  | { kind: 'duel'; label: string; from: [number, number]; swapSeconds: number };

export interface StudioFloaters {
  /** What floats up: a short text, or steam. */
  glyph: string | 'steam';
  count: number;
}

export interface StudioDetail {
  /** The band's colour and the colour of what is written on it. */
  band: string;
  ink: string;
  ticker?: StudioTicker;
  card?: StudioCard;
  floaters?: StudioFloaters;
}

export const STUDIO_DETAILS: Record<string, StudioDetail> = {
  france3: {
    band: '#1d4f91', ink: '#ffffff',
    ticker: { label: 'France 3 Région', lines: STUDIO_TICKER_LINES.france3 },
    card: { kind: 'sign', seconds: 5, texts: ['Dans un instant : le concours de labour', 'Dans un instant : la fête de l\'andouille', 'Dans un instant : vous'] },
  },
  hanouna: {
    band: '#ff3fa4', ink: '#ffffff',
    ticker: { label: 'En direct', lines: STUDIO_TICKER_LINES.hanouna },
    card: { kind: 'sign', seconds: 2.4, texts: ['Applaudissez', 'Riez', 'Plus fort', 'Huez'] },
    floaters: { glyph: 'HA', count: 5 },
  },
  cnews: {
    band: '#d3121f', ink: '#ffffff',
    ticker: { label: 'L\'Heure des pros', lines: STUDIO_TICKER_LINES.cnews },
    card: { kind: 'counter', label: 'Chroniqueurs d\'accord', seconds: 4, values: ['4 sur 5', '5 sur 5', '5 sur 5, plus fort'] },
  },
  lcp: {
    band: '#8a1f2b', ink: '#ffffff',
    ticker: { label: 'LCP', lines: STUDIO_TICKER_LINES.lcp },
    card: { kind: 'counter', label: 'Téléspectateurs', seconds: 3.5, values: ['11', '10', '11', '12', '11', '9'] },
    floaters: { glyph: 'Zzz', count: 3 },
  },
  public_senat: {
    band: '#7a2416', ink: '#ffe9c2',
    ticker: { label: 'Public Sénat', lines: STUDIO_TICKER_LINES.public_senat },
    card: { kind: 'clock', label: 'Séance en cours depuis', from: 4 * 3600 + 12 * 60, direction: 'up' },
    floaters: { glyph: 'Zzz', count: 4 },
  },
  lci: {
    band: '#0d57a6', ink: '#ffffff',
    ticker: { label: '24 h Pujadas', lines: STUDIO_TICKER_LINES.lci },
    card: { kind: 'counter', label: 'Experts en plateau', seconds: 4.5, values: ['6', '7', '8', '7', '9'] },
  },
  bfm: {
    band: '#e2001a', ink: '#ffffff',
    ticker: { label: 'Alerte info', lines: STUDIO_TICKER_LINES.bfm },
    card: { kind: 'sign', seconds: 3, texts: ['Priorité au direct', 'Édition spéciale', 'Alerte info'] },
  },
  c_a_vous: {
    band: '#b5651d', ink: '#fff3dc',
    ticker: { label: 'À table', lines: STUDIO_TICKER_LINES.c_a_vous },
    card: { kind: 'sign', seconds: 5, texts: ['Au menu : langue de bois, sauce gribiche', 'Au menu : éléments de langage en croûte', 'Au menu : promesse flambée', 'En dessert : un démenti'] },
    floaters: { glyph: 'steam', count: 4 },
  },
  quotidien: {
    band: '#f2a900', ink: '#1a1208',
    ticker: { label: 'Quotidien', lines: STUDIO_TICKER_LINES.quotidien },
    card: { kind: 'counter', label: 'Archive retrouvée', seconds: 3, values: ['2014', '2009', '1997', '2017', '2002', '2011'] },
  },
  france2_dimanche: {
    band: '#16306b', ink: '#ffffff',
    ticker: { label: 'Le dimanche politique', lines: STUDIO_TICKER_LINES.france2_dimanche },
    card: { kind: 'clock', label: 'Il vous reste', from: 5 * 60, direction: 'down' },
  },
  grand_oral: {
    band: '#12306e', ink: '#ffffff',
    ticker: { label: 'Le Grand Oral', lines: STUDIO_TICKER_LINES.grand_oral },
    card: { kind: 'counter', label: 'Chiffre avancé', note: 'à vérifier', seconds: 3, values: ['47,3 %', '1 sur 3', '12 milliards', '+ 0,4 point', '62 %', '3 fois plus'] },
  },
  france2_prime: {
    band: '#c1121f', ink: '#ffffff',
    ticker: { label: 'Soirée électorale', lines: STUDIO_TICKER_LINES.france2_prime },
    card: { kind: 'clock', label: 'Temps restant', from: 4 * 60, direction: 'down' },
  },
  tf1_20h: {
    band: '#0a3d91', ink: '#ffffff',
    ticker: { label: 'Le 20 heures', lines: STUDIO_TICKER_LINES.tf1_20h },
    card: { kind: 'clock', label: 'Il vous reste', from: 6 * 60, direction: 'down' },
  },
  tf1_second_tour: {
    band: '#1b1f3a', ink: '#ffffff',
    ticker: { label: 'Le débat', lines: STUDIO_TICKER_LINES.tf1_second_tour },
    card: { kind: 'duel', label: 'Temps de parole', from: [14 * 60 + 32, 14 * 60 + 58], swapSeconds: 7 },
  },
};
