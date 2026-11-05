import { KEYWORD_RULES, TERM_RULES } from '#src/client/const/keywordRules.ts';
import { boldTerms } from '#src/client/tools/richText.ts';

export interface GlossaryEntry {
  term: string;
  rule: string;
}

/** The plural or conjugated forms the card texts use, back to the word the glossary knows. */
const BASE_FORMS: Record<string, string> = {
  tracts: 'Tract',
  annonces: 'Annonce',
  héritages: 'Héritage',
  'fins de tour': 'Fin de tour',
  célébrations: 'Célébration',
};

const RULES_BY_TERM = new Map<string, GlossaryEntry>([
  ...Object.values(KEYWORD_RULES).map(({ label, rule }) => [label.toLowerCase(), { term: label, rule }] as const),
  ...Object.entries(TERM_RULES).map(([term, rule]) => [term.toLowerCase(), { term: term.charAt(0).toUpperCase() + term.slice(1), rule }] as const),
]);

/** « Tract (2) » is explained as Tract; « Tracts » as Tract too. */
function baseTerm(term: string): string {
  const bare = term.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
  return (BASE_FORMS[bare] ?? bare).toLowerCase();
}

/** Every word the glossary explains, as a text may write it: longest first, so « Tracts » wins over « Tract ». */
const KNOWN_FORMS = [...RULES_BY_TERM.values()].map((entry) => entry.term).concat(Object.keys(BASE_FORMS)).sort((a, b) => b.length - a.length);
const KNOWN_FORM = new RegExp(`(?<![\\p{L}\\d])(${KNOWN_FORMS.map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'giu');

/**
 * Plain text, a hero's power for one, with the words the glossary explains put in bold, as the
 * cards write them: « Votre premier politique a **Polémique** à chaque combat. »
 */
export function boldGlossaryTerms(text: string): string {
  return text.replace(KNOWN_FORM, (word) => `**${word}**`);
}

/** The rules of every keyword and term in bold in these lines, each once, in reading order. */
export function glossaryFor(lines: string[]): GlossaryEntry[] {
  const entries = boldTerms(lines).map((term) => RULES_BY_TERM.get(baseTerm(term))).filter((entry): entry is GlossaryEntry => Boolean(entry));
  return entries.filter((entry, index) => entries.findIndex((other) => other.term === entry.term) === index);
}
