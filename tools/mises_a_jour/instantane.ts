import fs from 'node:fs';
import path from 'node:path';
import type { Card, Casserole, Spell } from '../../src/engine/types.ts';

/**
 * Fige les cartes d'une version, avant et après, pour la page des mises à jour (/mises-a-jour) : les politiques, les
 * casseroles et les sorts nouveaux ou changés depuis la version précédente. L'ancienne version se lit dans une copie
 * du dépôt à son commit :
 *   git worktree add /tmp/v-avant <commit de la version précédente>
 *   node tools/mises_a_jour/instantane.ts /tmp/v-avant 0.3.9
 * Écrit src/data/misesAJour/<version>.ts. Le texte de la version (en bref, règles, pourquoi) s'écrit à la main dans
 * src/data/misesAJour.ts.
 */
const [oldRoot, version] = process.argv.slice(2);
if (!oldRoot || !version) {
  console.error('Usage : node tools/mises_a_jour/instantane.ts <dépôt de la version précédente> <version>');
  process.exit(1);
}
const newRoot = path.resolve(import.meta.dirname, '../..');

interface GameData { cards: Card[]; casseroles: Casserole[]; spells: Spell[] }

async function load(root: string): Promise<GameData> {
  const { CARDS } = await import(path.join(root, 'src/data/cards.ts'));
  const { CASSEROLES } = await import(path.join(root, 'src/data/casseroles.ts'));
  const { SPELLS } = await import(path.join(root, 'src/data/sorts.ts'));
  return { cards: CARDS, casseroles: CASSEROLES, spells: SPELLS };
}

/** Ce que montre une carte de politique. */
function cardShape(c: Card): Card {
  return { id: c.id, name: c.name, camp: c.camp, tier: c.tier, atk: c.atk, hp: c.hp, keywords: c.keywords ?? [], effects: c.effects ?? [] };
}

/** Ce que montre une carte de casserole : sa mécanique, sans le fait, le statut ni les sources. */
function casseroleShape(c: Casserole): Partial<Casserole> {
  const { fait, statut, sources, citation, blague, verifie, ...shown } = c as Casserole & Record<string, unknown>;
  return shown;
}

function changes<T extends { id: string }>(before: T[], after: T[], shape: (x: T) => unknown) {
  const old = new Map(before.map((x) => [x.id, x]));
  return after
    .filter((x) => !old.has(x.id) || JSON.stringify(shape(old.get(x.id) as T)) !== JSON.stringify(shape(x)))
    .map((x) => (old.has(x.id) ? { before: shape(old.get(x.id) as T), after: shape(x) } : { after: shape(x) }));
}

const [before, after] = await Promise.all([load(path.resolve(oldRoot)), load(newRoot)]);
const snapshot = {
  cards: changes(before.cards, after.cards, cardShape),
  casseroles: changes(before.casseroles, after.casseroles, casseroleShape),
  spells: changes(before.spells, after.spells, (s) => s),
};
/** Une carte par ligne : le fichier se relit dans un diff. */
const lines = (items: unknown[]) => items.map((item) => `    ${JSON.stringify(item)},`).join('\n');
const out = path.join(newRoot, 'src/data/misesAJour', `${version}.ts`);
fs.writeFileSync(
  out,
  `import type { VersionCards } from '../misesAJour.ts';\n\n` +
    `/** Les cartes de la version ${version}, avant et après. Fichier généré par tools/mises_a_jour/instantane.ts. */\n` +
    `export const CARTES: VersionCards = {\n` +
    `  cards: [\n${lines(snapshot.cards)}\n  ],\n` +
    `  casseroles: [\n${lines(snapshot.casseroles)}\n  ],\n` +
    `  spells: [\n${lines(snapshot.spells)}\n  ],\n` +
    `};\n`,
);
console.log(`${out} : ${snapshot.cards.length} politiques, ${snapshot.casseroles.length} casseroles, ${snapshot.spells.length} sorts`);
