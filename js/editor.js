var selectedIcon = new google.maps.MarkerImage('images/activecrosshair-new.png',
		new google.maps.Size(30,30),
		new google.maps.Point(0,0),
		new google.maps.Point(15,15));

var active = {
	marker: null,
	oldName: null
};

function makeMarkerActive(marker, event)
{
	var newX = newY = 0;

	var $target = $(event.target);

	console.log($target[0].tagName);
	if( $target[0].tagName.toLowerCase() == 'area' )
	{
		var search = "img[usemap='#" + $target.parent('map').attr('id') + "']";
		console.log(search);
		$target = $(search);
	}
	console.log($target.offset());

	newY = $target.offset().top + 40;
	newX = $target.offset().left - 39;

	$("#editBox").css({
			'top': newY,
			'left': newX
			})
		.show();
	$("#editName").val(marker.getTitle()).focus();

	marker.setIcon(selectedIcon);
	marker.setDraggable(true);
	active['marker'] = marker;
	active['oldName'] = marker.getTitle();
}

function closeActiveMarker()
{
	marker = active['marker'];
	marker.setIcon(defaultIcon);
	marker.setDraggable(false);
	active = {marker:null,oldName:null};
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
	makeMarkerActive(this, event);
}

$(document).ready(function()
{
	$("#adminControls button").button();

	google.maps.event.addListener(map, 'click', function(event)
		{
			if( active['marker'] == null )
			{
				var marker = createPin("**UNNAMED**", event.latLng);
				marker.setMap(map);
				google.maps.event.addListener(marker, 'click', markerOnClick);

				makeMarkerActive(marker, event);
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

	$("div#dumpDialog").hide();
	$("button#saveChanges").click(function(e)
		{
			// Record action in GA
			_gaq.push(['_trackPageview', '/edit/save/']);
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

			// Record action in GA
			_gaq.push(['_trackPageview', '/edit/dump/']);
		});
});

