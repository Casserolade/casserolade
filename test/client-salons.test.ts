import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { createGameStore } from '../src/client/stores/createGameStore.ts';
import { usePseudoNudge } from '../src/client/stores/usePseudoNudge.ts';
import { seatsLabel } from '../src/client/tools/seatsLabel.ts';
import { shouldAskPseudo } from '../src/client/tools/shouldAskPseudo.ts';
import { hasDefaultPseudo } from '../src/client/tools/hasDefaultPseudo.ts';
import { pseudoOrDefault } from '../src/client/tools/pseudoOrDefault.ts';
import { EMPTY_MANIFEST } from '../src/client/const/gameManifest.ts';
import type { GameManifest } from '../src/client/const/gameManifest.ts';
import { achievementLevel } from '../src/client/tools/achievementLevel.ts';
import { achievementShelves } from '../src/client/tools/achievementShelves.ts';
import { postIntentUrl } from '../src/client/tools/postIntentUrl.ts';
import { victoryCardModel } from '../src/client/tools/victoryCardModel.ts';
import { victoryPostText } from '../src/client/tools/victoryPostText.ts';
import { CARD_BY_ID } from '../src/data/cards.ts';
import { RAYONS, SUCCES } from '../src/data/succes.ts';
import { makeMinion } from '../src/engine/minion.ts';
import { defaultRoomName } from '../src/client/tools/defaultRoomName.ts';
import { hasFreeSeat } from '../src/client/tools/hasFreeSeat.ts';
import { isOwnChatLine } from '../src/client/tools/isOwnChatLine.ts';
import { moderablePlayers } from '../src/client/tools/moderablePlayers.ts';
import { publicRoomStatus } from '../src/client/tools/publicRoomStatus.ts';
import { readPublicRooms } from '../src/client/tools/readPublicRooms.ts';
import { roomHumans } from '../src/client/tools/roomHumans.ts';
import { withPublicName } from '../src/client/tools/withPublicName.ts';
import { createGame, viewFor } from '../src/engine/game.ts';
import type { ClientMessage, OptionsSalon, ServerMessage, VueSalon } from '../src/protocol/messages.ts';
import { parseClientMessage } from '../src/protocol/parseClientMessage.ts';
import type { SalonPublic } from '../src/protocol/publicRooms.ts';
import type { Transport } from '../src/protocol/transport.ts';

const OPTIONS: OptionsSalon = { bots: 0, niveauBots: 'moyen', minuteur: true };

function publicRoom(partial: Partial<SalonPublic> = {}): SalonPublic {
  return { code: 'ABC234', nom: 'Soirée casseroles', hote: 'Marianne', joueurs: 3, places: 8, manche: null, ...partial };
}

/** A room as the server shows it to seat 0, its host: two humans, six bots. */
function room(partial: Partial<VueSalon> = {}): VueSalon {
  return {
    code: 'ABC234',
    siege: 0,
    moi: 'Marianne',
    hote: 0,
    estHote: true,
    etat: 'attente',
    options: OPTIONS,
    joueurs: Array.from({ length: 8 }, (_, siege) => ({ siege, pseudo: siege === 0 ? 'Marianne' : siege === 1 ? 'Gaspard' : `Bot ${siege - 1}`, bot: siege >= 2, connecte: true })),
    ...partial,
  };
}

function fakeTransport() {
  const sent: ClientMessage[] = [];
  let listener: (message: ServerMessage) => void = () => {};
  const transport: Transport = {
    send: (message) => void sent.push(message),
    onMessage: (next) => (listener = next),
    onClose: () => {},
    close: () => {},
  };
  return { transport, sent, receive: (message: ServerMessage) => listener(message) };
}

test('readPublicRooms : la liste du serveur, vérifiée ligne à ligne', () => {
  const listed = publicRoom();
  assert.deepEqual(readPublicRooms([listed, { ...listed, code: 'XYZ789', manche: 4 }]), [listed, { ...listed, code: 'XYZ789', manche: 4 }]);
  assert.deepEqual(readPublicRooms([{ ...listed, nom: '' }, { ...listed, joueurs: -1 }, { ...listed, hote: 3 }, null, 'salon']), [], 'une ligne mal formée est écartée');
  assert.deepEqual(readPublicRooms([{ ...listed, manche: 'trois' }]), [listed], 'une manche illisible : le salon attend');
  assert.equal(readPublicRooms({ salons: [] }), null);
  assert.equal(readPublicRooms(null), null);
});

test('defaultRoomName : « Chez » et le pseudo de l\'hôte, que le serveur accepte comme nom', () => {
  assert.equal(defaultRoomName('Dam'), 'Chez Dam');
  assert.equal(defaultRoomName('  Zoé  '), 'Chez Zoé');
  assert.equal(defaultRoomName(''), 'Table ouverte');
  assert.equal(defaultRoomName('   '), 'Table ouverte');
  for (const pseudo of ['Dam', '', 'x'.repeat(24)]) {
    const message = { type: 'creer_salon', pseudo: 'Hôte', options: { ...OPTIONS, nomPublic: defaultRoomName(pseudo) } };
    assert.ok(parseClientMessage(JSON.stringify(message)), `le nom par défaut de « ${pseudo} » passe le protocole`);
    assert.ok(defaultRoomName(pseudo).length <= 32);
  }
});

test('un salon public qui joue dit sa manche, et qu\'on y entre pour la suivante tant qu\'il reste une place', () => {
  assert.equal(publicRoomStatus(publicRoom()), null, 'un salon qui attend n\'a rien à dire');
  assert.equal(publicRoomStatus(publicRoom({ manche: 0 })), 'Partie lancée : entrez pour la suivante');
  assert.equal(publicRoomStatus(publicRoom({ manche: 5 })), 'Manche 5 en cours : entrez pour la suivante');
  assert.equal(publicRoomStatus(publicRoom({ manche: 5, joueurs: 8 })), 'Manche 5 en cours');
  assert.equal(hasFreeSeat(publicRoom()), true);
  assert.equal(hasFreeSeat(publicRoom({ joueurs: 8 })), false);
});

test('withPublicName : ouvre le salon au public sous un nom, ou le referme, sans toucher aux autres réglages', () => {
  const settings: OptionsSalon = { ...OPTIONS, table: 4, contexte: 'primaire' };
  assert.deepEqual(withPublicName(settings, 'Chez Dam'), { ...settings, nomPublic: 'Chez Dam' });
  assert.deepEqual(withPublicName({ ...settings, nomPublic: 'Chez Dam' }, undefined), settings);
  assert.equal('nomPublic' in withPublicName({ ...settings, nomPublic: 'Chez Dam' }, undefined), false, 'refermé : plus de nom du tout');
  assert.deepEqual(withPublicName({ ...settings, nomPublic: 'Chez Dam' }, 'Le QG'), { ...settings, nomPublic: 'Le QG' });
});

test('le chat : ses propres lignes se reconnaissent au pseudo, et ce que dit le salon n\'est à personne', () => {
  assert.equal(isOwnChatLine({ id: 1, pseudo: 'Zoé', siege: -1, texte: 'salut' }, 'Zoé'), true);
  assert.equal(isOwnChatLine({ id: 2, pseudo: 'Lou', siege: -1, texte: 'salut' }, 'Zoé'), false, 'deux joueurs sans siège ne se confondent pas');
  assert.equal(isOwnChatLine({ id: 3, pseudo: '', siege: -1, texte: 'Zoé entre dans le salon.', annonce: true }, ''), false);
  assert.equal(isOwnChatLine({ id: 4, pseudo: 'Zoé', siege: 2, texte: 'gg' }, ''), false, 'hors d\'un salon, aucune ligne n\'est à soi');
});

test('roomHumans : ceux de la table, et pendant la partie ceux qui attendent la suivante', () => {
  assert.equal(roomHumans(null), 0);
  assert.equal(roomHumans(room()), 2);
  assert.equal(roomHumans(room({ etat: 'en_jeu', enAttente: ['Zoé', 'Lou'] })), 4);
});

test('entré pendant la partie, on attend dans le salon : sa table, son chat, et la partie suivante se joue', () => {
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  const playing = room({ siege: -1, moi: 'Zoé', etat: 'en_jeu', enAttente: ['Zoé'], joueurs: room().joueurs.map((seat) => (seat.siege === 1 ? { ...seat, pseudo: 'Bot 7', bot: true } : seat)) });
  receive({ type: 'salon', jeton: 'j', salon: playing });
  assert.equal(store.screen.value, 'waiting', 'pas de « mise en place du plateau » : on n\'y joue pas');
  assert.equal(store.canChat.value, true, 'une seule humaine à table, mais on est deux à pouvoir se parler');
  receive({ type: 'chat', messages: [{ id: 1, pseudo: '', siege: -1, texte: 'Zoé entre dans le salon.', annonce: true }] });
  assert.equal(store.chat.value.length, 1);

  // La partie finie, le salon attend ; l'hôte relance, et cette fois elle a un siège.
  receive({ type: 'salon', jeton: 'j', salon: room({ siege: 1, moi: 'Zoé', etat: 'fini' }) });
  assert.equal(store.screen.value, 'waiting');
  receive({ type: 'salon', jeton: 'j', salon: room({ siege: 1, moi: 'Zoé', etat: 'en_jeu' }) });
  assert.equal(store.screen.value, 'loading', 'à table, le plateau se met en place');
  receive({ type: 'vue', vue: viewFor(createGame({ seed: 7 }), 1), reste_ms: null });
  assert.equal(store.screen.value, 'recruit');
});

test('après la partie d\'un salon, on revient au salon : le classement s\'efface, la table et le chat restent', () => {
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'salon', jeton: 'j', salon: room({ etat: 'en_jeu' }) });
  receive({ type: 'vue', vue: viewFor(createGame({ seed: 7 }), 0), reste_ms: null });
  receive({ type: 'chat', messages: [{ id: 1, pseudo: 'Gaspard', siege: 1, texte: 'gg' }] });
  store.backToRoom();
  assert.equal(store.screen.value, 'recruit', 'en pleine partie, on ne la quitte pas ainsi');
  receive({ type: 'salon', jeton: 'j', salon: room({ etat: 'fini' }) });
  receive({ type: 'fin', classement: [{ seat: 0, pseudo: 'Marianne', heroId: 'hollande', place: 1 }] });
  assert.equal(store.screen.value, 'end');
  store.backToRoom();
  assert.equal(store.screen.value, 'waiting');
  assert.equal(store.ranking.value, null);
  assert.equal(store.chat.value.length, 1, 'le chat du salon reste');
  // L'hôte relance : une nouvelle partie, comme après « Rejouer ».
  receive({ type: 'salon', jeton: 'j', salon: room({ etat: 'en_jeu' }) });
  assert.equal(store.screen.value, 'loading');
});

// L'hôte modère son salon : couper le chat d'un joueur, ou l'exclure, du salon comme de la partie.

test('moderablePlayers : pour l\'hôte, chaque autre humain, à table ou en attente ; personne pour les autres', () => {
  assert.deepEqual(moderablePlayers(null), []);
  assert.deepEqual(moderablePlayers(room({ estHote: false })), [], 'qui n\'est pas l\'hôte ne modère personne');
  assert.deepEqual(moderablePlayers(room()), [{ pseudo: 'Gaspard', muted: false }], 'ni soi, ni les bots');
  assert.deepEqual(moderablePlayers(room({ etat: 'en_jeu', enAttente: ['Zoé'], muets: ['Zoé'] })), [{ pseudo: 'Gaspard', muted: false }, { pseudo: 'Zoé', muted: true }]);
});

test('l\'hôte coupe un chat ou exclut : le serveur reçoit le pseudo, et le protocole le laisse passer', () => {
  const { transport, sent } = fakeTransport();
  const store = createGameStore(transport);
  store.mutePlayer('Gaspard', true);
  store.mutePlayer('Gaspard', false);
  store.kickPlayer('Gaspard');
  assert.deepEqual(sent, [{ type: 'muet', pseudo: 'Gaspard', oui: true }, { type: 'muet', pseudo: 'Gaspard', oui: false }, { type: 'exclure', pseudo: 'Gaspard' }]);
  for (const message of sent) assert.deepEqual(parseClientMessage(JSON.stringify(message)), message);
});

test('exclu par l\'hôte, on revient à l\'accueil avec son mot ; le chat coupé se dit sans quitter la table', () => {
  const { transport, receive } = fakeTransport();
  const store = createGameStore(transport);
  receive({ type: 'salon', jeton: 'j', salon: room({ siege: 1, moi: 'Gaspard', estHote: false, muets: ['Gaspard'] }) });
  receive({ type: 'erreur', erreur: 'L\'hôte a coupé votre chat.' });
  assert.equal(store.notice.value, 'L\'hôte a coupé votre chat.');
  assert.equal(store.refused.value, null);
  assert.equal(store.screen.value, 'waiting');
  receive({ type: 'erreur', erreur: 'L\'hôte vous a exclu de ce salon.' });
  assert.equal(store.refused.value, 'L\'hôte vous a exclu de ce salon.', 'la page d\'accueil l\'affiche');
});

// Le plateau de fin d'un vainqueur, à partager : la carte de victoire et les mots qui vont avec.

test('la carte de victoire se lit sur la dernière vue du vainqueur : son héros, sa manche, son plateau et le plus gros', () => {
  const vue = viewFor(createGame({ seed: 7 }), 0);
  const gros = (id: string, uid: number, atk: number, hp: number) => ({ ...makeMinion(CARD_BY_ID[id], uid), atk, hp });
  const plateau = [gros('hassan', 1, 312, 280), { ...gros('melenchon', 2, 2400, 2150), golden: true }, gros('lalanne', 3, 9000, 3)];
  const art = { atlas: 'personnages/melenchon.webp' } as GameManifest['personnages'][string];
  const manifest: GameManifest = { ...EMPTY_MANIFEST, personnages: { melenchon: art }, plateaux: { [vue.plateau.id]: { decor: 'plateaux/decor.webp' } } };
  const carte = victoryCardModel({ ...vue, heroId: 'polony', round: 15, hp: 14, board: plateau }, manifest, 'Dam');
  assert.equal(carte.byline, 'Dam, avec Natacha Polony');
  assert.equal(carte.facts, 'Manche 15 · 14 sondages');
  assert.equal(carte.backdrop, 'plateaux/decor.webp');
  assert.deepEqual(carte.board.map((m) => [m.name, m.atk, m.hp, m.golden]), [['Rima Hassan', '312', '280', false], ['Jean-Luc Mélenchon', '2,4k', '2,1k', true], ['Francis Lalanne', '9k', '3', false]]);
  assert.equal(carte.board[1].art, art);
  assert.equal(carte.board[0].art, null, 'un politique sans tête dans le manifeste garde sa place, vide');
  assert.equal(carte.leader?.name, 'Jean-Luc Mélenchon', 'le plus gros par sa plus petite stat : 9000/3 ne compte pas');
  assert.equal(victoryPostText(carte), 'Élu sur Casserolade avec Natacha Polony ! Mon plateau de fin, Jean-Luc Mélenchon en tête (2,4k/2,1k) :');
  // Contre des bots, pas de pseudo ; un seul sondage s'écrit au singulier ; un plateau vide n'a pas de plus gros.
  const seul = victoryCardModel({ ...vue, heroId: 'polony', round: 9, hp: 1, board: [] }, manifest, null);
  assert.equal(seul.byline, 'Avec Natacha Polony');
  assert.equal(seul.facts, 'Manche 9 · 1 sondage');
  assert.equal(seul.leader, null);
  assert.equal(victoryPostText(seul), 'Élu sur Casserolade avec Natacha Polony !');
});

test('postIntentUrl : un post sur X, son texte et le lien du jeu, encodés', () => {
  const adresse = postIntentUrl('Élu sur Casserolade avec Natacha Polony ! Mon plateau (2,4k/2,1k) :', 'https://casserolade.fr');
  assert.ok(adresse.startsWith('https://x.com/intent/post?text='));
  const lu = new URL(adresse).searchParams;
  assert.equal(lu.get('text'), 'Élu sur Casserolade avec Natacha Polony ! Mon plateau (2,4k/2,1k) :');
  assert.equal(lu.get('url'), 'https://casserolade.fr');
});

test('le tableau des succès se range par rayons, dans l\'ordre du jeu, et compte ce qui est gagné', () => {
  const rayons = achievementShelves(['premier_mandat', 'bete_politique', 'inconnu']);
  assert.deepEqual(rayons.map((rayon) => rayon.name), Object.values(RAYONS));
  assert.equal(rayons.reduce((somme, rayon) => somme + rayon.items.length, 0), SUCCES.length, 'chaque succès est dans un rayon, une fois');
  assert.equal(rayons.find((rayon) => rayon.id === 'mandats')?.wonCount, 1);
  assert.equal(rayons.find((rayon) => rayon.id === 'gros_bras')?.wonCount, 1);
  assert.equal(rayons.find((rayon) => rayon.id === 'en_ligne')?.wonCount, 0);
  assert.ok(rayons.every((rayon) => rayon.items.length > 0));
});

test('achievementLevel : le niveau des bots d\'une partie rapide, et rien pour ceux du tutoriel', () => {
  assert.equal(achievementLevel('difficile'), 'difficile');
  assert.equal(achievementLevel('facile'), 'facile');
  assert.equal(achievementLevel('debutant'), undefined);
  assert.equal(achievementLevel(undefined), undefined);
});

// Le pseudo : on incite à en choisir un, sans jamais empêcher de jouer.

test('sans pseudo, le premier geste en ligne est retenu et montre le champ ; le champ validé, il repart', () => {
  assert.equal(shouldAskPseudo('', false), true);
  assert.equal(shouldAskPseudo('   ', false), true, 'des espaces ne font pas un pseudo');
  assert.equal(shouldAskPseudo('', true), false, 'déjà demandé : on ne retient pas deux fois');
  assert.equal(shouldAskPseudo('Dam', false), false);

  const pseudo = ref('');
  let montre = 0;
  const joues: string[] = [];
  const { asking, withPseudo, resume } = usePseudoNudge(pseudo, () => montre++);
  resume();
  assert.equal(joues.length, 0, 'rien de retenu : valider le champ ne lance rien');
  withPseudo(() => joues.push(`rejoindre:${pseudo.value}`));
  assert.deepEqual([asking.value, montre, joues.length], [true, 1, 0], 'retenu, et le champ est montré');
  pseudo.value = 'Dam';
  resume();
  assert.deepEqual([asking.value, joues], [false, ['rejoindre:Dam']], 'le pseudo tapé puis Entrée : le geste repart, avec le pseudo');
  resume();
  assert.equal(joues.length, 1, 'une seule fois');

  // Sans pseudo : valider le champ vide, ou refaire le geste, passe aussi. On jouera « Sans étiquette ».
  pseudo.value = '';
  withPseudo(() => joues.push('creer'));
  resume();
  assert.deepEqual([asking.value, joues.at(-1)], [false, 'creer']);
  withPseudo(() => joues.push('ouvrir'));
  withPseudo(() => joues.push('ouvrir encore'));
  assert.deepEqual([asking.value, montre, joues.at(-1)], [false, 3, 'ouvrir encore'], 'le geste refait passe, et rien ne reste retenu');
});

test('hasDefaultPseudo : le pseudo de qui n\'en a pas choisi, seul ou numéroté dans un salon', () => {
  assert.equal(hasDefaultPseudo('Sans étiquette'), true);
  assert.equal(hasDefaultPseudo('Sans étiquette 2'), true);
  assert.equal(hasDefaultPseudo('Sans étiquette 12'), true);
  assert.equal(hasDefaultPseudo('Sans étiquette deux'), false);
  assert.equal(hasDefaultPseudo('Sans étiquettes'), false);
  assert.equal(hasDefaultPseudo('Dam'), false);
  assert.equal(pseudoOrDefault('  '), 'Sans étiquette', 'le même nom que celui que l\'accueil envoie sans pseudo');
});

test('choisir son pseudo depuis le salon : le serveur reçoit le nouveau nom, et le protocole le laisse passer', () => {
  const { transport, sent } = fakeTransport();
  createGameStore(transport).renameSelf('Cléo');
  assert.deepEqual(sent, [{ type: 'renommer', pseudo: 'Cléo' }]);
  assert.deepEqual(parseClientMessage(JSON.stringify(sent[0])), sent[0]);
});

test('seatsLabel : combien sont assis, en mots', () => {
  assert.equal(seatsLabel(1, 8), '1 joueur sur 8');
  assert.equal(seatsLabel(4, 8), '4 joueurs sur 8');
  assert.equal(seatsLabel(0, 8), '0 joueur sur 8');
});
