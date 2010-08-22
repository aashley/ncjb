var selectedIcon = new google.maps.MarkerImage('images/activecrosshair-new.png',
		new google.maps.Size(30,30),
		new google.maps.Point(0,0),
		new google.maps.Point(15,15));

var active = {marker: null, old: {name: null, lat: null, lng: null}};

var placeHolderName = '** NEW **';

function makeMarkerActive(marker, newX, newY )
{
	$("#editBox").css({
			'top': newY,
			'left': newX
			})
		.show();
	$("#editName").val(marker.getTitle()).focus();
	if( $("#editName").val() == placeHolderName )
	{
		$("#editName").select();
	}

	if( marker.getTitle() == placeHolderName )
	{
		$("#deleteSystem").hide();
	}
	else
	{
		$("#deleteSystem").show();
	}

	marker.setIcon(selectedIcon);
	marker.setDraggable(true);
	active['marker'] = marker;
	active['old']['name'] = marker.getTitle();
	active['old']['lat'] = marker.getPosition().lat();
	active['old']['lng'] = marker.getPosition().lng();
}

function closeActiveMarker()
{
	marker = active['marker'];

	oldName = active['old']['name'];
	oldLat = active['old']['lat'];
	oldLng = active['old']['lng'];

	newName = $("#editName").val();
	active = {marker: null, old: {name: null, lat: null, lng: null}};

	if( newName == placeHolderName )
	{
		// No name was set so discard the new system
		marker.setMap(null);
		delete marker;
	}
	else
	{
		if( oldName != newName )
		{
			marker.setTitle(newName);
			delete systemObjects[oldName];
			systemObjects[newName] = marker;
			// Tell the server to remove the old name
			$.getJSON('/editor/delete',
					{
						'systemName': oldName
					},
					function(data)
					{
					});
		}

		if(		oldName != newName
			||	oldLat != marker.getPosition().lat()
			||	oldLng != marker.getPosition().lng() )
		{
			// Something has changed call a save with the server
			$.getJSON('/editor/save',
					{
						'systemName': newName,
						'lat': marker.getPosition().lat(),
						'lng': marker.getPosition().lng()
					},
					function(data)
					{
					});
		}
		marker.setIcon(defaultIcon);
		marker.setDraggable(false);
	}

	$("#editName").val('');
	$("#editBox").hide();
}

function markerOnClick(event)
{
	event.cancelBubble = true;
	if( active['marker'] != null )
	{
		closeActiveMarker();
	}

	var $target = $(event.target);

	if( $target[0].tagName.toLowerCase() == 'area' )
	{
		var search = "img[usemap='#" + $target.parent('map').attr('id') + "']";
		$target = $(search);
	}

	newY = $target.offset().top + 40;
	newX = $target.offset().left - 39;

	makeMarkerActive(this, newX, newY);
}

$(document).ready(function()
{
	$("#adminControls button").button();

	google.maps.event.addListener(map, 'click', function(event)
		{
			if( active['marker'] == null )
			{
				var marker = createPin(placeHolderName, event.latLng);
				marker.setMap(map);
				google.maps.event.addListener(marker, 'click', markerOnClick);

				makeMarkerActive(marker, event.pixel.x - 54, event.pixel.y + 25);
			}
			else
			{
				closeActiveMarker();
			}
		});

	// Setup Editor
	$.each(systemObjects, function(systemName, systemMarker)
		{
			systemMarker.setMap(map);

			google.maps.event.addListener(systemMarker, 'click', markerOnClick);
		});

	$("div#dumpDialog, div#deleteConfirmDialog").hide();
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

			// Record action in GA
			_gaq.push(['_trackPageview', '/edit/dump/']);
		});
	$("#deleteSystem").button(
		{
			'icons': {
				'primary': 'ui-icon-trash'
				},
			'text': false
		})
	.click(function(e)
		{
			$("#deleteConfirmDialog").dialog(
				{
					resizable: false,
					height: 155,
					width: 330,
					modal: true,
					buttons: {
						'Delete System': function()
						{
							$.getJSON('/editor/delete',
								{
									'systemName': active['marker'].getTitle()
								},
								function(data)
								{
									// Handle removal from local data
									if( typeof(data.success) != 'undefined' && data.success == true )
									{
										active['marker'].setMap(null);
										delete active['marker'];
										active = {marker: null, old: {name: null, lat: null, lng: null}};

										$("#editName").val('');
										$("#editBox").hide();
									}
									else
									{
										if( typeof(data.message) != 'undefined' )
										{
											alert(data.message);
										}
										else
										{
											alert('Unknown error occured while deleting system');
										}
									}
								});
							$(this).dialog('close');
						},
						'Cancel': function()
						{
							$(this).dialog('close');
						}
					}
				});
		});

});

