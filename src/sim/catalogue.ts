import { writeFileSync } from 'node:fs';
import type { Casserole, Effect } from '../engine/types.ts';
import { CARD_BY_ID, CARDS } from '../data/cards.ts';
import { CASSEROLES } from '../data/casseroles.ts';

/** Génère le catalogue des casseroles à partir des données : il reste donc toujours à jour. */
const KEYWORDS: Record<string, string> = {
  immunite: 'Immunité',
  porte_parole: 'Porte-parole',
  cumul: 'Cumul des mandats',
  polemique: 'Polémique',
  retour: 'Retour en politique',
  ni_droite_ni_gauche: 'Ni droite ni gauche',
};
const TRIGGERS: Record<string, string> = { debut_combat: '49.3', riposte: 'Riposte', heritage: 'Héritage', annonce: 'Annonce', fin_recrutement: 'Fin de recrutement' };
const TARGETS: Record<string, string> = { premier_ennemi: 'au premier ennemi', dernier_ennemi: 'au dernier ennemi', tous_ennemis: 'à tous les ennemis', allies: 'à tous les alliés' };

function effect(e: Effect): string {
  const to = TARGETS[e.to] ?? '';
  if (e.do === 'degats') return `${TRIGGERS[e.when]} : ${e.value} dégât(s) ${to}`;
  if (e.do === 'buff') return `${TRIGGERS[e.when]} : +${e.atk}/+${e.hp} ${to}`;
  if (e.do === 'retirer') return `${TRIGGERS[e.when]} : retire ${KEYWORDS[e.keyword]} ${to}`;
  return `${TRIGGERS[e.when]}`;
}

function summary(c: Casserole): string {
  const out: string[] = [];
  if (c.atk) out.push(c.atk === 8 && c.hp === -99 ? '+8 attaque, plus qu\'1 PV' : `${c.atk > 0 ? '+' : ''}${c.atk} attaque`);
  if (c.hp && c.hp !== -99) out.push(`${c.hp > 0 ? '+' : ''}${c.hp} PV`);
  for (const k of c.keywords ?? []) out.push(KEYWORDS[k]);
  for (const e of c.effects ?? []) out.push(effect(e));
  if (c.budgetPerRound && c.budgetPerRound > 0) out.push(`+${c.budgetPerRound} budget par manche`);
  if (c.instantBudget) out.push(`+${c.instantBudget} budget immédiat`);
  if (c.bonusDamage) out.push(`+${c.bonusDamage} dégâts au héros s'il survit`);
  if (c.summon) out.push(`invoque : ${c.summon}`);
  if (c.freeRecruit) out.push('un politique gratuit de votre échelon');
  if (c.swapStats) out.push('échange attaque et PV');
  if (c.aloneBonus) out.push(`+${c.aloneBonus}/+${c.aloneBonus} s'il est seul de son camp`);
  if (c.charges === 2) out.push('compte double vers le scandale');
  if (c.forgetsAll) out.push('fait tout oublier');
  // Le défaut ne s'applique que pendant un scandale.
  const defects: string[] = [];
  if (c.budgetPerRound && c.budgetPerRound < 0) defects.push(`${c.budgetPerRound} budget par manche`);
  if (c.locked) defects.push('ne bouge plus');
  if (c.silence) defects.push('perd ses effets');
  if (c.hpLossOnDeath) defects.push(`−${c.hpLossOnDeath} sondage à sa mort`);
  if (defects.length > 0) out.push(`scandale : ${defects.join(', ')}`);
  return out.join(', ');
}

const cell = (s: string) => s.replaceAll('|', '\\|');
const CAMPS: [string, string][] = [
  ['insoumis', 'Insoumis'],
  ['socialistes', 'Socialistes'],
  ['ecologistes', 'Écologistes'],
  ['macronie', 'Macronie'],
  ['republicains', 'Républicains'],
  ['rn', 'RN'],
  ['reconquete', 'Reconquête'],
  ['civile', 'Société civile'],
];

const lines: string[] = [];
const ridicules = CASSEROLES.filter((c) => c.kind === 'ridicule').length;
lines.push('# Catalogue des casseroles', '');
lines.push(`Fichier généré par \`node src/sim/catalogue.ts\`, à ne pas modifier à la main : ${CASSEROLES.length} casseroles, dont ${ridicules} ridicules et ${CASSEROLES.length - ridicules} affaires, pour ${CARDS.length} politiques. Statuts vérifiés au 2 novembre 2026.`, '');
lines.push('⚠ signale un fait ou une formulation encore à recouper.', '');
for (const [camp, label] of CAMPS) {
  const list = CASSEROLES.filter((c) => CARD_BY_ID[c.owner].camp === camp);
  lines.push(`## ${label}`, '');
  lines.push('| Casserole | Propriétaire | Coût | Effet | Sur la carte | Statut |', '|---|---|---|---|---|---|');
  for (const c of list) {
    const text = c.citation ? `« ${c.citation} » ${c.blague}` : c.blague;
    lines.push(`| **${cell(c.name)}**${c.verifie ? '' : ' ⚠'} | ${CARD_BY_ID[c.owner].name} | ${c.cost} | ${cell(summary(c))} | ${cell(text)} | ${cell(c.statut)} |`);
  }
  lines.push('');
}
// Le fichier à écrire est donné en argument ; sans argument, le catalogue s'affiche.
const target = process.argv[2];
if (target) {
  writeFileSync(target, lines.join('\n'));
  console.log(`${CASSEROLES.length} casseroles écrites dans ${target}`);
} else {
  console.log(lines.join('\n'));
}
