import { Application, Sprite } from 'pixi';
import { DEMO_CARDS } from '/tools/graphisme/demo/const/demo_cards.js';
import { loadGameAssets } from '/tools/graphisme/demo/rig/load_game_assets.js';
import { DemoCard } from '/tools/graphisme/demo/rig/demo_card.js';
import { SoundPlayer } from '/tools/graphisme/demo/rig/sound_player.js';

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;
const CARD_SCALE = 0.78;
const CARD_TOP = 130;
const CARD_CENTERS = [232, 640, 1048];
const ATTACK_REACH = 0.74; // stops short of the target, so both puppets stay readable

async function start() {
  const stageHost = document.querySelector('#stage');
  const status = document.querySelector('#status');
  try {
    const app = new Application();
    await app.init({ width: STAGE_WIDTH, height: STAGE_HEIGHT, autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2), background: '#060b22', antialias: true });
    stageHost.append(app.canvas);
    await loadFonts();
    const assets = await loadGameAssets(DEMO_CARDS.map((card) => card.id));
    app.stage.addChild(new Sprite(assets.set));
    const demoCards = placeCards({ assets, stage: app.stage, soundPlayer: new SoundPlayer() });
    app.ticker.add((ticker) => updateCards(demoCards, ticker.deltaMS / 1000));
    connectControls(demoCards);
    status.textContent = '';
    window.__demoCards = demoCards;
  } catch (error) {
    console.error('Demo failed to start', error);
    status.textContent = 'La démo n’a pas pu démarrer : voir la console.';
  }
}

function updateCards(demoCards, deltaSeconds) {
  demoCards.forEach((demoCard) => demoCard.update(deltaSeconds));
}

async function loadFonts() {
  await Promise.all(['800 40px "Alegreya Sans SC"', '500 28px "Alegreya Sans"', '700 28px "Alegreya Sans"',
    '74px Bangers'].map((font) => document.fonts.load(font)));
}

function placeCards({ assets, stage, soundPlayer }) {
  return DEMO_CARDS.map((card, index) => {
    const demoCard = new DemoCard({ card, assets, soundPlayer, stage });
    demoCard.view.scale.set(CARD_SCALE);
    demoCard.view.position.set(CARD_CENTERS[index] - (512 * CARD_SCALE) / 2, CARD_TOP);
    return demoCard;
  });
}

function reachBetween(fromIndex, toIndex) {
  return ((CARD_CENTERS[toIndex] - CARD_CENTERS[fromIndex]) / CARD_SCALE) * ATTACK_REACH;
}

function runCardAction(demoCards, action, index) {
  const demoCard = demoCards[index];
  const target = demoCards[(index + 1) % demoCards.length];
  const targetIndex = (index + 1) % demoCards.length;
  const actions = {
    talk: () => demoCard.talk(),
    attack: () => demoCard.attack(reachBetween(index, targetIndex), () => target.takeHit()),
    hit: () => demoCard.takeHit(),
    crush: () => demoCard.crush(),
    getup: () => demoCard.getUp(),
    golden: () => demoCard.toggleGolden(),
    immunity: () => demoCard.showImmunity(),
    prison: () => demoCard.togglePrison(),
    polemic: () => demoCard.showPolemic(),
  };
  actions[action]();
}

async function playWholeScene(demoCards) {
  const [macron, sarkozy, lepen] = demoCards;
  await Promise.all(demoCards.map((demoCard) => demoCard.getUp()));
  await macron.talk();
  await sarkozy.talk();
  await sarkozy.attack(reachBetween(1, 2), () => lepen.takeHit());
  await lepen.talk();
  await lepen.attack(reachBetween(2, 0), () => macron.takeHit());
  await macron.crush();
}

function connectControls(demoCards) {
  document.querySelector('#controls').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.action === 'scene') playWholeScene(demoCards);
    else if (button.dataset.eyes) setAllEyes(demoCards, button);
    else runCardAction(demoCards, button.dataset.action, Number(button.dataset.card));
  });
}

function setAllEyes(demoCards, button) {
  demoCards.forEach((demoCard) => demoCard.setRestingEyes(button.dataset.eyes));
  document.querySelectorAll('[data-eyes]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
}

start();
