editMode = true;

$(document).ready(function()
{
	google.maps.event.addListener(map, 'click', function(event)
		{
			placeMarker(event.latLng);
		});

	// Setup Editor
	$.each(systemObjects, function(systemName, systemMarker)
		{
			systemMarker.setMap(map);
			systemMarker.setDraggable(true);
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


