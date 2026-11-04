import type { StudioLook } from '#src/client/const/studioLights.ts';

export interface StudioElements {
  beams: Record<string, string>[];
  crowd: Record<string, string>[];
  flashes: Record<string, string>[];
}

/** A number between 0 and 1 that looks random and stays the same from one render to the next. */
function scatter(seed: number): number {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function beamStyle(look: StudioLook, index: number): Record<string, string> {
  return {
    '--beam-x': `${((index + 0.5) / look.beams) * 100}%`,
    '--beam-color': look.colors[index % look.colors.length],
    '--beam-swing': `${12 + scatter(index + 1) * 16}deg`,
    '--beam-seconds': `${5 + scatter(index + 7) * 6}s`,
    '--beam-delay': `${-scatter(index + 13) * 8}s`,
  };
}

function personStyle(index: number): Record<string, string> {
  const isLeft = index % 2 === 0;
  const place = Math.floor(index / 2);
  return {
    '--person-side': `${1 + place * 2.6 + scatter(index + 3) * 1.4}%`,
    // Their feet are below the screen: nobody floats. The front row is the largest, and on top.
    '--person-row': `${-2.5 + (2 - (place % 3)) * 4.5}rem`,
    '--person-size': `${5.5 + (place % 3) * 1.3 + scatter(index + 9)}rem`,
    '--person-depth': String(place % 3),
    '--person-seconds': `${0.7 + scatter(index + 11) * 0.8}s`,
    '--person-delay': `${-scatter(index + 17)}s`,
    '--person-color': `hsl(${Math.floor(scatter(index + 19) * 360)} 20% ${10 + scatter(index + 23) * 10}%)`,
    ...(isLeft ? { left: 'var(--person-side)' } : { right: 'var(--person-side)' }),
  };
}

function flashStyle(index: number): Record<string, string> {
  return {
    '--flash-x': `${scatter(index + 29) < 0.5 ? 2 + scatter(index + 31) * 16 : 82 + scatter(index + 31) * 16}%`,
    '--flash-y': `${48 + scatter(index + 37) * 30}%`,
    '--flash-seconds': `${3 + scatter(index + 41) * 5}s`,
    '--flash-delay': `${-scatter(index + 43) * 8}s`,
  };
}

/** Where every spotlight, spectator and camera flash of a TV set goes. */
export function studioElements(look: StudioLook): StudioElements {
  return {
    beams: Array.from({ length: look.beams }, (_, index) => beamStyle(look, index)),
    crowd: Array.from({ length: look.crowd }, (_, index) => personStyle(index)),
    flashes: Array.from({ length: look.flashes }, (_, index) => flashStyle(index)),
  };
}
