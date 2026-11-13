import { createApp } from 'vue';
import PatchNotesScreen from './screens/PatchNotesScreen.vue';
import { counter } from '#src/client/services/counter.ts';
import { whenOpened } from '#src/client/services/whenOpened.ts';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/bestiaire.css';

gameArt.load();
createApp(PatchNotesScreen).mount('#mises-a-jour');
whenOpened(() => counter.page('mises_a_jour'));
