import type { GameIconName } from '#src/client/const/gameIcons.ts';

export interface SpellArt {
  /** The color of the burst behind the icon. */
  color: string;
  icon: GameIconName;
}

/** What each spell card shows in its window: one bold icon on a manga burst. */
export const SPELL_ART: Record<string, SpellArt> = {
  tract: { color: '#d8343c', icon: 'paper' },
  investiture: { color: '#e0a400', icon: 'crown' },
  sondage_flatteur: { color: '#2f9e5a', icon: 'chart' },
  elements_de_langage: { color: '#7a3fc0', icon: 'mic' },
  note_de_frais: { color: '#c8901a', icon: 'coin' },
  promesse: { color: '#d8343c', icon: 'megaphone' },
  primaire: { color: '#5a5a6e', icon: 'skull' },
  motion_de_synthese: { color: '#d04d8a', icon: 'cards' },
  matinale: { color: '#2b7fd0', icon: 'refresh' },
  temps_de_parole: { color: '#c0582a', icon: 'mic' },
  loi_de_finances: { color: '#c8901a', icon: 'column' },
  bracelet_electronique: { color: '#4b5a78', icon: 'bracelet' },
  immunite_parlementaire: { color: '#d9a400', icon: 'shield' },
  debauchage: { color: '#2a4aa8', icon: 'magnet' },
  campagne_de_terrain: { color: '#c0582a', icon: 'megaphone' },
  seconde_chance: { color: '#3a7be0', icon: 'heart' },
  ouverture: { color: '#e08a1a', icon: 'cards' },
  testament_politique: { color: '#4b4b63', icon: 'cards' },
  programme: { color: '#2f9e5a', icon: 'cards' },
  motion_de_censure: { color: '#a82a3a', icon: 'hourglass' },
  petite_phrase: { color: '#3aa040', icon: 'speech' },
  remaniement: { color: '#d9a400', icon: 'sparkle' },
  seconde_deliberation: { color: '#7a3fc0', icon: 'refresh' },
  tribune_libre: { color: '#4b4b63', icon: 'skull' },
  cumul_des_mandats: { color: '#c0582a', icon: 'chevrons' },
  congres: { color: '#2a4aa8', icon: 'column' },
  grand_debat: { color: '#d8343c', icon: 'megaphone' },
  conseil_des_ministres: { color: '#2b7fd0', icon: 'bolt' },
};

export const DEFAULT_SPELL_ART: SpellArt = { color: '#5a5a6e', icon: 'sparkle' };
