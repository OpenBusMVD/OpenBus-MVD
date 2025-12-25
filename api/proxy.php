<?php
 header("Access-Control-Allow-Origin: https://openbusmvd.github.io");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(["error" => "Falta parametro action"]);
        exit;
    }

    function hhmmToMin(string $hhmm): int {
        [$h, $m] = array_map('intval', explode(':', $hhmm));
        return $h * 60 + $m;
    }

    function minToHHMM(int $min): string {
        $h = intdiv($min, 60) % 24;
        $m = $min % 60;
        return sprintf('%02d:%02d', $h, $m);
    }

    function proximoOmnibus($horarios, $horaActual) {
        foreach ($horarios as $index => $viaje) {
            $horarioStr = $viaje[0];
            $horarioMinutos = hhmmToMin($horarioStr);

            if ($horarioMinutos >= $horaActual) {
                $horaStr = minToHHMM($horarioMinutos);
                $restante = $horarioMinutos - $horaActual;
                
                // Ajuste por si la hora actual es del día anterior y el bus es de madrugada
                if ($restante < 0) $restante += 1440;

                return [
                    "hora" => $horaStr,
                    "restante" => $restante,
                    "minsTotales" => $horarioMinutos,
                    "indice" => $index
                ];
            }
        }

        return [
            "hora" => null,
            "mensaje" => "Error."
        ];
    }


    function nextBuses($idParada, $idLinea, $idBajada){
        date_default_timezone_set('America/Montevideo');
        
        switch (date('N')) {
            case 6: $day = "2"; break;
            case 7: $day = "3"; break;
            default: $day = "1"; break;
        }

        $assetsDir = "";
        
        $mapaFile = $assetsDir . 'mapa_lineas.json';
        if (!file_exists($mapaFile)) return json_encode(["hora" => null, "mensaje" => "Error sistema"]);
        $mapaLineas = json_decode(file_get_contents($mapaFile), true);
        
        $variantesPosibles = $mapaLineas[$idLinea] ?? [];
        if (empty($variantesPosibles)) return json_encode(["hora" => null, "mensaje" => "Línea s/d"]);

        $horariosFile = $assetsDir . 'tipo_dia_' . $day . '.json';
        if (!file_exists($horariosFile)) return json_encode(["hora" => null, "mensaje" => "No hay horarios"]);
        $jsonHorarios = json_decode(file_get_contents($horariosFile), true);

        $mejorResultado = null;

        $created = new DateTime("now");
        $horaActual = (int)$created->format('H') * 60 + (int)$created->format('i');

        foreach ($variantesPosibles as $vid) {
            $vid = (string)$vid;

            // Verificar que la variante pase por la parada de subida
            if (isset($jsonHorarios[$idParada][$vid])) {
                $datosSubida = $jsonHorarios[$idParada][$vid];
                
                if ($idBajada === null) {
                    $res = proximoOmnibus($datosSubida, $horaActual);
                    if ($res['hora'] !== null) {
                        return json_encode($res);
                    }
                    continue;
                }

                if (isset($jsonHorarios[$idBajada][$vid])) {
                    $datosBajada = $jsonHorarios[$idBajada][$vid];

                    // Tomamos el primer viaje para ver el número de parada
                    $ordSubida = intval($datosSubida[0][2]);
                    $ordBajada = intval($datosBajada[0][2]);

                    if ($ordBajada <= $ordSubida) {
                        continue; // Dirección incorrecta (Vuelta)
                    }

                    // Se asumen 45 segundos por parada de diferencia
                    $diferenciaParadas = $ordBajada - $ordSubida;
                    $tiempoMinimoViaje = ceil($diferenciaParadas * 0.75); 

                    $busSubida = proximoOmnibus($datosSubida, $horaActual);
                    
                    if ($busSubida['hora'] !== null) {
                        $minSalida = $busSubida['minsTotales']; // Hora que pasa por mi parada

                        // No usamos índices. Buscamos el primer bus que llegue DESPUÉS de (Salida + TiempoMinimo)
                        $minLlegadaEstimada = $minSalida + $tiempoMinimoViaje;
                        
                        $horaLlegadaReal = "??:??";
                        $duracion = 0;

                        foreach ($datosBajada as $viajeBajada) {
                            $tLlegada = hhmmToMin($viajeBajada[0]);
                            
                            // Ajuste medianoche: Si el bus de salida es 23:50 y llegada es 00:20
                            if ($tLlegada < $minSalida && $minSalida > 1300) { 
                                $tLlegada += 1440; 
                            }

                            if ($tLlegada >= $minLlegadaEstimada) {
                                $horaLlegadaReal = $viajeBajada[0];
                                $duracion = $tLlegada - $minSalida;
                                break;
                            }
                        }

                        if ($duracion > 0) {
                            $busSubida['horaLlegada'] = $horaLlegadaReal;
                            $busSubida['duracionViaje'] = $duracion;
                            return json_encode($busSubida);
                        }
                    }
                }
            }
        }

        return json_encode(["hora" => null, "mensaje" => "Sin coincidencia"]);
        
        
    }

    $action = $_GET['action'];
    $baseIM = "http://www.montevideo.gub.uy/";
    $url = "";

    switch ($action) {
        case 'lineas':
            // Obtener líneas de una parada
            // Uso: proxy.php?action=lineas&id=1234
            $idParada = $_GET['idParada'];
            $idLinea = $_GET['idLinea'];
            $idBajada = $_GET['idBajada'] ?? null;
            echo(nextBuses($idParada, $idLinea, $idBajada));
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