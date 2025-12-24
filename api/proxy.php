<?php
    header('Content-Type: application/json');

    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(["error" => "Falta parametro action"]);
        exit;
    }

    $action = $_GET['action'];
    $baseIM = "http://www.montevideo.gub.uy/";
    $url = "";

    switch ($action) {
        case 'lineas':
            // Obtener líneas de una parada
            // Uso: proxy.php?action=lineas&id=1234
        $id = $_GET['id'];
        $url = $baseIM . "transporteRest/lineas/" . intval($id);
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

        $response = @file_get_contents($url);

        if ($response === FALSE) {
            echo json_encode(["error" => "No encontrado o error externo", "found" => false]);
        } else {
            echo $response;
        }
?>