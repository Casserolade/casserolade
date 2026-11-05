import { loadSources } from '#src/client/services/loadSources.ts';
import type { GameSources } from '#src/client/services/loadSources.ts';
import { sourceMatches } from '#src/client/tools/sourceMatches.ts';

type Sources = GameSources;

type Part = string | { lien: string } | { gras: string };

/** One line of the list, built from text and links only: nothing from the data is read as HTML. */
function item(parts: Part[]): HTMLLIElement {
  const li = document.createElement('li');
  for (const part of parts) {
    if (typeof part === 'string') li.append(part);
    else if ('gras' in part) li.append(Object.assign(document.createElement('strong'), { textContent: part.gras }));
    else li.append(Object.assign(document.createElement('a'), { href: part.lien, textContent: 'source', target: '_blank', rel: 'noreferrer' }));
  }
  return li;
}

function links(urls: (string | undefined)[]): Part[] {
  return urls.filter((url): url is string => Boolean(url)).flatMap((url) => [' · ', { lien: url }]);
}

function categories(sources: Sources): [string, HTMLLIElement[]][] {
  return [
    ['Les phrases du jeu', sources.phrases.map((p) => item([{ gras: p.qui }, ` : « ${p.texte} »`, p.date ? ` (${p.date})` : '', ...links(p.sources)]))],
    ['Les casseroles', sources.casseroles.map((c) => item([{ gras: `${c.qui}, « ${c.nom} »` }, c.citation ? ` « ${c.citation} »` : '', ` ${c.fait} Statut : ${c.statut}`]))],
    ['Les vraies voix', sources.voix.map((v) => item([{ gras: v.nom }, v.auteur ? ` : ${v.auteur}` : '', v.date ? ` (${v.date})` : '', ...links([v.source])]))],
    ['Les photos', sources.photos.map((p) => item([{ gras: p.nom }, p.auteur ? `, par ${p.auteur}` : '', p.licence ? `, ${p.licence}` : '', ...links([p.source])]))],
    ['Les logos des chaînes', sources.logos.map((l) => item([{ gras: l.id }, l.auteur ? `, ${l.auteur}` : '', l.licence ? `, ${l.licence}` : '', ...links([l.source])]))],
    ['Les polices', sources.polices.map((f) => item([{ gras: f.nom }, `, ${f.licence}`]))],
  ];
}

/** Each category folded, with its count; the search keeps only the lines that hold its words. */
function render(sources: Sources, host: HTMLElement, search: HTMLInputElement): void {
  const blocks = categories(sources).map(([title, lines]) => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const list = document.createElement('ul');
    list.append(...lines);
    details.append(summary, list);
    return { title, lines, details, summary };
  });
  const filter = () => {
    for (const block of blocks) {
      let shown = 0;
      for (const line of block.lines) {
        line.hidden = !sourceMatches(line.textContent ?? '', search.value);
        if (!line.hidden) shown++;
      }
      block.summary.textContent = `${block.title} (${shown})`;
      if (search.value.trim()) block.details.open = shown > 0;
    }
  };
  search.addEventListener('input', filter);
  host.replaceChildren(...blocks.map((block) => block.details));
  filter();
}

async function showSources(button: HTMLButtonElement, panel: HTMLElement): Promise<void> {
  const host = panel.querySelector<HTMLElement>('.categories');
  const search = panel.querySelector<HTMLInputElement>('input[type="search"]');
  if (!host || !search) return;
  button.disabled = true;
  button.textContent = 'Chargement…';
  const sources = await loadSources();
  if (!sources) {
    button.disabled = false;
    button.textContent = 'Les sources ne se chargent pas : réessayer';
    return;
  }
  render(sources, host, search);
  panel.hidden = false;
  button.hidden = true;
}

const button = document.querySelector<HTMLButtonElement>('#voir-sources');
const panel = document.querySelector<HTMLElement>('#liste-sources');
if (button && panel) button.addEventListener('click', () => void showSources(button, panel));
