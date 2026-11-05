import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { cardInspector } from '#src/client/stores/cardInspector.ts';
import { playSound } from '#src/client/services/soundEffects.ts';
import { carrySwing } from '#src/client/stores/carrySwing.ts';
import { centerOf, tableFx } from '#src/client/stores/tableFx.ts';
import type { Point } from '#src/client/stores/tableFx.ts';
import { DROP_ZONES } from '#src/client/const/dropZones.ts';
import { insertionIndex } from '#src/client/tools/insertionIndex.ts';
import { nearestSlotIndex } from '#src/client/tools/nearestSlotIndex.ts';
import type { SlotBox } from '#src/client/tools/nearestSlotIndex.ts';
import { zoneForTableY } from '#src/client/tools/zoneForTableY.ts';
import { allyTargets, annonceNeedsTarget, destroysTarget, heldSpellEffects, spellNeedsTarget, spellTargets } from '#src/client/tools/playTargets.ts';
import type { ShownCard } from '#src/client/tools/shownCard.ts';
import type { PlayerView } from '#src/engine/game.ts';
import { insertAroundLocked, reorderAroundLocked } from '#src/engine/reorderAroundLocked.ts';
import type { Casserole, HandSpell, Minion, PlayerAction, Spell } from '#src/engine/types.ts';

/** Under this distance, a press is a click. */
const DRAG_THRESHOLD_PX = 8;
/** A click that follows a drag or a cancelled aim does nothing. */
const SWALLOW_MS = 350;
/** A card of the hand sent once is not sent again while the game has not answered: a double click plays it once. */
const SENT_MS = 1500;

export type Zone = 'board' | 'shop' | 'hand';

/** What the player can pick up on the table. */
export type GestureItem =
  | { from: 'shop'; slot: number; minion: Minion }
  | { from: 'shop-spell'; slot: number; spell: Spell }
  | { from: 'shop-casserole'; casserole: Casserole }
  | { from: 'hand'; minion: Minion }
  | { from: 'hand-spell'; held: HandSpell; card: ShownCard }
  | { from: 'board'; minion: Minion; index: number };

export interface Aim {
  zone: Zone | null;
  /** Where a minion would land on the board. */
  index: number;
  /** The board minion under the pointer. */
  uid: number | null;
}

/** The player has laid something down, and now points at the ally it is for. */
export type Targeting =
  | { kind: 'play'; minion: Minion; to: number; onto?: number; valid: number[] }
  | { kind: 'cast'; held: HandSpell; card: ShownCard; valid: number[]; origin: Point };

export interface Dragging {
  item: GestureItem;
  point: Point;
  aim: Aim;
}

/** What the board shows right now: its order with what is being laid or moved, and who glows. */
export interface BoardPreview {
  order: Minion[];
  /** The minion that is not really there yet, or the one being moved. */
  ghost: number | null;
  /** A minion about to be laid down for good, waiting for the target of its Annonce. */
  placed: number | null;
  /** The ally a Ralliement or a spell would land on. */
  host: number | null;
  /** While aiming: the allies that can be chosen. Null when nobody is being aimed at. */
  valid: number[] | null;
}

const NO_AIM: Aim = { zone: null, index: 0, uid: null };
const GHOST_UID = -1;

export function isMinionItem(item: GestureItem): item is Extract<GestureItem, { minion: Minion }> {
  return 'minion' in item;
}

/** The zone under the pointer: by its height on the table only, across the whole width (DROP_ZONES). */
function zoneAt(point: Point): Zone | null {
  const stage = document.querySelector('.table .stage');
  if (!stage) return null;
  const box = stage.getBoundingClientRect();
  return zoneForTableY(((point.y - box.top) / box.height) * DROP_ZONES.tableHeight);
}

function boardSlots(): { uid: number; box: DOMRect }[] {
  return [...document.querySelectorAll<HTMLElement>('[data-board-uid]')]
    .map((element) => ({ uid: Number(element.dataset.boardUid), box: element.getBoundingClientRect() }))
    .filter((slot) => slot.uid !== GHOST_UID);
}

function boardElement(uid: number): Element | null {
  return document.querySelector(`[data-board-uid="${uid}"]`);
}

/**
 * Every gesture of the recruitment: pick up, carry, drop, click, and aim at an ally.
 * Nothing changes in the game before the drop; every action goes through `act`, so the engine decides.
 */
export function useTableGestures({ view, act }: { view: () => PlayerView; act: (action: PlayerAction) => void }) {
  const dragging = shallowRef<Dragging | null>(null);
  const targeting = shallowRef<Targeting | null>(null);
  const pointer = ref<Point>({ x: 0, y: 0 });
  let pressed: { item: GestureItem; start: Point; pointerId: number; source: Element } | null = null;
  /** The board slots when the drag began: they shift afterwards and must not move the target with them. */
  let slotsAtStart: { uid: number; box: DOMRect }[] = [];
  let swallowUntil = 0;

  const board = () => view().board;

  // —— Actions, with the effect that answers each one ——

  /** What was bought jumps into the hand, if the purse and the hand allow it: the engine has the last word. */
  function flyToHand(from: Point | null, cost: number, shown: { minion: Minion } | { card: ShownCard }): void {
    const current = view();
    if (current.budget < cost || current.hand.length + current.spells.length >= current.handLimit) return;
    playSound('buy');
    const to = centerOf(document.querySelector('.hand-zone'));
    if (from && to) tableFx.add({ kind: 'recruit', from, to, ...shown });
  }

  function buy(item: GestureItem, from: Point | null): void {
    const current = view();
    if (item.from === 'shop') {
      flyToHand(from, current.buyCost, { minion: item.minion });
      act({ t: 'buy', slot: item.slot, main: true });
    } else if (item.from === 'shop-spell') {
      flyToHand(from, current.shopSpellCosts[item.slot] ?? item.spell.cost, { card: { kind: 'spell', spell: item.spell } });
      act({ t: 'buy_spell', slot: item.slot });
    } else if (item.from === 'shop-casserole') {
      flyToHand(from, current.casseroleCost ?? item.casserole.cost, { card: { kind: 'casserole', casserole: item.casserole, ownerMultiplier: current.params.ownerMultiplier } });
      act({ t: 'buy_casserole' });
    }
  }

  /** Sent back to the shop: coins burst from it toward the budget. */
  function sell(minion: Minion, from: Point): void {
    playSound('sell');
    const to = centerOf(document.querySelector('.budget'));
    if (to) tableFx.add({ kind: 'coins', from, to });
    act({ t: 'sell', uid: minion.uid });
  }

  /** The card of the hand last sent to the game, and the view it was sent from. */
  let sent: { uid: number; view: PlayerView; at: number } | null = null;

  /** A card of the hand goes to the game: until its answer, a second click on it does nothing. */
  function send(action: Extract<PlayerAction, { t: 'play' | 'cast' }>): void {
    sent = { uid: action.uid, view: view(), at: performance.now() };
    act(action);
  }

  /**
   * Still in the hand, and not already sent: a second click of a double click lands on a card that
   * is leaving, or that the game has not answered for yet. It does nothing, and says nothing.
   */
  function isPlayable(uid: number, inHand: boolean): boolean {
    if (!inHand) return false;
    return !(sent && sent.uid === uid && sent.view === view() && performance.now() - sent.at < SENT_MS);
  }

  /** Laid on the board for good: a thump, and the medallion lands (BoardRow). */
  function layDown(action: Extract<PlayerAction, { t: 'play' }>): void {
    if (action.onto !== undefined || board().length < view().boardLimit) playSound('play');
    send(action);
  }

  function play(minion: Minion, to: number, onto?: number): void {
    const where = onto === undefined ? { to } : { onto };
    if (!annonceNeedsTarget(minion.effects)) {
      layDown({ t: 'play', uid: minion.uid, ...where });
      return;
    }
    const valid = allyTargets(board(), onto, minion.effects);
    // A lone ally gets a bonus straight away; it is never destroyed without the player pointing at it.
    if (valid.length === 0 || (valid.length === 1 && !destroysTarget(minion.effects))) {
      layDown({ t: 'play', uid: minion.uid, ...where, ...(valid.length ? { target: valid[0] } : {}) });
      return;
    }
    startTargeting({ kind: 'play', minion, to, onto, valid });
  }

  function cast(held: HandSpell, card: ShownCard, target: number | undefined, from: Point | null): void {
    const to = target === undefined ? null : centerOf(boardElement(target));
    if (from && to) tableFx.add({ kind: 'spell', from, to, card });
    else if (from) tableFx.add({ kind: 'burst', at: from, color: '#ffd84a' });
    playSound('spell');
    if (target !== undefined) tableFx.jolt(target);
    send(target === undefined ? { t: 'cast', uid: held.uid } : { t: 'cast', uid: held.uid, target });
  }

  /** A spell that needs a minion: straight on it if there is only one and it loses nothing, else the player points. */
  function aimSpell(held: HandSpell, card: ShownCard, origin: Point): void {
    const valid = spellTargets(held, board());
    if (valid.length === 0) {
      send({ t: 'cast', uid: held.uid });
      return;
    }
    if (valid.length === 1 && !destroysTarget(heldSpellEffects(held))) cast(held, card, valid[0], origin);
    else startTargeting({ kind: 'cast', held, card, valid, origin });
  }

  // —— Aiming at an ally ——

  function startTargeting(next: Targeting): void {
    targeting.value = next;
    cardInspector.pause(false);
  }

  function chooseTarget(uid: number): void {
    const current = targeting.value;
    if (!current || !current.valid.includes(uid)) return;
    targeting.value = null;
    if (current.kind === 'play') {
      const where = current.onto === undefined ? { to: current.to } : { onto: current.onto };
      tableFx.add({ kind: 'burst', at: centerOf(boardElement(uid)) ?? pointer.value, color: '#ffe680' });
      layDown({ t: 'play', uid: current.minion.uid, ...where, target: uid });
    } else {
      cast(current.held, current.card, uid, current.origin);
    }
  }

  function cancelTargeting(): void {
    targeting.value = null;
  }

  // —— Clicks ——

  function click(item: GestureItem, source: Element): void {
    if (performance.now() < swallowUntil || targeting.value) return;
    if (item.from === 'hand' && !isPlayable(item.minion.uid, view().hand.some((m) => m.uid === item.minion.uid))) return;
    if (item.from === 'hand-spell' && !isPlayable(item.held.uid, view().spells.some((s) => s.uid === item.held.uid))) return;
    const from = centerOf(source);
    switch (item.from) {
      case 'shop':
      case 'shop-spell':
      case 'shop-casserole':
        buy(item, from);
        return;
      case 'hand':
        play(item.minion, board().length);
        return;
      case 'hand-spell':
        if (spellNeedsTarget(item.held)) aimSpell(item.held, item.card, from ?? pointer.value);
        else cast(item.held, item.card, undefined, from);
        return;
      case 'board':
        return;
    }
  }

  function clickBoardMinion(uid: number): void {
    if (targeting.value) chooseTarget(uid);
  }

  // —— Carrying ——

  function press(event: PointerEvent, item: GestureItem): void {
    if (event.button !== 0 || targeting.value) return;
    pressed = { item, start: { x: event.clientX, y: event.clientY }, pointerId: event.pointerId, source: event.currentTarget as Element };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
  }

  function aimAt(point: Point, item: GestureItem): Aim {
    const zone = zoneAt(point);
    if (zone !== 'board') return { ...NO_AIM, zone };
    const under = slotsAtStart.find(({ box }) => point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom);
    const boxes: SlotBox[] = slotsAtStart.map((slot) => slot.box);
    if (item.from === 'board') {
      const available = board().flatMap((m, index) => (m.locked ? [] : [index]));
      const index = item.minion.locked || boxes.length === 0 ? item.index : nearestSlotIndex(boxes, available, point);
      return { zone, index, uid: under?.uid ?? null };
    }
    return { zone, index: insertionIndex(boxes, point), uid: under?.uid ?? null };
  }

  function beginDrag(item: GestureItem, point: Point): void {
    slotsAtStart = boardSlots();
    cardInspector.pause(true);
    carrySwing.start(point.x, point.y);
    dragging.value = { item, point, aim: aimAt(point, item) };
  }

  function handleMove(event: PointerEvent): void {
    if (!pressed || event.pointerId !== pressed.pointerId) return;
    const point = { x: event.clientX, y: event.clientY };
    if (!dragging.value) {
      if (Math.hypot(point.x - pressed.start.x, point.y - pressed.start.y) < DRAG_THRESHOLD_PX) return;
      beginDrag(pressed.item, point);
    }
    carrySwing.moveTo(point.x, point.y);
    const { item } = dragging.value as Dragging;
    dragging.value = { item, point, aim: aimAt(point, item) };
  }

  function stopListening(): void {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleCancel);
  }

  function handleCancel(): void {
    stopListening();
    endDrag();
  }

  function endDrag(): void {
    if (dragging.value) {
      carrySwing.stop();
      swallowUntil = performance.now() + SWALLOW_MS;
    }
    dragging.value = null;
    pressed = null;
    cardInspector.pause(false);
  }

  function handleUp(event: PointerEvent): void {
    if (!pressed || event.pointerId !== pressed.pointerId) return;
    stopListening();
    const current = dragging.value;
    endDrag();
    if (current) drop(current.item, current.aim, current.point);
  }

  function drop(item: GestureItem, aim: Aim, point: Point): void {
    switch (item.from) {
      case 'shop':
      case 'shop-spell':
      case 'shop-casserole':
        if (aim.zone === 'hand' || aim.zone === 'board') buy(item, point);
        return;
      case 'hand':
        if (aim.zone === 'shop') sell(item.minion, point);
        else if (aim.zone === 'board' && item.minion.keywords.includes('ralliement') && aim.uid !== null) play(item.minion, aim.index, aim.uid);
        else if (aim.zone === 'board') play(item.minion, aim.index);
        return;
      case 'hand-spell': {
        // Anywhere on the table casts, the shop side included: the whole panel reads as the play area
        // (5 November 2026, spells dropped over the shop came back). Only the hand band gives the card back.
        if (aim.zone === null || aim.zone === 'hand') return;
        if (!spellNeedsTarget(item.held)) {
          cast(item.held, item.card, undefined, point);
          return;
        }
        const valid = spellTargets(item.held, board());
        if (aim.uid !== null && valid.includes(aim.uid)) cast(item.held, item.card, aim.uid, point);
        else aimSpell(item.held, item.card, point);
        return;
      }
      case 'board':
        if (aim.zone === 'shop') sell(item.minion, point);
        else if (aim.zone === 'board' && aim.index !== item.index) {
          playSound('play', 0.6);
          act({ t: 'move', uid: item.minion.uid, to: aim.index });
        }
        return;
    }
  }

  // —— What the board shows ——

  const boardPreview = computed<BoardPreview>(() => {
    const current = board();
    const aiming = targeting.value;
    if (aiming?.kind === 'play') {
      if (aiming.onto !== undefined) return { order: current, ghost: null, placed: null, host: aiming.onto, valid: aiming.valid };
      const placed = { ...aiming.minion };
      return { order: insertAroundLocked(current, placed, aiming.to, (m) => m.locked) ?? [...current, placed], ghost: null, placed: placed.uid, host: null, valid: aiming.valid };
    }
    if (aiming) return { order: current, ghost: null, placed: null, host: null, valid: aiming.valid };
    const drag = dragging.value;
    const still: BoardPreview = { order: current, ghost: null, placed: null, host: null, valid: null };
    if (!drag) return still;
    const { item, aim } = drag;
    if (item.from === 'hand-spell' && spellNeedsTarget(item.held)) {
      const valid = spellTargets(item.held, current);
      return { ...still, valid, host: aim.uid !== null && valid.includes(aim.uid) ? aim.uid : null };
    }
    if (aim.zone !== 'board') return item.from === 'board' ? { ...still, ghost: item.minion.uid } : still;
    if (item.from === 'board') {
      return { ...still, order: reorderAroundLocked(current, item.index, aim.index, (m) => m.locked) ?? current, ghost: item.minion.uid };
    }
    if (item.from === 'hand') {
      if (item.minion.keywords.includes('ralliement') && aim.uid !== null) return { ...still, host: aim.uid };
      if (current.length >= view().boardLimit) return still;
      const ghost = { ...item.minion, uid: GHOST_UID };
      return { ...still, order: insertAroundLocked(current, ghost, aim.index, (m) => m.locked) ?? current, ghost: GHOST_UID };
    }
    return still;
  });

  /** The source of a gesture waits as a faint copy where it was. */
  function isCarried(match: (item: GestureItem) => boolean): boolean {
    const item = dragging.value?.item;
    return Boolean(item && match(item));
  }

  // —— Aiming: the pointer, Escape, and a click anywhere else ——

  function trackPointer(event: PointerEvent): void {
    pointer.value = { x: event.clientX, y: event.clientY };
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (targeting.value) cancelTargeting();
    }
  }

  function handlePressAnywhere(event: PointerEvent): void {
    pointer.value = { x: event.clientX, y: event.clientY };
    if (!targeting.value) return;
    const target = (event.target as Element | null)?.closest('[data-board-uid]') as HTMLElement | null;
    const uid = target ? Number(target.dataset.boardUid) : null;
    if (uid !== null && targeting.value.valid.includes(uid)) return;
    // Anywhere else cancels, and that click does nothing more.
    event.stopPropagation();
    event.preventDefault();
    swallowUntil = performance.now() + SWALLOW_MS;
    cancelTargeting();
  }

  function swallowClick(event: MouseEvent): void {
    if (performance.now() >= swallowUntil) return;
    event.stopPropagation();
    event.preventDefault();
  }

  onMounted(() => {
    window.addEventListener('pointermove', trackPointer);
    window.addEventListener('pointerdown', handlePressAnywhere, { capture: true });
    window.addEventListener('click', swallowClick, { capture: true });
    window.addEventListener('keydown', handleKey);
  });
  onUnmounted(() => {
    stopListening();
    endDrag();
    window.removeEventListener('pointermove', trackPointer);
    window.removeEventListener('pointerdown', handlePressAnywhere, { capture: true });
    window.removeEventListener('click', swallowClick, { capture: true });
    window.removeEventListener('keydown', handleKey);
  });

  return { dragging, targeting, pointer, boardPreview, press, click, clickBoardMinion, chooseTarget, cancelTargeting, isCarried };
}

export type TableGestures = ReturnType<typeof useTableGestures>;
