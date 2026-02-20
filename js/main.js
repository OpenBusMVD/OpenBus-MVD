import { cargarParadas } from './map_logic.js';
import { initSearchListeners } from './search.js';
import { handleUI } from './ui.js';

import './globals.js'; 

document.addEventListener("DOMContentLoaded", function() {
    handleUI();
    cargarParadas();
    initSearchListeners();
});