import gsap from 'gsap';
import { CUTSCENE_FLOORS, DEFAULT_FLOOR } from '#src/client/const/cutsceneFloors.ts';
import type { GameManifest } from '#src/client/const/gameManifest.ts';
import { createActor, faceVariables } from '#src/client/cutscenes/cutsceneActor.ts';
import type { CutsceneActor } from '#src/client/cutscenes/cutsceneActor.ts';
import { decorArt } from '#src/client/cutscenes/cutsceneArt.ts';
import { getUp, liveliness, slip, stride, toPose, trip } from '#src/client/cutscenes/cutsceneMoves.ts';
import { propArt } from '#src/client/cutscenes/cutsceneArt.ts';
import { createBubble, createCaption, createConfetti, createHostLine, createProp, createShout, createTicker, createTitle } from '#src/client/cutscenes/cutsceneOverlays.ts';
import { beep, createAnkleProp, walkOff } from '#src/client/cutscenes/cutscenePropMoves.ts';
import { addDecor, createStage } from '#src/client/cutscenes/cutsceneStage.ts';
import type { CutsceneStage, StageDecor } from '#src/client/cutscenes/cutsceneStage.ts';
import { actionSeconds } from '#src/client/tools/actionSeconds.ts';
import { cameraFraming } from '#src/client/tools/cameraFraming.ts';
import { hashText } from '#src/client/tools/hashText.ts';
import { ANIMATEURS } from '#src/data/animateurs.ts';
import { DUREES_VOIX } from '#src/data/dureesVoix.ts';
import type { Action, Allure, Aspect, Bord, Cadre, Cinematique, Plan, Pose, Role } from '#src/data/histoire/cinematique.ts';
import { createRng } from '#src/engine/rng.ts';
import '#src/client/cutscenes/cutscene.css';

const STAGE_WIDTH = 1920;
/** How far past an edge an actor waits, off stage. */
const OFF_STAGE = 380;
/** Talking: the jaw drops this far and tilts this much, at this beat. */
const JAW_DROP = 16;
const JAW_TILT = 3;
const JAW_BEAT = 0.085;
const SHAKE_PIXELS: Record<number, number> = { 1: 10, 2: 20, 3: 34 };
const CONFETTI_PIECES = 70;
/** In a chase, the one who follows is this far behind. */
const CHASE_GAP = 0.3;
const BUBBLE_MARGIN = 30;
/** Once the ticker is up, the captions and the hosts stand above it. */
const ABOVE_TICKER = -112;
const BONK_DISTANCE = 300;
/** At the back of the stage (depth 100), a puppet is this small and stands this much higher. */
const FAR_SCALE = 0.55;
const FAR_RISE = 230;
/** Props drawn in front of the puppets. */
const FRONT_PROPS = new Set(['pupitre', 'portique', 'urne']);
/** The props bigger than the rest, standing on the floor: a gate to walk through, a lectern to speak behind. */
const PROP_SIZES: Record<string, { width: number; height: number }> = {
  portique: { width: 330, height: 580 },
  pupitre: { width: 270, height: 250 },
  aimant: { width: 380, height: 400 },
  escalope: { width: 190, height: 120 },
  porte: { width: 250, height: 500 },
  banane: { width: 170, height: 124 },
  carapace: { width: 200, height: 166 },
  canape: { width: 700, height: 330 },
  chat: { width: 200, height: 150 },
};
const PROP_SIZE = { width: 220, height: 220 };
/** Thrown up, a prop breaks into this many pieces that land around. */
const SCATTER_PIECES = 7;
const HOLOGRAM_FILTER = 'sepia(1) hue-rotate(160deg) saturate(4) brightness(1.15) drop-shadow(0 0 18px #4fd2ff)';
const GHOST_FILTER = 'grayscale(1) brightness(1.35)';

export type CutsceneCue =
  | { at: number; kind: 'voice' | 'sfx' | 'music'; id: string }
  | { at: number; kind: 'music-stop' };

export interface CutsceneOptions {
  manifest: GameManifest;
  /** What a real voice lasts, in seconds. */
  voiceSeconds?: (key: string) => number | undefined;
  /** Called when a sound is due, in the game. A HyperFrames composition places its sounds from `cues` instead. */
  onCue?: (cue: CutsceneCue) => void;
  reducedMotion?: boolean;
}

/** What is on screen for a moment, and until when: the next one of its kind hides it early. */
interface Showing {
  element: HTMLElement;
  until: number;
}

/** Where an actor stands, as the build goes forward in time. */
interface Standing {
  /** Its feet, in stage pixels; null off stage. */
  feet: number | null;
  scale: number;
  y: number;
  facing: 1 | -1;
  pose: Pose;
}

const OFF: Standing = { feet: null, scale: 1, y: 0, facing: 1, pose: 'debout' };

/**
 * A career cutscene, built once from its script: its stage in a container, and one paused GSAP timeline that plays it.
 * Nothing in it reads a clock or an unseeded random: the same script draws the same frames, live in the game or seeked
 * frame by frame in a HyperFrames composition (`window.__timelines[id] = cutscene.timeline`).
 */
export class Cutscene {
  /** Nothing renders before its time: a tween placed later must not show its start at once (a flash, a stride). */
  readonly timeline = gsap.timeline({ paused: true, defaults: { immediateRender: false } });
  readonly cues: CutsceneCue[] = [];
  readonly duration: number;
  private readonly stage: CutsceneStage;
  private readonly manifest: GameManifest;
  private readonly voiceSeconds: (key: string) => number | undefined;
  private readonly reducedMotion: boolean;
  private readonly random: () => number;
  private readonly actors = new Map<string, CutsceneActor>();
  private readonly roles = new Map<string, Role>();
  private readonly standing = new Map<string, Standing>();
  private readonly decors = new Map<string, StageDecor>();
  private currentDecor: string;
  /** Where the feet rest in the current scene. */
  private floor: number;
  private readonly props = new Map<string, { type: string; text?: string }>();
  private readonly floorProps = new Map<string, HTMLElement>();
  private readonly heldProps = new Map<string, HTMLElement>();
  /** Props worn at an ankle, and by whom: the electronic bracelet. */
  private readonly wornProps = new Map<string, { element: HTMLElement; role: string }>();
  /** Props lying about in the current scene: a new scene clears them away. */
  private readonly lying = new Set<HTMLElement>();
  private readonly hologramSince = new Map<string, number>();
  /** Each one's cudgel, and the stars of each one's dizzy head, made the first time they are needed. */
  private readonly sticks = new Map<CutsceneActor, HTMLElement>();
  private readonly stars = new Map<CutsceneActor, { box: HTMLElement; orbits: HTMLElement[] }>();
  private readonly lastLine = new Map<string, Showing>();
  private lastCaption: Showing | null = null;
  private lastTitle: Showing | null = null;
  private lastTicker: HTMLElement | null = null;

  constructor(container: HTMLElement, script: Cinematique, options: CutsceneOptions) {
    this.duration = script.duree;
    this.manifest = options.manifest;
    this.voiceSeconds = options.voiceSeconds ?? ((key) => DUREES_VOIX[key]);
    this.reducedMotion = options.reducedMotion ?? false;
    this.random = createRng(hashText(script.id)).next;
    this.stage = createStage(container, script.style);
    this.currentDecor = script.decor;
    this.floor = CUTSCENE_FLOORS[script.decor] ?? DEFAULT_FLOOR;
    this.stage.root.style.setProperty('--floor', `${this.floor}px`);
    this.buildDecors(script);
    for (const role of script.distribution) this.addActor(role);
    for (const prop of script.accessoires ?? []) this.props.set(prop.id, { type: prop.type, text: prop.texte });
    gsap.set(this.stage.flash, { autoAlpha: 0 });
    this.sway();
    this.flicker();
    if (script.musique && script.musique !== 'aucune') {
      this.cues.push({ at: 0, kind: 'music', id: script.musique }, { at: script.duree, kind: 'music-stop' });
    }
    for (const plan of script.plans) this.addPlan(plan, script.style);
    for (const [role, since] of this.hologramSince) this.hologramFlicker(role, since, script.duree);
    // The timeline lasts exactly the cutscene, whatever ends early.
    this.timeline.set({}, {}, script.duree);
    if (options.onCue) for (const cue of this.cues) this.timeline.call(options.onCue, [cue], cue.at);
  }

  play(): void {
    this.timeline.play(0);
  }

  /** Straight to the end, without firing the sounds on the way. */
  finish(): void {
    this.timeline.progress(1, true);
    this.timeline.pause();
  }

  destroy(): void {
    this.timeline.kill();
    this.stage.root.remove();
  }

  // —— Building ——

  private buildDecors(script: Cinematique): void {
    const ids = new Set([script.decor, ...script.plans.flatMap((plan) => (plan.decor ? [plan.decor] : []))]);
    for (const id of ids) {
      const decor = addDecor(this.stage, decorArt(this.manifest, id));
      gsap.set([decor.back, decor.front].filter(Boolean), { autoAlpha: id === script.decor ? 1 : 0 });
      this.decors.set(id, decor);
    }
  }

  private addActor(role: Role): void {
    const actor = createActor(this.stage.actors, role, this.manifest);
    gsap.set(actor.root, { autoAlpha: 0, x: -OFF_STAGE - actor.width });
    this.actors.set(role.role, actor);
    this.roles.set(role.role, role);
    this.standing.set(role.role, OFF);
  }

  private addPlan(plan: Plan, style: Cinematique['style']): void {
    if (plan.decor) this.changeScene(plan.decor, plan.transition ?? 'coupe', plan.a);
    if (plan.cadre) this.frame(plan.cadre, plan.a, style);
    let speed = 1;
    for (const action of plan.actions) {
      if ('accelere' in action) speed = action.accelere;
      else this.add(action, plan.a + (action.delai ?? 0), speed);
    }
  }

  private actor(role: string): CutsceneActor | null {
    return this.actors.get(role) ?? null;
  }

  /**
   * It turns to a side. A cardboard sign with a name turns too, and so do the props in its hand (a Constitution, a
   * phone): their writing never reads backwards.
   */
  private turn(actor: CutsceneActor, side: 1 | -1, at: number): void {
    this.timeline.set(actor.facing, { scaleX: side }, at);
    this.timeline.set(actor.grip, { scaleX: side }, at);
    if (!actor.jaw) this.timeline.set(actor.head, { scaleX: side }, at);
  }

  /** The deeper it stands, the further back it is drawn. */
  private layer(actor: CutsceneActor, depth: number, at: number): void {
    this.timeline.set(actor.root, { zIndex: Math.round(100 - depth) }, at);
  }

  private stand(role: string): Standing {
    return this.standing.get(role) ?? OFF;
  }

  private update(role: string, change: Partial<Standing>): void {
    this.standing.set(role, { ...this.stand(role), ...change });
  }

  /** The size and the height of a puppet at this depth of the stage. */
  private depthOf(depth: number): { scale: number; y: number } {
    const share = Math.min(100, Math.max(0, depth)) / 100;
    return { scale: 1 - (1 - FAR_SCALE) * share, y: -FAR_RISE * share };
  }

  /** Every puppet sways on the spot, at twelve drawings a second, each at its own beat. */
  private sway(): void {
    for (const actor of this.actors.values()) {
      const beats = Math.ceil(this.duration / 0.5) + 1;
      this.timeline.fromTo(actor.sway, { rotation: -1.4, y: 0 }, { rotation: 1.4, y: -5, duration: 0.5, ease: 'steps(6)', yoyo: true, repeat: beats }, this.random() * 0.5);
    }
  }

  /** A silent film's grain flickers. */
  private flicker(): void {
    if (!this.stage.grain) return;
    this.timeline.fromTo(this.stage.grain, { opacity: 1 }, { opacity: 0.7, duration: 0.07, ease: 'steps(1)', yoyo: true, repeat: Math.ceil(this.duration / 0.07) }, 0);
  }

  // —— Scenes and the camera ——

  /**
   * A new scene: the set changes (or stays, for a cut in the same place), and everyone of the scene before leaves it,
   * with what lay about and what was being said.
   */
  private changeScene(decor: string, transition: NonNullable<Plan['transition']>, at: number): void {
    if (decor !== this.currentDecor) this.swapDecor(decor, transition, at);
    for (const [role, actor] of this.actors) {
      if (this.stand(role).feet === null) continue;
      this.timeline.set(actor.root, { autoAlpha: 0 }, at);
      this.standUp(actor, at);
      this.update(role, { feet: null, pose: 'debout' });
    }
    if (this.lying.size) this.timeline.set([...this.lying], { autoAlpha: 0 }, at);
    this.lying.clear();
    for (const line of this.lastLine.values()) this.hideEarly(line, at);
    this.lastLine.clear();
  }

  private swapDecor(decor: string, transition: NonNullable<Plan['transition']>, at: number): void {
    const before = this.decors.get(this.currentDecor);
    const next = this.decors.get(decor);
    if (!next) return;
    const outgoing = [before?.back, before?.front].filter((element): element is HTMLElement => Boolean(element));
    const incoming = [next.back, next.front].filter((element): element is HTMLElement => Boolean(element));
    if (transition === 'fondu') {
      this.timeline.to(incoming, { autoAlpha: 1, duration: 0.5 }, at);
      this.timeline.to(outgoing, { autoAlpha: 0, duration: 0.5 }, at);
    } else if (transition === 'volet') {
      this.timeline.fromTo(incoming, { autoAlpha: 1, clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.45, ease: 'power2.inOut' }, at);
      this.timeline.set(outgoing, { autoAlpha: 0 }, at + 0.45);
    } else {
      this.timeline.set(incoming, { autoAlpha: 1 }, at);
      this.timeline.set(outgoing, { autoAlpha: 0 }, at);
    }
    this.currentDecor = decor;
    this.floor = CUTSCENE_FLOORS[decor] ?? DEFAULT_FLOOR;
    this.timeline.set(this.stage.root, { '--floor': `${this.floor}px` }, at);
  }

  private frame(shot: Cadre, at: number, style: Cinematique['style']): void {
    let target: 'large' | 'serre' | { x: number; y: number } = 'large';
    if (shot === 'serre') target = 'serre';
    else if (typeof shot === 'object') {
      const actor = this.actor(shot.sur);
      const { feet, scale, y } = this.stand(shot.sur);
      target = { x: feet ?? STAGE_WIDTH / 2, y: this.floor + y - (actor?.height ?? 500) * scale * 0.72 };
    }
    const { scale, x, y } = cameraFraming(target);
    // Silent films and Benny Hill cut sharp; the others move the camera.
    const cut = style === 'muet' || style === 'benny_hill';
    this.timeline.to(this.stage.camera, { scale, x, y, duration: cut ? 0.01 : 0.5, ease: 'power2.inOut' }, at);
  }

  private add(action: Action, at: number, speed: number): void {
    const seconds = actionSeconds(action, speed, this.voiceSeconds);
    if ('entre' in action) this.enter(action.entre, action.par, action.x, at, seconds, action.allure ?? 'marche', action.profondeur);
    else if ('sort' in action) this.leave(action.sort, action.par, at, seconds, action.allure ?? 'marche');
    else if ('va' in action) this.walk(action.va, action.x, at, seconds, action.allure ?? 'marche', action.profondeur);
    else if ('place' in action) this.place(action.place, action.x, at, action.profondeur, action.regarde);
    else if ('regarde' in action) this.face(action.regarde, action.vers === 'gauche' ? -1 : 1, at);
    else if ('pose' in action) this.pose(action.pose, action.quoi, at, action.en ?? 1.6);
    else if ('poursuite' in action) this.chase(action.poursuite, action.tours ?? 2, at, speed);
    else if ('saute' in action) this.jump(action.saute, at, seconds);
    else if ('tremble' in action) this.shiver(action.tremble, at, seconds);
    else if ('tourne' in action) this.spin(action.tourne, at, seconds);
    else if ('tombe' in action) this.fall(action.tombe, at, seconds);
    else if ('trebuche' in action) this.stumble(action.trebuche, at);
    else if ('releve' in action) this.rise(action.releve, at, seconds);
    else if ('s_envole' in action) this.flyAway(action.s_envole, at, seconds);
    else if ('retourne' in action) this.turnHead(action.retourne, at, seconds);
    else if ('tape' in action) this.bonk(action.tape, action.sur, at, speed);
    else if ('bastonne' in action) this.beat(action.bastonne, action.sur, action.coups ?? 3, at, speed);
    else if ('gratte' in action) this.itch(action.gratte, action.par, at, seconds);
    else if ('coup_de_pied' in action) this.kick(action.coup_de_pied, action.sur, at);
    else if ('etourdi' in action) this.dizzy(action.etourdi, at, seconds);
    else if ('derape' in action) this.slipOver(action.derape, at);
    else if ('disparait' in action) this.vanish(action.disparait, at);
    else if ('boum' in action) this.explode(action.boum, action.x, at, seconds);
    else if ('aspect' in action) this.look(action.aspect, action.comme, at);
    else if ('visage' in action) this.expression(action.visage, action.expression, at);
    else if ('dit' in action) this.say(action.dit, action.texte, 'voix' in action ? action.voix : undefined, at, seconds, false);
    else if ('pense' in action) this.say(action.pense, action.texte, undefined, at, seconds, true);
    else if ('narrateur' in action) this.narrate(action.narrateur, at, seconds);
    else if ('animateur' in action) this.host(action.animateur, action.texte, at, seconds);
    else if ('foule' in action) this.shout(action.foule, at, seconds);
    else if ('pancarte' in action) this.sign(action.pancarte, action.tenue_par, at, seconds);
    else if ('titre' in action) this.title(action.titre, action.sous_titre, at, seconds);
    else if ('bandeau' in action) this.ticker(action.bandeau, at);
    else if ('accessoire' in action) this.prop(action, at);
    else if ('bruitage' in action) this.cues.push({ at, kind: 'sfx', id: action.bruitage });
    else if ('secousse' in action) this.shake(action.secousse, at, seconds);
    else if ('eclair' in action) this.timeline.fromTo(this.stage.flash, { autoAlpha: 0.9 }, { autoAlpha: 0, duration: seconds, ease: 'power2.out' }, at);
    else if ('confettis' in action) this.confetti(at);
  }

  // —— Going about ——

  private enter(role: string, edge: Bord, xPercent: number, at: number, seconds: number, gait: Allure, depth?: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    const { scale, y } = this.depthOf(depth ?? 0);
    this.layer(actor, depth ?? 0, at);
    const feet = (xPercent / 100) * STAGE_WIDTH;
    const target = feet - actor.width / 2;
    const fromX = edge === 'gauche' ? -OFF_STAGE - actor.width : edge === 'droite' ? STAGE_WIDTH + OFF_STAGE : target;
    const fromY = edge === 'bas' ? y + actor.height * scale + 60 : edge === 'haut' ? -this.floor - 200 : y;
    this.timeline.set(actor.root, { autoAlpha: 1, x: fromX, y: fromY, scale }, at);
    if (edge === 'gauche' || edge === 'droite') {
      const facing = edge === 'gauche' ? 1 : -1;
      this.turn(actor, facing, at);
      this.timeline.to(actor.root, { x: target, duration: seconds, ease: 'none' }, at);
      stride(this.timeline, actor, gait, at, seconds, this.stand(role).pose);
      this.update(role, { facing });
    } else {
      this.timeline.to(actor.root, { x: target, y, duration: seconds, ease: 'back.out(1.3)' }, at);
    }
    this.update(role, { feet, scale, y });
  }

  private leave(role: string, edge: Bord, at: number, seconds: number, gait: Allure): void {
    const actor = this.actor(role);
    if (!actor) return;
    const vars: gsap.TweenVars = { duration: seconds, ease: 'none' };
    if (edge === 'gauche' || edge === 'droite') {
      vars.x = edge === 'gauche' ? -OFF_STAGE - actor.width : STAGE_WIDTH + OFF_STAGE;
      this.turn(actor, edge === 'gauche' ? -1 : 1, at);
      stride(this.timeline, actor, gait, at, seconds, 'debout');
    } else {
      vars.y = edge === 'bas' ? actor.height + 60 : -this.floor - 200;
      vars.ease = 'power2.in';
    }
    this.timeline.to(actor.root, vars, at);
    this.timeline.set(actor.root, { autoAlpha: 0 }, at + seconds);
    this.update(role, { feet: null });
  }

  private walk(role: string, xPercent: number, at: number, seconds: number, gait: Allure, depth?: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    const before = this.stand(role);
    const { scale, y } = depth === undefined ? before : this.depthOf(depth);
    if (depth !== undefined) this.layer(actor, depth, at);
    const feet = (xPercent / 100) * STAGE_WIDTH;
    const ahead: 1 | -1 = feet >= (before.feet ?? feet) ? 1 : -1;
    // Pulled backwards, it keeps looking where it wanted to go.
    const facing: 1 | -1 = gait === 'recule' ? (-ahead as 1 | -1) : ahead;
    this.turn(actor, facing, at);
    // A yank starts at full pull; a walk eases in and out.
    this.timeline.to(actor.root, { x: feet - actor.width / 2, y, scale, duration: seconds, ease: gait === 'recule' ? 'power3.out' : 'sine.inOut' }, at);
    stride(this.timeline, actor, gait, at, seconds, before.pose === 'allonge' ? 'debout' : before.pose);
    this.update(role, { feet, scale, y, facing });
  }

  /** Whatever happened to it before, it stands up straight again, at once: a new scene starts clean. */
  private standUp(actor: CutsceneActor, at: number): void {
    this.timeline.set(actor.hop, { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 }, at);
    this.timeline.set(actor.figure, { rotation: 0, y: 0 }, at);
    this.timeline.set([actor.armNear, actor.armFar, actor.legNear, actor.legFar, actor.head], { rotation: 0 }, at);
  }

  private place(role: string, xPercent: number, at: number, depth?: number, facing?: 'gauche' | 'droite'): void {
    const actor = this.actor(role);
    if (!actor) return;
    if (this.stand(role).feet === null) this.standUp(actor, at);
    const { scale, y } = this.depthOf(depth ?? 0);
    this.layer(actor, depth ?? 0, at);
    const feet = (xPercent / 100) * STAGE_WIDTH;
    const side: 1 | -1 = facing === 'gauche' ? -1 : 1;
    this.timeline.set(actor.root, { autoAlpha: 1, x: feet - actor.width / 2, y, scale }, at);
    this.turn(actor, side, at);
    this.update(role, { feet, scale, y, facing: side });
  }

  private face(role: string, side: 1 | -1, at: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    this.turn(actor, side, at);
    this.update(role, { facing: side });
  }

  private pose(role: string, pose: Pose, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    toPose(this.timeline, actor, pose, at);
    const lively = pose === 'salue' || pose === 'applaudit' || pose === 'danse';
    if (lively) liveliness(this.timeline, actor, pose, at, seconds);
    this.update(role, { pose: lively ? 'debout' : pose });
  }

  /** Benny Hill: they sprint across the stage, one after the other, again and again, then they are gone. */
  private chase(roles: string[], crossings: number, at: number, speed: number): void {
    const crossing = 1.4 / speed;
    roles.forEach((role, index) => {
      const actor = this.actor(role);
      if (!actor) return;
      const { scale, y } = this.stand(role);
      const left = -OFF_STAGE - actor.width;
      const right = STAGE_WIDTH + OFF_STAGE;
      for (let pass = 0; pass < crossings; pass++) {
        const start = at + pass * crossing + index * CHASE_GAP;
        const rightwards = pass % 2 === 0;
        this.turn(actor, rightwards ? 1 : -1, start);
        this.timeline.fromTo(actor.root, { x: rightwards ? left : right, y, scale, autoAlpha: 1 }, { x: rightwards ? right : left, duration: crossing, ease: 'none' }, start);
        stride(this.timeline, actor, 'sprint', start, crossing, 'debout');
      }
      this.timeline.set(actor.root, { autoAlpha: 0 }, at + crossings * crossing + index * CHASE_GAP);
      this.update(role, { feet: null, pose: 'debout' });
    });
  }

  private jump(role: string, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    this.timeline.to(actor.hop, { y: -150, duration: seconds * 0.45, ease: 'power2.out' }, at);
    this.timeline.to(actor.hop, { y: 0, duration: seconds * 0.4, ease: 'power2.in' }, at + seconds * 0.45);
    this.timeline.to(actor.hop, { scaleY: 0.82, scaleX: 1.12, duration: seconds * 0.075, yoyo: true, repeat: 1 }, at + seconds * 0.85);
  }

  private shiver(role: string, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    const beats = Math.max(1, Math.round(seconds / 0.05)) | 1;
    this.timeline.to(actor.hop, { x: 12, duration: 0.05, yoyo: true, repeat: beats, ease: 'steps(1)' }, at);
  }

  /** A spin, as paper does it: turned this way and that, twice, back as it was. */
  private spin(role: string, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (actor) this.timeline.to(actor.facing, { scaleX: -this.stand(role).facing, duration: seconds / 4, yoyo: true, repeat: 3, ease: 'power1.inOut' }, at);
  }

  /** It falls over by itself, away from the middle of the stage. */
  private fall(role: string, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    const side = (this.stand(role).feet ?? STAGE_WIDTH / 2) < STAGE_WIDTH / 2 ? -1 : 1;
    this.timeline.to(actor.hop, { rotation: side * 82, duration: seconds, ease: 'bounce.out' }, at);
  }

  private stumble(role: string, at: number): void {
    const actor = this.actor(role);
    if (actor) trip(this.timeline, actor, at, this.stand(role).facing);
  }

  private rise(role: string, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    getUp(this.timeline, actor, at, seconds);
    this.update(role, { pose: 'debout' });
  }

  private flyAway(role: string, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    this.timeline.to(actor.root, { y: -this.floor - actor.height - 100, duration: seconds, ease: 'power2.in' }, at);
    this.timeline.to(actor.hop, { rotation: 10, duration: seconds / 4, yoyo: true, repeat: 3, ease: 'sine.inOut' }, at);
    this.timeline.set(actor.root, { autoAlpha: 0 }, at + seconds);
    this.update(role, { feet: null });
  }

  /** South Park: the head turns away, then back, the right way round. */
  private turnHead(role: string, at: number, seconds: number): void {
    const head = this.actor(role)?.head;
    if (!head) return;
    this.timeline.to(head, { scaleX: -1, duration: 0.1, ease: 'power2.inOut' }, at);
    this.timeline.to(head, { scaleX: 1, duration: 0.1, ease: 'power2.inOut' }, at + Math.max(0.2, seconds - 0.1));
  }

  /** One puppet bonks another on the head: it rushes up and swings its arm, the other squashes. */
  private bonk(role: string, target: string, at: number, speed: number): void {
    const hitter = this.actor(role);
    const hit = this.actor(target);
    if (!hitter || !hit) return;
    const targetFeet = this.stand(target).feet ?? STAGE_WIDTH / 2;
    const fromLeft = (this.stand(role).feet ?? 0) <= targetFeet;
    const feet = targetFeet + (fromLeft ? -BONK_DISTANCE : BONK_DISTANCE);
    const rush = 0.15 / speed;
    this.turn(hitter, fromLeft ? 1 : -1, at);
    this.timeline.to(hitter.root, { x: feet - hitter.width / 2, duration: rush, ease: 'power2.in' }, at);
    this.timeline.fromTo(hitter.armNear, { rotation: -150 }, { rotation: 30, duration: 0.12, ease: 'power3.in' }, at);
    this.timeline.to(hitter.armNear, { rotation: 0, duration: 0.2 }, at + 0.3);
    this.timeline.to(hit.hop, { scaleY: 0.76, scaleX: 1.14, duration: 0.07, yoyo: true, repeat: 1, ease: 'power2.out' }, at + rush);
    this.cues.push({ at: at + rush, kind: 'sfx', id: 'coup' });
    this.update(role, { feet, facing: fromLeft ? 1 : -1 });
  }

  /** Rushes up beside the other one, facing it, and says where it stands. */
  private closeIn(role: string, target: string, at: number, seconds: number): { hitter: CutsceneActor; hit: CutsceneActor; side: 1 | -1 } | null {
    const hitter = this.actor(role);
    const hit = this.actor(target);
    if (!hitter || !hit) return null;
    const targetFeet = this.stand(target).feet ?? STAGE_WIDTH / 2;
    const side: 1 | -1 = (this.stand(role).feet ?? 0) <= targetFeet ? 1 : -1;
    const feet = targetFeet - side * BONK_DISTANCE;
    this.turn(hitter, side, at);
    this.timeline.to(hitter.root, { x: feet - hitter.width / 2, duration: seconds, ease: 'power2.in' }, at);
    this.update(role, { feet, facing: side });
    return { hitter, hit, side };
  }

  /** Guignol's stick: out comes a cudgel, and down it comes on the other's head, again and again. */
  private beat(role: string, target: string, blows: number, at: number, speed: number): void {
    const rush = 0.18 / speed;
    const fight = this.closeIn(role, target, at, rush);
    if (!fight) return;
    const { hitter, hit } = fight;
    const stick = this.stickOf(hitter);
    this.timeline.to(stick, { autoAlpha: 1, duration: 0.05 }, at);
    const beat = 0.32 / speed;
    for (let blow = 0; blow < blows; blow++) {
      const swing = at + rush + blow * beat;
      const impact = swing + beat * 0.4;
      this.timeline.fromTo(hitter.armNear, { rotation: -170 }, { rotation: 25, duration: beat * 0.4, ease: 'power3.in' }, swing);
      this.timeline.to(hitter.armNear, { rotation: -170, duration: beat * 0.5, ease: 'power1.out' }, impact + 0.02);
      this.timeline.to(hit.hop, { scaleY: 0.7, scaleX: 1.18, duration: 0.06, yoyo: true, repeat: 1, ease: 'power2.out' }, impact);
      this.timeline.to(hit.head, { rotation: blow % 2 ? 9 : -9, duration: 0.06, yoyo: true, repeat: 1 }, impact);
      this.cues.push({ at: impact, kind: 'sfx', id: 'coup' });
    }
    const end = at + rush + blows * beat;
    this.timeline.to(hitter.armNear, { rotation: 0, duration: 0.2 }, end);
    this.timeline.to(stick, { autoAlpha: 0, duration: 0.15 }, end + 0.25);
    this.dizzy(target, end, 3);
  }

  private stickOf(actor: CutsceneActor): HTMLElement {
    let stick = this.sticks.get(actor);
    if (!stick) {
      stick = document.createElement('div');
      stick.className = 'cs-stick';
      const art = propArt('baton');
      if (art) {
        const image = document.createElement('img');
        image.src = art;
        image.alt = '';
        stick.append(image);
      }
      actor.hand.append(stick);
      gsap.set(stick, { autoAlpha: 0 });
      this.sticks.set(actor, stick);
    }
    return stick;
  }

  /** Three stars go round and round above its head. */
  private dizzy(role: string, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    let stars = this.stars.get(actor);
    if (!stars) {
      const box = document.createElement('div');
      box.className = 'cs-stars';
      const unit = Number.parseFloat(actor.figure.style.getPropertyValue('--u')) || 1;
      const radius = Number(actor.figure.style.getPropertyValue('--head-width') || 250) * unit * 0.55;
      const orbits = [0, 1, 2].map(() => {
        const orbit = document.createElement('div');
        orbit.className = 'cs-star-orbit';
        const star = document.createElement('div');
        star.className = 'cs-star';
        orbit.append(star);
        box.append(orbit);
        gsap.set(star, { x: radius });
        return orbit;
      });
      gsap.set(box, { autoAlpha: 0, scaleY: 0.45 });
      actor.head.append(box);
      stars = { box, orbits };
      this.stars.set(actor, stars);
    }
    this.timeline.to(stars.box, { autoAlpha: 1, duration: 0.1 }, at);
    stars.orbits.forEach((orbit, index) => {
      this.timeline.fromTo(orbit, { rotation: index * 120 }, { rotation: index * 120 + 360, duration: 0.75, ease: 'none', repeat: Math.max(1, Math.ceil(seconds / 0.75)) }, at);
    });
    this.timeline.to(stars.box, { autoAlpha: 0, duration: 0.2 }, at + seconds);
  }

  /** Itching powder, thrown by someone or fallen from the sky: it scratches, hops and wriggles all over. */
  private itch(role: string, thrower: string | undefined, at: number, seconds: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    const { feet, scale, y } = this.stand(role);
    const headX = feet ?? STAGE_WIDTH / 2;
    const headY = this.floor + y - actor.height * scale * 0.75;
    const from = thrower ? this.stand(thrower) : null;
    const fromX = from?.feet ?? headX;
    const fromY = from?.feet != null ? this.floor + from.y - (this.actor(thrower ?? '')?.height ?? 500) * from.scale * 0.45 : headY - 400;
    for (let grain = 0; grain < 40; grain++) {
      const dot = document.createElement('div');
      dot.className = 'cs-powder';
      this.stage.bubbles.append(dot);
      const landX = headX + (this.random() - 0.5) * 180;
      const landY = headY + (this.random() - 0.5) * 120;
      const start = at + this.random() * 0.25;
      gsap.set(dot, { autoAlpha: 0, x: fromX, y: fromY });
      this.timeline.set(dot, { autoAlpha: 1 }, start);
      this.timeline.to(dot, { x: landX, duration: 0.5, ease: 'none' }, start);
      this.timeline.to(dot, { y: Math.min(fromY, landY) - 80, duration: 0.22, ease: 'power2.out' }, start);
      this.timeline.to(dot, { y: landY, duration: 0.28, ease: 'power2.in' }, start + 0.22);
      this.timeline.to(dot, { autoAlpha: 0, duration: 0.3 }, start + 0.6);
    }
    const wriggle = at + 0.5;
    const span = Math.max(0.6, seconds - 0.5);
    const flails = Math.max(1, Math.round(span / 0.09)) | 1;
    this.timeline.fromTo(actor.armNear, { rotation: -150 }, { rotation: 30, duration: 0.09, yoyo: true, repeat: flails, ease: 'none' }, wriggle);
    this.timeline.fromTo(actor.armFar, { rotation: 150 }, { rotation: -30, duration: 0.11, yoyo: true, repeat: flails, ease: 'none' }, wriggle);
    this.timeline.to(actor.hop, { y: -60, duration: 0.15, yoyo: true, repeat: Math.max(1, Math.round(span / 0.15)) | 1, ease: 'power1.out' }, wriggle);
    this.timeline.to(actor.figure, { rotation: 12, duration: 0.12, yoyo: true, repeat: Math.max(1, Math.round(span / 0.12)) | 1, ease: 'sine.inOut' }, wriggle);
    this.cues.push({ at: wriggle, kind: 'sfx', id: 'boing' });
    toPose(this.timeline, actor, 'debout', at + seconds);
  }

  /** A kick in the backside: the other flies up, spinning, out of the picture. */
  private kick(role: string, target: string, at: number): void {
    const fight = this.closeIn(role, target, at, 0.2);
    if (!fight) return;
    const { hitter, hit, side } = fight;
    const impact = at + 0.3;
    this.timeline.fromTo(hitter.legNear, { rotation: 30 }, { rotation: -80, duration: 0.12, ease: 'power3.in' }, at + 0.18);
    this.timeline.to(hitter.legNear, { rotation: 0, duration: 0.25 }, impact + 0.1);
    this.timeline.to(hit.root, { x: `+=${side * 1100}`, y: `-=${this.floor * 0.8}`, duration: 0.9, ease: 'power2.out' }, impact);
    this.timeline.to(hit.hop, { rotation: side * 720, duration: 0.9, ease: 'none' }, impact);
    this.timeline.set(hit.root, { autoAlpha: 0 }, impact + 0.9);
    this.timeline.set(hit.hop, { rotation: 0 }, impact + 0.95);
    this.cues.push({ at: impact, kind: 'sfx', id: 'boing' });
    this.update(target, { feet: null });
  }

  /** Gone at once, in a little puff. */
  private vanish(role: string, at: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    this.timeline.to(actor.root, { autoAlpha: 0, scale: this.stand(role).scale * 1.3, duration: 0.2, ease: 'power2.out' }, at);
    this.update(role, { feet: null });
  }

  private slipOver(role: string, at: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    slip(this.timeline, actor, at);
    this.update(role, { pose: 'allonge' });
  }

  /** BOUM: a comic-book explosion on someone, or at a place; the screen flashes and shakes. */
  private explode(role: string, xPercent: number | undefined, at: number, seconds: number): void {
    const actor = this.actor(role);
    const { feet, scale, y } = this.stand(role);
    const x = feet ?? ((xPercent ?? 50) / 100) * STAGE_WIDTH;
    const top = actor && feet !== null ? this.floor + y - actor.height * scale * 0.55 : this.floor - 300;
    const burst = createProp(this.stage.bubbles, 'boum', undefined, 'cs-prop');
    Object.assign(burst.style, { width: '420px', height: '420px' });
    gsap.set(burst, { autoAlpha: 0, x: x - 210, y: top - 210, scale: 0.2, rotation: (this.random() - 0.5) * 30 });
    this.timeline.set(burst, { autoAlpha: 1 }, at);
    this.timeline.to(burst, { scale: 1.3, duration: 0.22, ease: 'back.out(2.5)' }, at);
    this.timeline.to(burst, { autoAlpha: 0, scale: 1.6, duration: 0.3 }, at + seconds - 0.3);
    this.timeline.fromTo(this.stage.flash, { autoAlpha: 0.8 }, { autoAlpha: 0, duration: 0.3 }, at);
    this.shake(3, at, 0.45);
    this.cues.push({ at, kind: 'sfx', id: 'masse' });
  }

  /** A hologram, a ghost, a giant, a dwarf, or itself again. */
  private look(role: string, aspect: Aspect, at: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    const since = this.hologramSince.get(role);
    // Grown, shrunk or upside down, a hologram stays a hologram; anything else ends it.
    const staysHologram = since !== undefined && (aspect === 'geant' || aspect === 'minuscule' || aspect === 'renverse');
    if (since !== undefined && !staysHologram) {
      this.hologramFlicker(role, since, at);
      this.hologramSince.delete(role);
    }
    const { scale } = this.stand(role);
    const filter = aspect === 'hologramme' || staysHologram ? HOLOGRAM_FILTER : aspect === 'fantome' ? GHOST_FILTER : 'none';
    // Upside down: turned about its middle, it floats head first above the floor.
    this.timeline.set(actor.sway, { rotation: 0 }, at);
    this.timeline.to(actor.hop, { rotation: aspect === 'renverse' ? 180 : 0, y: aspect === 'renverse' ? -actor.height * 0.85 : 0, duration: 0.3, ease: 'back.out(1.5)' }, at);
    const opacity = aspect === 'fantome' ? 0.5 : 1;
    const size = aspect === 'geant' ? 1.8 : aspect === 'minuscule' ? 0.45 : 1;
    this.timeline.set(actor.figure, { filter, opacity }, at);
    this.timeline.to(actor.root, { scale: scale * size, duration: 0.35, ease: 'back.out(1.6)' }, at);
    if (aspect === 'hologramme') {
      this.cues.push({ at, kind: 'sfx', id: 'teleportation' });
      this.hologramSince.set(role, at);
    }
  }

  /** A hologram flickers from when it appears until it goes. */
  private hologramFlicker(role: string, from: number, to: number): void {
    const actor = this.actor(role);
    if (!actor || to <= from) return;
    this.timeline.fromTo(actor.figure, { opacity: 0.85 }, { opacity: 0.55, duration: 0.09, ease: 'steps(1)', yoyo: true, repeat: Math.max(1, Math.floor((to - from) / 0.09)) | 1 }, from);
    this.timeline.set(actor.figure, { opacity: 1 }, to);
  }

  private expression(role: string, expression: Parameters<typeof faceVariables>[2], at: number): void {
    const actor = this.actor(role);
    const cast = this.roles.get(role);
    if (!actor?.jaw || !cast) return;
    this.timeline.set(actor.figure, faceVariables(this.manifest, cast, expression), at);
  }

  // —— Words ——

  /**
   * A line, or a thought, in a bubble above the head, over everything the camera frames: the same size wherever the
   * puppet stands, kept inside the stage, its tail toward the head.
   */
  private say(role: string, text: string, voice: string | undefined, at: number, seconds: number, thought: boolean): void {
    const actor = this.actor(role);
    if (!actor) return;
    this.hideEarly(this.lastLine.get(role), at);
    const bubble = createBubble(this.stage.bubbles, text);
    if (thought) bubble.classList.add('cs-thought');
    const { feet, scale, y } = this.stand(role);
    const unit = Number.parseFloat(actor.figure.style.getPropertyValue('--u')) || 1;
    const headTop = Number(actor.figure.style.getPropertyValue('--head-top') || 70) * unit;
    const above = this.floor + y - (actor.height - headTop) * scale;
    const half = bubble.offsetWidth / 2;
    const head = feet ?? STAGE_WIDTH / 2;
    const centre = Math.min(STAGE_WIDTH - BUBBLE_MARGIN - half, Math.max(BUBBLE_MARGIN + half, head));
    bubble.style.setProperty('--tail', `${Math.max(-half + 40, Math.min(half - 40, head - centre))}px`);
    gsap.set(bubble, { xPercent: -50, yPercent: -100, x: centre, y: Math.max(bubble.offsetHeight + 20, above - 18), autoAlpha: 0, scale: 0.6, transformOrigin: '50% 100%' });
    this.timeline.to(bubble, { autoAlpha: 1, scale: 1, duration: 0.18, ease: 'back.out(2)' }, at);
    this.timeline.to(bubble, { autoAlpha: 0, duration: 0.15 }, at + seconds);
    if (actor.jaw && !thought) {
      const beats = Math.max(1, Math.round(seconds / JAW_BEAT)) | 1;
      this.timeline.to(actor.jaw, { y: JAW_DROP, rotation: JAW_TILT, duration: JAW_BEAT, yoyo: true, repeat: beats, ease: 'none' }, at);
    }
    if (voice) this.cues.push({ at, kind: 'voice', id: voice });
    this.lastLine.set(role, { element: bubble, until: at + seconds });
  }

  private narrate(text: string, at: number, seconds: number): void {
    this.hideEarly(this.lastCaption, at);
    const caption = createCaption(this.stage.overlay, text);
    const rest = this.lastTicker ? ABOVE_TICKER : 0;
    gsap.set(caption, { xPercent: -50, autoAlpha: 0, y: rest + 24 });
    this.timeline.to(caption, { autoAlpha: 1, y: rest, duration: 0.25, ease: 'power2.out' }, at);
    this.timeline.to(caption, { autoAlpha: 0, duration: 0.2 }, at + seconds);
    this.lastCaption = { element: caption, until: at + seconds };
  }

  /** A host speaks low on the left, like a news anchor; the narrator steps aside meanwhile. */
  private host(id: string, text: string, at: number, seconds: number): void {
    const host = ANIMATEURS.find((a) => a.id === id);
    this.hideEarly(this.lastCaption, at);
    const line = createHostLine(this.stage.overlay, this.manifest, { id, name: host?.nom ?? id }, text);
    gsap.set(line, { autoAlpha: 0, x: -60, y: this.lastTicker ? ABOVE_TICKER : 0 });
    this.timeline.to(line, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power3.out' }, at);
    this.timeline.to(line, { autoAlpha: 0, duration: 0.2 }, at + seconds);
    this.lastCaption = { element: line, until: at + seconds };
  }

  private shout(text: string, at: number, seconds: number): void {
    const shout = createShout(this.stage.overlay, text);
    gsap.set(shout, { xPercent: -50, autoAlpha: 0, scale: 0.4, rotation: (this.random() - 0.5) * 10 });
    this.timeline.to(shout, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'back.out(3)' }, at);
    this.timeline.to(shout, { y: -8, duration: 0.06, yoyo: true, repeat: 9, ease: 'steps(1)' }, at + 0.2);
    this.timeline.to(shout, { autoAlpha: 0, duration: 0.2 }, at + seconds);
  }

  /** A sign: held up high in a puppet's hand, or rising alone from below the stage. */
  private sign(text: string, holder: string | undefined, at: number, seconds: number): void {
    const actor = holder ? this.actor(holder) : null;
    if (actor) {
      const sign = createProp(actor.grip, 'pancarte', text, 'cs-held');
      gsap.set(sign, { autoAlpha: 0, scale: 0.4, rotation: 150, xPercent: -30, yPercent: -10 });
      this.timeline.to(actor.armNear, { rotation: -150, duration: 0.25, ease: 'back.out(2)' }, at);
      this.timeline.to(sign, { autoAlpha: 1, scale: 1.6, duration: 0.25, ease: 'back.out(2)' }, at);
      this.timeline.to(actor.armNear, { rotation: -165, duration: 0.3, yoyo: true, repeat: Math.max(1, Math.round(seconds / 0.3)) | 1, ease: 'sine.inOut' }, at + 0.25);
      this.timeline.to(sign, { autoAlpha: 0, duration: 0.2 }, at + seconds);
      this.timeline.to(actor.armNear, { rotation: 0, duration: 0.25 }, at + seconds);
      return;
    }
    const sign = createProp(this.stage.props, 'pancarte', text, 'cs-prop');
    gsap.set(sign, { x: STAGE_WIDTH / 2 - 110, y: 1120, autoAlpha: 1, scale: 1.6 });
    this.timeline.to(sign, { y: 520, duration: 0.4, ease: 'back.out(1.6)' }, at);
    this.timeline.to(sign, { y: 1120, duration: 0.3, ease: 'power2.in' }, at + seconds);
  }

  private title(main: string, sub: string | undefined, at: number, seconds: number): void {
    this.hideEarly(this.lastTitle, at);
    const title = createTitle(this.stage.overlay, main, sub);
    gsap.set(title, { autoAlpha: 0, scale: 1.35 });
    this.timeline.to(title, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'power3.out' }, at);
    this.timeline.to(title, { autoAlpha: 0, duration: 0.25 }, at + seconds);
    this.lastTitle = { element: title, until: at + seconds };
  }

  /** The ticker slides up and stays, its text running when it is too long, until another one replaces it. */
  private ticker(text: string, at: number): void {
    if (this.lastTicker) this.timeline.to(this.lastTicker, { yPercent: 100, duration: 0.2 }, at);
    const { ticker, text: words } = createTicker(this.stage.overlay, text);
    gsap.set(ticker, { autoAlpha: 1, yPercent: 100 });
    this.timeline.to(ticker, { yPercent: 0, duration: 0.3, ease: 'power3.out' }, at);
    const overflow = words.scrollWidth - (STAGE_WIDTH - 360);
    if (overflow > 0) this.timeline.to(words, { x: -overflow - 40, duration: overflow / 160, ease: 'none' }, at + 1.2);
    this.lastTicker = ticker;
  }

  // —— Props ——

  private prop(action: Extract<Action, { accessoire: string }>, at: number): void {
    const declared = this.props.get(action.accessoire);
    if (!declared) return;
    const holder0 = action.par ? this.actor(action.par) : null;
    // A cudgel is held by its handle, the heavy end out: the same one the puppet beats with.
    const giver = action.par ? (declared.type === 'baton' && holder0 ? this.stickOf(holder0) : this.heldProp(action.accessoire, declared, action.par)) : null;
    const taker = action.a ? this.heldProp(action.accessoire, declared, action.a) : null;
    const holder = action.par ? this.actor(action.par) : null;
    const where = action.x ?? ((action.par ? this.stand(action.par).feet : null) ?? STAGE_WIDTH / 2) / (STAGE_WIDTH / 100);
    if (action.fait === 'apparait' || action.fait === 'pose') {
      if (giver) this.timeline.to(giver, { autoAlpha: 0, duration: 0.15 }, at);
      if (holder) this.timeline.to(holder.armNear, { rotation: 0, duration: 0.2 }, at);
      const floor = this.floorProp(action.accessoire, declared);
      const size = PROP_SIZES[declared.type] ?? PROP_SIZE;
      this.timeline.fromTo(floor, { x: (where / 100) * STAGE_WIDTH - size.width / 2, y: this.floor - size.height, autoAlpha: 0, scale: 0.3, transformOrigin: '50% 100%' }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, at);
      this.lying.add(floor);
    } else if (action.fait === 'disparait') {
      const held = [...this.heldProps.entries()].filter(([key]) => key.startsWith(`${action.accessoire}@`)).map(([, prop]) => prop);
      const all = [this.floorProps.get(action.accessoire), this.wornProps.get(action.accessoire)?.element, ...held].filter((prop): prop is HTMLElement => Boolean(prop));
      if (all.length) this.timeline.to(all, { autoAlpha: 0, scale: 0.5, duration: 0.3 }, at);
    } else if ((action.fait === 'brandi' || action.fait === 'tient') && giver && holder) {
      const raised = action.fait === 'brandi';
      this.takeOff(action.accessoire, at);
      this.timeline.to(holder.armNear, { rotation: raised ? -150 : -35, duration: 0.3, ease: 'back.out(2)' }, at);
      this.timeline.fromTo(giver, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, at);
      if (raised) this.timeline.to(holder.armNear, { rotation: -170, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, at + 0.3);
    } else if (action.fait === 'donne' && taker && action.a) {
      if (giver) this.timeline.to(giver, { autoAlpha: 0, duration: 0.15 }, at);
      const receiver = this.actor(action.a);
      if (receiver) this.timeline.to(receiver.armNear, { rotation: -35, duration: 0.3 }, at + 0.1);
      this.timeline.fromTo(taker, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'back.out(2)' }, at + 0.1);
    } else if (action.fait === 'vole' && holder && action.par) {
      if (giver) this.timeline.to(giver, { autoAlpha: 0, duration: 0.1 }, at);
      this.scatter(declared, action.par, at);
    } else if (action.fait === 'descend') {
      const hanging = this.floorProp(action.accessoire, declared);
      const size = PROP_SIZES[declared.type] ?? PROP_SIZE;
      this.timeline.fromTo(hanging, { x: (where / 100) * STAGE_WIDTH - size.width / 2, y: -size.height - 40, autoAlpha: 1, scale: 1 }, { y: 30, duration: 0.7, ease: 'bounce.out' }, at);
      this.lying.add(hanging);
    } else if (action.fait === 'touche' && action.a) {
      this.projectile(action.accessoire, declared, action.par, action.a, at);
    } else if (action.fait === 'traverse') {
      const floor = this.floorProp(action.accessoire, declared);
      const fromLeft = action.par !== 'droite';
      this.timeline.fromTo(floor, { x: fromLeft ? -300 : STAGE_WIDTH + 80, y: this.floor - 220, autoAlpha: 1, scaleX: fromLeft ? 1 : -1 }, { x: fromLeft ? STAGE_WIDTH + 80 : -300, duration: 2.6, ease: 'none' }, at);
    } else if (action.fait === 'cheville' && action.par) {
      this.wear(action.accessoire, declared.type, action.par, at);
    } else if (action.fait === 'bipe') {
      this.beepAt(action.accessoire, at);
    } else if (action.fait === 'sort') {
      const floor = this.floorProps.get(action.accessoire);
      if (floor) walkOff(this.timeline, floor, action.par !== 'gauche', STAGE_WIDTH, at);
    }
  }

  /** Worn at the ankle of `role`: it clicks shut there, and goes everywhere with it. */
  private wear(id: string, type: string, role: string, at: number): void {
    const actor = this.actor(role);
    if (!actor) return;
    const worn = this.wornProps.get(id)?.element ?? createAnkleProp(actor, type);
    this.wornProps.set(id, { element: worn, role });
    this.timeline.fromTo(worn, { autoAlpha: 0, scale: 1.8 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, at);
  }

  /** Taken off the ankle, into a hand: the worn one springs away. */
  private takeOff(id: string, at: number): void {
    const worn = this.wornProps.get(id);
    if (!worn) return;
    this.timeline.to(worn.element, { autoAlpha: 0, y: -60, scale: 1.4, duration: 0.25, ease: 'power2.out' }, at);
    this.wornProps.delete(id);
  }

  /** It beeps where it is: at an ankle, the « BIP ! » rising beside the foot; on the floor, above the prop. */
  private beepAt(id: string, at: number): void {
    this.cues.push({ at, kind: 'sfx', id: 'bip' });
    const worn = this.wornProps.get(id);
    if (worn) {
      const { feet, scale, y } = this.stand(worn.role);
      if (feet === null) return;
      const point = { x: feet, y: this.floor + y - 45 * scale };
      beep(this.timeline, worn.element, this.actor(worn.role), this.stage.bubbles, point, at);
      return;
    }
    const floor = this.floorProps.get(id);
    if (floor) beep(this.timeline, floor, null, this.stage.bubbles, { x: STAGE_WIDTH / 2, y: this.floor - 300 }, at);
  }

  /**
   * Thrown at someone (the blue shell): it flies, spinning, from its thrower or from the left edge, and hits; BOUM, the
   * one hit spins round and falls.
   */
  private projectile(id: string, declared: { type: string; text?: string }, thrower: string | undefined, target: string, at: number): void {
    const hit = this.actor(target);
    const { feet, scale, y } = this.stand(target);
    if (!hit || feet === null) return;
    const shot = this.floorProp(id, declared);
    const size = PROP_SIZES[declared.type] ?? PROP_SIZE;
    const from = thrower ? this.stand(thrower).feet : null;
    const startX = from ?? -size.width - 60;
    const startY = this.floor - size.height - (thrower ? 160 : 40);
    const flight = 0.8;
    this.timeline.fromTo(shot, { x: startX - size.width / 2, y: startY, autoAlpha: 1, rotation: 0, scale: 1 }, { x: feet - size.width / 2, y: this.floor + y - hit.height * scale * 0.5 - size.height / 2, rotation: 720, duration: flight, ease: 'power1.in' }, at);
    this.timeline.set(shot, { autoAlpha: 0 }, at + flight);
    this.explode(target, undefined, at + flight, 0.9);
    const side = startX < feet ? 1 : -1;
    this.timeline.to(hit.hop, { rotation: side * 720, duration: 0.6, ease: 'power2.out' }, at + flight);
    this.timeline.to(hit.hop, { rotation: side * 802, duration: 0.3, ease: 'bounce.out' }, at + flight + 0.6);
    this.update(target, { pose: 'allonge' });
  }

  /** Thrown up from the hands: the pieces fly every which way and land on the floor around, never on anyone. */
  private scatter(declared: { type: string; text?: string }, role: string, at: number): void {
    const { feet, facing, scale } = this.stand(role);
    const actor = this.actor(role);
    if (!actor || feet === null) return;
    const handX = feet + facing * actor.width * 0.3 * scale - 70;
    const handY = this.floor - actor.height * 0.55 * scale;
    for (let index = 0; index < SCATTER_PIECES; index++) {
      const piece = createProp(this.stage.props, declared.type);
      const landX = feet + (this.random() - 0.5) * 1100;
      const apex = handY - 220 - this.random() * 260;
      gsap.set(piece, { autoAlpha: 0, x: handX, y: handY, scale: 0.55 });
      const flight = 0.7 + this.random() * 0.4;
      this.timeline.set(piece, { autoAlpha: 1 }, at);
      this.timeline.to(piece, { x: landX - 70, duration: flight, ease: 'none' }, at);
      this.timeline.to(piece, { y: apex, duration: flight * 0.45, ease: 'power2.out' }, at);
      this.timeline.to(piece, { y: this.floor - 110, duration: flight * 0.55, ease: 'bounce.out' }, at + flight * 0.45);
      this.timeline.to(piece, { rotation: (this.random() - 0.5) * 900, duration: flight, ease: 'power1.out' }, at);
      this.lying.add(piece);
    }
  }

  private floorProp(id: string, declared: { type: string; text?: string }): HTMLElement {
    let prop = this.floorProps.get(id);
    if (!prop) {
      prop = createProp(FRONT_PROPS.has(declared.type) ? this.stage.frontProps : this.stage.props, declared.type, declared.text);
      const size = PROP_SIZES[declared.type];
      if (size) Object.assign(prop.style, { width: `${size.width}px`, height: `${size.height}px` });
      prop.dataset.prop = id;
      prop.dataset.type = declared.type;
      gsap.set(prop, { autoAlpha: 0 });
      this.floorProps.set(id, prop);
    }
    return prop;
  }

  private heldProp(id: string, declared: { type: string; text?: string }, role: string): HTMLElement | null {
    const actor = this.actor(role);
    if (!actor) return null;
    const key = `${id}@${role}`;
    let prop = this.heldProps.get(key);
    if (!prop) {
      prop = createProp(actor.grip, declared.type, declared.text, 'cs-held');
      prop.dataset.prop = id;
      gsap.set(prop, { autoAlpha: 0 });
      this.heldProps.set(key, prop);
    }
    return prop;
  }

  // —— Shocks ——

  private shake(force: number, at: number, seconds: number): void {
    const pixels = (SHAKE_PIXELS[force] ?? 10) * (this.reducedMotion ? 0.3 : 1);
    const steps = Math.max(2, Math.round(seconds / 0.05));
    for (let step = 0; step < steps; step++) {
      const fade = 1 - step / steps;
      this.timeline.to(this.stage.shaker, { x: (this.random() - 0.5) * 2 * pixels * fade, y: (this.random() - 0.5) * 2 * pixels * fade, duration: 0.05, ease: 'none' }, at + step * 0.05);
    }
    this.timeline.to(this.stage.shaker, { x: 0, y: 0, duration: 0.05 }, at + steps * 0.05);
  }

  private confetti(at: number): void {
    for (const piece of createConfetti(this.stage.confetti, CONFETTI_PIECES, this.random)) {
      const start = at + this.random() * 0.4;
      this.timeline.fromTo(piece, { y: -40, x: 0, rotation: 0, autoAlpha: 1 }, { y: 1160, x: (this.random() - 0.5) * 320, rotation: this.random() * 900, duration: 1.4 + this.random() * 0.9, ease: 'power1.in' }, start);
    }
  }

  /** What was still on screen when the next of its kind comes: gone at once. */
  private hideEarly(showing: Showing | null | undefined, at: number): void {
    if (showing && showing.until > at) this.timeline.to(showing.element, { autoAlpha: 0, duration: 0.1 }, at);
  }
}
