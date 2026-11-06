import { createApp } from 'vue';
import App from './App.vue';
import { SCREEN_SET } from '#src/client/const/screenSet.ts';
import { MOBILE_SCREENS } from '#src/client/screens/mobile/mobileScreens.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/mobile.css';

/** The phone version (/m/), held upright: the same game, with screens of its own. */
gameArt.load();
createApp(App).provide(SCREEN_SET, MOBILE_SCREENS).mount('#app');
