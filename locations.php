<?php

$dbh = new PDO('mysql:host=localhost;dbname=evemaps', 'root', '');

$mode = '';
if( isset($_GET['mode']) )
{
	$mode = $_GET['mode'];
}

switch( $mode )
{
	case 'solarsystems':
		$sql = "SELECT regionID, constellationID, solarSystemID, solarSystemName FROM mapSolarSystems WHERE regionID < 11000001";
		break;

	case 'constellations':
		$sql = "SELECT regionID, constellationID, constellationName FROM mapConstellations WHERE regionID < 11000001";
		break;

	case 'regions':
	default:
		$sql = "SELECT regionID, regionName FROM mapRegions WHERE regionID < 11000001";
		break;
}

$first = TRUE;

$filename = tempnam('/tmp', 'locations-');

$fp = fopen($filename, 'w');

$result = $dbh->query($sql);
while( $row = $result->fetch(PDO::FETCH_ASSOC) )
{
	if( $first )
	{
		$first = FALSE;
		fputcsv($fp, array_keys($row));
	}

	fputcsv($fp, $row);
}

fclose($fp);

header('Content-Type: text/plain');
readfile($filename);

unlink($filename);
