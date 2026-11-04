import { createApp } from 'vue';
import App from './App.vue';
import { gameArt } from '#src/client/stores/gameArt.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

gameArt.load();
createApp(App).mount('#app');
