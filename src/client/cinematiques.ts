import { createApp } from 'vue';
import CutsceneReview from '#src/client/screens/CutsceneReview.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

/** Development only: every career cutscene, to watch one by one before it enters the game. */
gameArt.load().then(() => createApp(CutsceneReview).mount('#app'));
