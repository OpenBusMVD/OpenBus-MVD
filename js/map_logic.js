import { map, state, myIcon, sidePanel, toggleBtn } from './globals.js';

let urlServer = "https://gdsongverifier.alwaysdata.net/openbus/" // Comentar para ejecutar de forma local

L.DomEvent.disableClickPropagation(sidePanel);
L.DomEvent.disableScrollPropagation(sidePanel);

toggleBtn.addEventListener('click', () => {
    sidePanel.classList.toggle('open');
    toggleBtn.classList.toggle('open');
});

sidePanel.addEventListener('mouseenter', () => map.dragging.disable());
sidePanel.addEventListener('mouseleave', () => map.dragging.enable());

export async function cargarParadas() {
    try {
        const response = await fetch('assets/data/busStopsInfo.json'); 
        const arr = await response.json();

        arr.forEach((arrays, i) => {
            state.busStopsIds[i] = arrays['busstopId'];
            
            let lat = arrays['location']['coordinates'][1];
            let lon = arrays['location']['coordinates'][0];

            state.markerStops[i] = L.marker([lat, lon], {icon: myIcon, autoPan: false}).on('click', onClick);
            state.markerStops[i].myID = i;
            state.markerStops[i].busStopID = arrays['busstopId'];

            state.latlng[i] = L.latLng(lat, lon);
        });
    } catch (error) {
        console.error("Error cargando busStopsInfo.json:", error);
    }
}

map.locate({setView: true});
let clickCircle;

export function onLocationFound(e) {
    var radius = e.accuracy;
    var marker = L.marker(e.latlng).addTo(map)
        .bindPopup("Te encuentras a " + radius + " metros a la redonda.").openPopup();
    clickCircle = L.circle(e.latlng, radius).addTo(map);

    marker.getPopup().on('remove', function() {
        map.removeLayer(clickCircle);
    });  

    marker.getPopup().on('add', function() {
        clickCircle = L.circle(e.latlng, radius).addTo(map);
    });  
}
map.on('locationfound', onLocationFound);


var popVar = -1;
var clicked = false;
var popUpStop;

async function onClick(e) {
    state.clickedMarkers.clearLayers();
    
    let textInfo = "<b>Líneas:</b> ";
    
    try {
        const response = await fetch(urlServer+`api/proxy.php?action=lineas&id=${e.target.busStopID}`);
        const data = await response.json();
        
        if (data.lineas) {
            const lineasStr = data.lineas.map(l => l.descripcion).join(", ");
            textInfo += lineasStr;
        } else {
            textInfo += "Sin información";
        }
        textInfo += "<br>";
        popupVariable(e.target.myID, textInfo, e.target.busStopID);

    } catch (error) {
        console.error("Error cargando líneas:", error);
        popupVariable(e.target.myID, "Error cargando datos.", e.target.busStopID);
    }
}

function popupVariable(varPop, text, busID){
    popVar = varPop;
    clicked = false;
    state.clickedMarkers.addLayer(state.markerStops[popVar]);
    state.shelterMarkers.removeLayer(state.markerStops[popVar]);
    map.addLayer(state.clickedMarkers);
    map.removeLayer(state.shelterMarkers);

    if(popUpStop === undefined || popUpStop.isPopupOpen() == false){
        popUpStop = state.markerStops[popVar].bindPopup("<b>Parada número: "+busID+"</b><br>"+text).openPopup();
    }

    state.markerStops[popVar].getPopup().on('remove', function() {
        clicked = false;
        state.clickedMarkers.removeLayer(state.markerStops[popVar]);
        state.shelterMarkers.addLayer(state.markerStops[popVar]);
        map.removeLayer(state.clickedMarkers);
        map.removeLayer(state.busesMarkers);
        if (map.getZoom() >= 17){   
            map.addLayer(state.shelterMarkers);
        }
    });  
};

map.on('moveend', () => {
    let bounds = map.getBounds();
    if(clicked != true){
        for(let i=0; i < state.latlng.length; i++){
            if(state.latlng[i] && bounds.contains(state.latlng[i]) && state.searchRoutes == false){
                state.shelterMarkers.addLayer(state.markerStops[i]);
            } else {
                if(state.markerStops[i]) state.shelterMarkers.removeLayer(state.markerStops[i]);
            }
        }  
    }
});

map.on('zoomend', function() {
    let zoom = map.getZoom();
    if(clicked != true){
        if (zoom >= 17 && state.searchRoutes == false){   
            map.addLayer(state.shelterMarkers);
        } else {
            map.removeLayer(state.shelterMarkers);
        }        
    }
});