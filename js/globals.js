proj4.defs("EPSG:32721", "+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs");

export var myIcon = L.icon({
    iconUrl: 'assets/img/Bus_stop_symbol.png',
    iconSize: [27.8, 25.6],
    className: "stop-base-layer"
});

export var iconBus = L.icon({
    iconUrl: 'assets/img/bus-icon.png',
    iconSize: [55.6, 51.2] // Doble de tamaño que el icono de la parada
});

export var map = L.map('map', {zoomControl: false, preferCanvas: true, attributionControl: false}).setView([-34.872972, -56.14629063], 13);

L.tileLayer.wms(
    'https://geoserver.montevideo.gub.uy/geoserver/gwc/service/wms?', {
        maxZoom: 20,
        layers: 'stm_carto_basica',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        tiled: true,
        srs: 'EPSG:3857',
        attribution: "Intendencia de Montevideo",
        className: "mapa-base-layer"
    }).addTo(map);

var semaforos = L.tileLayer.wms('https://montevideo.gub.uy/app/geoserver/mapstore-tematicas/vyt_v_int_semaforos/ows?', {
    layers: 'vyt_v_int_semaforos',
    format: 'image/png',
    transparent: true,
    minZoom: 16
}).addTo(map);


let bikeMap = L.geoJSON();

export function showBikeLanes(){
    const estiloBicisenda = {
        color: '#2ecc71', 
        weight: 5, 
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
    };

    const urlWFS = 'https://montevideo.gub.uy/app/geoserver/mapstore-tematicas/ows?' + new URLSearchParams({
        service: 'WFS',
        version: '1.0.0',
        request: 'GetFeature',
        typeName: 'mapstore-tematicas:vyt_v_bi_bicicircuitos_activos',
        outputFormat: 'application/json',
        srsName: 'EPSG:4326'
    });

    if(map.hasLayer(bikeMap)){
        bikeMap.removeFrom(map);
    }
    else{
      fetch(urlWFS)
        .then(response => response.json())
        .then(geojsonData => {
            bikeMap = L.geoJSON(geojsonData, {
                style: estiloBicisenda
            }).addTo(map);
        })
        .catch(error => console.error("Error cargando bicisendas:", error));    
    }
      
}

export let bikeStopsMap = L.geoJSON();
export let bikeStopsState = false;

export function showBikeStops() {
    bikeStopsState = !bikeStopsState;

    const urlWFS_Bicis =
        'https://montevideo.gub.uy/app/geoserver/mapstore-tematicas/ows?' +
        new URLSearchParams({
            service: 'WFS',
            version: '1.0.0',
            request: 'GetFeature',
            typeName: 'mapstore-tematicas:vyt_bi_bicicletarios',
            outputFormat: 'application/json',
            srsName: 'EPSG:4326'
        });

    if(!bikeStopsState && map.hasLayer(bikeStopsMap)){
        map.removeLayer(bikeStopsMap);
    }
    else{
      fetch(urlWFS_Bicis)
        .then(r => r.json())
        .then(data => {
            bikeStopsMap = L.geoJSON(data, {
                pointToLayer(feature, latlng) {
                    return L.marker(latlng, {
                        icon: L.divIcon({
                            className: '',
                            html: `
                                <div class="marker-bici">
                                    <img src="assets/img/bike.png" alt="Bici">
                                </div>
                            `,
                            iconSize: [24, 24],
                            iconAnchor: [12, 12],
                            popupAnchor: [0, -12]
                        })
                    });
                },

                onEachFeature: function(feature, layer) {
                if (feature.properties) {
                    // 1. Extraemos los datos útiles
                    // Usamos || "" para evitar que escriba "undefined" si falta algún dato
                    const nombre = feature.properties.nombre_ubicacion || "Bicicletario";
                    const cantidad = feature.properties.cantidad || "?";
                    // Limpiamos el texto "Clasificación: " para que no ocupe tanto espacio
                    const tipo = (feature.properties.observaciones || "").replace("Clasificación: ", "");

                    // 2. Armamos un diseño bonito
                    const html = `
                        <div style="text-align: center; min-width: 120px; font-family: sans-serif;">
                            <!-- Título con el nombre -->
                            <b style="font-size: 14px; color: #333; display:block; margin-bottom:5px;">
                                ${nombre}
                            </b>
                            
                            <!-- Capacidad con emoji -->
                            <div style="background-color: #eee; border-radius: 4px; padding: 2px 5px; font-size: 13px; font-weight: bold; display: inline-block;">
                                🚲 Capacidad: ${cantidad}
                            </div>

                            <b style="font-size: 14px; color: #333; display:block; margin-bottom:5px;">
                                Observaciones:
                            </b>
                            <div style="font-size: 11px; color: #666; margin-top: 6px; font-style: italic;">
                                ${tipo}
                            </div>
                        </div>
                    `;
                    
                    layer.bindPopup(html);
                }
            }
            });
            if(map.getZoom() >= 15 && !map.hasLayer(bikeStopsMap)){
                map.addLayer(bikeStopsMap);
            }

            
        })
        .catch(console.error);  
    }
}


export const state = {
    markerStops: [],
    latlng: [],
    busStopsIds: [],
    shelterMarkers: new L.FeatureGroup(),
    busesMarkers: new L.FeatureGroup(),
    clickedMarkers: new L.FeatureGroup(),
    searchRoutes: false // Controla si se buscó una ruta o no, para mostrar todas las paradas o solo las relevantes
};

export const toggleBtn = document.getElementById('toggleBtn');
export const searchPanel = document.getElementById('searchPanel');
export const resultsList_container = document.getElementById('resultsList_container');
export const bottomPanel_container = document.getElementById('bottomModal');
export const resultsList = document.getElementById('resultsList');
export const busesList = document.getElementById('busesList');
export const urlServer = window.CONFIG?.urlServer || 
""; // <- Dejar en blanco si se ejecuta en local
//https://gdsongverifier.alwaysdata.net/openbus/

export const domElements = {
    popUp1: document.getElementById("popupOrigin1"),
    popUp2: document.getElementById("popupOrigin2"),
    popUp3: document.getElementById("popupDestiny1"),
    popUp4: document.getElementById("popupDestiny2"),
    originSearch1: document.getElementById("originSearch1"),
    originSearch2: document.getElementById("originSearch2"),
    destinySearch1: document.getElementById("destinySearch1"),
    destinySearch2: document.getElementById("destinySearch2"),
    searchButton: document.getElementById("searchButton")
};
