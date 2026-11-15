import { createApp } from 'vue';
import EffectsPreviewScreen from './screens/EffectsPreviewScreen.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

/** A working page, served in development only: every TV set with its dressing, and each effect at a click. */
void gameArt.load().then(() => createApp(EffectsPreviewScreen).mount('#app'));
