import { EditorApp } from './App.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root element.');
new EditorApp(root).mount();
