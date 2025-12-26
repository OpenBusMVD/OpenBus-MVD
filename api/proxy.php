<?php
    $corsOrigin = getenv('CORS_ORIGIN') ?: 'https://openbusmvd.github.io';
    header("Access-Control-Allow-Origin: " . $corsOrigin);
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");

if (!isset($_GET['action'])) {
    http_response_code(400);
    echo json_encode(["error" => "Falta parametro action"]);
    exit;
}

$dbPath = __DIR__ . '/../assets/data/buses.db';

try {
    $db = new PDO("sqlite:$dbPath");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA journal_mode = WAL;'); 
} catch (PDOException $e) {
    echo json_encode(["error" => "Error DB: " . $e->getMessage()]);
    exit;
}

function minToHHMM(int $min): string {
    $h = intdiv($min, 60) % 24;
    $m = $min % 60;
    return sprintf('%02d:%02d', $h, $m);
}

    // Busca el mejor viaje entre A y B para una Línea dada, después de cierta hora.
function buscarTramo($db, $day, $idLinea, $idOrigen, $idDestino, $minHoraSalida) {

    $stmt = $db->prepare("SELECT id_variante FROM lineas_variantes WHERE id_linea = ?");
    $stmt->execute([$idLinea]);
    $variantes = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($variantes)) return null;

    $mejorOpcion = null;
    $minLlegadaGlobal = 999999; 

    foreach ($variantes as $vid) {
        
        // OBTENER ORDINALES (Para saber dirección y distancia)
        // Buscamos un ejemplo cualquiera de esta variante en Origen y Destino para ver sus números de parada
        $sqlOrd = "SELECT h.ordinal, h.id_parada 
        FROM horarios h 
        JOIN viajes v ON h.internal_id = v.internal_id
        WHERE v.id_variante = ? AND h.id_parada IN (?, ?) 
        GROUP BY h.id_parada";
        
        $stmt = $db->prepare($sqlOrd);
        $stmt->execute([$vid, $idOrigen, $idDestino]);
        $ordData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Debemos tener datos de ambas paradas
        if (count($ordData) < 2) continue; 

        $ordOrigen = 0;
        $ordDestino = 0;
        
        foreach ($ordData as $o) {
            if ($o['id_parada'] == $idOrigen) $ordOrigen = intval($o['ordinal']);
            if ($o['id_parada'] == $idDestino) $ordDestino = intval($o['ordinal']);
        }

        if ($ordDestino <= $ordOrigen) continue;

        // Calculamos cuánto tarda el bus en hacer esas paradas. Los directos van más rápidos
        $lineasDirectas = array("D1","D5","D8","D9","D10","D11");
        if(in_array($idLinea, $lineasDirectas)){
            $minEstimado = ceil(($ordDestino - $ordOrigen) * 0.4);
        }
        else{
            $minEstimado = ceil(($ordDestino - $ordOrigen) * 0.7);    
        }

        // BUSCAR SALIDAS (Próximos 3 buses)
        $sql = "SELECT h.minutos 
        FROM horarios h
        JOIN viajes v ON h.internal_id = v.internal_id
        WHERE v.tipo_dia = ? AND v.id_variante = ? AND h.id_parada = ? AND h.minutos >= ? 
        ORDER BY h.minutos ASC LIMIT 3";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$day, $vid, $idOrigen, $minHoraSalida]);
        $salidas = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($salidas)) continue;

        foreach ($salidas as $minSalida) {
            $minSalida = intval($minSalida);

            if ($minSalida >= $minLlegadaGlobal) break;

            $minBusquedaLlegada = $minSalida + $minEstimado;

            $sqlDest = "SELECT h.minutos 
            FROM horarios h
            JOIN viajes v ON h.internal_id = v.internal_id
            WHERE v.tipo_dia = ? AND v.id_variante = ? AND h.id_parada = ? AND h.minutos >= ?
            ORDER BY h.minutos ASC LIMIT 1";
            
            $stmtDest = $db->prepare($sqlDest);
            $stmtDest->execute([$day, $vid, $idDestino, $minBusquedaLlegada]);
            $minLlegada = $stmtDest->fetchColumn();

            if ($minLlegada) {
                $minLlegada = intval($minLlegada);
                
                // Ajuste medianoche
                if ($minLlegada < $minSalida) $minLlegada += 1440;

                $duracion = $minLlegada - $minSalida;

                // Si tarda más de 2.5 horas, probablemente agarró el bus del turno siguiente.
                if ($duracion < 150) {
                    if ($minLlegada < $minLlegadaGlobal) {
                        $minLlegadaGlobal = $minLlegada;
                        $mejorOpcion = [
                            'minSalida' => $minSalida,
                            'minLlegada' => $minLlegada,
                            'duracion' => $duracion
                        ];
                    }
                    // Si ya encontramos un viaje válido para esta salida, pasamos a la siguiente variante
                    // (Asumimos que el primer bus que cumple las reglas es el correcto)
                    break; 
                }
            }
        }
    }
    return $mejorOpcion;
}


function nextBuses($db, $idParada, $idLinea, $idBajada, $idTrasbordo, $trasbordoBajada, $idLinea2, $distSalida, $distLlegada, $distTrasbordo){
    date_default_timezone_set('America/Montevideo');
    switch (date('N')) {
        case 6: $day = "2"; break;
        case 7: $day = "3"; break;
        default: $day = "1"; break;
    }

    $now = new DateTime("now");
    $minAhora = (int)$now->format('H') * 60 + (int)$now->format('i');

    $minsCaminataInicial = ceil($distSalida / 70);
    $minsCaminataTrasbordo = ceil($distTrasbordo / 70);
    $minsCaminataFinal = ceil($distLlegada / 70);

    // TRAMO 1
    $minHoraBusqueda1 = $minAhora;
    $destinoTramo1 = $idBajada;
    
    $tramo1 = buscarTramo($db, $day, $idLinea, $idParada, $destinoTramo1, $minHoraBusqueda1);

    if (!$tramo1) return json_encode(["mensaje" => "Sin servicio T1"]);

    $horaSalida = minToHHMM($tramo1['minSalida']);
    $horaBajada1 = minToHHMM($tramo1['minLlegada']);
    $minutosSalida = $tramo1['duracion'];
    
    $restanteSalida = $tramo1['minSalida'] - $minAhora;
    if ($restanteSalida < 0) $restanteSalida += 1440;

    // TRAMO 2
    $horaTrasbordo = -1;
    $minutosTrasbordo = -1;
    $minFinViaje = $tramo1['minLlegada'];

    if ($idTrasbordo != -1 && $idLinea2) {
        $minHoraBusqueda2 = $tramo1['minLlegada'] + 1; // 1 min buffer
        $tramo2 = buscarTramo($db, $day, $idLinea2, $idTrasbordo, $trasbordoBajada, $minHoraBusqueda2);

        if (!$tramo2) return json_encode(["mensaje" => "Sin servicio T2"]);

        $horaTrasbordo = minToHHMM($tramo2['minSalida']);
        $minutosTrasbordo = $tramo2['duracion'];
        $minFinViaje = $tramo2['minLlegada'];
    }

    $horaLlegada = minToHHMM($minFinViaje);
    $minLlegadaCasa = $minFinViaje + $minsCaminataFinal;
    $minutosTotales = $minLlegadaCasa - $minAhora;
    if ($minutosTotales < 0) $minutosTotales += 1440;

    $horaBajadaFinal = ($idTrasbordo == -1) ? -1 : $horaBajada1;

    return json_encode([
        "horaSalida" => $horaSalida,
        "horaBajada" => $horaBajadaFinal,
        "horaTrasbordo" => $horaTrasbordo,
        "horaLlegada" => $horaLlegada,
        "restanteSalida" => $restanteSalida,
        "minutosSalida" => $minutosSalida,
        "minutosTrasbordo" => $minutosTrasbordo,
        "minutosTotales" => $minutosTotales
    ]);

}

$action = $_GET['action'];
$baseIM = "http://www.montevideo.gub.uy/";
$url = "";

switch ($action) {
    case 'lineas':
            // Obtener líneas de una parada
            // Uso: proxy.php?action=lineas&id=1234
    $p = $_GET['idParada'] ?? null;
    $l = $_GET['idLinea'] ?? null;
    $l2 = $_GET['idLinea2'] ?? null;
    $b = $_GET['idBajada'] ?? null;
    $t = $_GET['idTrasbordo'] ?? null;
    $tb = $_GET['trasbordoBajada'] ?? null;
    $distanciaSalida = $_GET['dSalida'];
    $distanciaLlegada = $_GET['dLlegada'];
    $distanciaTrasbordo = $_GET['dTrasbordo'];
    if ($p && $l && $distanciaSalida && $distanciaLlegada) echo nextBuses($db, $p, $l, $b, $t, $tb, $l2, $distanciaSalida, $distanciaLlegada, $distanciaTrasbordo);
    else echo json_encode(["error" => "Faltan parametros"]);
    break;

    case 'buscar_calle':
            // Buscar calle por nombre
            // Uso: proxy.php?action=buscar_calle&q=Av+Italia
    $q = urlencode($_GET['q']);
    $url = $baseIM . "ubicacionesRest/calles/?nombre=" . $q;
    break;

    case 'buscar_cruce':
            // Buscar cruce (calle 2)
            // Uso: proxy.php?action=buscar_cruce&t1=123&q=Bulevar
    $t1 = intval($_GET['t1']);
    $q = urlencode($_GET['q']);
    $url = $baseIM . "ubicacionesRest/cruces/" . $t1 . "/?nombre=" . $q;
    break;

    case 'validar_puerta':
            // Validar número de puerta
            // Uso: proxy.php?action=validar_puerta&t1=123&q=4500
    $t1 = intval($_GET['t1']);
            $q = intval($_GET['q']); // El número de puerta
            $url = $baseIM . "ubicacionesRest/direccion/" . $t1 . "/" . $q;
            break;

            case 'coords_cruce':
            // Coordenadas de un cruce simple
            // Uso: proxy.php?action=coords_cruce&id=1234
            $id = intval($_GET['id']);
            $url = $baseIM . "ubicacionesRest/cruces/" . $id;
            break;

            case 'coords_esquina':
            // Coordenadas exactas de esquina entre dos calles
            // Uso: proxy.php?action=coords_esquina&id1=123&id2=456
            $id1 = intval($_GET['id1']);
            $id2 = intval($_GET['id2']);
            $url = $baseIM . "ubicacionesRest/esquina/" . $id1 . "/" . $id2;
            break;

            case 'coords_direccion':
            // Coordenadas de una dirección (puerta)
            // Uso: proxy.php?action=coords_direccion&id1=123&puerta=4500
            $id1 = intval($_GET['id1']);
            $puerta = intval($_GET['puerta']);
            $url = $baseIM . "ubicacionesRest/direccion/" . $id1 . "/" . $puerta;
            break;

            default:
            http_response_code(400);
            echo json_encode(["error" => "Accion no valida"]);
            exit;
        }  

        if($url != ""){
            $response = @file_get_contents($url);

            if ($response === FALSE) {
                echo json_encode(["error" => "No encontrado o error externo", "found" => false]);
            } else {
                echo $response;
            }    
        }
        
        ?>
