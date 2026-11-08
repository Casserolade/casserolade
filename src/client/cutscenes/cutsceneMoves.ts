import type gsap from 'gsap';
import type { CutsceneActor } from '#src/client/cutscenes/cutsceneActor.ts';
import { CUTSCENE_POSES } from '#src/client/const/cutscenePoses.ts';
import type { PoseShape } from '#src/client/const/cutscenePoses.ts';
import { strideBeats } from '#src/client/tools/strideBeats.ts';
import type { Allure, Pose } from '#src/data/histoire/cinematique.ts';

/**
 * How a paper body moves, as tweens added to a cutscene's timeline: the gaits, the poses, the falls. Each function
 * places its tweens at `at`, for `seconds`, and leaves the body in a known state at the end.
 */

/** One stride of each gait, in seconds: a walk, a run, a sprint. */
const STRIDE: Record<Allure, number> = { marche: 0.42, court: 0.31, sprint: 0.24, glisse: 0.08, recule: 0.07 };

function shapeOf(pose: Pose): PoseShape {
  return CUTSCENE_POSES[pose] ?? CUTSCENE_POSES.debout;
}

/** An odd number of half-strides fitting in `seconds`: a yoyo of that many repeats ends where it started. */
function halfStrides(seconds: number, half: number): number {
  return Math.max(1, Math.round(seconds / half)) | 1;
}

/** The body goes to a pose, its pieces turning about their joints. */
export function toPose(timeline: gsap.core.Timeline, actor: CutsceneActor, pose: Pose, at: number, seconds = 0.25): void {
  const shape = shapeOf(pose);
  const unit = Number.parseFloat(actor.figure.style.getPropertyValue('--u')) || 1;
  timeline.to(actor.armNear, { rotation: shape.armNear, duration: seconds, ease: 'back.out(1.6)' }, at);
  timeline.to(actor.armFar, { rotation: shape.armFar, duration: seconds, ease: 'back.out(1.6)' }, at);
  timeline.to([actor.legNear], { rotation: shape.legNear, duration: seconds, ease: 'power2.out' }, at);
  timeline.to([actor.legFar], { rotation: shape.legFar, duration: seconds, ease: 'power2.out' }, at);
  timeline.to(actor.head, { rotation: shape.head, duration: seconds, ease: 'power2.out' }, at);
  timeline.to(actor.figure, { y: shape.figureY * unit, rotation: shape.figureRotation, duration: seconds, ease: 'power2.out' }, at);
  timeline.to(actor.hop, { rotation: pose === 'allonge' ? -88 : 0, y: pose === 'allonge' ? -actor.height * 0.08 : 0, duration: seconds, ease: 'power2.out' }, at);
}

/** Waving, clapping, dancing: the pose moves for `seconds`, then it stands again. */
export function liveliness(timeline: gsap.core.Timeline, actor: CutsceneActor, pose: Pose, at: number, seconds: number): void {
  const beat = 0.2;
  const repeats = halfStrides(seconds - 0.3, beat);
  if (pose === 'salue') timeline.to(actor.armNear, { rotation: -105, duration: beat, yoyo: true, repeat: repeats, ease: 'sine.inOut' }, at + 0.25);
  if (pose === 'applaudit') {
    timeline.to(actor.armNear, { rotation: 75, duration: beat / 1.5, yoyo: true, repeat: repeats + 2, ease: 'power1.in' }, at + 0.25);
    timeline.to(actor.armFar, { rotation: -75, duration: beat / 1.5, yoyo: true, repeat: repeats + 2, ease: 'power1.in' }, at + 0.25);
  }
  if (pose === 'danse') {
    timeline.to(actor.armNear, { rotation: 40, duration: beat * 1.5, yoyo: true, repeat: repeats, ease: 'sine.inOut' }, at + 0.25);
    timeline.to(actor.armFar, { rotation: -120, duration: beat * 1.5, yoyo: true, repeat: repeats, ease: 'sine.inOut' }, at + 0.25);
    timeline.to(actor.figure, { rotation: 9, duration: beat * 1.5, yoyo: true, repeat: repeats, ease: 'sine.inOut' }, at + 0.25);
    timeline.to(actor.legNear, { rotation: -30, duration: beat * 1.5, yoyo: true, repeat: repeats, ease: 'sine.inOut' }, at + 0.25);
  }
  toPose(timeline, actor, 'debout', at + seconds);
}

/**
 * Its legs and arms while it goes for `seconds`. A walk faces us, waddling; a run is drawn side-on as South Park does:
 * the torso squeezed, both legs on one hip swinging fore and aft, the far limbs darker, the body leaning in.
 * At the end, it stands in `restingPose`.
 */
export function stride(timeline: gsap.core.Timeline, actor: CutsceneActor, gait: Allure, at: number, seconds: number, restingPose: Pose): void {
  const { halves, beat } = strideBeats(seconds, STRIDE[gait]);
  const unit = Number.parseFloat(actor.figure.style.getPropertyValue('--u')) || 1;
  const end = at + seconds;
  // A yoyo of `halves` half-strides, each `beat` long, ends where it started, at `end`; the body bobs twice as fast.
  const swing = { duration: beat, yoyo: true, repeat: halves - 1, ease: 'sine.inOut' };
  const bob = { duration: beat / 2, yoyo: true, repeat: halves * 2 - 1, ease: 'sine.inOut' };
  if (gait === 'glisse') {
    // Dragged against its will: the feet slide, the body leans back and shakes, the arms reach behind.
    timeline.to(actor.figure, { rotation: -16, duration: 0.15, ease: 'power2.out' }, at);
    timeline.to(actor.hop, { x: 6, duration: beat, yoyo: true, repeat: halves - 1, ease: 'steps(1)' }, at);
    timeline.to(actor.armNear, { rotation: 60, duration: 0.15 }, at);
    timeline.to(actor.armFar, { rotation: 40, duration: 0.15 }, at);
    timeline.set(actor.hop, { x: 0 }, end);
  } else if (gait === 'recule') {
    // Pulled backwards by the ankle: it leans towards where it wanted to go, both arms reaching for it, the near leg
    // dragged behind, the feet skidding.
    timeline.to(actor.figure, { rotation: 15, duration: 0.12, ease: 'power2.out' }, at);
    timeline.to(actor.armNear, { rotation: -105, duration: 0.12, ease: 'back.out(2)' }, at);
    timeline.to(actor.armFar, { rotation: -75, duration: 0.12, ease: 'back.out(2)' }, at);
    timeline.to(actor.legNear, { rotation: 38, duration: 0.12, ease: 'power2.out' }, at);
    timeline.to(actor.hop, { x: -5, duration: beat, yoyo: true, repeat: halves - 1, ease: 'steps(1)' }, at);
    timeline.set(actor.hop, { x: 0 }, end);
  } else if (gait === 'marche') {
    timeline.fromTo(actor.legNear, { rotation: -20 }, { rotation: 20, ...swing }, at);
    timeline.fromTo(actor.legFar, { rotation: 20 }, { rotation: -20, ...swing }, at);
    timeline.fromTo(actor.armNear, { rotation: 16 }, { rotation: -16, ...swing }, at);
    timeline.fromTo(actor.armFar, { rotation: -16 }, { rotation: 16, ...swing }, at);
    timeline.fromTo(actor.figure, { y: 0, rotation: -3 }, { y: -10 * unit, rotation: 3, ...bob }, at);
  } else {
    timeline.set(actor.torso, { scaleX: 0.62 }, at);
    timeline.set(actor.legFar, { xPercent: 14, scaleY: 1.35 }, at);
    timeline.set(actor.legNear, { xPercent: -14, scaleY: 1.35 }, at);
    timeline.set(actor.armFar, { xPercent: 26 }, at);
    timeline.set(actor.armNear, { xPercent: -26 }, at);
    timeline.set([actor.legFar, actor.armFar], { filter: 'brightness(0.62)' }, at);
    timeline.fromTo(actor.legNear, { rotation: 58 }, { rotation: -58, ...swing }, at);
    timeline.fromTo(actor.legFar, { rotation: -58 }, { rotation: 58, ...swing }, at);
    timeline.fromTo(actor.armNear, { rotation: -55 }, { rotation: 55, ...swing }, at);
    timeline.fromTo(actor.armFar, { rotation: 55 }, { rotation: -55, ...swing }, at);
    timeline.fromTo(actor.figure, { rotation: 10, y: 0 }, { rotation: 14, y: -40 * unit, ...bob }, at);
    timeline.fromTo(actor.head, { rotation: -8 }, { rotation: 8, ...swing }, at);
    timeline.set(actor.torso, { scaleX: 1 }, end);
    timeline.set([actor.legFar, actor.legNear], { xPercent: 0, scaleY: 1 }, end);
    timeline.set([actor.armFar, actor.armNear], { xPercent: 0 }, end);
    timeline.set([actor.legFar, actor.armFar], { filter: 'none' }, end);
  }
  toPose(timeline, actor, restingPose, end, 0.15);
}

/** It trips over its own feet: arms flung up, it falls flat on its face, the way it was going. */
export function trip(timeline: gsap.core.Timeline, actor: CutsceneActor, at: number, facing: number): void {
  timeline.to(actor.armNear, { rotation: -160, duration: 0.15, ease: 'power2.out' }, at);
  timeline.to(actor.armFar, { rotation: 160, duration: 0.15, ease: 'power2.out' }, at);
  timeline.to(actor.hop, { rotation: 84 * facing, duration: 0.45, ease: 'bounce.out' }, at + 0.1);
  timeline.to(actor.legNear, { rotation: -35, duration: 0.2, yoyo: true, repeat: 1 }, at + 0.1);
}

/** It slips (a banana peel): the feet fly up, the arms flail, and it lands flat on its back. */
export function slip(timeline: gsap.core.Timeline, actor: CutsceneActor, at: number): void {
  timeline.to([actor.legNear, actor.legFar], { rotation: -110, duration: 0.12, ease: 'power3.out' }, at);
  timeline.to(actor.armNear, { rotation: -170, duration: 0.12 }, at);
  timeline.to(actor.armFar, { rotation: 170, duration: 0.12 }, at);
  timeline.to(actor.hop, { y: -110, duration: 0.18, ease: 'power2.out' }, at);
  timeline.to(actor.hop, { rotation: -86, duration: 0.3, ease: 'power2.in' }, at + 0.05);
  timeline.to(actor.hop, { y: 0, duration: 0.25, ease: 'bounce.out' }, at + 0.18);
}

/** Back on its feet, from a fall, a trip or lying down. */
export function getUp(timeline: gsap.core.Timeline, actor: CutsceneActor, at: number, seconds: number): void {
  timeline.to(actor.hop, { rotation: 0, y: 0, duration: seconds, ease: 'back.out(2)' }, at);
  toPose(timeline, actor, 'debout', at, seconds);
}
