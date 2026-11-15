import { circlePath } from '#src/client/tools/circlePath.ts';

/** One flat shape of a visitor's drawing: its outline and its colour. */
export interface VisitorShape {
  d: string;
  fill: string;
}

/**
 * What passes on a TV set's ticker now and then, a small thing the show is known for: it comes from the right, facing
 * left. `cross`: it goes by, from one edge to the other; `peek`: it comes in, stays a moment, and backs out;
 * `patrol`: it advances, steps back, advances again, and leaves.
 */
export interface StudioVisitor {
  /** The grid of its drawing, and how wide it is on the table (in the table's pixels). */
  grid: [width: number, height: number];
  width: number;
  shapes: VisitorShape[];
  move: 'cross' | 'peek' | 'patrol';
  /** It rumbles as it goes (an engine). */
  rumbles: boolean;
  /** One passage every so many seconds. */
  seconds: number;
}

const TYRE = '#26262b';
const RIM = '#f2c230';

export const STUDIO_VISITORS: Record<string, StudioVisitor> = {
  // France 3: the tractor of the ticker (« Circulation : un tracteur roule au pas »), at a tractor's pace.
  france3: {
    grid: [132, 86], width: 118, move: 'cross', rumbles: true, seconds: 46,
    shapes: [
      { d: circlePath(58, 10, 5), fill: '#dcdcdc' },
      { d: circlePath(50, 17, 4), fill: '#c9c9c9' },
      { d: 'M45 24h7v18h-7Z', fill: '#5b5b5b' },
      { d: 'M66 14h34v30H66Z', fill: '#efe7d2' },
      { d: 'M71 19h24v17H71Z', fill: '#9fd4ff' },
      { d: 'M14 44h54v-6h38v30H14Z', fill: '#d8352a' },
      { d: 'M14 48h7v16h-7Z', fill: TYRE },
      { d: circlePath(90, 62, 22), fill: TYRE },
      { d: circlePath(90, 62, 9), fill: RIM },
      { d: circlePath(30, 70, 13), fill: TYRE },
      { d: circlePath(30, 70, 5), fill: RIM },
    ],
  },
  // LCI: the arrow of the map (« La flèche avance, puis recule »).
  lci: {
    grid: [150, 60], width: 120, move: 'patrol', rumbles: false, seconds: 40,
    shapes: [
      { d: 'M3 30 48 4v15h99v22H48v15Z', fill: '#e3202b' },
      { d: 'M56 26h84v8H56Z', fill: '#ffffff' },
    ],
  },
  // Quotidien: the red microphone, held out from off screen (« Micro rouge en approche : souriez »).
  quotidien: {
    grid: [230, 60], width: 190, move: 'peek', rumbles: false, seconds: 38,
    shapes: [
      { d: 'M74 26h156v8H74Z', fill: TYRE },
      { d: 'M58 21h18v18H58Z', fill: '#c9c9c9' },
      { d: 'M4 30a30 25 0 1 0 60 0a30 25 0 1 0-60 0Z', fill: '#e02424' },
      { d: circlePath(32, 30, 12), fill: '#ffffff' },
      { d: circlePath(32, 30, 6.5), fill: '#e02424' },
      { d: 'M35 36l4-4 9 9-4 4Z', fill: '#ffffff' },
    ],
  },
};
