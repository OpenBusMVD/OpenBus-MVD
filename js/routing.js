import { map, state, sidePanel_container } from './globals.js';

let urlServer = "https://gdsongverifier.alwaysdata.net/openbus/" // Comentar para ejecutar de forma local

// Variables locales del módulo
let geojsonData = null;
let recorridosCache = null;
let markerSalida = L.marker();
let markerLlegada = L.marker();
var salida, llegada;
var omnibusLinea = L.geoJSON();

// Variables UI Sidepanel (internas)
var entradas;
var markerSalidaBus = L.marker();
var markerBajadaBus = L.marker();
var markerTrasbordoBus = L.marker();
var markerLlegadaBus = L.marker();
var routingSalida, routingTrasbordo, routingLlegada;
var coordsBajadaBus = 0;
var coordsSalidaBus = 0;
var coordsLlegadaBus = 0;
var coordsTrasbordoBus = 0;

// Colores de buses
var lineas_ucot = ["17","71","79","300","306","316","317","328","329","330","370","371","379","396","CE1","L12","L13","L17","L18","L31","L32","L33"];
var lineas_coetc = ["2","76","402","404","405","407","409","427","456","494","495","CE1","G","L7","L14","L16","L19","L29","PB","D9","DM1"];
var lineas_come = ["505","522","524","526","538","546","582","L24","L25","L38","D11","DM1"];

export function allRouting(coordsOrigin, coordsDestiny){
    const greenIcon = L.icon({
        iconUrl: 'assets/img/marker-icon-green.png',
        shadowUrl: 'assets/img/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    const [lngSalida, latSalida] = proj4("EPSG:32721", "EPSG:4326",[coordsOrigin[0],coordsOrigin[1]]);
    salida = L.latLng(latSalida,lngSalida);

    markerSalida.remove();
    markerSalida = L.marker(salida, {icon: greenIcon}).addTo(map);

    var indexSalida = 0;
    var totalSalida = [];
    for(var i = 0; i < state.markerStops.length; i++){
        if(!state.latlng[i]) continue;
        var parada = state.latlng[i];
        var distance = map.distance(salida, parada);
        if(distance < 1500){
            totalSalida.push({busID: state.markerStops[i].busStopID, distancia: distance});
            indexSalida++;
        }
    }

    const redIcon = L.icon({
        iconUrl: 'assets/img/marker-icon-red.png',
        shadowUrl: 'assets/img/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    const [lngLlegada, latLlegada] = proj4("EPSG:32721", "EPSG:4326",[coordsDestiny[0],coordsDestiny[1]]);
    llegada = L.latLng(latLlegada,lngLlegada);

    markerLlegada.remove();
    markerLlegada = L.marker(llegada, {icon: redIcon}).addTo(map);
    
    var indexLlegada = 0;
    var totalLlegada = [];
    for(var i = 0; i < state.markerStops.length; i++){
         if(!state.latlng[i]) continue;
        var parada = state.latlng[i];
        var distance = map.distance(llegada,parada);
        if(distance < 500){
            totalLlegada.push({busID: state.markerStops[i].busStopID, distancia: distance});
            indexLlegada++;
        }
    }

    fetch(urlServer + 'api/get2Routes_2.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ totalSalida, totalLlegada})
    })
    .then(response => response.json())
    .then(data => handle2Routes(data, salida, llegada))
    .catch(error => console.error('Error:', error.message));
}

async function handleLines(dataLineas, cSalida, cBajada, cTrasbordo, cLlegada) {
    
    // Carga de datos si no existen en memoria
    if (!recorridosCache) {
        try {
            const response = await fetch('assets/data/recorridos.geojson');
            recorridosCache = await response.json();
        } catch (error) {
            console.error("Error cargando el archivo de recorridos:", error);
            return;
        }
    }

    if (omnibusLinea) {
        omnibusLinea.remove();
    }

    let featuresRecortadas = [];

    // Salida
    let featureSalida = recorridosCache.features.find(f => 
        f.properties.DESC_LINEA == dataLineas.salida.idLinea && 
        f.properties.COD_VARIAN == dataLineas.salida.idVariante
    );

    if (featureSalida) {
        // Se usan los argumentos cSalida/cBajada en vez de variables globales
        // Turf usa lng,lat en vez de lat,lng como leaflet
        let startPt = turf.point([cSalida.lng, cSalida.lat]);
        let endPt = turf.point([cBajada.lng, cBajada.lat]);
        
        // Se recorta la linea con la libreria turf
        let sliceSalida = turf.lineSlice(startPt, endPt, featureSalida);
        
        sliceSalida.properties = { ...featureSalida.properties };
        sliceSalida.properties.tipoTramo = 'salida'; 
        featuresRecortadas.push(sliceSalida);
    }

    // Trasbordo
    if (dataLineas.trasbordo && dataLineas.trasbordo.idLinea) {
        let featureTrasbordo = recorridosCache.features.find(f => 
            f.properties.DESC_LINEA == dataLineas.trasbordo.idLinea && 
            f.properties.COD_VARIAN == dataLineas.trasbordo.idVariante
        );

        if (featureTrasbordo) {
            let startPtT = turf.point([cTrasbordo.lng, cTrasbordo.lat]);
            let endPtT = turf.point([cLlegada.lng, cLlegada.lat]);
            
            let sliceTrasbordo = turf.lineSlice(startPtT, endPtT, featureTrasbordo);
            
            sliceTrasbordo.properties = { ...featureTrasbordo.properties };
            sliceTrasbordo.properties.tipoTramo = 'trasbordo';
            featuresRecortadas.push(sliceTrasbordo);
        }
    }

    omnibusLinea = L.geoJSON(featuresRecortadas, {
        style: function(feature) {
            if (feature.properties.tipoTramo === 'salida') {
                return { color: '#007AFF', weight: 6, opacity: 0.9 };
            } else if (feature.properties.tipoTramo === 'trasbordo') {
                return { color: '#FF3B30', weight: 6, opacity: 0.9 };
            }
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup(`
                <b>Línea:</b> ${feature.properties.DESC_LINEA}<br>
                <b>Variante:</b> ${feature.properties.COD_VARIAN}<br>
                <b>Sublinea:</b> ${feature.properties.DESC_SUBLI}<br>
                <b>Sentido:</b> ${feature.properties.DESC_VARIA}<br>
                <b>ID:</b> ${feature.properties.GID}
            `);
        }
    }).addTo(map);
}

function handleUISearch(routeId){
    let id = parseInt(routeId);
    let salidaId = entradas[id][1].salida.idParada;
    let bajadaId = entradas[id][1].salida.idBajada;
    
    markerSalidaBus.remove();
    markerBajadaBus.remove();
    markerTrasbordoBus.remove();
    markerLlegadaBus.remove();
    if(routingSalida != null) routingSalida.remove();
    if(routingLlegada != null) routingLlegada.remove();
    if(routingTrasbordo != null) routingTrasbordo.remove();

    markerSalidaBus = state.markerStops.find(item => item && item.busStopID === salidaId);
    markerBajadaBus = state.markerStops.find(item => item && item.busStopID === bajadaId);
    
    if(!markerSalidaBus || !markerBajadaBus) {
         console.error("Error: Marcador de bus no encontrado en memoria");
         return;
    }

    coordsSalidaBus = markerSalidaBus._latlng;
    coordsBajadaBus = markerBajadaBus._latlng;

    routingSalida = L.Routing.control({
        waypoints: [ salida, L.latLng(coordsSalidaBus) ],
        router: L.Routing.osrmv1({ serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1' }),
        createMarker: function() { return null; },
        lineOptions: { styles: [{ color: '#666', opacity: 1, weight: 5, dashArray: '10, 10' }] },
        addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: false, show: false
    }).addTo(map);

    if(entradas[id][1].trasbordo.length != 0){
        let trasbordoId = entradas[id][1].trasbordo.idParada;
        let llegadaId = entradas[id][1].trasbordo.idBajada;
        markerTrasbordoBus = state.markerStops.find(item => item && item.busStopID === trasbordoId);
        coordsTrasbordoBus = markerTrasbordoBus._latlng;
        markerLlegadaBus = state.markerStops.find(item => item && item.busStopID === llegadaId); 
        coordsLlegadaBus = markerLlegadaBus._latlng;
        markerTrasbordoBus.addTo(map); 
        markerLlegadaBus.addTo(map);

        routingTrasbordo = L.Routing.control({
            waypoints: [ L.latLng(coordsBajadaBus), L.latLng(coordsTrasbordoBus) ],
            router: L.Routing.osrmv1({ serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1' }),
            createMarker: function() { return null; },
            lineOptions: { styles: [{ color: '#666', opacity: 1, weight: 5, dashArray: '10, 10' }] },
            addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: false, show: false
        }).addTo(map);

        routingLlegada = L.Routing.control({
            waypoints: [ L.latLng(coordsLlegadaBus), llegada ],
            router: L.Routing.osrmv1({ serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1' }),
            createMarker: function() { return null; },
            lineOptions: { styles: [{ color: '#666', opacity: 1, weight: 5, dashArray: '10, 10' }] },
            addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: false, show: false
        }).addTo(map);
    } else {
        coordsBajadaBus = markerBajadaBus._latlng;
        routingLlegada = L.Routing.control({
            waypoints: [ L.latLng(coordsBajadaBus), llegada ],
            router: L.Routing.osrmv1({ serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1' }),
            createMarker: function() { return null; },
            lineOptions: { styles: [{ color: '#666', opacity: 1, weight: 5, dashArray: '10, 10' }] },
            addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: false, show: false
        }).addTo(map);
    }

    markerSalidaBus.addTo(map);
    markerBajadaBus.addTo(map);
    handleLines(entradas[id][1], coordsSalidaBus, coordsBajadaBus, coordsTrasbordoBus, coordsLlegadaBus); 
}

function handle2Routes(data, salida, llegada){
    entradas = Object.entries(data);
    sidePanel_container.innerHTML = '';

    entradas.sort((a, b) => {
        let a_trasbordo, a_llegada, b_trasbordo, b_llegada;
        if(a[1].trasbordo.length != 0){
            a_trasbordo = a[1].trasbordo.distanciaTrasbordo;
            a_llegada = a[1].trasbordo.distanciaDestino;
        } else {
            a_trasbordo = 0;
            a_llegada = a[1].salida.distanciaLlegada;
        }
        if(b[1].trasbordo.length != 0){
            b_trasbordo = b[1].trasbordo.distanciaTrasbordo;
            b_llegada = b[1].trasbordo.distanciaDestino;
        } else {
            b_trasbordo = 0;
            b_llegada = b[1].salida.distanciaLlegada;
        }
        const distA = a[1].salida.distanciaSalida + a_trasbordo + a_llegada;
        const distB = b[1].salida.distanciaSalida + b_trasbordo + b_llegada;
        return distA - distB;
    });

    let i = 0;
    while(entradas[i] !== undefined && i < 7){
        var omnibus = document.createElement('div');
        omnibus.className = 'route'
        if(i == 0) omnibus.classList.add('selected');
        omnibus.id = i;

        let color;
        if(lineas_ucot.includes(entradas[i][1].salida.idLinea.toString())) color = "bus-yellow";
        else if(lineas_coetc.includes(entradas[i][1].salida.idLinea.toString())) color = "bus-red";
        else if(lineas_come.includes(entradas[i][1].salida.idLinea.toString())) color = "bus-green";
        else color = "bus-blue";

        if(entradas[i][1].trasbordo.length != 0){
            let colorTrasbordo;
            if(lineas_ucot.includes(entradas[i][1].trasbordo.idLinea.toString())) colorTrasbordo = "bus-yellow";
            else if(lineas_coetc.includes(entradas[i][1].trasbordo.idLinea.toString())) colorTrasbordo = "bus-red";
            else if(lineas_come.includes(entradas[i][1].trasbordo.idLinea.toString())) colorTrasbordo = "bus-green";
            else colorTrasbordo = "bus-blue";

            omnibus.innerHTML = `
            <p class="time">12:39 p.m.—1:04 p.m.</p>
            <p class="duration">25 min</p>
            <div class="bus-icons">
                <h3 class="${color}">${entradas[i][1].salida.idLinea}</h3> 
                <div class="line"></div>
                <h3 class="${colorTrasbordo}">${entradas[i][1].trasbordo.idLinea}</h3> 
            </div>`;
        } else {
            omnibus.innerHTML = `
            <p class="time">12:39 p.m.—1:04 p.m.</p>
            <p class="duration">25 min</p>
            <div class="bus-icons">
                <h3 class="${color}">${entradas[i][1].salida.idLinea}</h3> 
            </div>`;
        }
        sidePanel_container.appendChild(omnibus);
        i++;
    }
    handleUISearch(0);
}

sidePanel_container.addEventListener('click', (event) => {
    const routeDiv = event.target.closest('.route');
    if (routeDiv) {
        document.querySelectorAll('.route').forEach(r => r.classList.remove('selected'));
        const routeId = routeDiv.id;
        routeDiv.classList.add('selected');
        handleUISearch(routeId);
    }
});

async function preloadRecorridos() {
    if (!geojsonData) {
        const response = await fetch('assets/data/recorridos.geojson');
        geojsonData = await response.json();
    }
}

preloadRecorridos();