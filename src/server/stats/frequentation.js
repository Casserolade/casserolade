// The attendance part of the statistics dashboard (statsPage.ts): today hour by hour, the totals, where visitors come
// from, the last thirty days, the games played in the page and online, and whether this browser is counted. It renders what tableau.js
// receives from the stream, passed on as a « frequentation » event of the document.

const NOT_COUNTED_KEY = 'casserolade.compteur';
const MODES = [['solo', 'Parties solo'], ['carriere', 'Carrière'], ['tutoriel', 'Tutoriel']];
const DEVICES = [['telephone', 'Téléphone'], ['tablette', 'Tablette'], ['ordinateur', 'Ordinateur']];
const LEVELS = [['debutant', 'Débutant'], ['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']];
/** The seats of online games: the humans, then each level of bots. */
const SEATS = [['humain', 'Humains'], ...LEVELS.map(([key, label]) => [key, `Bots, ${label.toLowerCase()}`])];
const HOURS = [['visiteurs', 'visiteurs arrivés', '#4d8dff'], ['parties', 'parties lancées', '#ffaa2e']];
/** Under this many games, a hero's average says little: its line is shown pale. */
const FEW_GAMES = 10;
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const names = { heros: {}, chapitres: [] };

function element(tag, attributes = {}, text = '') {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== '') node.textContent = text;
  return node;
}

/** A number as French writes it, 3 003; anything else as it is. */
function shown(value) {
  return typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value);
}

function row(cells, header = false) {
  const line = element('tr');
  for (const cell of cells) line.append(cell instanceof Node ? cell : element(header ? 'th' : 'td', {}, shown(cell)));
  return line;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function percent(part, whole) {
  return whole ? `${Math.round((part / whole) * 100)} %` : '—';
}

function average(total, count) {
  return count ? (total / count).toFixed(1).replace('.', ',') : '—';
}

function dayLabel(jour) {
  return SHORT_DAY.format(new Date(`${jour}T12:00:00Z`));
}

/** The totals of some days, as the table of totals lists them. */
function totalsOf(days) {
  const local = (mode, key) => sum(days.map((day) => day.local[mode][key]));
  return {
    visiteurs: sum(days.map((day) => day.visiteurs)),
    nouveaux: sum(days.map((day) => day.nouveaux)),
    pages: sum(days.map((day) => sum(Object.values(day.pages)))),
    ...Object.fromEntries(MODES.map(([mode]) => [mode, `${local(mode, 'lancees')} / ${local(mode, 'finies')}`])),
    parties: sum(days.map((day) => day.parties)),
    partiesFinies: sum(days.map((day) => day.partiesFinies)),
    partiesAbandonnees: sum(days.map((day) => day.partiesAbandonnees)),
    joueurs: sum(days.map((day) => day.joueurs)),
  };
}

function allTimeTotals(totaux) {
  return {
    visiteurs: totaux.visiteurs,
    nouveaux: totaux.nouveaux,
    pages: totaux.pages,
    ...Object.fromEntries(MODES.map(([mode]) => [mode, `${totaux.local[mode].lancees} / ${totaux.local[mode].finies}`])),
    parties: totaux.parties,
    partiesFinies: totaux.partiesFinies,
    partiesAbandonnees: totaux.partiesAbandonnees,
    joueurs: totaux.joueurs,
  };
}

/** The average length of the day's finished online games, in minutes. */
function onlineLength(day) {
  return day.partiesFinies ? `${Math.round(day.dureeFiniesMs / day.partiesFinies / 60_000)} min` : '—';
}

function renderToday(day) {
  const tiles = [
    [day.visiteurs, 'visiteurs'], [day.nouveaux, 'nouveaux'], [sum(Object.values(day.pages)), 'pages vues'],
    ...MODES.map(([mode, label]) => [`${day.local[mode].lancees} / ${day.local[mode].finies}`, `${label.toLowerCase()} (lancées / finies)`]),
    [day.parties, 'parties en ligne'], [day.partiesFinies, 'en ligne, allées au bout'], [onlineLength(day), 'durée moyenne en ligne'],
    [day.partiesAbandonnees, 'en ligne, abandonnées'], [day.reprises, 'sièges repris par un bot'], [day.joueurs, 'joueurs en ligne'],
    [day.salonsCrees, 'salons créés'], [day.picConnexions, 'pic de connexions'], [day.robots, 'robots'], [day.incidents, 'incidents'],
  ];
  document.getElementById('jour').replaceChildren(...tiles.map(([value, label]) => {
    const tile = element('div', { class: label === 'incidents' && value > 0 ? 'tile alerte' : 'tile' });
    tile.append(element('b', {}, shown(value)), element('span', {}, label));
    return tile;
  }));
}

function renderTotals(days, totaux) {
  const columns = [['Aujourd\'hui', totalsOf(days.slice(0, 1))], ['7 jours', totalsOf(days.slice(0, 7))], ['30 jours', totalsOf(days.slice(0, 30))], ['Depuis le début', allTimeTotals(totaux)]];
  const lines = [
    ['visiteurs', 'Visiteurs (un par navigateur et par jour)'], ['nouveaux', 'Nouveaux visiteurs'], ['pages', 'Pages vues'],
    ...MODES.map(([mode, label]) => [mode, `${label}, lancées / finies`]), ['parties', 'Parties en ligne'], ['partiesFinies', 'En ligne, allées au bout'],
    ['partiesAbandonnees', 'En ligne, abandonnées'], ['joueurs', 'Joueurs en ligne'],
  ];
  document.getElementById('totaux').replaceChildren(
    row(['', ...columns.map(([title]) => title)], true),
    ...lines.map(([key, label]) => row([label, ...columns.map(([, totals]) => totals[key])])),
  );
}

/** Where visitors came from and on what screen, over the days given. */
function renderOrigins(days) {
  const sources = {};
  for (const day of days) for (const [source, count] of Object.entries(day.sources)) sources[source] = (sources[source] ?? 0) + count;
  const visitors = sum(days.map((day) => day.visiteurs));
  const top = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 12);
  document.getElementById('sources').replaceChildren(
    row(['Source', 'Visiteurs', 'Part'], true),
    ...(top.length ? top.map(([source, count]) => row([source, count, percent(count, visitors)])) : [row(['Personne encore', '', ''])]),
  );
  document.getElementById('appareils').replaceChildren(
    row(['Écran', 'Visiteurs', 'Part'], true),
    ...DEVICES.map(([key, label]) => {
      const count = sum(days.map((day) => day.appareils[key]));
      return row([label, count, percent(count, visitors)]);
    }),
  );
}

function bar(value, top) {
  const cell = element('td', { class: 'bar' });
  const fill = element('i');
  fill.style.width = `${top ? (value / top) * 100 : 0}%`;
  cell.append(fill);
  return cell;
}

function renderDays(days) {
  // Not « shown »: that name is the number formatter, and hiding it broke the table and everything drawn after it.
  const recent = days.slice(0, 30);
  const most = Math.max(1, ...recent.map((day) => day.visiteurs));
  const head = row(['Jour', 'Visiteurs', '', 'Nouveaux', 'Téléphone', 'Pages', 'Solo', 'Carrière', 'Tutoriel', 'En ligne', 'Finies', 'Joueurs', 'Salons', 'Pic', 'Robots', 'Incidents'], true);
  const lines = recent.map((day) => {
    const game = (mode) => `${day.local[mode].lancees} / ${day.local[mode].finies}`;
    const line = row([dayLabel(day.jour), day.visiteurs]);
    line.append(bar(day.visiteurs, most));
    for (const value of [day.nouveaux, day.appareils.telephone, sum(Object.values(day.pages)), game('solo'), game('carriere'), game('tutoriel'), day.parties, day.partiesFinies, day.joueurs, day.salonsCrees, day.picConnexions, day.robots]) {
      line.append(element('td', {}, shown(value)));
    }
    line.append(element('td', day.incidents ? { class: 'alerte' } : {}, shown(day.incidents)));
    return line;
  });
  document.getElementById('jours').replaceChildren(head, ...lines);
  const old = recent.filter((day) => day.ancienneMesure).reverse();
  const note = document.getElementById('ancienne');
  note.hidden = old.length === 0;
  note.textContent = `Avant le compteur du 6 novembre 2026, l'ancienne mesure comptait le test de santé du serveur (2 867 « visites » par jour) et recomptait tout le monde à chaque redémarrage : ${old.map((day) => `${dayLabel(day.jour)}, ${shown(day.ancienneMesure.visites)} visites et ${shown(day.ancienneMesure.visiteurs)} visiteurs`).join(' ; ')}.`;
}

/** The versions of the game, the latest first. */
function latestFirst(results) {
  return Object.keys(results).sort((a, b) => b.localeCompare(a, 'fr', { numeric: true }));
}

/** Finished games of heroes, camps or seats, the best average place first; pale under a few games. */
function resultsTable(title, entries, nameOf, sorted = true) {
  const lines = sorted ? [...entries].sort((a, b) => a[1].places / a[1].parties - b[1].places / b[1].parties) : entries;
  const table = element('table');
  table.append(row([title, 'Parties', 'Place moyenne', 'Victoires', 'Top 4'], true), ...lines.map(([id, count]) => {
    const line = row([nameOf(id), count.parties, average(count.places, count.parties), percent(count.victoires, count.parties), percent(count.top4, count.parties)]);
    if (count.parties < FEW_GAMES) line.classList.add('pale');
    return line;
  }));
  return table;
}

const heroName = (id) => names.heros[id] ?? id;

function renderHeroes(heros) {
  const versions = latestFirst(heros);
  const host = document.getElementById('heros');
  if (versions.length === 0) {
    host.replaceChildren(element('p', { class: 'meta' }, 'Aucune partie solo finie pour l\'instant.'));
    return;
  }
  host.replaceChildren(...versions.flatMap((version) => [element('h3', {}, `Version ${version}`), resultsTable('Héros', Object.entries(heros[version]), heroName)]));
}

/**
 * The online games of the latest version: humans against each level of bots, then the heroes and the camps of the
 * humans who played to the end. The archive on the server keeps every game, for the full analysis.
 */
function renderOnline(enLigne) {
  const host = document.getElementById('enligne');
  const [version, ...older] = latestFirst(enLigne);
  if (!version) {
    host.replaceChildren(element('p', { class: 'meta' }, 'Aucune partie en ligne allée au bout pour l\'instant.'));
    return;
  }
  const results = enLigne[version];
  const seats = SEATS.filter(([key]) => results.sieges[key]).map(([key]) => [key, results.sieges[key]]);
  const seatName = (key) => SEATS.find(([k]) => k === key)?.[1] ?? key;
  const columns = element('div', { class: 'duo' });
  const heroes = element('section');
  heroes.append(element('h3', {}, 'Par héros, les humains'), resultsTable('Héros', Object.entries(results.heros), heroName));
  const others = element('section');
  others.append(
    element('h3', {}, 'Humains et bots, à la même table'), resultsTable('Siège', seats, seatName, false),
    element('h3', {}, 'Par camp, les humains (trois politiques du camp au moins)'), resultsTable('Camp', Object.entries(results.camps), (id) => id),
  );
  columns.append(heroes, others);
  const title = `Version ${version}${older.length ? ` (avant : ${older.join(', ')})` : ''}`;
  host.replaceChildren(element('h3', {}, title), columns);
}

/** Today hour by hour (Paris), as bars, over the day before's visitors in a pale line: when the site is played. */
function renderHours(today, before) {
  const host = document.getElementById('heures');
  // Days counted before the hours were: nothing to compare with.
  const yesterday = before && sum(before.heures.visiteurs) > 0 ? before : null;
  const values = [...HOURS.flatMap(([key]) => today.heures[key]), ...(yesterday?.heures.visiteurs ?? [])];
  const max = Math.max(1, ...values);
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 240 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  const height = (value) => (value / max) * 96;
  HOURS.forEach(([key, , color], index) => today.heures[key].forEach((value, hour) => {
    if (!value) return;
    const bar = document.createElementNS(svgNs, 'rect');
    bar.setAttribute('x', String(hour * 10 + 1 + index * 4));
    bar.setAttribute('y', String(100 - height(value)));
    bar.setAttribute('width', '4');
    bar.setAttribute('height', String(height(value)));
    bar.setAttribute('fill', color);
    svg.append(bar);
  }));
  if (yesterday) {
    const line = document.createElementNS(svgNs, 'polyline');
    line.setAttribute('points', yesterday.heures.visiteurs.map((value, hour) => `${hour * 10 + 5},${100 - height(value)}`).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#8f98ad');
    line.setAttribute('stroke-dasharray', '3 3');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(line);
  }
  const caption = element('figcaption');
  for (const [key, label, color] of HOURS) {
    const item = element('span', {}, ` ${label} : ${shown(sum(today.heures[key]))}`);
    const swatch = element('i');
    swatch.style.background = color;
    item.prepend(swatch);
    caption.append(item);
  }
  if (yesterday) caption.append(element('span', {}, `· en pointillé, les visiteurs du ${dayLabel(yesterday.jour)} (${shown(sum(yesterday.heures.visiteurs))})`));
  const scale = element('div', { class: 'heures' });
  scale.append(...['0 h', '6 h', '12 h', '18 h', '24 h'].map((label) => element('span', {}, label)));
  host.replaceChildren(caption, svg, scale);
}

function renderLevels(niveaux) {
  document.getElementById('niveaux').replaceChildren(
    row(['Bots', 'Lancées', 'Finies', 'Gagnées', 'Place moyenne'], true),
    ...LEVELS.map(([key, label]) => {
      const count = niveaux[key] ?? { lancees: 0, finies: 0, gagnees: 0, places: 0 };
      return row([label, count.lancees, count.finies, count.gagnees, average(count.places, count.finies)]);
    }),
  );
}

function renderChapters(chapitres) {
  document.getElementById('chapitres').replaceChildren(
    row(['Élection', 'Lancées', 'Finies', 'Gagnées', 'Réussite'], true),
    ...names.chapitres.map(({ id, nom }) => {
      const count = chapitres[id] ?? { lancees: 0, finies: 0, gagnees: 0 };
      return row([nom, count.lancees, count.finies, count.gagnees, percent(count.gagnees, count.finies)]);
    }),
  );
}

function renderIncidents(incidents) {
  const host = document.getElementById('incidents');
  if (incidents.length === 0) {
    host.textContent = 'Aucun incident.';
    return;
  }
  const at = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
  const list = element('ol');
  for (const i of incidents) list.append(element('li', { class: 'incident' }, `${at.format(new Date(i.at))} · ${i.kind} · salon ${i.code} · manche ${i.round} : ${i.message}`));
  host.replaceChildren(list);
}

function readExclusion() {
  try {
    return localStorage.getItem(NOT_COUNTED_KEY) === 'non';
  } catch {
    return false;
  }
}

/** The browsers of the one who reads these numbers can leave the count: the choice is kept by the browser. */
function renderExclusion() {
  const excluded = readExclusion();
  const host = document.getElementById('exclusion');
  const button = element('button', { type: 'button' }, excluded ? 'Le compter de nouveau' : 'Ne plus compter ce navigateur');
  button.addEventListener('click', () => {
    try {
      if (excluded) localStorage.removeItem(NOT_COUNTED_KEY);
      else localStorage.setItem(NOT_COUNTED_KEY, 'non');
    } catch {
      // No storage: the browser stays as it was.
    }
    renderExclusion();
  });
  host.replaceChildren(element('span', {}, excluded ? 'Ce navigateur n\'est pas compté : ses visites et ses parties ne s\'ajoutent pas.' : 'Ce navigateur est compté, comme celui de n\'importe quel visiteur.'), ' ', button);
}

document.addEventListener('frequentation', (event) => {
  const data = event.detail;
  if (data.noms) Object.assign(names, data.noms);
  const days = [...data.jours].reverse();
  if (days[0]) {
    renderToday(days[0]);
    renderHours(days[0], days[1]);
  }
  renderTotals(days, data.totaux);
  renderOrigins(days.slice(0, 30));
  renderDays(days);
  renderHeroes(data.cumul.heros);
  renderLevels(data.cumul.niveaux);
  renderChapters(data.cumul.chapitres);
  renderOnline(data.cumul.enLigne ?? {});
  renderIncidents(data.incidents);
});

renderExclusion();
