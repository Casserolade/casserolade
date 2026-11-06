import GameFrame from '#src/client/components/organisms/GameFrame.vue';
import type { ScreenSet } from '#src/client/const/screenSet.ts';
import CombatScreen from '#src/client/screens/CombatScreen.vue';
import HeroScreen from '#src/client/screens/HeroScreen.vue';
import HomeScreen from '#src/client/screens/HomeScreen.vue';
import RecruitScreen from '#src/client/screens/RecruitScreen.vue';

/** The computer's screens: the table drawn for 1920×1080, scaled to the window. */
export const DESKTOP_SCREENS: ScreenSet = {
  home: HomeScreen,
  hero: HeroScreen,
  recruit: RecruitScreen,
  combat: CombatScreen,
  frame: GameFrame,
};
