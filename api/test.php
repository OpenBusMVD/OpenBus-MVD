<?php
$db = new PDO("sqlite:../assets/data/buses.db");
$stmt = $db->query("SELECT * FROM lineas_variantes WHERE id_linea = '112'");
$res = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($res);
?>