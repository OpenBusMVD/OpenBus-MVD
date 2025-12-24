export async function liveSearch(query, popupId, t1) {
    let targetPopup = document.getElementById(popupId);
    targetPopup.innerHTML = '';

    let urlProxy = "api/proxy.php";
    let isNumeric = !isNaN(query) && query.trim() !== "";
    let params = "";

    if (isNumeric && t1) {
        params = `?action=validar_puerta&t1=${t1}&q=${query}`;
    } 
    else if (!isNumeric && t1) {
        params = `?action=buscar_cruce&t1=${t1}&q=${query}`;
    } 
    else {
        params = `?action=buscar_calle&q=${query}`;
    }

    try {
        const response = await fetch(urlProxy + params);
        const json = await response.json();

        if (json.error || json === false) {
             renderNoResults(targetPopup);
             return;
        }

        if (t1 == null) {
            let dataToList = json;
            if (Array.isArray(json) && typeof json[0] === 'string') {
                try { dataToList = JSON.parse(json[0]); } catch(e){}
            }
            renderPopupItems(dataToList, targetPopup);
        } 
        else {
            if (isNumeric) {
                const div = document.createElement('div');
                div.className = 'popup-item';
                div.textContent = query; 
                div.setAttribute('codigo', -1); 
                targetPopup.appendChild(div);
            } else {
                renderPopupItems(json, targetPopup);
            }
        }
    } catch (error) {
        console.error("Error en Live Search:", error);
    }
}

function renderPopupItems(list, container) {
    for (var i = 0; i < 25 && list[i]?.["nombre"] !== undefined; i++) {
        const div = document.createElement('div');
        div.className = 'popup-item';
        div.textContent = list[i]["nombre"];
        div.setAttribute('codigo', list[i]["codigo"]);
        container.appendChild(div);
    }
}

function renderNoResults(container) {
    const div = document.createElement('div');
    div.className = 'noResults';
    div.textContent = "No hay resultados";
    container.appendChild(div);
}

export async function getCoordinates(params) {
    let queryString = "";
    
    switch(params.method) {
        case 'coords_esquina':
            queryString = `?action=coords_esquina&id1=${params.id1}&id2=${params.id2}`;
            break;
        case 'coords_direccion':
            queryString = `?action=coords_direccion&id1=${params.id1}&puerta=${params.puerta}`;
            break;
        case 'coords_cruce':
            queryString = `?action=coords_cruce&id=${params.id1}`;
            break;
    }

    try {
        const response = await fetch('api/proxy.php' + queryString);
        const data = await response.json();
        
        if(params.method === 'coords_cruce') {
            return data[0].codigo; 
        }
        if(data.geoJSON && data.geoJSON.coordinates) {
            return data.geoJSON.coordinates;
        }
        return null;

    } catch (error) {
        console.error('Error coordenadas:', error);
        return null;
    }
}