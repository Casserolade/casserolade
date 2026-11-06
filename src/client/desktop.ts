import { createApp } from 'vue';
import App from './App.vue';
import { SCREEN_SET } from '#src/client/const/screenSet.ts';
import { DESKTOP_SCREENS } from '#src/client/screens/desktopScreens.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

/** The computer version: the table drawn for 1920×1080. */
gameArt.load();
createApp(App).provide(SCREEN_SET, DESKTOP_SCREENS).mount('#app');
