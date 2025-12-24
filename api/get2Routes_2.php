<?php 
	header("Access-Control-Allow-Origin: https://openbusmvd.github.io");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
	
	$assetsDir = ""; // = "../assets/data/" si se ejecuta local

	$jsonParadas = file_get_contents($assetsDir.'paradas_total.json');
	$jsonParadas = json_decode($jsonParadas, true);
	$jsonOmnibus = file_get_contents($assetsDir.'omnibus_paradas.json');
	$jsonOmnibus = json_decode($jsonOmnibus, true);
	$data = file_get_contents('php://input', true);
	$data = json_decode($data, true);
	$salida = $data['totalSalida'];
	$llegada = $data['totalLlegada'];
	$totalSalida = [];
	$salidaDistancia = [];
	$llegadaDistancia = [];




	$i = 0;
	foreach($llegada as $idBusStop => $distancia) {
		$actualParada = $jsonParadas[$distancia['busID']];
		foreach($actualParada['lineas'] as $lineaId => $lineaData){
			$llegadasLineas[] = $lineaId;
			foreach($lineaData as $variantes){
				$llegadasVariantes[$lineaId][] = $variantes['cod_varian'];
				if(!isset($llegadaDistancia[$lineaId][$variantes['cod_varian']]["distancia"]) || $distancia['distancia'] < $llegadaDistancia[$lineaId][$variantes['cod_varian']]["distancia"]){
					$llegadaDistancia[$lineaId][$variantes['cod_varian']] = ["busID" => $distancia['busID'], "distancia" => $distancia['distancia'], "lineaData" => $lineaData];
				}
			}
		}	
	}

	foreach($salida as $idBusStop => $distancia) {
		$actualParada = $jsonParadas[$distancia['busID']];
			//$totalTrasbordo[] = $actualParada;
		foreach($actualParada['lineas'] as $lineaId => $lineaData){
			foreach($lineaData as $variantes){
				if(!isset($salidaDistancia[$lineaId][$variantes['cod_varian']]["distancia"]) || $distancia['distancia'] < $salidaDistancia[$lineaId][$variantes['cod_varian']]["distancia"]){
					$salidaDistancia[$lineaId][$variantes['cod_varian']] = ["busID" => $distancia['busID'], "distancia" => $distancia['distancia'], "lineaData" => $lineaData];
				}
			}
			
		}
	}

	$totalTrasbordo = [];

	$i = 0;
	$vistos = [];


	function helper($codVecina, $cod_ubic_p, $idLinea, $idVariante, $vecinas, $originalOrdinal){
		global $jsonParadas, $llegadasLineas, $llegadasVariantes, $llegadaDistancia, $totalTrasbordo, $salidaDistancia, $i;
		foreach($jsonParadas[strval($codVecina)]["lineas"] as $idTrasbordo => $lineas){				
			if(in_array($idTrasbordo, $llegadasLineas) && isset($salidaDistancia[$idLinea][$idVariante])){

				foreach($lineas as $subVariantes){
					$codSubVariantes = $subVariantes['cod_varian'];


					if((in_array($codSubVariantes, $llegadasVariantes[$idTrasbordo])) && (array_column($jsonParadas[$llegadaDistancia[$idTrasbordo][$codSubVariantes]["busID"]]["lineas"][$idTrasbordo],"ordinal","cod_varian")[$codSubVariantes] > array_column($jsonParadas[$codVecina]["lineas"][$idTrasbordo],"ordinal","cod_varian")[$codSubVariantes])){
						$clave = $idLinea . '-' . $idTrasbordo;
						

						if((!isset($totalTrasbordo[$clave])) || (($totalTrasbordo[$clave]["trasbordo"]["distanciaTrasbordo"] > $vecinas['distancia']) && ($i > $totalTrasbordo[$clave]["salida"]["ordinalLlegada"] + 6))){
							if($cod_ubic_p == $codVecina){
								$flag = true;
							}
							else{
								$flag = false;
							}
							$totalTrasbordo[$clave] = ["salida" => ["idParada" => $salidaDistancia[$idLinea][$idVariante]["busID"], "idLinea" => $idLinea, "idVariante" => $idVariante, "idBajada" => (int)$cod_ubic_p, "distanciaSalida" => $salidaDistancia[$idLinea][$idVariante]["distancia"], "ordinalSalida" => $originalOrdinal, "ordinalLlegada" => $i],"trasbordo" => ["idParada" => (int)$codVecina, "idLinea" => $idTrasbordo, "idVariante" => $codSubVariantes, "idBajada" => $llegadaDistancia[$idTrasbordo][$codSubVariantes]["busID"],"distanciaTrasbordo" => $vecinas['distancia'], "distanciaDestino" => $llegadaDistancia[$idTrasbordo][$codSubVariantes]["distancia"], "flag" => $flag, "ordinalSalida" => array_column($jsonParadas[$codVecina]["lineas"][$idTrasbordo],"ordinal","cod_varian")[$codSubVariantes], "ordinalLlegada" => array_column($jsonParadas[$llegadaDistancia[$idTrasbordo][$codSubVariantes]["busID"]]["lineas"][$idTrasbordo],"ordinal","cod_varian")[$codSubVariantes]]];	
						}

					}
				}
			}
		}
	}

	function helper_2($idParada, $idLinea, $idVariante, $originalOrdinal){
		global $jsonParadas, $llegadasLineas, $llegadasVariantes, $llegadaDistancia, $totalTrasbordo, $salidaDistancia;
		if(in_array($idLinea, $llegadasLineas) && isset($salidaDistancia[$idLinea][$idVariante]) && in_array($idVariante,$llegadasVariantes[$idLinea]) && (array_column($jsonParadas[$llegadaDistancia[$idLinea][$idVariante]["busID"]]["lineas"][$idLinea],"ordinal","cod_varian")[$idVariante] > array_column($jsonParadas[$idParada]["lineas"][$idLinea],"ordinal","cod_varian")[$idVariante])){
			$clave = $idLinea;
			if((!isset($totalTrasbordo[$clave]))){
				$flag = true;
				$totalTrasbordo[$clave] = ["salida" => ["idParada" => $salidaDistancia[$idLinea][$idVariante]["busID"], "idLinea" => $idLinea, "idVariante" => $idVariante, "idBajada" => $llegadaDistancia[$idLinea][$idVariante]["busID"], "distanciaSalida" => $salidaDistancia[$idLinea][$idVariante]["distancia"], "ordinalSalida" => $originalOrdinal, "ordinalLlegada" => array_column($jsonParadas[$llegadaDistancia[$idLinea][$idVariante]["busID"]]["lineas"][$idLinea],"ordinal","cod_varian")[$idVariante], "distanciaLlegada" => $llegadaDistancia[$idLinea][$idVariante]["distancia"]],"trasbordo" => []];	
			}
		}
	}


		// 1 ruta

	foreach($salidaDistancia as $idLinea => $linea){
		foreach($linea as $variante){
			foreach($variante['lineaData'] as $busStop){
				$cod_varian = $busStop['cod_varian'];
				$i = $busStop['ordinal'];
				$originalOrdinal = $busStop['ordinal'];
				$actualLinea = $jsonOmnibus[strval($idLinea)];
				$idVariante = $cod_varian;
				$variantes = $actualLinea[$cod_varian];
				$foo['distancia'] = 0;
				helper_2($jsonOmnibus[strval($idLinea)][strval($cod_varian)][strval($i)]['cod_ubic_p'],$idLinea,$idVariante,$originalOrdinal);
			}
		}
	}

		// 2 rutas

	if(count($totalTrasbordo) >= 3){
		echo(json_encode($totalTrasbordo));
		exit();
	}

	foreach($salidaDistancia as $idLinea => $linea){
		foreach($linea as $variante){
			foreach($variante['lineaData'] as $busStop){
				$cod_varian = $busStop['cod_varian'];
				$i = $busStop['ordinal'] + 2;
				$originalOrdinal = $busStop['ordinal'];
				$actualLinea = $jsonOmnibus[strval($idLinea)];
				$idVariante = $cod_varian;
				$variantes = $actualLinea[$cod_varian];
				$i = $busStop['ordinal'];
				while(isset($variantes[strval($i)]) && $idVariante == $cod_varian){
					$actualOrdinal = $variantes[strval($i)];
					$cod_ubic_p = $actualOrdinal['cod_ubic_p'];
					$foo['distancia'] = 0;
					helper($cod_ubic_p, $cod_ubic_p, $idLinea, $idVariante, $foo, $originalOrdinal);
					foreach($jsonParadas[strval($cod_ubic_p)]["vecinas"] as $vecinas){
						if($vecinas["distancia"] > 500){
							break;
						}
						$codVecina = $vecinas['cod_ubic_p'];
						helper($codVecina, $cod_ubic_p, $idLinea, $idVariante, $vecinas, $originalOrdinal);							
					}
					$i++;
				}
			}
		}
	}
	echo(json_encode($totalTrasbordo));
?>