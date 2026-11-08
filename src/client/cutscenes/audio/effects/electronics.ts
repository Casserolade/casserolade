import { BEEP_TIMES } from '#src/client/const/beepTimes.ts';
import type { SoundEffect } from '#src/client/cutscenes/audio/effects/soundEffectTypes.ts';
import { heldGain } from '#src/client/cutscenes/audio/kit/envelopes.ts';
import { level, oscillator } from '#src/client/cutscenes/audio/kit/sources.ts';

/** The piezo of an electronic bracelet: shrill and flat, a hair out of tune with itself. */
const PIEZO_HERTZ = 3150;
const BEEP_SECONDS = 0.13;

/** An electronic bracelet calling its wearer to order: BIP BIP BIP, in time with its red light. */
export const BIP: SoundEffect = {
  seconds: (BEEP_TIMES.at(-1) ?? 0) + BEEP_SECONDS + 0.05,
  play(context, out, at) {
    for (const offset of BEEP_TIMES) {
      const begin = at + offset;
      const { gain, end } = heldGain(context, out, begin, 0.085, BEEP_SECONDS, { attack: 0.003, decay: 0.01, sustain: 0.9, release: 0.015 });
      oscillator(context, 'square', PIEZO_HERTZ, begin, end).connect(level(context, gain, 0.45));
      oscillator(context, 'sine', PIEZO_HERTZ * 1.006, begin, end).connect(gain);
    }
  },
};
