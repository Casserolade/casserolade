/**
 * Ce que chante un camp quand un de ses politiques célèbre sans avoir de petite phrase vérifiée : un vrai
 * slogan de campagne ou un vrai chant de meeting, affiché comme un chant (entre notes de musique), jamais
 * comme une citation du politique. Demande de l'utilisateur, 3 novembre 2026 : « Il faut dire un truc
 * générique sur le parti ». Dernière vérification : 3 novembre 2026.
 *
 * - insoumis : « On lâche rien », HK et les Saltimbanks (2011), l'hymne des manifestations depuis.
 * - socialistes : slogan de campagne de François Hollande, 2012.
 * - écologistes : le chant des marches pour le climat, 2019.
 * - macronie : le « et en même temps » d'Emmanuel Macron, depuis sa campagne de 2017.
 * - républicains : slogan de campagne de Nicolas Sarkozy, 2007.
 * - rn : le chant des meetings du Rassemblement national.
 * - reconquête : slogan dévoilé par Éric Zemmour à Villepinte, 5 décembre 2021.
 * - société civile : pas de parti, la salle applaudit.
 */
import type { Camp } from '../engine/types.ts';

export const CHANTS: Record<Camp, string> = {
  insoumis: 'On lâche rien !',
  socialistes: 'Le changement, c\'est maintenant !',
  ecologistes: 'On est plus chauds que le climat !',
  macronie: 'Et en même temps !',
  republicains: 'Ensemble, tout devient possible !',
  rn: 'On est chez nous !',
  reconquete: 'Impossible n\'est pas français !',
  civile: '(Applaudissements)',
};
