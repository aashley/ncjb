var map = null,
	systemObjects = {},
	systemNames = [],
	activePin = null,
	defaultIcon = null,
	iconShape = {
		coord: [4,3,23,3,24,4,24,20,23,21,19,21,14,26,9,21,4,21,3,20,3,4,4,3],
		type: 'poly'
	};

function createPin(title, position)
{
	var marker = new google.maps.Marker({
		position: position,
		title: title,
		draggable: false,
		icon: defaultIcon,
		shape: iconShape
	});
	return marker;
}

$(document).ready(function ()
{
	defaultIcon = new google.maps.MarkerImage('images/crosshair-new.png',
		new google.maps.Size(30,30),
		new google.maps.Point(0,0),
		new google.maps.Point(15,15));

	// Map Initialisation
	var mapTypeOptions = {
		getTileUrl: function(coord, zoom) {
			return "tiles/" + zoom + "/tile_" + coord.x + '_' + coord.y + ".png";
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
		var marker = createPin(system[0], latLng);

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

				// Record selection in GA
				_gaq.push(['_trackPageview', '/systems/' + ui.item.value]);
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
});
