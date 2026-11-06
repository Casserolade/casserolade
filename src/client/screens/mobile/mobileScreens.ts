import MobileGameFrame from '#src/client/components/organisms/MobileGameFrame.vue';
import type { ScreenSet } from '#src/client/const/screenSet.ts';
import MobileCombatScreen from '#src/client/screens/mobile/MobileCombatScreen.vue';
import MobileHeroScreen from '#src/client/screens/mobile/MobileHeroScreen.vue';
import MobileHomeScreen from '#src/client/screens/mobile/MobileHomeScreen.vue';
import MobileRecruitScreen from '#src/client/screens/mobile/MobileRecruitScreen.vue';

/** The phone's screens, held upright. */
export const MOBILE_SCREENS: ScreenSet = {
  home: MobileHomeScreen,
  hero: MobileHeroScreen,
  recruit: MobileRecruitScreen,
  combat: MobileCombatScreen,
  frame: MobileGameFrame,
};
