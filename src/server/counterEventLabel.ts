import { HERO_BY_ID } from '../data/heroes.ts';
import { CHAPITRES_COMPTES } from '../histoire/carrieres.ts';
import type { CountedEvent, Device, GameEndEvent, GameStartEvent, PageEvent, PageKind } from '../protocol/counterEvent.ts';

const PAGES: Record<PageKind, string> = { jeu: 'le jeu', jeu_telephone: 'le jeu sur téléphone', bestiaire: 'le bestiaire', a_propos: 'la page À propos' };
const DEVICE_NAMES: Record<Device, string> = { telephone: 'téléphone', tablette: 'tablette', ordinateur: 'ordinateur' };
const ELECTIONS: Record<string, string> = Object.fromEntries(CHAPITRES_COMPTES.map((chapter) => [chapter.id, chapter.nom]));

function visitLabel(event: PageEvent): string | null {
  if (!event.premier) return null;
  const from = event.source ? `, depuis ${event.source}` : '';
  return `${event.nouveau ? 'Nouveau visiteur' : 'Visiteur de retour'} sur ${PAGES[event.page]} (${DEVICE_NAMES[event.appareil]}${from})`;
}

function startLabel(event: GameStartEvent): string {
  if (event.mode === 'solo') return `Partie solo lancée (bots ${event.niveau})`;
  if (event.mode === 'carriere') return `Carrière lancée : ${ELECTIONS[event.chapitre] ?? event.chapitre}`;
  return 'Tutoriel lancé';
}

function endLabel(event: GameEndEvent): string {
  const place = event.place === 1 ? '1re' : `${event.place}e`;
  const how = `${place} avec ${HERO_BY_ID[event.heros]?.name ?? event.heros} en ${event.manches} manches`;
  if (event.mode === 'solo') return `Partie solo ${event.gagnee ? 'gagnée' : 'finie'} (bots ${event.niveau}) : ${how}`;
  if (event.mode === 'carriere') return `Carrière, ${ELECTIONS[event.chapitre] ?? event.chapitre} : élection ${event.gagnee ? 'gagnée' : 'perdue'}, ${how}`;
  return `Tutoriel ${event.gagnee ? 'réussi' : 'fini'} : ${how}`;
}

/**
 * The line the dashboard's feed shows for an event of the counter: a visitor's first page of the day, a game started
 * or finished in a page. The other pages of a visit say nothing.
 */
export function counterEventLabel(event: CountedEvent): string | null {
  if (event.type === 'page') return visitLabel(event);
  return event.type === 'partie' ? startLabel(event) : endLabel(event);
}
