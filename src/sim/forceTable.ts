import fs from 'node:fs';

/** Une mesure de `bilan_cartes.ts` : le gain de places d'une carte offerte, dans un contexte et à une manche. */
export interface ForceRow { id: string; context: 'seul' | 'camp'; round: number; delta: number }

/**
 * Écrit la table de force que lit le bot difficile (`src/data/forceCartes.ts`) : pour chaque carte, le gain de places
 * mesuré à la manche 5, seule et dans son camp. Une carte sans mesure dans son camp (Société civile) reprend `seul`.
 */
export function writeForceTable(file: string, rows: ForceRow[], command: string): void {
  const byCard = new Map<string, { seul?: number; camp?: number }>();
  for (const r of rows) {
    if (r.round !== 5) continue;
    const entry = byCard.get(r.id) ?? {};
    entry[r.context] = Math.round(r.delta * 100) / 100;
    byCard.set(r.id, entry);
  }
  const lines = [...byCard].map(([id, f]) => `  ${id}: { seul: ${f.seul ?? 0}, camp: ${f.camp ?? f.seul ?? 0} },`);
  fs.writeFileSync(file, `/**
 * La force mesurée de chaque carte : les places que gagne un bot moyen qui la reçoit à la manche 5, seule (\`seul\`) ou
 * en visant son camp (\`camp\`). Le bot difficile s'en sert comme un joueur qui connaît le jeu : il sait quelles cartes
 * gagnent, au-delà de leurs stats. Fichier généré, à refaire après un changement de cartes :
 *   ${command}
 * Jamais avec \`--niveau difficile\` : le difficile lit cette table, il se mesurerait lui-même.
 */
export const FORCE_CARTES: Record<string, { seul: number; camp: number }> = {
${lines.join('\n')}
};
`);
}
