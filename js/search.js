import { domElements, state, bottomPanel_container, resultsList, searchPanel } from './globals.js';
import { liveSearch, getCoordinates } from './api.js';
import { allRouting } from './routing.js';

let { 
    originSearch1, originSearch2, destinySearch1, destinySearch2, 
    popUp1, popUp2, popUp3, popUp4, searchButton 
} = domElements;

let chosenOrigin1 = false;
let chosenOrigin2 = false;
let chosenDestiny1 = false;
let chosenDestiny2 = false;

let timeoutOrigin1, timeoutOrigin2, timeoutDestiny1, timeoutDestiny2;

export function initSearchListeners() {

    resultsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('popup-origin1')) {
            chosenOrigin1 = true;
            originSearch2.disabled = false;
            let chosenNameOrigin1 = e.target.textContent;
            let chosenCodeOrigin1 = e.target.getAttribute("codigo");
            originSearch1.value = chosenNameOrigin1;
            originSearch1.setAttribute('codigo', chosenCodeOrigin1);
            checkSearchButton();
        }
        else if(e.target.classList.contains('popup-origin2')){
            chosenOrigin2 = true;
            let chosenNameOrigin2 = e.target.textContent;
            let chosenCodeOrigin2 = e.target.getAttribute("codigo");
            originSearch2.setAttribute('codigo', chosenCodeOrigin2);
            originSearch2.value = chosenNameOrigin2;
        }
        else if(e.target.classList.contains('popup-destiny1')){
            chosenDestiny1 = true;
            destinySearch2.disabled = false;
            let chosenNameDestiny1 = e.target.textContent;
            let chosenCodeDestiny1 = e.target.getAttribute("codigo");
            destinySearch1.value = chosenNameDestiny1;
            destinySearch1.setAttribute('codigo', chosenCodeDestiny1);
            checkSearchButton();
        }
        else if(e.target.classList.contains('popup-destiny2')){
            chosenDestiny2 = true;
            let chosenNameDestiny2 = e.target.textContent;
            let chosenCodeDestiny2 = e.target.getAttribute("codigo");
            destinySearch2.setAttribute('codigo', chosenCodeDestiny2);
            destinySearch2.value = chosenNameDestiny2;
        }
    });

    originSearch1.addEventListener("keyup", function (e) {
        clearTimeout(timeoutOrigin1);
        timeoutOrigin1 = setTimeout(() => {
            chosenOrigin1 = false;
            originSearch2.disabled = true;
            resultsList.innerHTML = '';
            var inputVal = e.target.value;
            if(inputVal.length !== 0){
                liveSearch(inputVal, null, "origin1");
            }
        }, 300);
    });

    originSearch2.addEventListener("keyup", function (e) {
        clearTimeout(timeoutOrigin2);
        timeoutOrigin2 = setTimeout(() => {
            resultsList.innerHTML = '';
            var inputVal = e.target.value;
            if(inputVal.length !== 0 && originSearch2.disabled === false){
                let t1 = originSearch1.getAttribute("codigo");
                liveSearch(inputVal, t1, "origin2");
            } else {
                originSearch2.removeAttribute("codigo");
            }
        }, 300);
    });

    destinySearch1.addEventListener("keyup", function (e) {
        clearTimeout(timeoutDestiny1);
        timeoutDestiny1 = setTimeout(() => {
            chosenDestiny1 = false;
            destinySearch2.disabled = true;
            resultsList.innerHTML = '';
            var inputVal = e.target.value;
            if(inputVal.length !== 0){
                liveSearch(inputVal, null, "destiny1");
            }
        }, 300);
    });

    destinySearch2.addEventListener("keyup", function (e) {
        clearTimeout(timeoutDestiny2);
        timeoutDestiny2 = setTimeout(() => {
            resultsList.innerHTML = '';
            var inputVal = e.target.value;
            if(inputVal.length !== 0){
                let t1 = destinySearch1.getAttribute("codigo");
                liveSearch(inputVal, t1, "destiny2");
            } else {
                destinySearch2.removeAttribute("codigo");
            }
        }, 300);
    });

    // --- BOTÓN DE BÚSQUEDA ---
    searchButton.addEventListener("click", async function () {
        let coordsOrigin = null;
        let coordsDestiny = null;

        // ORIGEN
        let codOrigin1 = originSearch1.getAttribute("codigo");
        
        if (chosenOrigin1 && !originSearch2.hasAttribute("codigo")) {
            let codOrigin2 = await getCoordinates({ method: 'coords_cruce', id1: codOrigin1 });
            coordsOrigin = await getCoordinates({ method: 'coords_esquina', id1: codOrigin1, id2: codOrigin2 });
        } 
        else {
            if (originSearch2.getAttribute("codigo") == -1) {
                let puerta = originSearch2.value;
                coordsOrigin = await getCoordinates({ method: 'coords_direccion', id1: codOrigin1, puerta: puerta });
            } else {
                let codOrigin2 = originSearch2.getAttribute("codigo");
                coordsOrigin = await getCoordinates({ method: 'coords_esquina', id1: codOrigin1, id2: codOrigin2 });
            }
        }

        // DESTINO
        let codDest1 = destinySearch1.getAttribute("codigo");
        
        if (chosenDestiny1 && !destinySearch2.hasAttribute("codigo")) {
            let codDest2 = await getCoordinates({ method: 'coords_cruce', id1: codDest1 });
            coordsDestiny = await getCoordinates({ method: 'coords_esquina', id1: codDest1, id2: codDest2 });
        } 
        else {
            if (destinySearch2.getAttribute("codigo") == -1) {
                let puerta = destinySearch2.value;
                coordsDestiny = await getCoordinates({ method: 'coords_direccion', id1: codDest1, puerta: puerta });
            } else {
                let codDest2 = destinySearch2.getAttribute("codigo");
                coordsDestiny = await getCoordinates({ method: 'coords_esquina', id1: codDest1, id2: codDest2 });
            }
        }

        if(coordsOrigin && coordsDestiny) {
            await searchPanel.dismiss();
            await bottomPanel_container.present();
            allRouting(coordsOrigin, coordsDestiny);
            state.searchRoutes = true;
        } else {
            console.error("Faltan coordenadas para calcular la ruta");
            alert("No se pudieron encontrar las coordenadas. Intenta ser más específico con las calles.");
        }
    });
}

function checkSearchButton() {
    if(chosenOrigin1 == true && chosenDestiny1 == true){
        searchButton.disabled = false;
    } else {
        searchButton.disabled = true;
    }
}