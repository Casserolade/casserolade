// The real-time statistics dashboard of Casserolade (statsPage.ts): one Server-Sent Events stream, tiles,
// SVG charts over the last five minutes and the live feed of events. The days go to frequentation.js, as a
// « frequentation » event of the document. Plain JavaScript, no dependency: the page's CSP only allows these files.

const BASE = document.body.dataset.base;
const HISTORY = 300;
const TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** What the tiles show, from the last measure. */
const TILES = [
  ['connexions', 'connexions'], ['adresses', 'adresses'], ['joueurs', 'joueurs en partie'], ['enJeu', 'parties en cours'],
  ['salons', 'salons ouverts'], ['enFile', 'dans la file publique'], ['messagesIn', 'messages reçus / s'], ['messagesOut', 'messages envoyés / s'],
  ['kioOut', 'Kio envoyés / s'], ['boucleP99', 'latence boucle p99 (ms)', 100], ['occupation', 'occupation boucle (%)', 70],
  ['cpu', 'CPU (% d\'un cœur)', 80], ['memoireMo', 'mémoire (Mo)'], ['tasMo', 'tas JS (Mo)'],
];
/** The charts: each a few series of the measures, with their colours. */
const CHARTS = [
  ['La salle', [['connexions', 'connexions', '#4d8dff'], ['joueurs', 'joueurs en partie', '#ffaa2e'], ['enFile', 'file publique', '#4cd07a']]],
  ['Le trafic, par seconde', [['messagesIn', 'messages reçus', '#4d8dff'], ['messagesOut', 'messages envoyés', '#ffaa2e']]],
  ['La boucle d\'événements', [['boucleP99', 'latence p99 (ms)', '#ff5d50'], ['boucleP50', 'latence p50 (ms)', '#ffd84a'], ['occupation', 'occupation (%)', '#4cd07a']]],
  ['Le processus', [['memoireMo', 'mémoire (Mo)', '#4d8dff'], ['tasMo', 'tas JS (Mo)', '#8f98ad'], ['cpu', 'CPU (%)', '#ffaa2e']]],
];

const state = { samples: [], events: [], startedAt: null };

function element(tag, attributes = {}, text = '') {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text) node.textContent = text;
  return node;
}

function renderTiles(container, entries, values) {
  container.replaceChildren(...entries.map(([key, label, alertAbove]) => {
    const value = values?.[key] ?? 0;
    const tile = element('div', { class: `tile${alertAbove !== undefined && value > alertAbove ? ' alerte' : ''}` });
    tile.append(element('b', {}, String(value)), element('span', {}, label));
    return tile;
  }));
}

/** One chart: a polyline per series, scaled to the highest value shown, with the current values in the legend. */
function renderChart(figure, title, series) {
  const samples = state.samples;
  const max = Math.max(1, ...series.flatMap(([key]) => samples.map((s) => s[key] ?? 0)));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${HISTORY} 100`);
  svg.setAttribute('preserveAspectRatio', 'none');
  for (const [key, , color] of series) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    const offset = HISTORY - samples.length;
    line.setAttribute('points', samples.map((s, i) => `${offset + i},${100 - ((s[key] ?? 0) / max) * 96 - 2}`).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1.6');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(line);
  }
  const last = samples.at(-1) ?? {};
  const caption = element('figcaption');
  caption.append(element('b', {}, title));
  for (const [key, label, color] of series) {
    const item = element('span', {}, ` ${label} : ${last[key] ?? 0}`);
    const swatch = element('i');
    swatch.style.background = color;
    item.prepend(swatch);
    caption.append(item);
  }
  caption.append(element('span', {}, `· échelle ${Math.round(max * 10) / 10}`));
  figure.replaceChildren(caption, svg);
}

function renderCharts() {
  const container = document.getElementById('courbes');
  if (container.children.length !== CHARTS.length) container.replaceChildren(...CHARTS.map(() => element('figure')));
  CHARTS.forEach(([title, series], index) => renderChart(container.children[index], title, series));
}

function renderFeed() {
  document.getElementById('fil').replaceChildren(...state.events.map((event) => {
    const item = element('li', { class: event.type });
    item.append(element('time', {}, TIME.format(new Date(event.t))), element(event.type === 'partie' ? 'b' : 'span', {}, event.texte));
    return item;
  }));
}

/** The days, the totals and the incidents: frequentation.js draws them. */
function passOnDays(data) {
  document.dispatchEvent(new CustomEvent('frequentation', { detail: data }));
}

function renderUptime() {
  if (!state.startedAt) return;
  const seconds = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  document.getElementById('depuis').textContent = `en ligne depuis ${h} h ${String(m).padStart(2, '0')} min`;
}

function connect() {
  const status = document.getElementById('etat');
  const stream = new EventSource(`${BASE}/flux`);
  stream.addEventListener('open', () => {
    status.textContent = 'en direct';
    status.classList.add('vivant');
  });
  stream.addEventListener('error', () => {
    status.textContent = 'reconnexion…';
    status.classList.remove('vivant');
  });
  stream.addEventListener('bonjour', (message) => {
    const data = JSON.parse(message.data);
    state.samples = data.samples;
    state.events = data.events;
    state.startedAt = data.demarrage;
    document.getElementById('version').textContent = `version ${data.version ?? 'inconnue'}`;
    renderTiles(document.getElementById('direct'), TILES, state.samples.at(-1));
    renderCharts();
    renderFeed();
    passOnDays(data);
    renderUptime();
  });
  stream.addEventListener('mesure', (message) => {
    const sample = JSON.parse(message.data);
    state.samples.push(sample);
    if (state.samples.length > HISTORY) state.samples.shift();
    renderTiles(document.getElementById('direct'), TILES, sample);
    renderCharts();
    renderUptime();
  });
  stream.addEventListener('evenement', (message) => {
    state.events.unshift(JSON.parse(message.data));
    state.events.length = Math.min(state.events.length, 60);
    renderFeed();
  });
  stream.addEventListener('jours', (message) => passOnDays(JSON.parse(message.data)));
}

connect();
