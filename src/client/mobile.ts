import { createApp } from 'vue';
import App from './App.vue';
import { AWAY_FROM_HOME } from '#src/client/const/awayFromHome.ts';
import type { AwayFromHome } from '#src/client/const/awayFromHome.ts';
import { SCREEN_SET } from '#src/client/const/screenSet.ts';
import { MOBILE_SCREENS } from '#src/client/screens/mobile/mobileScreens.ts';
import { counter } from '#src/client/services/counter.ts';
import { createBackGuard } from '#src/client/services/createBackGuard.ts';
import { startLiveBeat } from '#src/client/services/liveBeat.ts';
import { whenOpened } from '#src/client/services/whenOpened.ts';
import { fullscreenMode } from '#src/client/stores/fullscreenMode.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/mobile.css';

/** The phone version (/m/), held upright: the same game, with screens of its own. */
const backGuard = createBackGuard(window);
const awayFromHome: AwayFromHome = {
  leaveHome() {
    backGuard.hold();
    fullscreenMode.enterIfWanted();
  },
  backHome() {
    backGuard.release();
    fullscreenMode.leave();
  },
};

gameArt.load();
createApp(App).provide(SCREEN_SET, MOBILE_SCREENS).provide(AWAY_FROM_HOME, awayFromHome).mount('#app');
whenOpened(() => {
  counter.page('jeu_telephone');
  startLiveBeat();
});
