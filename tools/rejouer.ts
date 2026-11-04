/**
 * Rejoue un incident de partie (un plantage, ou une règle du moteur qui ne tient plus), avec le moteur courant.
 *
 *   node tools/rejouer.ts data/serveur/incidents/<fichier>.json
 *   (sur le serveur : ~/casserolade, volume casserolade_mmr, dossier incidents)
 *
 * Le rapport contient la graine, les sièges, les options et le journal : la partie se reconstruit entrée par
 * entrée. Un plantage qui se reproduit est un bug à corriger, et un test à écrire ; un rejeu qui diverge
 * vient d'un autre moteur : rejouez avec le commit du rapport (`git worktree add /tmp/v <version>`).
 */
import { readFileSync } from 'node:fs';
import { invariantViolations } from '../src/engine/invariants.ts';
import { replayRoom } from '../src/server/replayRoom.ts';
import type { RoomIncident } from '../src/server/room.ts';

const file = process.argv[2];
if (!file) {
  console.error('Usage : node tools/rejouer.ts <incident.json>');
  process.exit(2);
}
const incident = JSON.parse(readFileSync(file, 'utf8')) as RoomIncident & { code?: string; version?: string | null; at?: string };
console.log(`Incident (${incident.kind}) du salon ${incident.code ?? '?'}, ${incident.at ?? ''}, moteur ${incident.version ?? 'inconnu'}`);
console.log(`Manche ${incident.round}, phase ${incident.phase}, ${incident.log.length} entrées de journal : ${incident.message}`);
try {
  const game = replayRoom(incident);
  const violations = invariantViolations(game);
  console.log(`Rejoué jusqu'à la manche ${game.round}, phase ${game.phase}.`);
  if (incident.kind === 'crash') console.log('Le plantage ne se reproduit pas en rejouant le journal : il a eu lieu dans la dernière étape (voir la pile du rapport).');
  console.log(violations.length ? `Invariants violés :\n  ${violations.join('\n  ')}` : 'Tous les invariants tiennent.');
  for (const p of game.players) console.log(`  siège ${p.seat} ${p.hero.id} : ${p.alive ? `${p.hp} sondages, échelon ${p.tier}, ${p.board.length} politiques` : `éliminé, ${p.place}e`}`);
} catch (error) {
  console.log('Le rejeu reproduit le problème :');
  console.log(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
if (incident.stack) console.log(`\nPile du rapport :\n${incident.stack}`);
