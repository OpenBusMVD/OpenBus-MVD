<?php 
header("Access-Control-Allow-Origin: https://openbusmvd.github.io");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
switch (date('N')) {
	case 1:
		$day = "HABIL";
		break;
	case 2:
		$day = "HABIL";
	case 3:
		$day = "HABIL";
	case 4:
		$day = "HABIL";
	case 5:
		$day = "HABIL";
	case 6:
		$day = "SABADO";
	case 7:
		$day = "DOMINGO";
}
$created = new DateTime("now", new DateTimeZone('America/Montevideo'));
$hora = $created->format('H:i');

$idBus = $_GET['id'];

$response = file_get_contents('http://www.montevideo.gub.uy/transporteRest/pasadas/'.$idBus.'/'.$day.'/'.$hora);
$response = json_decode($response);

foreach ($response as $arrays){
	echo("<br>");
	echo($arrays->{'linea'}. " [".$arrays->{'destino'}."] | ".$arrays->{'horaDesc'});
}


 ?>