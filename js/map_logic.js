import { map, state, myIcon, toggleBtn, urlServer, bikeStopsMap, bikeStopsState } from './globals.js';

window.addEventListener('load', () => {
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
});


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
    
    let textInfo = "";
    let textLineas = "<b>Líneas:</b> ";
    let textHorarios = "<b>Próximos buses:</b><br>";
    
    try {
        const response = await fetch(urlServer+`api/proxy.php?action=proximos&idParada=${e.target.busStopID}`);
        //console.log(response);
        const data = await response.json();
        
        if (data) {
            textLineas = data.lineas.join(", "); 
            data.proximos.forEach((info) => {
                textHorarios += info.restante + "' | " + info.linea + " | " + info.hora + "<br>";
            });
        } else {
            textInfo += "Sin información";
        }
        textInfo = textLineas + "<br><br>" + textHorarios;
        popupVariable(e.target.myID, textInfo, e.target.busStopID);

    } catch (error) {
        console.error("Error cargando líneas:", error);
        popupVariable(e.target.myID, "Error cargando datos.", e.target.busStopID);
    }
}

function popupVariable(varPop, text, busID){
    clicked = false;
    state.clickedMarkers.addLayer(state.markerStops[varPop]);
    state.shelterMarkers.removeLayer(state.markerStops[varPop]);
    map.addLayer(state.clickedMarkers);
    map.removeLayer(state.shelterMarkers);

    if(popUpStop === undefined || popUpStop.isPopupOpen() == false){
        popUpStop = state.markerStops[varPop].bindPopup("<b>Parada número: "+busID+"</b><br>"+text).openPopup();
    }

    state.markerStops[varPop].getPopup().on('remove', function() {
        clicked = false;
        state.clickedMarkers.removeLayer(state.markerStops[varPop]);
        state.shelterMarkers.addLayer(state.markerStops[varPop]);
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
        if (zoom >= 16 && state.searchRoutes == false && !map.hasLayer(state.shelterMarkers)){   
            map.addLayer(state.shelterMarkers);
        } else if(zoom < 16 && map.hasLayer(state.shelterMarkers)){
            map.removeLayer(state.shelterMarkers);
        }        
    }
    if(bikeStopsState && zoom >= 15 && !map.hasLayer(bikeStopsMap)){
        map.addLayer(bikeStopsMap);
    }
    else if(map.hasLayer(bikeStopsMap) && zoom < 15){
        map.removeLayer(bikeStopsMap);
    }
});