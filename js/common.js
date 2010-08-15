var map = null;
var systemObjects = {};
var systemNames = [];
var activePin = null;

var editMode = false;

$(document).ready(function ()
{
	// Map Initialisation
	var mapTypeOptions = {
		getTileUrl: function(coord, zoom) {
			return zoom + "/tile_" + coord.x + '_' + coord.y + ".png";
		},
		tileSize: new google.maps.Size(256,256),
		isPng: true,
		name: "NC JB",
		minZoom: 2,
		maxZoom: 5,
		alt: "Northern Coalition Jump Bridge Network"
	};

	var eveMapType = new google.maps.ImageMapType(mapTypeOptions);

	var myLatlng = new google.maps.LatLng(0,0);
	var myOptions = {
		backgroundColor: "#000000",
		zoom: 2,
		center: myLatlng,
		disableDefaultUI: true,
		navigationControl: true,
		mapTypeControlOptions: {
			mapTypeIds: ['ncjb'],
		}
	}
	map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

	map.mapTypes.set('ncjb', eveMapType);
	map.setMapTypeId('ncjb');

	// Look for previous view in cookies
	if(		$.cookie('ncjb_lat') != null
		&&	$.cookie('ncjb_lng') != null
		&&	$.cookie('ncjb_zoom') != null )
	{
		var myLatlng = new google.maps.LatLng($.cookie('ncjb_lat'), $.cookie('ncjb_lng'));
		map.setCenter(myLatlng);
		map.setZoom(parseInt($.cookie('ncjb_zoom')));
	}

	google.maps.event.addListener(map, 'click', function(event)
		{
			if(	editMode )
			{
				placeMarker(event.latLng);
			}
		});

	google.maps.event.addListener(map, 'center_changed', function()
		{
			var center = map.getCenter();
			$.cookie('ncjb_lat', center.lat());
			$.cookie('ncjb_lng', center.lng());
			$.cookie('ncjb_zoom', map.getZoom());
		});

	// Load predefined Systems
	for( i = 0; i < systems.length; i++ )
	{
		var system = systems[i];
		var latLng = new google.maps.LatLng(system[1], system[2]);
		var marker = new google.maps.Marker({
				position: latLng,
				title: system[0],
				draggable: editMode
			});

		systemObjects[system[0]] = marker;
		systemNames.push(system[0]);
	}


	// Setup Auto Complete on Search box
	$("#search").autocomplete({
			source: systemNames,
			select: function(event, ui)
			{
				if( typeof activePin == "object" && activePin != null )
				{
					activePin.setMap(null);
				}

				var marker = systemObjects[ui.item.value];

				map.panTo(marker.position);
				map.setZoom(5);
				marker.setMap(map);
				activePin = marker;
			}
		}).keyup(function(event)
			{
				if( typeof systemObjects[$(event.target).val()] == 'undefined' )
				{
					if( activePin != null )
					{
						activePin.setMap(null);
						activePin = null;
					}
				}
			});

	// Setup Editor
	$("div#adminControls button").button().hide();
	$("div#dumpDialog").hide();
	$("button#enableEdit").click(function(e)
		{
			editMode = true;

			$.each(systemObjects, function(systemName, systemMarker)
				{
					systemMarker.setMap(map);
					systemMarker.setDraggable(true);
				});

			$("button#dumpSystems, button#closeEdit").show();
			$("button#enableEdit").hide();
		})
		.show();
	$("button#closeEdit").click(function(e)
		{
			editMode = false;

			systemNames = [];
			$.each(systemObjects, function(systemName, systemMarker)
				{
					systemMarker.setMap(null);
					systemMarker.setDraggable(false);
					systemNames.push(systemName);
				});
			$("#search").autocomplete("option", "source", systemNames);

			$("button#dumpSystems, button#closeEdit").hide();
			$("button#enableEdit").show();
		})
	$("button#dumpSystems").click(function(e)
		{
			systems = [];
			$.each(systemObjects, function(systemName, systemMarker)
				{
					system = [
						systemName,
						systemMarker.position.lat(),
						systemMarker.position.lng()
						];
					systems.push(system);
				});
			$('textarea#dump').val(JSON.stringify(systems));

			$('div#dumpDialog').dialog({
				modal: true,
				title: "Dump of system data",
				width: 600,
				height: 400,
				buttons: {}
			});
		});
});

function placeMarker(location)
{
	var systemName = prompt("Enter name of system", "");
	var marker = new google.maps.Marker({
			position: location,
			map: map,
			title: systemName,
			draggable: true
	});

	systemObjects[systemName] = marker;
}


