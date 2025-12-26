proj4.defs("EPSG:32721", "+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs");

export var myIcon = L.icon({
    iconUrl: 'assets/img/Bus_stop_symbol.png',
    iconSize: [27.8, 25.6]
});

export var iconBus = L.icon({
    iconUrl: 'assets/img/bus-icon.png',
    iconSize: [55.6, 51.2] // Doble de tamaño que el icono de la parada
});

export var map = L.map('map').setView([-34.872972, -56.14629063], 13);

L.tileLayer.wms(
    'https://geoserver.montevideo.gub.uy/geoserver/gwc/service/wms?', {
        maxZoom: 18,
        layers: 'stm_carto_basica',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        tiled: true,
        srs: 'EPSG:3857',
        attribution: "Intendencia de Montevideo"
    }).addTo(map);

export const state = {
    markerStops: [],
    latlng: [],
    busStopsIds: [],
    shelterMarkers: new L.FeatureGroup(),
    busesMarkers: new L.FeatureGroup(),
    clickedMarkers: new L.FeatureGroup(),
    searchRoutes: false // Controla si se buscó una ruta o no, para mostrar todas las paradas o solo las relevantes
};

export const sidePanel = document.getElementById('sidePanel');
export const toggleBtn = document.getElementById('toggleBtn');
export const sidePanel_container = document.getElementById('omnibus_container');
export const urlServer = window.CONFIG?.urlServer || ""

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