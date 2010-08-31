var map = null,
	systemObjects = {},
	systemNames = [],
	activePin = null,
	inEve = false,
	currentSystem = null,
	defaultIcon = null,
	iconShape = {
		coord: [16,0,23,5,30,13,30,16,24,24,16,30,13,30,5,24,0,16,0,13,5,5,13,0,16,0],
		type: 'poly'
	},
	inEveTimeout = 30000,		// If we're in eve look for header updates every 10 seconds
	outEveTimeout = 360000,		// If we're not in eve or get a request failure look every 60 seconds
	eveHeaderTimeout = null;

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

function enableFollowMeControls()
{
	var widget = $("#followMe").button('widget');
	widget.show();
}

function disableFollowMeControls()
{
	var widget = $("#followMe").button('widget');
	widget.hide();
}

function headerTimeout(duration)
{
	if( eveHeaderTimeout != null )
	{
		clearTimeout(eveHeaderTimeout);
		eveHeaderTimeout = null;
	}
	eveHeaderTimeout = setTimeout('updateEveHeaders();', duration);
}

function updateEveHeaders()
{
	$.getJSON('/eve', function(eveHeaders)
		{
			if( typeof(eveHeaders['solarsystemname']) != 'undefined' )
			{
				inEve = true;
				currentSystem = eveHeaders['solarsystemname'];
				enableFollowMeControls();
				if( $('#followMe:checked').length > 0 )
				{
					$.History.go(currentSystem);
					activateSystemByName(currentSystem);

					// Record selection in GA
					_gaq.push(['_trackPageview', '/follow/' + currentSystem]);

					headerTimeout(inEveTimeout);
				}
				else
				{
					headerTimeout(outEveTimeout);
				}
			}
			else
			{
				headerTimeout(outEveTimeout);
			}
		});
	headerTimeout(outEveTimeout);
}

function activateSystemByName( systemName, zoom )
{
	if( typeof activePin == "object" && activePin != null )
	{
		activePin.setMap(null);
	}

	var marker = systemObjects[systemName];

	map.panTo(marker.position);
	if( typeof(zoom) != 'undefined' && zoom == true )
	{
		map.setZoom(5);
	}
	marker.setMap(map);
	activePin = marker;
}

$(document).ready(function ()
{
	$("#followMe").button({
		icons: {
			primary: 'ui-icon-link'
		},
		text: false
	}).change(function()
	{
		if( $(this).is(':checked') )
		{
			updateEveHeaders();
			_gaq.push(['_trackPageview', '/follow/enable']);
		}
		else
		{
			headerTimeout(outEveTimeout);
			_gaq.push(['_trackPageview', '/follow/disable']);
		}
	});

	$("#about").button({
		icons: {
			primary: 'ui-icon-help'
		},
		text: false
	}).click(function()
	{
		$('#aboutDialog').dialog({
			modal: true,
			title: "About " + $('title').text(),
			width: 600,
			height: 400,
			buttons: {}
		});
	});

	$(".itemLink").click(function(e)
		{
			if( typeof(CCPEVE) != 'undefined' )
			{
				var type = $(e.target).attr('evetype');
				var itemid = $(e.target).attr('eveitemid');

				CCPEVE.showInfo(type, itemid);
			}
		});

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

	// Look for EVE Online IGB
	if( typeof(CCPEVE) != 'undefined' )
	{
		var trustableUrl = 'http://' + location.host;
		CCPEVE.requestTrust(trustableUrl);
	}

	// Setup Auto Complete on Search box
	$("#search").autocomplete({
			source: systemNames,
			select: function(event, ui)
			{
				$.History.go(ui.item.value);
				activateSystemByName(ui.item.value, true);
				map.setZoom(5);

				// Record selection in GA
				_gaq.push(['_trackPageview', '/search/' + ui.item.value]);
			}
		}).keyup(function(event)
			{
				if( $('#followMe:checked').length > 0 )
				{
					$('#followMe')[0].checked = false;
					$('#followMe').button('widget').click();
				}
				if( typeof systemObjects[$(event.target).val()] == 'undefined' )
				{
					if( activePin != null )
					{
						activePin.setMap(null);
						activePin = null;
					}
				}
			});

	// Setup history support
	$.History.bind(function(state)
		{
			activateSystemByName(state);
		});

	// If we think we're in EVE, enable the follow me controls
	disableFollowMeControls();
	if( inEve )
	{
		enableFollowMeControls();
	}
	headerTimeout(inEveTimeout);
});
