from google.appengine.ext import db, webapp

#
# Data Model
#

class Region(db.Model):
	eveId = db.IntegerProperty(required=True)
	name = db.StringProperty(required=True)
	searchableName = db.StringProperty()
	saschaHasLocations = db.BooleanProperty(default=False)
	siriusHasLocations = db.BooleanProperty(default=False)

class Constellation(db.Model):
	eveId = db.IntegerProperty(required=True)
	name = db.StringProperty(required=True)
	searchableName = db.StringProperty()
	region = db.ReferenceProperty(required=True, reference_class=Region)
	saschaHasLocations = db.BooleanProperty(default=False)
	siriusHasLocations = db.BooleanProperty(default=False)

class System(db.Model):
	eveId = db.IntegerProperty(required=True)
	name = db.StringProperty(required=True)
	searchableName = db.StringProperty()
	constellation = db.ReferenceProperty(required=True, reference_class=Constellation)
	saschaLocation = db.GeoPtProperty()
	siriusLocation = db.GeoPtProperty()

	def getJsonObject(self):
		finalSystem = {
			"id": self.eveId,
			"name": self.name,
			"constellationId": self.constellation.eveId,
			"sascha": {
				"hasLocation": False
			},
			"sirius": {
				"hasLocation": False
			}
		}
		if self.saschaLocation is not None:
			finalSystem['sascha']['hasLocation'] = True;
			finalSystem['sascha']['lat'] = self.saschaLocation.lat;
			finalSystem['sascha']['lon'] = self.saschaLocation.lon;
		if self.siriusLocation is not None:
			finalSystem['sirius']['hasLocation'] = True;
			finalSystem['sirius']['lat'] = self.siriusLocation.lat;
			finalSystem['sirius']['lon'] = self.siriusLocation.lon;

		return finalSystem


class SubmittedMapLocation(db.Model):
	system = db.ReferenceProperty(System)
	location = db.GeoPtProperty()
	mapType = db.StringProperty()
	user = db.UserProperty()
	removeLocation = db.BooleanProperty()

