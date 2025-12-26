<?php
    require_once __DIR__ . '/../config.php';
    header("Access-Control-Allow-Origin: " . CORS_ORIGIN);
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


    function nextBuses($db, $idParada, $idLinea, $idBajada){
        date_default_timezone_set('America/Montevideo');
    
    switch (date('N')) {
        case 6: $day = "2"; break;
        case 7: $day = "3"; break;
        default: $day = "1"; break;
    }

    $stmt = $db->prepare("SELECT id_variante FROM lineas_variantes WHERE id_linea = ?");
    $stmt->execute([$idLinea]);
    $variantes = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($variantes)) return json_encode(["hora" => null, "mensaje" => "Línea s/d"]);

    $now = new DateTime("now");
    $minsActual = (int)$now->format('H') * 60 + (int)$now->format('i');

    $mejorCandidato = null;
    $minimaEspera = 999999;

    foreach ($variantes as $vid) {
        
        // BUSCAR SUBIDA
        $sql = "SELECT h.minutos, h.ordinal, v.internal_id 
                FROM horarios h
                JOIN viajes v ON h.internal_id = v.internal_id
                WHERE v.tipo_dia = ? 
                  AND v.id_variante = ? 
                  AND h.id_parada = ? 
                  AND h.minutos >= ? 
                ORDER BY h.minutos ASC LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$day, $vid, $idParada, $minsActual]);
        $busSubida = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$busSubida) continue;

        $minSalida = intval($busSubida['minutos']);
        
        // Si este bus sale MUCHO más tarde que un candidato que ya tenemos,
        // ni siquiera vale la pena calcularle la bajada
        if ($minSalida >= $minimaEspera + $minsActual) continue;

        $horaSalidaStr = minToHHMM($minSalida);
        $internalId = $busSubida['internal_id'];
        $ordSubida = intval($busSubida['ordinal']);

        $restante = $minSalida - $minsActual;
        if ($restante < 0) $restante += 1440;

        // Si no hay bajada, este es un candidato válido
        if ($idBajada === null) {
            // Guardamos si es mejor que el anterior
            if ($restante < $minimaEspera) {
                $minimaEspera = $restante;
                $mejorCandidato = [
                    "hora" => $horaSalidaStr,
                    "restante" => $restante,
                    "minsTotales" => 0,
                    "horaLlegada" => "Destino"
                ];
            }
            continue;
        }

        // BUSCAR BAJADA
        $busBajada = null;
        
        // ID Exacto
        $sql = "SELECT minutos FROM horarios 
                WHERE internal_id = ? AND id_parada = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$internalId, $idBajada]);
        $busBajada = $stmt->fetch(PDO::FETCH_ASSOC);

        // Si falló el ID
        if (!$busBajada) {

            $sqlOrd = "SELECT ordinal FROM horarios 
                       JOIN viajes ON horarios.internal_id = viajes.internal_id
                       WHERE viajes.tipo_dia = ? AND viajes.id_variante = ? AND horarios.id_parada = ? LIMIT 1";
            $stmt = $db->prepare($sqlOrd);
            $stmt->execute([$day, $vid, $idBajada]);
            $resOrd = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$resOrd) continue;
            
            $ordBajada = intval($resOrd['ordinal']);
            if ($ordBajada <= $ordSubida) continue;

            $diffParadas = $ordBajada - $ordSubida;
            $minEstimado = $minSalida + ceil($diffParadas * 0.7);

            $sql = "SELECT h.minutos 
                    FROM horarios h
                    JOIN viajes v ON h.internal_id = v.internal_id
                    WHERE v.tipo_dia = ? 
                      AND v.id_variante = ? 
                      AND h.id_parada = ? 
                      AND h.minutos >= ? 
                    ORDER BY h.minutos ASC LIMIT 1";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([$day, $vid, $idBajada, $minEstimado]);
            $busBajada = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if ($busBajada) {
            $minLlegada = intval($busBajada['minutos']);
            if ($minLlegada < $minSalida) $minLlegada += 1440;
            
            $duracion = $minLlegada - $minSalida;
            $horaLlegadaStr = minToHHMM($minLlegada);

            if ($duracion > 0) {
                if ($restante < $minimaEspera) {
                    $minimaEspera = $restante;
                    $mejorCandidato = [
                        "hora" => $horaSalidaStr,
                        "restante" => $restante,
                        "minutosTotales" => $duracion,
                        "horaLlegada" => $horaLlegadaStr
                    ];
                }
            }
        }
    }

    if ($mejorCandidato) {
        return json_encode($mejorCandidato);
    }

    return json_encode(["hora" => null, "mensaje" => "Sin servicio"]);
        
        
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
            $b = $_GET['idBajada'] ?? null;
            if ($p && $l) echo nextBuses($db, $p, $l, $b);
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