// The real-time statistics dashboard of Casserolade (statsPage.ts): one Server-Sent Events stream, tiles,
// SVG charts over the last five minutes, the live feed of events and the last thirty days.
// Plain JavaScript, no dependency: the page's CSP only allows this file and the stream.

const BASE = document.body.dataset.base;
const HISTORY = 300;
const TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const DATE_TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });

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
const TODAY = [
  ['visites', 'visites'], ['visiteurs', 'visiteurs'], ['parties', 'parties en ligne'], ['partiesPubliques', 'parties publiques'],
  ['joueurs', 'joueurs en ligne'], ['salonsCrees', 'salons créés'], ['picConnexions', 'pic de connexions'], ['incidents', 'incidents'],
];

const state = { samples: [], events: [], days: [], incidents: [], startedAt: null };

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

function renderDays() {
  const days = [...state.days].reverse().slice(0, 30);
  renderTiles(document.getElementById('jour'), TODAY, days[0]);
  const most = Math.max(1, ...days.map((d) => d.visites));
  const mostGames = Math.max(1, ...days.map((d) => d.parties));
  const head = element('tr');
  for (const label of ['Jour', 'Visites', '', 'Visiteurs', 'Parties', '', 'Publiques', 'Joueurs', 'Salons', 'Pic', 'Incidents']) head.append(element('th', {}, label));
  const rows = days.map((d) => {
    const row = element('tr');
    const bar = (value, top, kind) => {
      const cell = element('td', { class: `bar ${kind}` });
      const fill = element('i');
      fill.style.width = `${(value / top) * 100}%`;
      cell.append(fill);
      return cell;
    };
    row.append(element('td', {}, d.jour), element('td', {}, String(d.visites)), bar(d.visites, most, ''), element('td', {}, String(d.visiteurs)),
      element('td', {}, String(d.parties)), bar(d.parties, mostGames, 'parties'), element('td', {}, String(d.partiesPubliques)),
      element('td', {}, String(d.joueurs)), element('td', {}, String(d.salonsCrees)), element('td', {}, String(d.picConnexions)),
      element('td', d.incidents ? { class: 'alerte' } : {}, String(d.incidents)));
    return row;
  });
  document.getElementById('jours').replaceChildren(head, ...rows);
  const incidents = document.getElementById('incidents');
  if (state.incidents.length === 0) {
    incidents.textContent = 'Aucun incident.';
    return;
  }
  const list = element('ol');
  for (const i of state.incidents) list.append(element('li', { class: 'incident' }, `${DATE_TIME.format(new Date(i.at))} · ${i.kind} · salon ${i.code} · manche ${i.round} : ${i.message}`));
  incidents.replaceChildren(list);
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
    state.days = data.jours;
    state.incidents = data.incidents;
    state.startedAt = data.demarrage;
    document.getElementById('version').textContent = `version ${data.version ?? 'inconnue'}`;
    renderTiles(document.getElementById('direct'), TILES, state.samples.at(-1));
    renderCharts();
    renderFeed();
    renderDays();
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
  stream.addEventListener('jours', (message) => {
    const data = JSON.parse(message.data);
    state.days = data.jours;
    state.incidents = data.incidents;
    renderDays();
  });
}

connect();
