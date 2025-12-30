import { bottomPanel_container, searchPanel, map, myIcon, showBikeLanes, showBikeStops } from './globals.js';

export function handleUI(){
	bottomPanel_container.breakpoints = [0.25, 0.5, 0.85];
	document.getElementById('closeBottomModal').addEventListener('click', async () => {
	    const modal = document.getElementById('bottomModal');
	    await modal.dismiss();
  	});
	document.getElementById('closePanelBtn').addEventListener('click', async () => {
        await searchPanel.dismiss();
    });
    document.getElementById('closeSettingsBtn').addEventListener('click', async () => {
    	await document.getElementById('settingsPanel').dismiss();
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