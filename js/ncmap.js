function NcMap()
{
	this.regions = [];
	this.constellations = [];
	this.systems = {
		};

	this.regionIdMap = {};
	this.constellationIdMap = {};
	this.systemIdMap = {};

	this.regionConstellations = {};
	this.constellationSystems = {};

	this.googleMap = null;
	this.defaultIcon = null;
	this.defaultIconShape = null;

	this.markerCollection = {
		'clusterfuck': {},
		'sascha': {},
		'sirius': {}
	};
	this.activeMarker = null;

	this.tileHostMulti = true;
	this.tileHostCount = 6;
	this.tileBase = "http://tiles.lyarna.net/" + tileVersion + '/';

	this.currentSystem = currentSystem;
	this.followModeEnabled = false;
	this.followModeActive = false;
	this.locationCheckCount = 0;
	this.locationCheckFreq = 5000;
	this.locationCheckMinFreq = 1000;
	this.locationCheckMaxFreq = 120000;
	this.locationCheckTimeout = null;
}

NcMap.prototype.init = function()
{
	var ncMap = this;
	this.setupUi();
	this.setupMap();

	if( typeof(CCPEVE) != 'undefined' )
	{
		var trustableUrl = 'http://' + location.host;
		CCPEVE.requestTrust(trustableUrl);
	}
}

NcMap.prototype.setupUi = function()
{
	var ncMap = this,
		acCache = {},
		lastXhr;
	// Setup Auto Complete on Search box
	$("#search").autocomplete({
			source: function( request, response )
			{
				var term = request.term;
				if( term in acCache )
				{
					response(acCache[term]);
					return;
				}

				request['mapType'] = ncMap.googleMap.getMapTypeId();
				lastXhr = $.getJSON("/feeds/systemSearch", 
					request,
					function( data, status, xhr )
					{
						acCache[term] = data;
						if( xhr === lastXhr )
						{
							response(data);
						}
					});
			},
			select: function(event, ui)
			{
				ncMap.activateSystemByName(ui.item.value, true);

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
				if( typeof ncMap.markerCollection[ncMap.googleMap.getMapTypeId()][$(event.target).val()] == 'undefined' )
				{
					ncMap.deactivateMarker();
				}
			});

	$("#followMe").button({
		icons: {
			primary: 'ui-icon-link'
		},
		text: false
	}).change(function()
	{
		if( $(this).is(':checked') )
		{
			ncMap.follow();
			_gaq.push(['_trackPageview', '/follow/enable']);
		}
		else
		{
			ncMap.stopFollow();
			_gaq.push(['_trackPageview', '/follow/disable']);
		}
	});

	ncMap.disableFollow();
	if( ncMap.currentLocation != null )
	{
		ncMap.enableFollow();
	}
	else
	{
		ncMap.updateLocation();
	}

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

	$('#userControls a').button();

	$(".itemLink").click(function(e)
		{
			if( typeof(CCPEVE) != 'undefined' )
			{
				var type = $(e.target).attr('evetype');
				var itemid = $(e.target).attr('eveitemid');

				CCPEVE.showInfo(type, itemid);
			}
		});

	$.History.bind(function(state)
			{
				ncMap.findAndActivateSystem(state);
			})

}

NcMap.prototype.setupMap = function()
{
	var ncMap = this;

	this.defaultIcon = new google.maps.MarkerImage('/images/crosshair-new.png',
			new google.maps.Size(30,30),
			new google.maps.Point(0,0),
			new google.maps.Point(15,15));

	this.defaultIconShape = {
		"coord": [16,0,23,5,30,13,30,16,24,24,16,30,13,30,5,24,0,16,0,13,5,5,13,0,16,0],
		"type": 'poly'
	};

	// Clusterfuck Map Type
	var cfTypeOptions = {
		getTileUrl: function(coord, zoom) {
			var maxTile = Math.pow(2, zoom) - 1;
			if(		coord.x < 0 || coord.x > maxTile
				||	coord.y < 0 || coord.y > maxTile )
			{
				return ncMap.tileBase + "tile_black.png";
			}
			var tileUrlBase = ncMap.tileBase;
			if( ncMap.tileHostMulti )
			{
				var tileSum = coord.x + coord.y;
				var hostNumber = tileSum % ncMap.tileHostCount;
				tileUrlBase = tileUrlBase.replace('tiles', 'tiles' + hostNumber);
			}
			return tileUrlBase + "clusterfuck/" + zoom + "/tile_" + coord.x + '_' + coord.y + ".png";
		},
		tileSize: new google.maps.Size(256,256),
		isPng: true,
		name: "Clusterfuck",
		minZoom: 2,
		maxZoom: 5,
		alt: "Clusterfuck Jump Bridge Network"
	};
	var cfMapType = new google.maps.ImageMapType(cfTypeOptions);

	var initialLatlng = new google.maps.LatLng(0,0);
	var mapOptions = {
		backgroundColor: "#000000",
		zoom: 2,
		center: initialLatlng,
		disableDefaultUI: true,
		navigationControl: true,
		mapTypeControl: false,
		mapTypeControlOptions: {
			mapTypeIds: ['clusterfuck'],
			position: google.maps.ControlPosition.BOTTOM_RIGHT
		}
	}
	ncMap.googleMap = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

	ncMap.googleMap.mapTypes.set('clusterfuck', cfMapType);

	if(	$.cookie('ncjb_maptype') != null )
	{
		ncMap.googleMap.setMapTypeId($.cookie('ncjb_maptype'));
	}
	else
	{
		ncMap.googleMap.setMapTypeId('clusterfuck');
	}

	google.maps.event.addListener(ncMap.googleMap, 'maptypeid_changed', function()
		{
			$.cookie('ncjb_maptype', ncMap.googleMap.getMapTypeId(), {expires: 7});
			if( ncMap.activeMarker != null )
			{
				// There is an active marker try to find the same marker on
				// the new map type and activate it
				ncMap.activateSystemByName(ncMap.activeMarker.getTitle());
			}
			_gaq.push(['_trackPageview', '/mapType/' + ncMap.googleMap.getMapTypeId()]);
		});

	// Look for previous view in cookies
	if(		$.cookie('ncjb_lat') != null
		&&	$.cookie('ncjb_lng') != null
		&&	$.cookie('ncjb_zoom') != null )
	{
		var myLatlng = new google.maps.LatLng($.cookie('ncjb_lat'), $.cookie('ncjb_lng'));
		ncMap.googleMap.setCenter(myLatlng);
		ncMap.googleMap.setZoom(parseInt($.cookie('ncjb_zoom')));
	}

	google.maps.event.addListener(ncMap.googleMap, 'center_changed', function()
		{
			var center = ncMap.googleMap.getCenter();
			$.cookie('ncjb_lat', center.lat(), {expires: 7});
			$.cookie('ncjb_lng', center.lng(), {expires: 7});
			$.cookie('ncjb_zoom', ncMap.googleMap.getZoom(), {expires: 7});
		});
}

NcMap.prototype.createMarker = function( title, position, draggable )
{
	if( typeof draggable == 'undefined' )
	{
		draggable = false;
	}

	var marker = new google.maps.Marker({
			"position": position,
			"title": title,
			"draggable": draggable,
			"raiseOnDrag": false,
			"flat": true,
			"icon": this.defaultIcon,
			"shape": this.defaultIconShape
		});
	return marker;
}

NcMap.prototype.activateSystemByName = function( systemName, zoomIn )
{
	var ncMap = this;

	this.deactivateMarker();

	var marker = null;
	var mapType = this.googleMap.getMapTypeId();

	if( typeof this.markerCollection[mapType][systemName] !== 'undefined' )
	{
		marker = this.markerCollection[mapType][systemName];
	}
	else
	{
		// We dont have a marker do we have the details of the system?
		if( typeof this.systems[systemName] == 'undefined' )
		{
			// Don't know the system. lets get its details
			$.ajax({
					"async": false,
					"url": "/feeds/systemDetails",
					"dataType": 'json',
					"data": {
						"name": systemName
					},
					"success": function( data )
					{
						ncMap.systems[systemName] = data;
						ncMap.systemIdMap[data.id] = systemName;
					}
				});
		}

		if( this.systems[systemName][mapType].hasLocation == false )
		{
			// We've tried to activate a pin that isnt on this map
			return false;
		}

		var latlon = new google.maps.LatLng(this.systems[systemName][mapType].lat,
				this.systems[systemName][mapType].lon);
		marker = this.createMarker(this.systems[systemName].name, latlon);

		this.markerCollection[mapType][systemName] = marker;
	}

	this.googleMap.panTo(marker.position);
	if( typeof zoomIn != 'undefined' && zoomIn == true )
	{
		var newZoom = this.googleMap.mapTypes[mapType].maxZoom;
		this.googleMap.setZoom(newZoom);
	}
	marker.setMap(this.googleMap);
	this.activeMarker = marker;
}

NcMap.prototype.deactivateMarker = function()
{
	if( this.activeMarker != null )
	{
		this.activeMarker.setMap(null);
		this.activeMarker = null;
	}
}

NcMap.prototype.findAndActivateSystem = function(systemName)
{
	var ncMap = this;
	$.getJSON('/feeds/systemSearch',
			{
				'term': systemName,
				'mapType': this.googleMap.getMapTypeId()
			},
			function(data)
			{
				if( data.length > 0 )
				{
					ncMap.activateSystemByName(data[0].value);
				}
			});
}

NcMap.prototype.enableFollow = function()
{
	console.log('enable follow');

	var widget = $('#followMe').button('widget');
	widget.show();
	this.followModeEnabled = true;
	this.updateLocation();
}

NcMap.prototype.disableFollow = function()
{
//	console.log('disable follow');
	var widget = $('#followMe').button('widget');
	widget.hide();
	this.followModeEnabled = false;
	if( this.followModeActive )
	{
		this.deactivateMarker();
	}
}

NcMap.prototype.follow = function()
{
//	console.log('start follow');
	this.followModeActive = true;
	this.showFollowedLocation();
}

NcMap.prototype.stopFollow = function()
{
//	console.log('stop follow');
	this.followModeActive = false;
}

NcMap.prototype.showFollowedLocation = function()
{
	if( this.followModeActive && this.currentSystem != null )
	{
		//$.History.go(this.currentSystem);
		this.activateSystemByName(this.currentSystem);

		_gaq.push(['_trackPageview', '/follow/' + this.currentSystem]);
	}
}

NcMap.prototype.updateLocation = function()
{
	if( this.locationCheckTimeout != null )
	{
		return;
	}

	var ncMap = this;

	this.locationCheckCount++;

//	console.log('Location Check: ' + this.locationCheckCount + ' ' + this.locationCheckFreq);
	$.getJSON('/eve',
			function(eveHeaders)
			{
				if( typeof(eveHeaders['solarsystemname']) != 'undefined' )
				{
					if( ncMap.currentSystem != eveHeaders['solarsystemname'] )
					{
						// location has changed since last check
						ncMap.locationCheckFreq = ncMap.locationCheckFreq - Math.floor((ncMap.locationCheckFreq / 12) * 7);
						if( ncMap.locationCheckFreq < ncMap.locationCheckMinFreq )
						{
							ncMap.locationCheckFreq = ncMap.locationCheckMinFreq;
						}
					}
					else
					{
						// location has not changed since last check
						ncMap.locationCheckFreq = ncMap.locationCheckFreq + Math.floor(ncMap.locationCheckFreq / 4);
						if( ncMap.locationCheckFreq > ncMap.locationCheckMaxFreq )
						{
							ncMap.locationCheckFreq = ncMap.locationCheckMaxFreq;
						}
					}
					//$('#userControls').html(ncMap.locationCheckFreq);
					ncMap.currentSystem = eveHeaders['solarsystemname'];
					ncMap.showFollowedLocation();
				}
				else
				{
					ncMap.currentSystem = null;
				}

				if( ncMap.locationCheckCount > 2 && ncMap.currentSystem == null )
				{
					if( true == ncMap.followModeEnabled )
					{
						ncMap.disableFollow();
					}
					clearTimeout(ncMap.locationCheckTimeout);
					ncMap.locationCheckTimeout = null;
				}
				else
				{
					if( false == ncMap.followModeEnabled && ncMap.currentSystem != null )
					{
						ncMap.enableFollow();
					}
					ncMap.locationCheckTimeout = setTimeout(function(thisObj)
						{
							thisObj.locationCheckTimeout = null;
							thisObj.updateLocation();
						},
						ncMap.locationCheckFreq,
						ncMap);
				}
			});

}
