<?php

$dbh = new PDO('mysql:host=localhost;dbname=evemaps', 'root', '');

$modes = array('regions', 'constellations', 'solarsystems');

foreach( $modes as $mode )
{
	print $mode . ".csv ... ";

	switch( $mode )
	{
		case 'solarsystems':
			$sql = "SELECT constellationID, solarSystemID, solarSystemName FROM mapSolarSystems WHERE regionID < 11000001";
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
	
	$fp = fopen($mode . '.csv', 'w');
	
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

	print "done.\n";
}
