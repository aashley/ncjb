NcMapEditor.prototype = new NcMap();

function NcMapEditor()
{
	this.selectedIcon = null;
	this.newMarker = null;
	this.editingSystem = null;

	NcMap.apply(this, arguments);
}

NcMapEditor.prototype.init = function()
{
	NcMap.prototype.init.apply(this, arguments);

	var ncMap = this;

	$.getJSON('/feeds/regions',
			function(data)
			{
				$('#regionList').empty();
				for( var i = 0; i < data.length; i++ )
				{
					var region = data[i];
					$('#regionList').append('<option value="' + region.id + '">' + region.name + '</option>');
				}
				$('#regionList').change();
			});
}

NcMapEditor.prototype.setupMap = function()
{
	NcMap.prototype.setupMap.apply(this, arguments);

	this.selectedIcon = new google.maps.MarkerImage('/images/activecrosshair-new.png',
			new google.maps.Size(30,30),
			new google.maps.Point(0,0),
			new google.maps.Point(15,15));
}

NcMapEditor.prototype.setupUi = function()
{
	NcMap.prototype.setupUi.apply(this, arguments);

	var ncMap = this;

	$('#adminControls input[type="button"]').button();

	$('#regionList').change(function(e)
			{
				if( $('#regionList').val() == null )
				{
					return;
				}
				$.getJSON('/feeds/constellations',
					{
						'regionId': $('#regionList').val()
					},
					function( data )
					{
						$('#constellationList').empty();
						for( var i = 0; i < data.length; i++ )
						{
							var constellation = data[i];
							$('#constellationList').append('<option value="' + constellation.id + '">' + constellation.name + '</option>');
						}
						$('#constellationList').change();
					});
			});

	$('#constellationList').change(function(e)
			{
				if( $('#constellationList').val() == null )
				{
					return;
				}
				$.getJSON('/feeds/systems',
					{
						'constellationId': $('#constellationList').val(),
						'mapType': ncMap.googleMap.getMapTypeId(),
						'all': 'true'
					},
					function( data )
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
			});

	$('#systemList').change(function(e)
			{
				if( $('#systemList').val() == null )
				{
					return;
				}

				ncMap.activateSystemPanel($('#systemList').val());
			});

	$('#centerExisting').click(function(e)
		{
			if( ncMap.activeMarker != null )
			{
				ncMap.googleMap.panTo(ncMap.activeMarker.getPosition());
			}
		});

	$('#centerNew').click(function(e)
		{
			if( ncMap.newMarker != null )
			{
				ncMap.googleMap.panTo(ncMap.newMarker.getPosition());
			}
		});

	$('#createLocation').click(function(e)
		{
			ncMap.createLocation();
		});

	$('#saveLocation').click(function(e)
		{
			ncMap.saveLocation();
		});
}

NcMapEditor.prototype.displayMessage = function( message, error )
{
	if( typeof error == 'undefined' )
	{
		error = false;
	}

	var html = '<div id="message" class="ui-widget"><div class="ui-state-' + (error ? 'error' : 'highlight') + ' ui-corner-all ui-helper-clearfix"><p><span class="ui-icon ui-icon-' + (error ? 'alert' : 'info') + '"></span>' + message + '</p></div></div>';

	$('body').append(html);

	$('#message').click(function(e)
		{
			$('#message').fadeOut(400, function(e)
				{
					$('#message').remove();
				});
		});

	if( !error )
	{
		var execute = '$("#message").fadeOut(400, function(e) {'
				+ '$("#message").remove();'
				+ '});';

		setTimeout(execute, 5000);
	}
}

NcMapEditor.prototype.activateSystemPanel = function( systemId )
{
	var systemName = this.systemIdMap[systemId];
	var system = this.systems[systemName];

	this.editingSystem = systemName;
	if( this.newMarker != null )
	{
		this.newMarker.setMap(null);
		delete this.newMarker;
		this.newMarker = null;
	}
	this.activateSystemByName(systemName);
	$('#createLocation').show();
	$('#saveLocation').hide();
	$('#centerNew').hide();
	if( this.activeMarker == null )
	{
		$('#deleteLocation').hide();
		$('#centerExisting').hide();
	}
	else
	{
		$('#deleteLocation').show();
		$('#centerExisting').show();
	}
	$('#systemPanel').show();
};

NcMapEditor.prototype.createLocation = function()
{
	var system = this.systems[this.editingSystem];

	this.newMarker = this.createMarker('New ' + system.name, this.googleMap.getCenter(), true);
	this.newMarker.setIcon(this.selectedIcon);
	this.newMarker.setMap(this.googleMap);

	$('#centerNew').show();
	$('#saveLocation').show();
	$('#createLocation').blur().hide();
}

NcMapEditor.prototype.saveLocation = function()
{
	var ncMap = this;
	var system = this.systems[this.editingSystem];

	$.getJSON('/editor/save',
			{
				'systemName': system.name,
				'lat': ncMap.newMarker.getPosition().lat(),
				'lon': ncMap.newMarker.getPosition().lng(),
				'mapType': ncMap.googleMap.getMapTypeId()
			},
			function(data)
			{
				if( data.success )
				{
					ncMap.displayMessage(data.message)
				}
				else
				{
					ncMap.displayMessage(data.message, true);
				}
			});
}
