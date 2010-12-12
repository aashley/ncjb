NcMapAdmin.prototype = new NcMapEditor();

function NcMapAdmin()
{
	this.possibles = [];
	this.possiblesIdMap = {};
	this.possibleMarkers = [];
	this.possibleIcon = null
	NcMapEditor.apply(this, arguments);
}

NcMapAdmin.prototype.init = function()
{
	NcMapEditor.prototype.init.apply(this, arguments);

	this.loadSystemsWithSubmissions();
}

NcMapAdmin.prototype.setupMap = function()
{
	var ncMap = this;

	NcMapEditor.prototype.setupMap.apply(this, arguments);

	this.possibleIcon =  new google.maps.MarkerImage('/images/possiblecrosshair-new.png',
			new google.maps.Size(30,30),
			new google.maps.Point(0,0),
			new google.maps.Point(15,15));

	google.maps.event.addListener(ncMap.googleMap, 'maptypeid_changed', function()
		{
			ncMap.loadSystemsWithSubmissions();
		});
}

NcMapAdmin.prototype.setupUi = function()
{
	NcMapEditor.prototype.setupUi.apply(this, arguments);

	var ncMap = this;

	$("#systemPanel .choices input").live('change', function(e)
		{
			for( var i = 0; i < ncMap.possibleMarkers.length; i++ )
			{
				var marker = ncMap.possibleMarkers[i];
				if( $(this).val() == marker.getTitle() )
				{
					marker.setIcon(ncMap.selectedIcon);
					ncMap.googleMap.panTo(marker.getPosition());
				}
				else
				{
					marker.setIcon(ncMap.possibleIcon);
				}
			}
		});

	$("#saveChoice").click(function(e)
		{
			ncMap.saveChoice();
		});
}

NcMapAdmin.prototype.loadSystemsWithSubmissions = function()
{
	var ncMap = this;

	$('#systemPanel .choices').empty();
	$('#systemPanel').hide();
	$.getJSON('/admin/systemsWithSubmissions',
			{
				'mapType': ncMap.googleMap.getMapTypeId()
			},
			function(data)
			{
				$('#systemList').empty();
				for( var i = 0; i < data.length; i++ )
				{
					var system = data[i];
					ncMap.systems[system.name] = system;
					ncMap.systemIdMap[system.id] = system.name;
					$('#systemList').append('<option value="' + system.id + '">' + system.name + '</option>');
				}
				$('#systemList').change();
			});
}

NcMapAdmin.prototype.activateSystemPanel = function( systemId )
{
	var ncMap = this;
	var systemName = this.systemIdMap[systemId];
	var system = this.systems[systemName];

	$('#systemPanel .choices').html('Loading...');
	this.editingSystem = systemName;
	for( var i = 0; i < this.possibleMarkers.length; i++ )
	{
		if( this.possibleMarkers[i] != null )
		{
			this.possibleMarkers[i].setMap(null);
		}
	}
	this.possibleMarkers = [];

	this.activateSystemByName(systemName);

	$.getJSON('/admin/submissions',
			{
				'systemName': systemName,
				'mapType': ncMap.googleMap.getMapTypeId()
			},
			function(data)
			{
				$('#systemPanel .choices').empty();
				for( var i = 0; i < data.length; i++ )
				{
					var sub = data[i];
					var newKey = ncMap.possibles.length;
					ncMap.possibles[newKey] = sub;
					ncMap.possiblesIdMap[sub.id] = newKey;

					var latlon = new google.maps.LatLng(sub.lat, sub.lon);
					var marker = ncMap.createMarker(sub.id, latlon);
					marker.setIcon(ncMap.possibleIcon);
					ncMap.possibleMarkers.push(marker);
					marker.setMap(ncMap.googleMap);

					var html = '<input type="radio" id="' + sub.id + '" name="choice" value="' + sub.id + '"><label for="' + sub.id + '">Suggestion ' + (i + 1) + '</label>';

					$('#systemPanel .choices').append(html);
				}
				$('#systemPanel .choices').append('<input type="radio" id="none" name="choice" value="none"><label for="none">Ignore all</label>');
				$('#systemPanel .choices input').button();
			});
	$('#systemPanel').show();
};

NcMapAdmin.prototype.saveChoice = function()
{
	var ncMap = this;
	var system = this.systems[this.editingSystem];

	$.getJSON('/admin/save',
		{
			'systemName': ncMap.editingSystem,
			'mapType': ncMap.googleMap.getMapTypeId(),
			'suggestion': $('#systemPanel .choices input:checked').val()
		},
		function(data)
		{
			if( data.success )
			{
				ncMap.displayMessage(data.message)
				for( var i = 0; i < ncMap.possibleMarkers.length; i++ )
				{
					if( ncMap.possibleMarkers[i] != null )
					{
						ncMap.possibleMarkers[i].setMap(null);
					}
				}
				ncMap.possibleMarkers = [];

				$('#systemPanel .choices').empty();
				$('#systemPanel').hide();
				$('#systemList option[value="' + system.id + '"]').remove();
				$('#systemList').change();
			}
			else
			{
				ncMap.displayMessage(data.message, true);
			}
		});
}
