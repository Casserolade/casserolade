import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_SAVE_KEYS } from '../src/client/const/profileSaveKeys.ts';
import { saveRating, savedRating } from '../src/client/services/localRating.ts';
import { createGameStore } from '../src/client/stores/createGameStore.ts';
import { buildProfileSave } from '../src/client/tools/buildProfileSave.ts';
import { nextRankOf } from '../src/client/tools/nextRankOf.ts';
import { ownRoomRating } from '../src/client/tools/ownRoomRating.ts';
import { rankMoveOf } from '../src/client/tools/rankMoveOf.ts';
import { rankOf } from '../src/client/tools/rankOf.ts';
import { readProfileSave } from '../src/client/tools/readProfileSave.ts';
import { RANGS } from '../src/data/rangs.ts';
import { MMR_DEPART } from '../src/lobby/mmr.ts';
import type { ClientMessage, VueSalon } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import type { Transport } from '../src/protocol/transport.ts';

// Le rang des salons, côté joueur : le lieu où sa cote le fait siéger, et le profil qui se sauvegarde sans compte.

const CLE = '3f2b8c1e-9d4a-4f6b-8a2e-1c5d7e9f0a3b';

function memoire(depart: Record<string, string> = {}) {
  const valeurs = new Map(Object.entries(depart));
  return { getItem: (cle: string) => valeurs.get(cle) ?? null, setItem: (cle: string, valeur: string) => void valeurs.set(cle, valeur), valeurs };
}

function salon(extra: Partial<VueSalon> = {}): VueSalon {
  return {
    code: 'ABCDEF',
    siege: 0,
    moi: 'Anne',
    hote: 0,
    estHote: true,
    etat: 'attente',
    options: { bots: 0, niveauBots: 'facile', minuteur: true },
    joueurs: [
      { siege: 0, pseudo: 'Anne', bot: false, connecte: true, mmr: 1042 },
      { siege: 1, pseudo: 'Bob', bot: false, connecte: true },
      { siege: 2, pseudo: 'Bot 1', bot: true, connecte: true },
    ],
    ...extra,
  };
}

test('les rangs montent de la Salle des fêtes à l\'Élysée, et on commence au Conseil municipal', () => {
  assert.equal(RANGS[0].min, 0, 'aucune cote n\'est sans rang');
  assert.ok(RANGS.every((rang, i) => i === 0 || rang.min > RANGS[i - 1].min), 'du plus bas au plus haut');
  assert.equal(new Set(RANGS.map((rang) => rang.id)).size, RANGS.length);
  assert.equal(rankOf(MMR_DEPART).nom, 'Conseil municipal');
  // Un duel perdu entre égaux coûte 5 points : il en faut dix de suite pour quitter le rang de départ.
  assert.equal(rankOf(MMR_DEPART - 50).nom, 'Conseil municipal');
  assert.equal(rankOf(MMR_DEPART - 51).nom, 'Salle des fêtes');
  assert.equal(rankOf(0).nom, 'Salle des fêtes');
  assert.equal(rankOf(1029).nom, 'Conseil municipal');
  assert.equal(rankOf(1030).nom, 'Mairie');
  assert.equal(rankOf(1380).nom, 'Élysée');
  assert.equal(rankOf(5000).nom, 'Élysée');
});

test('le rang suivant, et le rang qui change après une partie', () => {
  assert.equal(nextRankOf(1000)?.nom, 'Mairie');
  assert.equal(nextRankOf(1030)?.nom, 'Assemblée');
  assert.equal(nextRankOf(1380), null, 'rien au-dessus de l\'Élysée');
  assert.equal(rankMoveOf(1025, 1030), 'up');
  assert.equal(rankMoveOf(1030, 1025), 'down');
  assert.equal(rankMoveOf(1000, 1005), null);
  assert.equal(rankMoveOf(1000, 1000), null);
});

test('la cote se lit sur son propre siège, et se garde pour l\'accueil', () => {
  assert.equal(ownRoomRating(salon()), 1042);
  assert.equal(ownRoomRating(salon({ siege: 1 })), null, 'pas encore de cote : pas de rang');
  assert.equal(ownRoomRating(salon({ siege: -1 })), null, 'entré pendant la partie, sans siège');
  assert.equal(ownRoomRating(null), null);
  const garde = memoire();
  assert.equal(savedRating(garde), null, 'rien avant une première partie contre un autre joueur');
  saveRating(1042, garde);
  assert.equal(savedRating(garde), 1042);
  assert.equal(savedRating(memoire({ 'casserolade.cote': 'beaucoup' })), null);
  assert.equal(savedRating(memoire({ 'casserolade.cote': '-3' })), null);
  assert.equal(savedRating(null), null);
});

test('entrer dans un salon envoie la clé du navigateur, pas plus', () => {
  const sent: ClientMessage[] = [];
  const transport: Transport = { send: (message) => void sent.push(message), onMessage: () => {}, onClose: () => {}, close: () => {} };
  const store = createGameStore(transport);
  store.createRoom('Anne', { bots: 0, niveauBots: 'facile', minuteur: true }, CLE);
  store.joinRoom('ABCDEF', 'Anne', CLE);
  store.joinRoom('ABCDEF', 'Anne');
  assert.deepEqual(sent.map((message) => ('joueur' in message ? message.joueur : undefined)), [CLE, CLE, undefined]);
  for (const message of sent) assert.deepEqual(parseClientMessage(JSON.stringify(message)), message, 'le serveur lit ce que le client envoie');
});

test('la sauvegarde du profil : la clé, le pseudo, les succès, la carrière, et rien d\'autre', () => {
  const navigateur = memoire({
    'casserolade.joueur': CLE,
    'casserolade.pseudo': 'Anne',
    'casserolade.progres': '{"parties":12}',
    'plateau.campagne': '{"chapitre":3}',
    'casserolade-volume': '0.4',
    'autre.site': 'secret',
  });
  const sauvegarde = buildProfileSave(navigateur.getItem);
  assert.deepEqual(sauvegarde, {
    game: 'casserolade',
    format: 1,
    entries: { 'casserolade.joueur': CLE, 'casserolade.pseudo': 'Anne', 'casserolade.progres': '{"parties":12}', 'plateau.campagne': '{"chapitre":3}' },
  });
  assert.ok(Object.keys(sauvegarde.entries).every((cle) => PROFILE_SAVE_KEYS.includes(cle)), 'ni réglages de l\'appareil, ni rien d\'un autre site');
  // Le fichier se relit tel quel.
  assert.deepEqual(readProfileSave(JSON.stringify(sauvegarde)), sauvegarde.entries);
});

test('restaurer : seules les clés du profil passent, et un fichier sans clé de joueur est refusé', () => {
  const fichier = (entries: unknown, game: unknown = 'casserolade') => JSON.stringify({ game, format: 1, entries });
  assert.deepEqual(
    readProfileSave(fichier({ 'casserolade.joueur': CLE, 'casserolade.pseudo': 'Anne', 'casserolade-volume': '1', __proto__: 'x', 'casserolade.progres': 42 })),
    { 'casserolade.joueur': CLE, 'casserolade.pseudo': 'Anne' },
    'ce qui n\'est pas du profil, ou pas un texte, reste dehors',
  );
  assert.equal(readProfileSave(fichier({ 'casserolade.pseudo': 'Anne' })), null, 'pas de clé de joueur : ce n\'est pas une sauvegarde');
  assert.equal(readProfileSave(fichier({ 'casserolade.joueur': '../etc' })), null);
  assert.equal(readProfileSave(fichier({ 'casserolade.joueur': CLE }, 'autre jeu')), null);
  assert.equal(readProfileSave(fichier(null)), null);
  assert.equal(readProfileSave('pas du json'), null);
  assert.equal(readProfileSave('null'), null);
  assert.equal(readProfileSave(fichier({ 'casserolade.joueur': CLE, 'casserolade.progres': 'x'.repeat(200_001) }))?.['casserolade.progres'], undefined, 'une valeur démesurée n\'entre pas');
});
