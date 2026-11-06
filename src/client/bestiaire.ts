import { createApp } from 'vue';
import BestiaryScreen from './screens/BestiaryScreen.vue';
import { counter } from '#src/client/services/counter.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/bestiaire.css';

gameArt.load();
createApp(BestiaryScreen).mount('#bestiaire');
counter.page('bestiaire');
