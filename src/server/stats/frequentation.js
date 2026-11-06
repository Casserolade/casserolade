// The attendance part of the statistics dashboard (statsPage.ts): today, the totals, where visitors come from, the
// last thirty days, the games played in the page, and whether this browser is counted. It renders what tableau.js
// receives from the stream, passed on as a « frequentation » event of the document.

const NOT_COUNTED_KEY = 'casserolade.compteur';
const MODES = [['solo', 'Parties solo'], ['carriere', 'Carrière'], ['tutoriel', 'Tutoriel']];
const DEVICES = [['telephone', 'Téléphone'], ['tablette', 'Tablette'], ['ordinateur', 'Ordinateur']];
const LEVELS = [['debutant', 'Débutant'], ['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']];
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
    joueurs: totaux.joueurs,
  };
}

function renderToday(day) {
  const tiles = [
    [day.visiteurs, 'visiteurs'], [day.nouveaux, 'nouveaux'], [sum(Object.values(day.pages)), 'pages vues'],
    ...MODES.map(([mode, label]) => [`${day.local[mode].lancees} / ${day.local[mode].finies}`, `${label.toLowerCase()} (lancées / finies)`]),
    [day.parties, 'parties en ligne'], [day.joueurs, 'joueurs en ligne'], [day.salonsCrees, 'salons créés'],
    [day.picConnexions, 'pic de connexions'], [day.robots, 'robots'], [day.incidents, 'incidents'],
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
    ...MODES.map(([mode, label]) => [mode, `${label}, lancées / finies`]), ['parties', 'Parties en ligne'], ['joueurs', 'Joueurs en ligne'],
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
  const shown = days.slice(0, 30);
  const most = Math.max(1, ...shown.map((day) => day.visiteurs));
  const head = row(['Jour', 'Visiteurs', '', 'Nouveaux', 'Téléphone', 'Pages', 'Solo', 'Carrière', 'Tutoriel', 'En ligne', 'Joueurs', 'Salons', 'Pic', 'Robots', 'Incidents'], true);
  const lines = shown.map((day) => {
    const game = (mode) => `${day.local[mode].lancees} / ${day.local[mode].finies}`;
    const line = row([dayLabel(day.jour), day.visiteurs]);
    line.append(bar(day.visiteurs, most));
    for (const value of [day.nouveaux, day.appareils.telephone, sum(Object.values(day.pages)), game('solo'), game('carriere'), game('tutoriel'), day.parties, day.joueurs, day.salonsCrees, day.picConnexions, day.robots]) {
      line.append(element('td', {}, shown(value)));
    }
    line.append(element('td', day.incidents ? { class: 'alerte' } : {}, shown(day.incidents)));
    return line;
  });
  document.getElementById('jours').replaceChildren(head, ...lines);
  const old = shown.filter((day) => day.ancienneMesure).reverse();
  const note = document.getElementById('ancienne');
  note.hidden = old.length === 0;
  note.textContent = `Avant le compteur du 6 novembre 2026, l'ancienne mesure comptait le test de santé du serveur (2 867 « visites » par jour) et recomptait tout le monde à chaque redémarrage : ${old.map((day) => `${dayLabel(day.jour)}, ${shown(day.ancienneMesure.visites)} visites et ${shown(day.ancienneMesure.visiteurs)} visiteurs`).join(' ; ')}.`;
}

function renderHeroes(heros) {
  const versions = Object.keys(heros).sort((a, b) => b.localeCompare(a, 'fr', { numeric: true }));
  const host = document.getElementById('heros');
  if (versions.length === 0) {
    host.replaceChildren(element('p', { class: 'meta' }, 'Aucune partie solo finie pour l\'instant.'));
    return;
  }
  host.replaceChildren(...versions.flatMap((version) => {
    const lines = Object.entries(heros[version]).sort((a, b) => a[1].places / a[1].parties - b[1].places / b[1].parties);
    const table = element('table');
    table.append(row(['Héros', 'Parties', 'Place moyenne', 'Victoires', 'Top 4'], true), ...lines.map(([id, count]) => {
      const line = row([names.heros[id] ?? id, count.parties, average(count.places, count.parties), percent(count.victoires, count.parties), percent(count.top4, count.parties)]);
      if (count.parties < FEW_GAMES) line.classList.add('pale');
      return line;
    }));
    return [element('h3', {}, `Version ${version}`), table];
  }));
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
  if (days[0]) renderToday(days[0]);
  renderTotals(days, data.totaux);
  renderOrigins(days.slice(0, 30));
  renderDays(days);
  renderHeroes(data.cumul.heros);
  renderLevels(data.cumul.niveaux);
  renderChapters(data.cumul.chapitres);
  renderIncidents(data.incidents);
});

renderExclusion();
