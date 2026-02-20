import { bottomPanel_container, searchPanel, map, myIcon, showBikeLanes, showBikeStops, busesPanel_container, state } from './globals.js';

export function handleUI(){
	bottomPanel_container.breakpoints = [0.25, 0.5, 0.85];
    busesPanel_container.breakpoints = [0.25, 0.5, 0.85];
	document.getElementById('closeBottomModal').addEventListener('click', async () => {
	    const modal = document.getElementById('bottomModal');
	    await modal.dismiss();
        if (map.omnibusLinea) {
            map.removeLayer(map.omnibusLinea);
            delete map.omnibusLinea;
        }
        if (map.routingTrasbordo) {
            map.removeControl(map.routingTrasbordo);
            delete map.routingTrasbordo;
        }
        if (map.markerSalidaBus) {
            map.removeLayer(map.markerSalidaBus);
            delete map.markerSalidaBus;
        }
        if (map.markerBajadaBus) {
            map.removeLayer(map.markerBajadaBus);
            delete map.markerBajadaBus;
        }
        if (map.markerLlegadaBus) {
            map.removeLayer(map.markerLlegadaBus);
            delete map.markerLlegadaBus;
        }
        if (map.markerTrasbordoBus) {
            map.removeLayer(map.markerTrasbordoBus);
            delete map.markerTrasbordoBus;
        }
        if (map.markerSalida) {
            map.removeLayer(map.markerSalida);
            delete map.markerSalida;
        }
        if (map.markerLlegada) {
            map.removeLayer(map.markerLlegada);
            delete map.markerLlegada;
        }
        if (map.routingSalida) {
            map.removeControl(map.routingSalida);
            delete map.routingSalida;
        }
        if (map.routingLlegada) {
            map.removeControl(map.routingLlegada);
            delete map.routingLlegada;
        }
        state.searchRoutes = false;
  	});
	document.getElementById('closePanelBtn').addEventListener('click', async () => {
        await searchPanel.dismiss();
    });
    document.getElementById('closeSettingsBtn').addEventListener('click', async () => {
    	await document.getElementById('settingsPanel').dismiss();
    })
    document.getElementById('closeBusesModal').addEventListener('click', async () => {
        await document.getElementById('busesModal').dismiss();
    })
    settings();
}

export function changeTheme(nombreTema) {
    var contenedorMapa = map.getContainer();
    
    contenedorMapa.classList.remove('theme-x-dark','theme-dark','theme-midnight','theme-gray','theme-blue','theme-retro','theme-matrix', 'theme-red', 'theme-milk', 'theme-minimalist', 'theme-ice', 'theme-purple');
    if (nombreTema) {
        contenedorMapa.classList.add(nombreTema);
    }
}

function settings(){
	const theme_select = document.getElementById('theme_select');
	theme_select.addEventListener('ionChange', (e) => {
		changeTheme(e.detail.value)
    	
  	});

    document.getElementById('bikeToggle').addEventListener('ionChange', (e) => {
        showBikeLanes();
    })
    document.getElementById('bikeStopsToggle').addEventListener('ionChange', (e) => {
        showBikeStops();
    })
}